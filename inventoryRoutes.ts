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

export async function handleInventoryRoutes(request: Request, env: Env, url: URL): Promise<Response | null> {
  const path = url.pathname;
  try {
    if (path === '/api/inventory' && request.method === 'POST') return await create(request, env);
    const m = path.match(/^\/api\/inventory\/([0-9a-fA-F-]{36})$/);
    if (m && request.method === 'PUT') return await update(request, env, m[1]);
    if (m && request.method === 'DELETE') return await remove(request, env, m[1]);
  } catch {
    return fail(500, 'Unable to complete the request. Please try again.', 'INVENTORY_REQUEST_FAILED');
  }
  return null;
}
