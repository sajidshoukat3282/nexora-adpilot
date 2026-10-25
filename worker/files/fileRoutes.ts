import type { Env } from '../index';
import { logAudit } from '../admin/adminRoutes';
import { resolveSession } from '../auth/session';
import { clientIdOf } from '../notifications/notificationRoutes';
import { TRIAL_LIMITS, trialInfo } from '../trial/trial';

/**
 * File upload from the user's computer (creative artwork, proof-of-play photos).
 * When the R2 bucket (binding FILES_BUCKET) exists, new files go there (25 MB each, with a per-company quota).
 * Without it, files are stored inside the database in small chunks (5 MB each). Old database files keep working.
 * Images / PDF / short video only. Files are private to the company,
 * and a client account can only open files of its own campaigns.
 */

const MAX_BYTES_D1 = 5 * 1024 * 1024;
const MAX_BYTES_R2 = 25 * 1024 * 1024;
const maxBytes = (env: Env) => (env.FILES_BUCKET ? MAX_BYTES_R2 : MAX_BYTES_D1);
const r2Key = (companyId: string, id: string) => `${companyId}/${id}`;

/** Per-company storage allowance in bytes (default 1 GB, change with the FILE_QUOTA_MB variable). */
const quotaBytes = (env: Env) => (Number(env.FILE_QUOTA_MB) > 0 ? Number(env.FILE_QUOTA_MB) : 1024) * 1024 * 1024;

export async function companyStorageBytes(env: Env, companyId: string): Promise<number> {
  const r = await env.DB.prepare('SELECT COALESCE(SUM(size),0) AS b FROM uploaded_files WHERE company_id = ?').bind(companyId).first<{ b: number }>();
  return Number(r?.b) || 0;
}
const CHUNK = 256 * 1024;

export const TYPES: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp',
  pdf: 'application/pdf', mp4: 'video/mp4', webm: 'video/webm',
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const fail = (status: number, message: string, error = 'INVALID_INPUT') => json({ ok: false, error, message }, status);

let ready = false;
export async function ensureFileTables(db: D1Database): Promise<void> {
  if (ready) return;
  await db.prepare(`CREATE TABLE IF NOT EXISTS uploaded_files (
    id TEXT PRIMARY KEY, company_id TEXT NOT NULL, campaign_id TEXT, name TEXT NOT NULL, ext TEXT NOT NULL,
    size INTEGER NOT NULL, chunks INTEGER NOT NULL, uploaded_by TEXT, created_at TEXT NOT NULL)`).run();
  try { await db.prepare(`ALTER TABLE uploaded_files ADD COLUMN storage TEXT NOT NULL DEFAULT 'd1'`).run(); } catch { /* column exists */ }
  await db.prepare(`CREATE TABLE IF NOT EXISTS uploaded_file_chunks (
    file_id TEXT NOT NULL, idx INTEGER NOT NULL, data TEXT NOT NULL, PRIMARY KEY (file_id, idx))`).run();
  ready = true;
}

export const extOf = (name: string): string => (name.split('.').pop() || '').toLowerCase();
export const safeName = (n: string): string => n.replace(/[^A-Za-z0-9._ -]/g, '_').replace(/\s+/g, ' ').trim().slice(0, 100) || 'file';

/** Checks the first bytes so a renamed file (for example an .exe called .png) is refused. */
export function looksRight(ext: string, b: Uint8Array): boolean {
  const at = (i: number, s: string) => s.split('').every((c, k) => b[i + k] === c.charCodeAt(0));
  if (ext === 'png') return b[0] === 0x89 && at(1, 'PNG');
  if (ext === 'jpg' || ext === 'jpeg') return b[0] === 0xff && b[1] === 0xd8;
  if (ext === 'gif') return at(0, 'GIF8');
  if (ext === 'webp') return at(0, 'RIFF') && at(8, 'WEBP');
  if (ext === 'pdf') return at(0, '%PDF');
  if (ext === 'mp4') return at(4, 'ftyp');
  if (ext === 'webm') return b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3;
  return false;
}

function toBase64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

