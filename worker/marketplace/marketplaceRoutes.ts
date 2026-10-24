import type { Env } from '../index';
import { logAudit } from '../admin/adminRoutes';
import { notify } from '../notifications/notificationRoutes';
import { readUploadedFile } from '../files/fileRoutes';
import { resolveSession, type SessionContext } from '../auth/session';

/**
 * Marketplace (private listing, version 1).
 * - Staff list chosen screens, write a short description and photo, and follow booking requests.
 * - A public page (no login) shows only listed screens. Rates are NEVER sent to the public.
 * - Visitors send a booking request. It is saved, staff are notified, and it can be turned into a CRM lead.
 * Staff routes are scoped by `session.companyId`. Public routes work by the company's marketplace slug and need the page to be switched on.
 */

const json = (data: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra } });
const fail = (status: number, message: string, error = 'INVALID_INPUT') => json({ ok: false, error, message }, status);
const nowIso = () => new Date().toISOString();
const todayIso = () => new Date().toISOString().slice(0, 10);
const uuid = () => crypto.randomUUID();
const STATUSES = ['new', 'contacted', 'quoted', 'won', 'lost'];

let ready = false;
async function ensure(db: D1Database): Promise<void> {
  if (ready) return;
  await db.prepare(`CREATE TABLE IF NOT EXISTS marketplace_settings (
    company_id TEXT PRIMARY KEY, enabled INTEGER NOT NULL DEFAULT 0, slug TEXT UNIQUE, headline TEXT, about TEXT,
    contact_phone TEXT, contact_email TEXT, updated_at TEXT)`).run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS marketplace_listings (
    inventory_id TEXT PRIMARY KEY, company_id TEXT NOT NULL, listed INTEGER NOT NULL DEFAULT 0, title TEXT, description TEXT,
    photo_url TEXT, min_days INTEGER, updated_at TEXT)`).run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS marketplace_requests (
    id TEXT PRIMARY KEY, company_id TEXT NOT NULL, name TEXT NOT NULL, company_name TEXT, phone TEXT, email TEXT,
    inventory_ids TEXT, start_date TEXT, end_date TEXT, budget TEXT, message TEXT, status TEXT NOT NULL DEFAULT 'new',
    notes TEXT, lead_id TEXT, ip_hash TEXT, created_at TEXT NOT NULL, updated_at TEXT)`).run();
  ready = true;
}

async function rows<T = any>(env: Env, sql: string, ...binds: unknown[]): Promise<T[]> {
  try { const r = await env.DB.prepare(sql).bind(...binds).all<T>(); return (r.results ?? []) as T[]; } catch { return []; }
}
async function one<T = any>(env: Env, sql: string, ...binds: unknown[]): Promise<T | null> {
  try { return (await env.DB.prepare(sql).bind(...binds).first<T>()) ?? null; } catch { return null; }
}
const text = (v: unknown, max: number): string | null => {
  const t = typeof v === 'string' ? v.trim() : '';
  return t ? t.slice(0, max) : null;
};
const isoDate = (v: unknown): string | null => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
const dayNum = (iso: string) => Math.floor(new Date(iso + 'T00:00:00Z').getTime() / 86400000);
const photoOk = (v: string | null): boolean => !v || /^https?:\/\//i.test(v) || /^\/api\/files\/[0-9a-fA-F-]{36}(\/|$)/.test(v);

async function guard(request: Request, env: Env, write: boolean): Promise<SessionContext | Response> {
  const s = await resolveSession(request, env.DB);
  if (!s) return json({ ok: false, error: 'UNAUTHENTICATED' }, 401);
  if (s.accountType === 'client') return fail(403, 'The marketplace is for staff only.', 'FORBIDDEN');
  if (write && !['crm.manage', 'inventory.manage', 'campaigns.manage'].some((p) => s.permissions.includes(p))) {
    return fail(403, 'You do not have permission to change the marketplace.', 'FORBIDDEN');
  }
  return s;
}

const slugify = (n: string): string => n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'company';

