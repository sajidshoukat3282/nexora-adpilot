import type { Env } from '../index';
import { resolveSession, type SessionContext } from '../auth/session';
import { logAudit } from '../admin/adminRoutes';

/**
 * Inventory create / edit / delete with a flexible `specs` JSON column that holds
 * the type-specific details (digital screen resolution, slots, device; static
 * billboard faces, lighting, permit; owner / rent). The column is added on first use.
 */

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}
const fail = (status: number, message: string, error = 'INVALID_INPUT') => json({ ok: false, error, message }, status);

let specsReady = false;
async function ensureSpecsColumn(db: D1Database): Promise<void> {
  if (specsReady) return;
  try {
    await db.prepare('ALTER TABLE inventory ADD COLUMN specs TEXT').run();
  } catch {
    /* column already exists */
  }
  specsReady = true;
}

/** Keep only flat primitive values, so the stored JSON stays small and safe. */
export function cleanSpecs(input: unknown): string | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const out: Record<string, string | number | boolean> = {};
  let n = 0;
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (n >= 40) break;
    if (!/^[a-z0-9_]{1,40}$/i.test(k)) continue;
    if (typeof v === 'string') out[k] = v.trim().slice(0, 300);
    else if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
    else if (typeof v === 'boolean') out[k] = v;
    else continue;
    n += 1;
  }
  const text = JSON.stringify(out);
  return text === '{}' ? null : text.slice(0, 6000);
}

async function guard(request: Request, env: Env): Promise<SessionContext | Response> {
  const session = await resolveSession(request, env.DB);
  if (!session) return json({ ok: false, error: 'UNAUTHENTICATED' }, 401);
  if (session.accountType === 'client' || !session.permissions.includes('inventory.manage')) {
    return fail(403, 'You do not have permission to change inventory.', 'FORBIDDEN');
  }
  return session;
}

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const str = (v: unknown, max = 200): string | null => {
  const s = String(v ?? '').trim().slice(0, max);
  return s ? s : null;
};

async function readBody(request: Request): Promise<Record<string, any>> {
  try {
    const b = await request.json();
    return b && typeof b === 'object' ? (b as Record<string, any>) : {};
  } catch {
    return {};
  }
}

function fields(b: Record<string, any>) {
  const type = b.screen_type === 'static' ? 'static' : 'digital';
  const status = ['online', 'offline', 'maintenance'].includes(b.status) ? b.status : 'online';
  return {
    name: str(b.name, 120),
    screen_type: type,
    city: str(b.city, 80),
    location: str(b.location, 300),
    latitude: num(b.latitude),
    longitude: num(b.longitude),
    geography_id: str(b.geography_id, 80),
    size: str(b.size, 60),
    rate: Math.max(0, num(b.rate) ?? 0),
    currency: (str(b.currency, 3) || 'PKR').toUpperCase(),
    status,
    specs: cleanSpecs(b.specs),
  };
}

