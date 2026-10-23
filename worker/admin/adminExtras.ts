import type { Env } from '../index';
import { resolveSession, type SessionContext } from '../auth/session';
import { logAudit } from './adminRoutes';
import { deleteUploadedFile, extOf, looksRight, safeName, saveUploadedFile } from '../files/fileRoutes';

/**
 * Admin extras: searchable activity log, custom permission templates and the company logo.
 * Everything is limited to the signed-in company. Managing needs `company.manage`;
 * reading the logo address (so it can be shown in the app, documents and client portal) needs any session.
 */

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const fail = (status: number, message: string, error = 'INVALID_INPUT') => json({ ok: false, error, message }, status);

const LOGO_MAX = 1024 * 1024;
const LOGO_EXT = ['png', 'jpg', 'jpeg', 'webp'];
const MAX_TEMPLATES = 20;

let ready = false;
async function ensure(db: D1Database): Promise<void> {
  if (ready) return;
  await db.prepare(`CREATE TABLE IF NOT EXISTS permission_templates (
    id TEXT PRIMARY KEY, company_id TEXT NOT NULL, name TEXT NOT NULL, permissions TEXT NOT NULL, created_at TEXT NOT NULL)`).run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS company_branding (
    company_id TEXT PRIMARY KEY, logo_file_id TEXT, updated_at TEXT NOT NULL)`).run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY, company_id TEXT NOT NULL, actor_email TEXT, action TEXT NOT NULL, detail TEXT, created_at TEXT NOT NULL)`).run();
  ready = true;
}

async function manager(request: Request, env: Env): Promise<SessionContext | Response> {
  const s = await resolveSession(request, env.DB);
  if (!s) return json({ ok: false, error: 'UNAUTHENTICATED' }, 401);
  if (s.accountType === 'client' || !s.permissions.includes('company.manage')) return fail(403, 'Only the workspace owner can do this.', 'FORBIDDEN');
  return s;
}

const logoUrl = (id: string | null | undefined): string | null => (id ? `/api/files/${id}/logo` : null);

