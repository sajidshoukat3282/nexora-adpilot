import type { Env } from '../index';
import { loadUploadedFile, TYPES } from '../files/fileRoutes';

/**
 * Screen player (web page) API. Works with the screen's secret player key, no login.
 * - GET /api/player/manifest?key=  : what to play now on this screen (approved creatives of campaigns running today). Also counts as a heartbeat.
 * - POST /api/player/plays?key= : the player reports how many times each creative played per day (kept as small daily totals in play_stats).
 * - GET /api/player/media/:fileId?key= : the file, only if an approved creative of a running campaign on this screen uses it. Cached for a long time.
 */

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

const todayIso = () => new Date().toISOString().slice(0, 10);
const IMG = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
const VID = ['mp4', 'webm'];
const extOfUrl = (u: string): string => (u.split('?')[0].split('#')[0].split('.').pop() || '').toLowerCase();

async function rows<T = any>(env: Env, sql: string, ...binds: unknown[]): Promise<T[]> {
  try { const r = await env.DB.prepare(sql).bind(...binds).all<T>(); return (r.results ?? []) as T[]; } catch { return []; }
}

async function screenOf(env: Env, key: string): Promise<{ inventory_id: string; company_id: string; name: string } | null> {
  if (!/^[0-9a-f]{64}$/.test(key)) return null;
  try {
    return await env.DB.prepare('SELECT o.inventory_id, o.company_id, i.name FROM screen_ops o JOIN inventory i ON i.id = o.inventory_id WHERE o.player_key = ? LIMIT 1').bind(key).first<any>() ?? null;
  } catch { return null; }
}

async function approvedCreatives(env: Env, sc: { inventory_id: string; company_id: string }) {
  const today = todayIso();
  return rows(env,
    `SELECT cr.id, cr.name, cr.url, cr.version, cr.updated_at, c.id AS campaign_id, c.name AS campaign_name, COALESCE(cs.slots,1) AS slots
       FROM campaign_creatives cr
       JOIN campaigns c ON c.id = cr.campaign_id
       JOIN campaign_screens cs ON cs.campaign_id = c.id AND cs.inventory_id = ?
      WHERE cr.company_id = ? AND c.company_id = ? AND cr.status = 'approved' AND cr.url IS NOT NULL AND cr.url != ''
        AND c.status IN ('booked','live') AND c.start_date <= ? AND c.end_date >= ?
      ORDER BY c.start_date, cr.created_at`, sc.inventory_id, sc.company_id, sc.company_id, today, today);
}

async function hash(v: string): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v));
  return Array.from(new Uint8Array(d)).slice(0, 6).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function manifest(env: Env, key: string): Promise<Response> {
  const sc = await screenOf(env, key);
  if (!sc) return json({ ok: false, error: 'INVALID_KEY', message: 'This player link is not valid.' }, 401);
  await env.DB.prepare('UPDATE screen_ops SET last_heartbeat = ? WHERE inventory_id = ?').bind(new Date().toISOString(), sc.inventory_id).run().catch(() => undefined);
  const list = await approvedCreatives(env, sc);
  const items: any[] = [];
  let skipped = 0;
  for (const c of list) {
    const url = String(c.url);
    const m = url.match(/^\/api\/files\/([0-9a-fA-F-]{36})/);
    let type: 'image' | 'video' | null = null;
    let src = '';
    if (m) {
      const f = await env.DB.prepare('SELECT ext FROM uploaded_files WHERE id = ? AND company_id = ?').bind(m[1], sc.company_id).first<{ ext: string }>().catch(() => null);
      if (f && IMG.includes(f.ext)) type = 'image';
      else if (f && VID.includes(f.ext)) type = 'video';
      src = `/api/player/media/${m[1]}?key=${key}`;
    } else if (/^https:\/\//i.test(url)) {
      const e = extOfUrl(url);
      if (IMG.includes(e)) type = 'image'; else if (VID.includes(e)) type = 'video';
      src = url;
    }
    if (!type) { skipped++; continue; }
    items.push({ id: c.id, name: c.name, campaign: c.campaign_name, type, src, repeat: Math.max(1, Math.min(10, Number(c.slots) || 1)), seconds: 10, stamp: c.updated_at });
  }
  const version = await hash(JSON.stringify(items.map((i) => [i.id, i.src, i.repeat, i.stamp])));
  return json({ ok: true, screen: sc.name, version, refresh_seconds: 300, items, skipped });
}