async function makeSlug(env: Env, companyId: string): Promise<string> {
  const c = await one<{ name: string }>(env, 'SELECT name FROM companies WHERE id = ? LIMIT 1', companyId);
  const base = slugify(c?.name || 'company');
  for (let i = 0; i < 6; i++) {
    const cand = i === 0 ? base : `${base}-${uuid().slice(0, 4)}`;
    const taken = await one(env, 'SELECT 1 AS x FROM marketplace_settings WHERE slug = ?', cand);
    if (!taken) return cand;
  }
  return `${base}-${uuid().slice(0, 8)}`;
}

/** Screens that already have a booked or live campaign overlapping the dates. */
async function busyIds(env: Env, companyId: string, start: string, end: string): Promise<Map<string, string>> {
  const r = await rows(env,
    `SELECT cs.inventory_id, c.name FROM campaign_screens cs JOIN campaigns c ON c.id = cs.campaign_id
      WHERE c.company_id = ? AND c.status IN ('booked','live') AND c.start_date <= ? AND c.end_date >= ?`, companyId, end, start);
  const m = new Map<string, string>();
  for (const x of r) m.set(x.inventory_id, x.name);
  return m;
}

/* ---------------- staff ---------------- */

async function adminOverview(env: Env, s: SessionContext, request: Request): Promise<Response> {
  const st = await one<any>(env, 'SELECT * FROM marketplace_settings WHERE company_id = ?', s.companyId);
  const list = await rows(env,
    `SELECT i.id, i.name, i.city, i.location, i.screen_type, i.size, i.rate, i.currency, l.listed, l.title, l.description, l.photo_url, l.min_days
       FROM inventory i LEFT JOIN marketplace_listings l ON l.inventory_id = i.id WHERE i.company_id = ? ORDER BY i.name`, s.companyId);
  const counts = await rows(env, 'SELECT status, COUNT(*) AS n FROM marketplace_requests WHERE company_id = ? GROUP BY status', s.companyId);
  const origin = new URL(request.url).origin;
  return json({
    ok: true,
    settings: { enabled: !!st?.enabled, slug: st?.slug ?? null, headline: st?.headline ?? '', about: st?.about ?? '', contact_phone: st?.contact_phone ?? '', contact_email: st?.contact_email ?? '' },
    public_url: st?.slug ? `${origin}/#/market/${st.slug}` : null,
    listings: list.map((x: any) => ({ ...x, listed: !!x.listed })),
    request_counts: Object.fromEntries(counts.map((c: any) => [c.status, c.n])),
  });
}

async function saveSettings(request: Request, env: Env, s: SessionContext): Promise<Response> {
  const b: any = await request.json().catch(() => ({}));
  const cur = await one<any>(env, 'SELECT slug FROM marketplace_settings WHERE company_id = ?', s.companyId);
  const slug = cur?.slug || (await makeSlug(env, s.companyId));
  const email = text(b.contact_email, 120);
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail(400, 'Please enter a valid contact email.');
  await env.DB.prepare(`INSERT INTO marketplace_settings (company_id, enabled, slug, headline, about, contact_phone, contact_email, updated_at)
    VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(company_id) DO UPDATE SET enabled = excluded.enabled, headline = excluded.headline, about = excluded.about,
    contact_phone = excluded.contact_phone, contact_email = excluded.contact_email, updated_at = excluded.updated_at`)
    .bind(s.companyId, b.enabled ? 1 : 0, slug, text(b.headline, 120), text(b.about, 600), text(b.contact_phone, 30), email, nowIso()).run();
  await logAudit(env, s.companyId, s.accountId, 'Marketplace settings saved', b.enabled ? 'Public page is on' : 'Public page is off');
  return json({ ok: true, message: b.enabled ? 'Saved. Your public page is on.' : 'Saved. Your public page is off.' });
}