/** Stores a checked file (R2 when available, otherwise database chunks) and returns its id. Callers must validate type and size first. */
export async function saveUploadedFile(env: Env, companyId: string, accountId: string, name: string, ext: string, buf: Uint8Array, campaignId: string | null): Promise<string> {
  await ensureFileTables(env.DB);
  const id = crypto.randomUUID();
  if (env.FILES_BUCKET) {
    await env.FILES_BUCKET.put(r2Key(companyId, id), buf, { httpMetadata: { contentType: TYPES[ext] || 'application/octet-stream' } });
    try {
      await env.DB.prepare('INSERT INTO uploaded_files (id, company_id, campaign_id, name, ext, size, chunks, uploaded_by, created_at, storage) VALUES (?,?,?,?,?,?,?,?,?,?)')
        .bind(id, companyId, campaignId, name, ext, buf.length, 0, accountId, new Date().toISOString(), 'r2').run();
    } catch (e) {
      await env.FILES_BUCKET.delete(r2Key(companyId, id)).catch(() => undefined);
      throw e;
    }
    return id;
  }
  const n = Math.ceil(buf.length / CHUNK);
  const stmts = [
    env.DB.prepare('INSERT INTO uploaded_files (id, company_id, campaign_id, name, ext, size, chunks, uploaded_by, created_at) VALUES (?,?,?,?,?,?,?,?,?)')
      .bind(id, companyId, campaignId, name, ext, buf.length, n, accountId, new Date().toISOString()),
  ];
  for (let i = 0; i < n; i++) {
    stmts.push(env.DB.prepare('INSERT INTO uploaded_file_chunks (file_id, idx, data) VALUES (?,?,?)').bind(id, i, toBase64(buf.subarray(i * CHUNK, (i + 1) * CHUNK))));
  }
  await env.DB.batch(stmts);
  return id;
}

/** Reads the stored bytes of a file row from R2 or from database chunks. Returns null if the bytes are missing. */
async function readBytes(env: Env, f: { id: string; company_id?: string; size: number; storage?: string }, companyId: string): Promise<Uint8Array | null> {
  if (f.storage === 'r2') {
    if (!env.FILES_BUCKET) return null;
    const o = await env.FILES_BUCKET.get(r2Key(companyId, f.id));
    return o ? new Uint8Array(await o.arrayBuffer()) : null;
  }
  const rs = await env.DB.prepare('SELECT data FROM uploaded_file_chunks WHERE file_id = ? ORDER BY idx ASC').bind(f.id).all<{ data: string }>();
  const out = new Uint8Array(f.size);
  let off = 0;
  for (const r of rs.results ?? []) {
    const bin = atob(r.data);
    for (let i = 0; i < bin.length && off < out.length; i++) out[off++] = bin.charCodeAt(i);
  }
  return out;
}

export async function deleteUploadedFile(env: Env, companyId: string, id: string): Promise<void> {
  const f = await env.DB.prepare('SELECT storage FROM uploaded_files WHERE id = ? AND company_id = ?').bind(id, companyId).first<{ storage: string }>();
  if (f?.storage === 'r2' && env.FILES_BUCKET) await env.FILES_BUCKET.delete(r2Key(companyId, id)).catch(() => undefined);
  await env.DB.batch([
    env.DB.prepare('DELETE FROM uploaded_file_chunks WHERE file_id = ? AND file_id IN (SELECT id FROM uploaded_files WHERE company_id = ?)').bind(id, companyId),
    env.DB.prepare('DELETE FROM uploaded_files WHERE id = ? AND company_id = ?').bind(id, companyId),
  ]);
}

/** Loads the bytes of one stored file of a company (images, pdf, video). */
export async function loadUploadedFile(env: Env, companyId: string, id: string): Promise<{ bytes: Uint8Array; ext: string; name: string } | null> {
  await ensureFileTables(env.DB);
  const f = await env.DB.prepare('SELECT id, name, ext, size, storage FROM uploaded_files WHERE id = ? AND company_id = ?').bind(id, companyId).first<any>();
  if (!f) return null;
  const bytes = await readBytes(env, f, companyId);
  return bytes ? { bytes, ext: f.ext, name: f.name } : null;
}