async function media(request: Request, env: Env, key: string, fileId: string): Promise<Response> {
  const sc = await screenOf(env, key);
  if (!sc) return new Response('Not found', { status: 404 });
  const allowed = (await approvedCreatives(env, sc)).some((c) => String(c.url).startsWith(`/api/files/${fileId}`));
  if (!allowed) return new Response('Not found', { status: 404 });
  const f = await loadUploadedFile(env, sc.company_id, fileId);
  if (!f || !(IMG.includes(f.ext) || VID.includes(f.ext))) return new Response('Not found', { status: 404 });
  const type = TYPES[f.ext] || 'application/octet-stream';
  const base = { 'content-type': type, 'accept-ranges': 'bytes', 'x-content-type-options': 'nosniff', 'cache-control': 'private, max-age=31536000, immutable' };
  const total = f.bytes.length;
  const range = request.headers.get('range')?.match(/^bytes=(\d*)-(\d*)$/);
  if (range && (range[1] || range[2])) {
    let start = range[1] ? parseInt(range[1], 10) : Math.max(0, total - parseInt(range[2], 10));
    let end = range[1] && range[2] ? parseInt(range[2], 10) : total - 1;
    end = Math.min(end, total - 1);
    if (start > end || start >= total) return new Response(null, { status: 416, headers: { 'content-range': `bytes */${total}` } });
    return new Response(f.bytes.slice(start, end + 1), { status: 206, headers: { ...base, 'content-range': `bytes ${start}-${end}/${total}`, 'content-length': String(end - start + 1) } });
  }
  return new Response(f.bytes, { status: 200, headers: { ...base, 'content-length': String(total) } });
}

let playTable = false;
async function playPlays(request: Request, env: Env, key: string): Promise<Response> {
  const sc = await screenOf(env, key);
  if (!sc) return json({ ok: false, error: 'INVALID_KEY' }, 401);
  if (!playTable) {
    await env.DB.prepare(`CREATE TABLE IF NOT EXISTS play_stats (
      inventory_id TEXT NOT NULL, campaign_id TEXT NOT NULL, creative_id TEXT NOT NULL, day TEXT NOT NULL,
      company_id TEXT NOT NULL, plays INTEGER NOT NULL DEFAULT 0, seconds INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (inventory_id, campaign_id, creative_id, day))`).run();
    playTable = true;
  }
  const b: any = await request.json().catch(() => ({}));
  const list: any[] = Array.isArray(b.plays) ? b.plays.slice(0, 200) : [];
  const now = Date.now();
  const okDay = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d) && Math.abs(new Date(d + 'T00:00:00Z').getTime() - now) <= 3 * 86400000;
  let saved = 0;
  for (const e of list) {
    const id = String(e?.id ?? '');
    const day = String(e?.day ?? '');
    const n = Math.max(0, Math.min(5000, Math.floor(Number(e?.plays) || 0)));
    const sec = Math.max(0, Math.min(86400, Math.floor(Number(e?.seconds) || 0)));
    if (!/^[0-9a-fA-F-]{36}$/.test(id) || !okDay(day) || n < 1) continue;
    const cr = await env.DB.prepare(`SELECT cr.campaign_id FROM campaign_creatives cr
        JOIN campaign_screens cs ON cs.campaign_id = cr.campaign_id AND cs.inventory_id = ?
       WHERE cr.id = ? AND cr.company_id = ? LIMIT 1`).bind(sc.inventory_id, id, sc.company_id).first<{ campaign_id: string }>().catch(() => null);
    if (!cr) continue;
    await env.DB.prepare(`INSERT INTO play_stats (inventory_id, campaign_id, creative_id, day, company_id, plays, seconds) VALUES (?,?,?,?,?,?,?)
        ON CONFLICT(inventory_id, campaign_id, creative_id, day) DO UPDATE SET plays = plays + excluded.plays, seconds = seconds + excluded.seconds`)
      .bind(sc.inventory_id, cr.campaign_id, id, day, sc.company_id, n, sec).run();
    saved += 1;
  }
  return json({ ok: true, saved });
}

export async function handlePlayerRoutes(request: Request, env: Env, url: URL): Promise<Response | null> {
  const path = url.pathname;
  if (!path.startsWith('/api/player/') || path === '/api/player/ping') return null;
  if (request.method !== 'GET' && !(request.method === 'POST' && path === '/api/player/plays')) return json({ ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);
  try {
    const key = (url.searchParams.get('key') || '').trim();
    if (path === '/api/player/plays') return await playPlays(request, env, key);
    if (path === '/api/player/manifest') return await manifest(env, key);
    const m = path.match(/^\/api\/player\/media\/([0-9a-fA-F-]{36})$/);
    if (m) return await media(request, env, key, m[1]);
    return json({ ok: false, error: 'NOT_FOUND' }, 404);
  } catch {
    return json({ ok: false, error: 'SERVER_ERROR' }, 500);
  }
}
