import type { Env } from '../index';
import { resolveSession } from '../auth/session';

/**
 * Slot-based availability. A digital screen shows several advertisers in one loop,
 * so its capacity is the "advertisers per loop" number (specs.spots). A static
 * billboard, or a digital screen with no number set, has a capacity of 1.
 * A screen is available for a booking when, on EVERY day of the range, the slots
 * already booked plus the slots requested stay within the capacity.
 */

const jsonRes = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

let slotsReady = false;
export async function ensureSlotsColumn(db: D1Database): Promise<void> {
  if (slotsReady) return;
  try {
    await db.prepare('ALTER TABLE campaign_screens ADD COLUMN slots INTEGER NOT NULL DEFAULT 1').run();
  } catch {
    /* column already exists */
  }
  try {
    await db.prepare('ALTER TABLE inventory ADD COLUMN specs TEXT').run();
  } catch {
    /* column already exists */
  }
  slotsReady = true;
}

export function capacityOf(screenType: string | null | undefined, specsJson: string | null | undefined): number {
  if (screenType === 'static') return 1;
  try {
    const n = Math.floor(Number(JSON.parse(specsJson || '{}').spots));
    return Number.isFinite(n) && n >= 1 ? Math.min(n, 50) : 1;
  } catch {
    return 1;
  }
}

const dayNum = (iso: string) => Math.floor(new Date(iso.slice(0, 10) + 'T00:00:00Z').getTime() / 86400000);

export interface Booking {
  campaign_id: string;
  campaign_name: string;
  start_date: string;
  end_date: string;
  slots: number;
}

export interface ScreenAvailability {
  inventory_id: string;
  name: string;
  capacity: number;
  requested: number;
  /** slots free on the busiest day of the range */
  free: number;
  fits: boolean;
  bookings: Booking[];
}

export async function availability(
  env: Env,
  companyId: string,
  inventoryId: string,
  start: string,
  end: string,
  requested: number,
  excludeCampaignId?: string,
): Promise<ScreenAvailability | null> {
  await ensureSlotsColumn(env.DB);
  const inv = await env.DB
    .prepare('SELECT id, name, screen_type, specs FROM inventory WHERE id = ? AND company_id = ?')
    .bind(inventoryId, companyId)
    .first<{ id: string; name: string; screen_type: string | null; specs: string | null }>();
  if (!inv) return null;
  const capacity = capacityOf(inv.screen_type, inv.specs);
  const rows = await env.DB
    .prepare(
      `SELECT c.id AS campaign_id, c.name AS campaign_name, c.start_date, c.end_date, COALESCE(cs.slots, 1) AS slots
         FROM campaign_screens cs INNER JOIN campaigns c ON c.id = cs.campaign_id
        WHERE cs.inventory_id = ? AND c.company_id = ? AND c.id != ?
          AND c.status NOT IN ('cancelled','completed')
          AND c.start_date <= ? AND c.end_date >= ?`,
    )
    .bind(inventoryId, companyId, excludeCampaignId ?? '', end, start)
    .all<Booking>();
  const bookings = rows.results ?? [];
  const from = dayNum(start);
  const to = Math.min(dayNum(end), from + 800);
  let busiest = 0;
  for (let d = from; d <= to; d += 1) {
    let used = 0;
    for (const b of bookings) if (dayNum(b.start_date) <= d && dayNum(b.end_date) >= d) used += Number(b.slots) || 1;
    if (used > busiest) busiest = used;
  }
  const free = Math.max(0, capacity - busiest);
  return { inventory_id: inventoryId, name: inv.name, capacity, requested, free, fits: requested <= free, bookings };
}

export const cleanSlots = (v: unknown): number => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n >= 1 ? Math.min(n, 50) : 1;
};

const isDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