async function saveListing(request: Request, env: Env, s: SessionContext, invId: string): Promise<Response> {
  const inv = await one<{ name: string }>(env, 'SELECT name FROM inventory WHERE id = ? AND company_id = ?', invId, s.companyId);
  if (!inv) return fail(404, 'Screen not found.', 'NOT_FOUND');
  const b: any = await request.json().catch(() => ({}));
  const photo = text(b.photo_url, 400);
  if (!photoOk(photo)) return fail(400, 'The photo must be an uploaded file or a link starting with http:// or https://.');
  const minDays = Math.max(0, Math.min(365, Math.floor(Number(b.min_days) || 0)));
  await env.DB.prepare(`INSERT INTO marketplace_listings (inventory_id, company_id, listed, title, description, photo_url, min_days, updated_at)
    VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(inventory_id) DO UPDATE SET listed = excluded.listed, title = excluded.title, description = excluded.description,
    photo_url = excluded.photo_url, min_days = excluded.min_days, updated_at = excluded.updated_at`)
    .bind(invId, s.companyId, b.listed ? 1 : 0, text(b.title, 100), text(b.description, 500), photo, minDays || null, nowIso()).run();
  await logAudit(env, s.companyId, s.accountId, b.listed ? 'Screen listed on marketplace' : 'Marketplace listing saved', inv.name);
  return json({ ok: true, message: b.listed ? 'Screen is listed.' : 'Listing saved (not listed).' });
}

async function listRequests(env: Env, s: SessionContext, url: URL): Promise<Response> {
  const st = url.searchParams.get('status') || '';
  const where = STATUSES.includes(st) ? ' AND status = ?' : '';
  const binds: unknown[] = [s.companyId]; if (where) binds.push(st);
  const list = await rows(env, `SELECT * FROM marketplace_requests WHERE company_id = ?${where} ORDER BY CASE status WHEN 'new' THEN 0 ELSE 1 END, created_at DESC LIMIT 300`, ...binds);
  const names = new Map((await rows(env, 'SELECT id, name, city FROM inventory WHERE company_id = ?', s.companyId)).map((i: any) => [i.id, `${i.name}${i.city ? ` (${i.city})` : ''}`]));
  const out: any[] = [];
  for (const r of list) {
    let ids: string[] = [];
    try { ids = JSON.parse(r.inventory_ids || '[]'); } catch { ids = []; }
    let busy = new Map<string, string>();
    if (r.start_date && r.end_date && r.status !== 'won' && r.status !== 'lost') busy = await busyIds(env, s.companyId, r.start_date, r.end_date);
    out.push({
      id: r.id, name: r.name, company_name: r.company_name, phone: r.phone, email: r.email, start_date: r.start_date, end_date: r.end_date,
      budget: r.budget, message: r.message, status: r.status, notes: r.notes, lead_id: r.lead_id, created_at: r.created_at,
      screens: ids.map((id) => ({ id, name: names.get(id) ?? 'Removed screen', busy_with: busy.get(id) ?? null })),
    });
  }
  return json({ ok: true, requests: out });
}

async function updateRequest(request: Request, env: Env, s: SessionContext, id: string): Promise<Response> {
  const cur = await one<any>(env, 'SELECT * FROM marketplace_requests WHERE id = ? AND company_id = ?', id, s.companyId);
  if (!cur) return fail(404, 'Request not found.', 'NOT_FOUND');
  if (request.method === 'DELETE') {
    await env.DB.prepare('DELETE FROM marketplace_requests WHERE id = ? AND company_id = ?').bind(id, s.companyId).run();
    return json({ ok: true, message: 'Request deleted.' });
  }
  const b: any = await request.json().catch(() => ({}));
  const status = STATUSES.includes(b.status) ? b.status : cur.status;
  const notes = b.notes !== undefined ? text(b.notes, 600) : cur.notes;
  await env.DB.prepare('UPDATE marketplace_requests SET status = ?, notes = ?, updated_at = ? WHERE id = ? AND company_id = ?').bind(status, notes, nowIso(), id, s.companyId).run();
  if (status !== cur.status) await logAudit(env, s.companyId, s.accountId, 'Marketplace request updated', `${cur.name}: ${status}`);
  return json({ ok: true, message: 'Request updated.' });
}