export async function handleAdminExtras(request: Request, env: Env, url: URL): Promise<Response | null> {
  const path = url.pathname;
  const m = request.method;
  const isTpl = path === '/api/admin/templates' || /^\/api\/admin\/templates\/[0-9a-fA-F-]{36}$/.test(path);
  const isLogo = path === '/api/admin/logo';
  const isAudit = path === '/api/admin/audit';
  const isBranding = path === '/api/branding';
  if (!isTpl && !isLogo && !isAudit && !isBranding) return null;
  try {
    await ensure(env.DB);

    if (isBranding && m === 'GET') {
      const s = await resolveSession(request, env.DB);
      if (!s) return json({ ok: false, error: 'UNAUTHENTICATED' }, 401);
      const r = await env.DB.prepare('SELECT logo_file_id FROM company_branding WHERE company_id = ?').bind(s.companyId).first<{ logo_file_id: string | null }>();
      return json({ ok: true, logo_url: logoUrl(r?.logo_file_id) });
    }

    const s = await manager(request, env);
    if (s instanceof Response) return s;

    if (isAudit && m === 'GET') {
      const q = (url.searchParams.get('q') || '').trim().slice(0, 60).toLowerCase();
      const action = (url.searchParams.get('action') || '').trim().slice(0, 80);
      const limit = Math.min(300, Math.max(10, Number(url.searchParams.get('limit')) || 150));
      const binds: unknown[] = [s.companyId];
      let where = 'company_id = ?';
      if (action) { where += ' AND action = ?'; binds.push(action); }
      if (q) { where += " AND (LOWER(action) LIKE ? OR LOWER(COALESCE(detail,'')) LIKE ? OR LOWER(COALESCE(actor_email,'')) LIKE ?)"; binds.push(`%${q}%`, `%${q}%`, `%${q}%`); }
      const rows = await env.DB.prepare(`SELECT id, actor_email, action, detail, created_at FROM audit_log WHERE ${where} ORDER BY created_at DESC LIMIT ${limit}`).bind(...binds).all<any>();
      const actions = await env.DB.prepare('SELECT DISTINCT action FROM audit_log WHERE company_id = ? ORDER BY action LIMIT 60').bind(s.companyId).all<{ action: string }>();
      return json({ ok: true, entries: (rows.results ?? []).map((r) => ({ id: r.id, actor: r.actor_email, action: r.action, detail: r.detail, at: r.created_at })), actions: (actions.results ?? []).map((a) => a.action) });
    }

    if (isTpl) {
      if (path === '/api/admin/templates' && m === 'GET') {
        const rows = await env.DB.prepare('SELECT id, name, permissions FROM permission_templates WHERE company_id = ? ORDER BY name').bind(s.companyId).all<any>();
        return json({ ok: true, templates: (rows.results ?? []).map((r) => ({ id: r.id, name: r.name, permissions: safeList(r.permissions) })) });
      }
      if (path === '/api/admin/templates' && m === 'POST') {
        const b = (await request.json().catch(() => ({}))) as any;
        const name = String(b.name ?? '').trim().slice(0, 40);
        if (name.length < 2) return fail(400, 'Please enter a template name.');
        const perms = (Array.isArray(b.permissions) ? b.permissions : []).map(String).filter((p: string) => /^[a-z_]+\.[a-z_]+$/.test(p) && p !== 'company.manage');
        if (perms.length === 0) return fail(400, 'Select at least one permission for the template.');
        const n = await env.DB.prepare('SELECT COUNT(*) n FROM permission_templates WHERE company_id = ?').bind(s.companyId).first<{ n: number }>();
        if ((n?.n ?? 0) >= MAX_TEMPLATES) return fail(409, 'You can keep up to 20 templates. Delete one first.', 'LIMIT');
        const dup = await env.DB.prepare('SELECT id FROM permission_templates WHERE company_id = ? AND LOWER(name) = ?').bind(s.companyId, name.toLowerCase()).first<{ id: string }>();
        if (dup) {
          await env.DB.prepare('UPDATE permission_templates SET permissions = ? WHERE id = ? AND company_id = ?').bind(JSON.stringify(perms), dup.id, s.companyId).run();
          await logAudit(env, s.companyId, s.accountId, 'Permission template updated', name);
          return json({ ok: true, id: dup.id });
        }
        const id = crypto.randomUUID();
        await env.DB.prepare('INSERT INTO permission_templates (id, company_id, name, permissions, created_at) VALUES (?,?,?,?,?)').bind(id, s.companyId, name, JSON.stringify(perms), new Date().toISOString()).run();
        await logAudit(env, s.companyId, s.accountId, 'Permission template created', name);
        return json({ ok: true, id });
      }
      const tid = path.split('/').pop() as string;
      if (m === 'DELETE') {
        const t = await env.DB.prepare('SELECT name FROM permission_templates WHERE id = ? AND company_id = ?').bind(tid, s.companyId).first<{ name: string }>();
        if (!t) return fail(404, 'Template not found.', 'NOT_FOUND');
        await env.DB.prepare('DELETE FROM permission_templates WHERE id = ? AND company_id = ?').bind(tid, s.companyId).run();
        await logAudit(env, s.companyId, s.accountId, 'Permission template deleted', t.name);
        return json({ ok: true });
      }
    }

    if (isLogo) {
      const old = await env.DB.prepare('SELECT logo_file_id FROM company_branding WHERE company_id = ?').bind(s.companyId).first<{ logo_file_id: string | null }>();
      if (m === 'POST') {
        const name = safeName(url.searchParams.get('name') || 'logo.png');
        const ext = extOf(name);
        if (!LOGO_EXT.includes(ext)) return fail(400, 'Use a PNG, JPG or WEBP image for the logo.');
        if (Number(request.headers.get('content-length') || 0) > LOGO_MAX + 4096) return fail(413, 'The logo is too large. The limit is 1 MB.', 'TOO_LARGE');
        const buf = new Uint8Array(await request.arrayBuffer());
        if (buf.length === 0) return fail(400, 'The file is empty.');
        if (buf.length > LOGO_MAX) return fail(413, 'The logo is too large. The limit is 1 MB.', 'TOO_LARGE');
        if (!looksRight(ext, buf)) return fail(400, 'The file content does not match its type. Please choose a real image.');
        const id = await saveUploadedFile(env, s.companyId, s.accountId, name, ext, buf, null);
        await env.DB.prepare('INSERT INTO company_branding (company_id, logo_file_id, updated_at) VALUES (?,?,?) ON CONFLICT(company_id) DO UPDATE SET logo_file_id = excluded.logo_file_id, updated_at = excluded.updated_at')
          .bind(s.companyId, id, new Date().toISOString()).run();
        if (old?.logo_file_id) await deleteUploadedFile(env, s.companyId, old.logo_file_id).catch(() => undefined);
        await logAudit(env, s.companyId, s.accountId, 'Company logo changed', name);
        return json({ ok: true, logo_url: logoUrl(id) });
      }
      if (m === 'DELETE') {
        await env.DB.prepare('UPDATE company_branding SET logo_file_id = NULL, updated_at = ? WHERE company_id = ?').bind(new Date().toISOString(), s.companyId).run();
        if (old?.logo_file_id) await deleteUploadedFile(env, s.companyId, old.logo_file_id).catch(() => undefined);
        await logAudit(env, s.companyId, s.accountId, 'Company logo removed');
        return json({ ok: true, logo_url: null });
      }
    }
    return fail(405, 'Method not allowed.', 'METHOD_NOT_ALLOWED');
  } catch {
    return fail(500, 'Unable to complete the request. Please try again.', 'ADMIN_REQUEST_FAILED');
  }
}

function safeList(v: string): string[] {
  try { const a = JSON.parse(v); return Array.isArray(a) ? a.map(String) : []; } catch { return []; }
}