/** Reads one stored file (used by the public marketplace page for listing photos and the logo). */
export async function readUploadedFile(env: Env, companyId: string, id: string): Promise<Response | null> {
  await ensureFileTables(env.DB);
  const f = await env.DB.prepare('SELECT id, name, ext, size, storage FROM uploaded_files WHERE id = ? AND company_id = ?').bind(id, companyId).first<any>();
  if (!f || !['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(f.ext)) return null;
  const out = await readBytes(env, f, companyId);
  if (!out) return null;
  return new Response(out, { status: 200, headers: { 'content-type': TYPES[f.ext] || 'application/octet-stream', 'x-content-type-options': 'nosniff', 'content-security-policy': "default-src 'none'; sandbox", 'cache-control': 'public, max-age=600' } });
}

export async function handleFileRoutes(request: Request, env: Env, url: URL): Promise<Response | null> {
  const path = url.pathname;
  if (path !== '/api/files' && !path.startsWith('/api/files/')) return null;
  try {
    const s = await resolveSession(request, env.DB);
    if (!s) return json({ ok: false, error: 'UNAUTHENTICATED' }, 401);
    await ensureFileTables(env.DB);

    if (path === '/api/files' && request.method === 'POST') {
      if (s.accountType === 'client' || !s.permissions.includes('campaigns.manage')) return fail(403, 'You do not have permission to upload files.', 'FORBIDDEN');
      const name = safeName(url.searchParams.get('name') || 'file');
      const ext = extOf(name);
      if (!TYPES[ext]) return fail(400, 'This file type is not allowed. Use PNG, JPG, GIF, WEBP, PDF, MP4 or WEBM.');
      const declared = Number(request.headers.get('content-length') || 0);
      const limit = maxBytes(env);
      const limitMb = Math.round(limit / 1048576);
      if (declared > limit + 4096) return fail(413, `The file is too large. The limit is ${limitMb} MB. For bigger files, paste a link instead.`, 'TOO_LARGE');
      const campaignId = url.searchParams.get('campaign_id') || '';
      if (campaignId) {
        const c = await env.DB.prepare('SELECT id FROM campaigns WHERE id = ? AND company_id = ?').bind(campaignId, s.companyId).first();
        if (!c) return fail(404, 'Campaign not found.', 'NOT_FOUND');
      }
      const buf = new Uint8Array(await request.arrayBuffer());
      if (buf.length === 0) return fail(400, 'The file is empty.');
      if (buf.length > limit) return fail(413, `The file is too large. The limit is ${limitMb} MB. For bigger files, paste a link instead.`, 'TOO_LARGE');
      const onTrial = (await trialInfo(env.DB, s.companyId)) !== null;
      const allowance = onTrial ? TRIAL_LIMITS.storage_mb * 1024 * 1024 : quotaBytes(env);
      if ((env.FILES_BUCKET || onTrial) && (await companyStorageBytes(env, s.companyId)) + buf.length > allowance) return fail(413, onTrial ? `The free trial includes ${TRIAL_LIMITS.storage_mb} MB of file storage. Subscribe to add more.` : 'Your storage allowance is full. Delete old files or contact support to increase it.', 'QUOTA_FULL');
      if (!looksRight(ext, buf)) return fail(400, 'The file content does not match its type. Please choose a real image, PDF or video.');
      const id = await saveUploadedFile(env, s.companyId, s.accountId, name, ext, buf, campaignId || null);
      await logAudit(env, s.companyId, s.accountId, 'File uploaded', name);
      return json({ ok: true, id, name, size: buf.length, url: `/api/files/${id}/${encodeURIComponent(name)}` });
    }

    const m = path.match(/^\/api\/files\/([0-9a-fA-F-]{36})(?:\/[^/]*)?$/);
    if (m && (request.method === 'GET' || request.method === 'DELETE')) {
      const f = await env.DB.prepare('SELECT id, company_id, campaign_id, name, ext, size, chunks, storage FROM uploaded_files WHERE id = ? AND company_id = ?').bind(m[1], s.companyId).first<any>();
      if (!f) return fail(404, 'File not found.', 'NOT_FOUND');
      if (request.method === 'DELETE') {
        if (s.accountType === 'client' || !s.permissions.includes('campaigns.manage')) return fail(403, 'You do not have permission to delete files.', 'FORBIDDEN');
        await deleteUploadedFile(env, s.companyId, f.id);
        await logAudit(env, s.companyId, s.accountId, 'File deleted', String(f.name));
        return json({ ok: true });
      }
      let isLogo = false;
      try { isLogo = !!(await env.DB.prepare('SELECT 1 AS x FROM company_branding WHERE company_id = ? AND logo_file_id = ?').bind(s.companyId, f.id).first()); } catch { /* no branding yet */ }
      if (s.accountType === 'client' && !isLogo) {
        const cid = await clientIdOf(env, s);
        const own = f.campaign_id && cid
          ? await env.DB.prepare('SELECT id FROM campaigns WHERE id = ? AND company_id = ? AND client_id = ?').bind(f.campaign_id, s.companyId, cid).first()
          : null;
        if (!own) return fail(404, 'File not found.', 'NOT_FOUND');
      }
      const out = await readBytes(env, f, s.companyId);
      if (!out) return fail(404, 'File not found.', 'NOT_FOUND');
      return new Response(out, {
        status: 200,
        headers: {
          'content-type': TYPES[f.ext] || 'application/octet-stream',
          'content-disposition': `inline; filename="${String(f.name).replace(/"/g, '')}"`,
          'x-content-type-options': 'nosniff',
          'content-security-policy': "default-src 'none'; img-src 'self' data:; media-src 'self'; style-src 'unsafe-inline'; sandbox",
          'cache-control': 'private, max-age=3600',
        },
      });
    }
    return fail(404, 'Not found.', 'NOT_FOUND');
  } catch {
    return fail(500, 'Unable to complete the request. Please try again.', 'FILE_REQUEST_FAILED');
  }
}