async function toLead(env: Env, s: SessionContext, id: string): Promise<Response> {
  const r = await one<any>(env, 'SELECT * FROM marketplace_requests WHERE id = ? AND company_id = ?', id, s.companyId);
  if (!r) return fail(404, 'Request not found.', 'NOT_FOUND');
  if (r.lead_id) return fail(409, 'This request is already a lead.', 'ALREADY_DONE');
  let ids: string[] = [];
  try { ids = JSON.parse(r.inventory_ids || '[]'); } catch { ids = []; }
  const names = ids.length ? (await rows(env, `SELECT name FROM inventory WHERE company_id = ? AND id IN (${ids.map(() => '?').join(',')})`, s.companyId, ...ids)).map((x: any) => x.name) : [];
  const note = [`Marketplace request`, names.length ? `Screens: ${names.join(', ')}` : '', r.start_date ? `Dates: ${r.start_date} to ${r.end_date}` : '', r.budget ? `Budget: ${r.budget}` : '', r.message ? `Message: ${r.message}` : ''].filter(Boolean).join('\n');
  const leadId = uuid();
  await env.DB.prepare(`INSERT INTO leads (id, company_id, company_name, contact_name, email, phone, estimated_value, source, notes) VALUES (?,?,?,?,?,?,?,?,?)`)
    .bind(leadId, s.companyId, r.company_name || r.name, r.name, r.email, r.phone, 0, 'Marketplace', note.slice(0, 900)).run();
  await env.DB.prepare('UPDATE marketplace_requests SET lead_id = ?, status = CASE WHEN status = \'new\' THEN \'contacted\' ELSE status END, updated_at = ? WHERE id = ?').bind(leadId, nowIso(), id).run();
  await logAudit(env, s.companyId, s.accountId, 'Marketplace request converted to lead', r.name);
  return json({ ok: true, lead_id: leadId, message: 'Lead created in CRM.' });
}

/* ---------------- public ---------------- */

const PUB = { 'access-control-allow-origin': '*', 'cache-control': 'no-store' };

async function loadPublic(env: Env, slug: string): Promise<{ company_id: string; st: any } | null> {
  if (!/^[a-z0-9-]{1,60}$/.test(slug)) return null;
  const st = await one<any>(env, 'SELECT * FROM marketplace_settings WHERE slug = ? AND enabled = 1', slug);
  return st ? { company_id: st.company_id, st } : null;
}

async function publicPage(env: Env, slug: string): Promise<Response> {
  const p = await loadPublic(env, slug);
  if (!p) return json({ ok: false, error: 'NOT_FOUND', message: 'This page is not available.' }, 404, PUB);
  const c = await one<{ name: string }>(env, 'SELECT name FROM companies WHERE id = ? LIMIT 1', p.company_id);
  const br = await one<{ logo_file_id: string }>(env, 'SELECT logo_file_id FROM company_branding WHERE company_id = ?', p.company_id);
  const list = await rows(env,
    `SELECT i.id, i.name, i.city, i.location, i.screen_type, i.size, l.title, l.description, l.photo_url, l.min_days
       FROM marketplace_listings l JOIN inventory i ON i.id = l.inventory_id WHERE l.company_id = ? AND l.listed = 1 AND i.company_id = ? ORDER BY i.city, i.name`, p.company_id, p.company_id);
  return json({
    ok: true, name: c?.name ?? '', headline: p.st.headline ?? '', about: p.st.about ?? '', phone: p.st.contact_phone ?? '', email: p.st.contact_email ?? '',
    logo: br?.logo_file_id ? `/api/public/market/${slug}/logo` : null,
    // No rate or price field is ever returned here.
    listings: list.map((x: any) => ({
      id: x.id, title: x.title || x.name, name: x.name, city: x.city, location: x.location, screen_type: x.screen_type, size: x.size,
      description: x.description, min_days: x.min_days, photo: x.photo_url ? `/api/public/market/${slug}/photo/${x.id}` : null,
    })),
  }, 200, PUB);
}