async function create(request: Request, env: Env): Promise<Response> {
  const s = await guard(request, env);
  if (s instanceof Response) return s;
  const f = fields(await readBody(request));
  if (!f.name) return fail(400, 'Screen name is required.');
  await ensureSpecsColumn(env.DB);
  const id = crypto.randomUUID();
  await env.DB
    .prepare(
      `INSERT INTO inventory (id, company_id, name, screen_type, city, location, latitude, longitude, geography_id, size, rate, currency, status, specs)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    )
    .bind(id, s.companyId, f.name, f.screen_type, f.city, f.location, f.latitude, f.longitude, f.geography_id, f.size, f.rate, f.currency, f.status, f.specs)
    .run();
  return json({ ok: true, id });
}

async function update(request: Request, env: Env, id: string): Promise<Response> {
  const s = await guard(request, env);
  if (s instanceof Response) return s;
  const f = fields(await readBody(request));
  if (!f.name) return fail(400, 'Screen name is required.');
  await ensureSpecsColumn(env.DB);
  const res = await env.DB
    .prepare(
      `UPDATE inventory SET name=?, screen_type=?, city=?, location=?, latitude=?, longitude=?, size=?, rate=?, currency=?, status=?, specs=?
        WHERE id=? AND company_id=?`,
    )
    .bind(f.name, f.screen_type, f.city, f.location, f.latitude, f.longitude, f.size, f.rate, f.currency, f.status, f.specs, id, s.companyId)
    .run();
  if (!res.meta?.changes) return fail(404, 'Screen not found.', 'NOT_FOUND');
  return json({ ok: true, message: 'Screen updated.' });
}

async function remove(request: Request, env: Env, id: string): Promise<Response> {
  const s = await guard(request, env);
  if (s instanceof Response) return s;
  const used = await env.DB
    .prepare(
      `SELECT COUNT(*) AS n FROM campaign_screens cs INNER JOIN campaigns c ON c.id = cs.campaign_id
        WHERE cs.inventory_id = ? AND c.company_id = ?`,
    )
    .bind(id, s.companyId)
    .first<{ n: number }>();
  if ((used?.n ?? 0) > 0) {
    return fail(409, 'This screen is used in campaigns, so it cannot be deleted. Set its status to Offline instead.', 'IN_USE');
  }
  const res = await env.DB.prepare('DELETE FROM inventory WHERE id = ? AND company_id = ?').bind(id, s.companyId).run();
  if (!res.meta?.changes) return fail(404, 'Screen not found.', 'NOT_FOUND');
  await logAudit(env, s.companyId, s.accountId, 'Screen deleted', id.slice(0, 8));
  return json({ ok: true, message: 'Screen deleted.' });
}

/* ---------------- suggested screens ---------------- */

const dnum = (iso: string) => Math.floor(new Date(String(iso).slice(0, 10) + 'T00:00:00Z').getTime() / 86400000);
const isoOfDay = (n: number) => new Date(n * 86400000).toISOString().slice(0, 10);
const isDay = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

/**
 * Ranks the company's online screens for a campaign: free for the dates (needs the slots asked),
 * in the wanted city, busy in the last 90 days (a sign of a good location), and a fit for the budget.
 * Then picks the best few that stay inside the budget. Staff only.
 */
async function suggest(request: Request, env: Env, url: URL): Promise<Response> {
  const session = await resolveSession(request, env.DB);
  if (!session) return json({ ok: false, error: 'UNAUTHENTICATED' }, 401);
  if (session.accountType === 'client') return fail(403, 'You do not have permission to see this.', 'FORBIDDEN');
  const cid = session.companyId;
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  if (!isDay(from) || !isDay(to)) return fail(400, 'Choose the start and end dates of the campaign.');
  if (to < from) return fail(400, 'The end date must be on or after the start date.');
  const len = dnum(to) - dnum(from) + 1;
  if (len > 366) return fail(400, 'Please choose a period of one year or less.');
  const city = (url.searchParams.get('city') || '').trim().toLowerCase();
  const kind = url.searchParams.get('type') === 'static' ? 'static' : url.searchParams.get('type') === 'digital' ? 'digital' : '';
  const budget = Math.max(0, Number(url.searchParams.get('budget')) || 0);
  const want = Math.max(1, Math.min(30, Math.floor(Number(url.searchParams.get('screens')) || 5)));
  const slots = Math.max(1, Math.min(50, Math.floor(Number(url.searchParams.get('slots')) || 1)));

  const safe = async <T,>(sql: string, ...b: unknown[]): Promise<T[]> => {
    try { const r = await env.DB.prepare(sql).bind(...b).all<T>(); return (r.results ?? []) as T[]; } catch { return []; }
  };
  const inv = await safe<any>(`SELECT id, name, screen_type, city, location, specs, status, rate, currency FROM inventory WHERE company_id=? AND status='online'`, cid);
  const todayN = dnum(new Date().toISOString().slice(0, 10));
  const histFrom = isoOfDay(todayN - 90);
  const histTo = isoOfDay(todayN - 1);
  const lo = histFrom < from ? histFrom : from;
  const hi = histTo > to ? histTo : to;
  const bookings = await safe<any>(`SELECT cs.inventory_id, COALESCE(cs.slots,1) slots, c.start_date, c.end_date
      FROM campaign_screens cs INNER JOIN campaigns c ON c.id=cs.campaign_id
     WHERE c.company_id=? AND c.status NOT IN ('cancelled') AND c.start_date <= ? AND c.end_date >= ?`, cid, hi, lo);

  const capOf = (t: string, specs: string | null) => {
    if (t === 'static') return 1;
    try { const n = Math.floor(Number(JSON.parse(specs || '{}').spots)); return Number.isFinite(n) && n >= 1 ? Math.min(n, 50) : 1; } catch { return 1; }
  };
  const byInv = new Map<string, any[]>();
  for (const b of bookings) { const a = byInv.get(b.inventory_id) ?? []; a.push(b); byInv.set(b.inventory_id, a); }

  const rows: any[] = [];
  for (const x of inv) {
    if (kind && x.screen_type !== kind) continue;
    const cap = capOf(x.screen_type, x.specs);
    if (cap < slots) continue;
    const mine = byInv.get(x.id) ?? [];
    const bookedOn = (n: number) => mine.reduce((a, b) => a + (dnum(b.start_date) <= n && dnum(b.end_date) >= n ? b.slots : 0), 0);
    let freeDays = 0;
    for (let n = dnum(from); n <= dnum(to); n += 1) if (cap - bookedOn(n) >= slots) freeDays += 1;
    let hist = 0;
    for (let n = todayN - 90; n < todayN; n += 1) hist += Math.min(cap, bookedOn(n));
    const demand = hist / (cap * 90);
    const rate = Number(x.rate) || 0;
    const cost = rate * slots * len;
    const cityMatch = !city || String(x.city || '').toLowerCase() === city;
    const freeShare = freeDays / len;
    const share = budget > 0 ? budget / want : 0;
    const fitScore = budget > 0 && cost > 0 ? Math.min(1, share / cost) : 1;
    const score = Math.round(100 * (0.4 * freeShare + 0.25 * (cityMatch ? 1 : 0) + 0.2 * Math.min(1, demand) + 0.15 * fitScore));
    const reasons: string[] = [];
    reasons.push(freeDays === len ? `Free for all ${len} day(s)` : `Free ${freeDays} of ${len} day(s)`);
    if (city) reasons.push(cityMatch ? `In ${x.city}` : `Not in ${url.searchParams.get('city')}`);
    reasons.push(demand >= 0.6 ? `Busy: ${Math.round(demand * 100)}% booked in the last 90 days` : demand > 0 ? `${Math.round(demand * 100)}% booked in the last 90 days` : 'No bookings in the last 90 days');
    if (budget > 0) reasons.push(cost <= share ? 'Fits the budget per screen' : 'Above the budget per screen');
    if (rate <= 0) reasons.push('No rate set');
    rows.push({ id: x.id, name: x.name, city: x.city ?? '-', location: x.location ?? '', type: x.screen_type === 'static' ? 'Static' : 'Digital', rate, currency: x.currency || 'PKR', cost: Math.round(cost), free_days: freeDays, days: len, city_match: cityMatch, demand: Math.round(demand * 100), score, reasons, ready: freeDays === len && cityMatch });
  }
  rows.sort((a, b) => b.score - a.score || a.cost - b.cost);

  // pick: fully free and in the wanted city, best score first, inside the budget
  const pick: string[] = [];
  let total = 0;
  for (const r of rows) {
    if (pick.length >= want) break;
    if (!r.ready) continue;
    if (budget > 0 && total + r.cost > budget) continue;
    pick.push(r.id);
    total += r.cost;
  }
  return json({ ok: true, period: { from, to, days: len }, want, slots, budget, pick, pick_total: total, rows: rows.slice(0, 40), screens_checked: inv.length });
}

export async function handleInventoryRoutes(request: Request, env: Env, url: URL): Promise<Response | null> {
  const path = url.pathname;
  try {
    if (path === '/api/inventory/suggest' && request.method === 'GET') return await suggest(request, env, url);
    if (path === '/api/inventory' && request.method === 'POST') return await create(request, env);
    const m = path.match(/^\/api\/inventory\/([0-9a-fA-F-]{36})$/);
    if (m && request.method === 'PUT') return await update(request, env, m[1]);
    if (m && request.method === 'DELETE') return await remove(request, env, m[1]);
  } catch {
    return fail(500, 'Unable to complete the request. Please try again.', 'INVENTORY_REQUEST_FAILED');
  }
  return null;
}