export async function handleCampaignSlots(request: Request, env: Env, url: URL): Promise<Response | null> {
  const path = url.pathname;
  const isCheck = path === '/api/campaigns/check-availability' && request.method === 'POST';
  const isCreate = path === '/api/campaigns' && request.method === 'POST';
  if (!isCheck && !isCreate) return null;
  try {
    const s = await resolveSession(request, env.DB);
    if (!s) return jsonRes({ ok: false, error: 'UNAUTHENTICATED' }, 401);
    const b = (await request.json().catch(() => ({}))) as Record<string, any>;
    await ensureSlotsColumn(env.DB);

    if (isCheck) {
      const ids: string[] = Array.isArray(b.inventory_ids) ? b.inventory_ids.map(String).slice(0, 100) : [];
      if (!ids.length || !isDate(b.start_date) || !isDate(b.end_date) || b.end_date < b.start_date) {
        return jsonRes({ ok: false, error: 'INVALID_INPUT', message: 'Missing screens or dates.' }, 400);
      }
      const want = (b.slots && typeof b.slots === 'object' ? b.slots : {}) as Record<string, unknown>;
      const screens: ScreenAvailability[] = [];
      for (const id of ids) {
        const a = await availability(env, s.companyId, id, b.start_date, b.end_date, cleanSlots(want[id]), b.exclude_campaign_id ? String(b.exclude_campaign_id) : undefined);
        if (a) screens.push(a);
      }
      // `conflicts` keeps the older shape: one row per overlapping booking of a screen that does not fit.
      const conflicts = screens.filter((x) => !x.fits).flatMap((x) => x.bookings.map((bk) => ({ inventory_id: x.inventory_id, campaign_name: bk.campaign_name, start_date: bk.start_date, end_date: bk.end_date })));
      return jsonRes({ ok: true, screens, conflicts });
    }

    // create campaign
    if (!s.permissions.includes('campaigns.manage') || s.accountType === 'client') {
      return jsonRes({ ok: false, error: 'FORBIDDEN', message: 'You do not have permission to create campaigns.' }, 403);
    }
    const name = String(b.name ?? '').trim().slice(0, 120);
    if (!name || !b.client_id) return jsonRes({ ok: false, error: 'INVALID_INPUT', message: 'Campaign name and client are required.' }, 400);
    if (!isDate(b.start_date) || !isDate(b.end_date) || b.end_date < b.start_date) {
      return jsonRes({ ok: false, error: 'INVALID_INPUT', message: 'Please enter valid start and end dates.' }, 400);
    }
    const client = await env.DB.prepare('SELECT id FROM clients WHERE id = ? AND company_id = ?').bind(String(b.client_id), s.companyId).first();
    if (!client) return jsonRes({ ok: false, error: 'INVALID_INPUT', message: 'Client not found.' }, 400);
    const screens: { inventory_id: string; rate_applied: number; slots: number }[] = (Array.isArray(b.screens) ? b.screens : [])
      .slice(0, 100)
      .map((x: any) => ({ inventory_id: String(x?.inventory_id ?? ''), rate_applied: Math.max(0, Number(x?.rate_applied) || 0), slots: cleanSlots(x?.slots) }));
    for (const sc of screens) {
      const a = await availability(env, s.companyId, sc.inventory_id, b.start_date, b.end_date, sc.slots);
      if (!a) return jsonRes({ ok: false, error: 'INVALID_INPUT', message: 'One of the screens was not found.' }, 400);
      if (!a.fits) {
        return jsonRes({ ok: false, error: 'CONFLICT', message: `${a.name}: only ${a.free} of ${a.capacity} slot${a.capacity === 1 ? '' : 's'} free in these dates.` }, 409);
      }
    }
    const status = ['draft', 'booked', 'live'].includes(b.status) ? b.status : 'draft';
    const id = crypto.randomUUID();
    await env.DB.batch([
      env.DB
        .prepare(`INSERT INTO campaigns (id, company_id, client_id, name, status, start_date, end_date, total_budget, currency, creative_url) VALUES (?,?,?,?,?,?,?,?,?,?)`)
        .bind(id, s.companyId, String(b.client_id), name, status, b.start_date, b.end_date, Math.max(0, Number(b.total_budget) || 0), String(b.currency || 'PKR').slice(0, 3).toUpperCase(), b.creative_url ? String(b.creative_url).slice(0, 500) : null),
      ...screens.map((sc) =>
        env.DB.prepare('INSERT INTO campaign_screens (id, campaign_id, inventory_id, rate_applied, slots) VALUES (?,?,?,?,?)').bind(crypto.randomUUID(), id, sc.inventory_id, sc.rate_applied, sc.slots),
      ),
    ]);
    return jsonRes({ ok: true, id });
  } catch {
    return jsonRes({ ok: false, error: 'CAMPAIGN_REQUEST_FAILED', message: 'Unable to complete the request. Please try again.' }, 500);
  }
}