async function publicAvailability(env: Env, slug: string, url: URL): Promise<Response> {
  const p = await loadPublic(env, slug);
  if (!p) return json({ ok: false, error: 'NOT_FOUND' }, 404, PUB);
  const start = isoDate(url.searchParams.get('start')); const end = isoDate(url.searchParams.get('end'));
  if (!start || !end || end < start) return json({ ok: true, unavailable: [] }, 200, PUB);
  const m = await busyIds(env, p.company_id, start, end);
  return json({ ok: true, unavailable: Array.from(m.keys()) }, 200, PUB);
}

async function publicFile(env: Env, slug: string, kind: 'logo' | 'photo', invId: string | null): Promise<Response> {
  const p = await loadPublic(env, slug);
  if (!p) return new Response('Not found', { status: 404 });
  let ref: string | null = null;
  if (kind === 'logo') ref = (await one<{ logo_file_id: string }>(env, 'SELECT logo_file_id FROM company_branding WHERE company_id = ?', p.company_id))?.logo_file_id ?? null;
  else if (invId) {
    const l = await one<{ photo_url: string }>(env, 'SELECT photo_url FROM marketplace_listings WHERE inventory_id = ? AND company_id = ? AND listed = 1', invId, p.company_id);
    const m = l?.photo_url?.match(/^\/api\/files\/([0-9a-fA-F-]{36})/);
    if (m) ref = m[1];
    else if (l?.photo_url && /^https?:\/\//i.test(l.photo_url)) return Response.redirect(l.photo_url, 302);
  }
  if (!ref) return new Response('Not found', { status: 404 });
  return (await readUploadedFile(env, p.company_id, ref)) ?? new Response('Not found', { status: 404 });
}

async function sha(v: string): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('mkt:' + v));
  return Array.from(new Uint8Array(d)).slice(0, 12).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function publicRequest(request: Request, env: Env, slug: string): Promise<Response> {
  const p = await loadPublic(env, slug);
  if (!p) return json({ ok: false, error: 'NOT_FOUND', message: 'This page is not available.' }, 404, PUB);
  const b: any = await request.json().catch(() => null);
  if (!b || typeof b !== 'object') return fail(400, 'Please fill in the form.');
  if (b.website) return json({ ok: true, message: 'Thank you. We will contact you soon.' }, 200, PUB); // honeypot: pretend success
  const name = text(b.name, 80); const phone = text(b.phone, 30); const email = text(b.email, 120);
  if (!name || name.length < 2) return fail(400, 'Please enter your name.');
  if (!phone && !email) return fail(400, 'Please enter a phone number or an email.');
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail(400, 'Please enter a valid email.');
  if (phone && !/^[0-9+()\-\s]{6,30}$/.test(phone)) return fail(400, 'Please enter a valid phone number.');
  const start = isoDate(b.start_date); const end = isoDate(b.end_date);
  if (b.start_date || b.end_date) {
    if (!start || !end || end < start) return fail(400, 'Please check the dates.');
    if (start < todayIso()) return fail(400, 'The start date cannot be in the past.');
    if (dayNum(end) - dayNum(start) > 366) return fail(400, 'The date range is too long.');
  }
  const wanted: string[] = Array.isArray(b.inventory_ids) ? Array.from(new Set(b.inventory_ids.map(String))).slice(0, 20) as string[] : [];
  if (wanted.length === 0) return fail(400, 'Please choose at least one screen.');
  const okRows = await rows(env, `SELECT inventory_id FROM marketplace_listings WHERE company_id = ? AND listed = 1 AND inventory_id IN (${wanted.map(() => '?').join(',')})`, p.company_id, ...wanted);
  const valid = okRows.map((x: any) => x.inventory_id);
  if (valid.length === 0) return fail(400, 'The chosen screens are not available.');
  const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown';
  const ipHash = await sha(ip);
  const since = new Date(Date.now() - 3600000).toISOString();
  const byIp = await one<{ n: number }>(env, 'SELECT COUNT(*) AS n FROM marketplace_requests WHERE ip_hash = ? AND created_at > ?', ipHash, since);
  const byCo = await one<{ n: number }>(env, 'SELECT COUNT(*) AS n FROM marketplace_requests WHERE company_id = ? AND created_at > ?', p.company_id, since);
  if ((byIp?.n ?? 0) >= 5 || (byCo?.n ?? 0) >= 40) return fail(429, 'Too many requests. Please try again later.', 'RATE_LIMITED');
  const id = uuid();
  await env.DB.prepare(`INSERT INTO marketplace_requests (id, company_id, name, company_name, phone, email, inventory_ids, start_date, end_date, budget, message, status, ip_hash, created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,'new',?,?)`)
    .bind(id, p.company_id, name, text(b.company_name, 100), phone, email, JSON.stringify(valid), start, end, text(b.budget, 60), text(b.message, 1000), ipHash, nowIso()).run();
  await notify(env, p.company_id, { key: `mkt-${id}`, severity: 'info', category: 'crm', title: 'New marketplace request', detail: `${name}${b.company_name ? ` (${String(b.company_name).slice(0, 60)})` : ''} asked about ${valid.length} screen${valid.length === 1 ? '' : 's'}.`, link: '/marketplace?tab=requests' });
  return json({ ok: true, message: 'Thank you. We have received your request and will contact you soon.' }, 200, PUB);
}

/* ---------------- router ---------------- */

export async function handleMarketplaceRoutes(request: Request, env: Env, url: URL): Promise<Response | null> {
  const path = url.pathname;
  const isPublic = path.startsWith('/api/public/market/');
  if (!isPublic && !path.startsWith('/api/marketplace/')) return null;
  try {
    await ensure(env.DB);
    if (isPublic) {
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...PUB, 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'content-type' } });
      let m = path.match(/^\/api\/public\/market\/([a-z0-9-]+)$/);
      if (m && request.method === 'GET') return await publicPage(env, m[1]);
      m = path.match(/^\/api\/public\/market\/([a-z0-9-]+)\/availability$/);
      if (m && request.method === 'GET') return await publicAvailability(env, m[1], url);
      m = path.match(/^\/api\/public\/market\/([a-z0-9-]+)\/logo$/);
      if (m && request.method === 'GET') return await publicFile(env, m[1], 'logo', null);
      m = path.match(/^\/api\/public\/market\/([a-z0-9-]+)\/photo\/([0-9a-fA-F-]{36})$/);
      if (m && request.method === 'GET') return await publicFile(env, m[1], 'photo', m[2]);
      m = path.match(/^\/api\/public\/market\/([a-z0-9-]+)\/request$/);
      if (m && request.method === 'POST') return await publicRequest(request, env, m[1]);
      return fail(404, 'API route not found.', 'NOT_FOUND');
    }
    const g = await guard(request, env, request.method !== 'GET');
    if (g instanceof Response) return g;
    const s = g;
    const id = '([0-9a-fA-F-]{36})';
    if (path === '/api/marketplace/admin' && request.method === 'GET') return await adminOverview(env, s, request);
    if (path === '/api/marketplace/settings' && request.method === 'PUT') return await saveSettings(request, env, s);
    if (path === '/api/marketplace/requests' && request.method === 'GET') return await listRequests(env, s, url);
    let m = path.match(new RegExp(`^/api/marketplace/listings/${id}$`));
    if (m && request.method === 'PUT') return await saveListing(request, env, s, m[1]);
    m = path.match(new RegExp(`^/api/marketplace/requests/${id}$`));
    if (m && (request.method === 'PUT' || request.method === 'DELETE')) return await updateRequest(request, env, s, m[1]);
    m = path.match(new RegExp(`^/api/marketplace/requests/${id}/lead$`));
    if (m && request.method === 'POST') return await toLead(env, s, m[1]);
    return fail(404, 'API route not found.', 'NOT_FOUND');
  } catch {
    return json({ ok: false, error: 'SERVER_ERROR', message: 'The marketplace could not complete that request.' }, 500);
  }
}
