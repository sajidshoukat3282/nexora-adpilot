import type { Env } from '../index';
import { resolveSession, type SessionContext } from '../auth/session';

/**
 * Real campaign workspace: open one campaign (with screens, invoices, expenses and
 * activity), edit it, change status, delete a draft, add / remove screens and renew
 * (duplicate) it. Every query is scoped by `session.companyId`.
 */

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}
export const fail = (status: number, message: string, error = 'INVALID_INPUT') => json({ ok: false, error, message }, status);

let ready = false;
async function ensureTables(db: D1Database): Promise<void> {
  if (ready) return;
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS campaign_activities (
         id TEXT PRIMARY KEY, company_id TEXT NOT NULL, campaign_id TEXT NOT NULL,
         actor_email TEXT, action TEXT NOT NULL, detail TEXT, created_at TEXT NOT NULL)`,
    )
    .run();
  ready = true;
}

const isDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

/** Allowed next statuses. Unknown / legacy statuses may move to draft, booked or cancelled. */
export const NEXT_STATUS: Record<string, string[]> = {
  draft: ['booked', 'cancelled'],
  booked: ['live', 'draft', 'cancelled'],
  live: ['completed', 'cancelled'],
  completed: [],
  cancelled: ['draft'],
};
export const nextStatuses = (s: string): string[] => NEXT_STATUS[s] ?? ['draft', 'booked', 'cancelled'];

export async function readBody(request: Request): Promise<Record<string, any>> {
  try {
    const b = await request.json();
    return b && typeof b === 'object' ? (b as Record<string, any>) : {};
  } catch {
    return {};
  }
}

export async function guard(request: Request, env: Env, write: boolean): Promise<SessionContext | Response> {
  const s = await resolveSession(request, env.DB);
  if (!s) return json({ ok: false, error: 'UNAUTHENTICATED' }, 401);
  if (s.accountType === 'client') return fail(403, 'Not available for client accounts.', 'FORBIDDEN');
  if (write && !s.permissions.includes('campaigns.manage')) {
    return fail(403, 'You do not have permission to change campaigns.', 'FORBIDDEN');
  }
  return s;
}

export async function log(env: Env, s: SessionContext, campaignId: string, action: string, detail = ''): Promise<void> {
  try {
    await ensureTables(env.DB);
    const a = await env.DB.prepare('SELECT email FROM accounts WHERE id = ? LIMIT 1').bind(s.accountId).first<{ email: string }>();
    await env.DB
      .prepare('INSERT INTO campaign_activities (id, company_id, campaign_id, actor_email, action, detail, created_at) VALUES (?,?,?,?,?,?,?)')
      .bind(crypto.randomUUID(), s.companyId, campaignId, a?.email ?? null, action, detail.slice(0, 300), new Date().toISOString())
      .run();
  } catch {
    /* logging must never break the action */
  }
}

export async function ownCampaign(env: Env, companyId: string, id: string) {
  return env.DB
    .prepare('SELECT * FROM campaigns WHERE id = ? AND company_id = ?')
    .bind(id, companyId)
    .first<Record<string, any>>();
}

/* ---------------- read ---------------- */

async function getOne(request: Request, env: Env, id: string): Promise<Response> {
  const s = await guard(request, env, false);
  if (s instanceof Response) return s;
  await ensureTables(env.DB);
  const c = await env.DB
    .prepare(
      `SELECT c.*, cl.name AS client_name, cl.phone AS client_phone, cl.email AS client_email
         FROM campaigns c LEFT JOIN clients cl ON cl.id = c.client_id
        WHERE c.id = ? AND c.company_id = ?`,
    )
    .bind(id, s.companyId)
    .first<Record<string, any>>();
  if (!c) return fail(404, 'Campaign not found.', 'NOT_FOUND');

  const screens = await env.DB
    .prepare(
      `SELECT cs.id, cs.inventory_id, cs.rate_applied, i.name, i.city, i.screen_type, i.status, i.currency
         FROM campaign_screens cs LEFT JOIN inventory i ON i.id = cs.inventory_id
        WHERE cs.campaign_id = ?`,
    )
    .bind(id)
    .all();
  const invoices = await env.DB
    .prepare(
      `SELECT id, invoice_number, issue_date, due_date, status, total_amount, amount_paid, currency
         FROM invoices WHERE company_id = ? AND campaign_id = ? ORDER BY issue_date DESC`,
    )
    .bind(s.companyId, id)
    .all();
  const expenses = await env.DB
    .prepare(`SELECT id, category, description, amount, expense_date FROM expenses WHERE company_id = ? AND campaign_id = ? ORDER BY expense_date DESC`)
    .bind(s.companyId, id)
    .all();
  const activity = await env.DB
    .prepare('SELECT id, actor_email, action, detail, created_at FROM campaign_activities WHERE company_id = ? AND campaign_id = ? ORDER BY created_at DESC LIMIT 60')
    .bind(s.companyId, id)
    .all();

  return json({
    ok: true,
    campaign: c,
    nextStatuses: nextStatuses(String(c.status)),
    screens: screens.results,
    invoices: invoices.results,
    expenses: expenses.results,
    activity: activity.results,
  });
}

/* ---------------- write ---------------- */

async function edit(request: Request, env: Env, id: string): Promise<Response> {
  const s = await guard(request, env, true);
  if (s instanceof Response) return s;
  const c = await ownCampaign(env, s.companyId, id);
  if (!c) return fail(404, 'Campaign not found.', 'NOT_FOUND');
  const b = await readBody(request);
  const name = String(b.name ?? '').trim().slice(0, 120);
  const budget = Number(b.total_budget);
  if (!name) return fail(400, 'Campaign name is required.');
  if (!isDate(b.start_date) || !isDate(b.end_date) || b.end_date < b.start_date) return fail(400, 'Please enter valid start and end dates.');
  if (!Number.isFinite(budget) || budget < 0) return fail(400, 'Budget must be a number.');
  const currency = (String(b.currency ?? c.currency).trim().slice(0, 3) || 'PKR').toUpperCase();
  await env.DB
    .prepare('UPDATE campaigns SET name=?, start_date=?, end_date=?, total_budget=?, currency=? WHERE id=? AND company_id=?')
    .bind(name, b.start_date, b.end_date, budget, currency, id, s.companyId)
    .run();
  await log(env, s, id, 'Campaign edited', `${b.start_date} to ${b.end_date}`);
  return json({ ok: true, message: 'Campaign updated.' });
}

async function setStatus(request: Request, env: Env, id: string): Promise<Response> {
  const s = await guard(request, env, true);
  if (s instanceof Response) return s;
  const c = await ownCampaign(env, s.companyId, id);
  if (!c) return fail(404, 'Campaign not found.', 'NOT_FOUND');
  const b = await readBody(request);
  const next = String(b.status ?? '');
  if (!nextStatuses(String(c.status)).includes(next)) {
    return fail(409, `A ${c.status} campaign cannot move to ${next}.`, 'INVALID_STATE');
  }
  await env.DB.prepare('UPDATE campaigns SET status = ? WHERE id = ? AND company_id = ?').bind(next, id, s.companyId).run();
  await log(env, s, id, 'Status changed', `${c.status} to ${next}`);
  return json({ ok: true, message: `Campaign is now ${next}.`, status: next });
}

async function removeCampaign(request: Request, env: Env, id: string): Promise<Response> {
  const s = await guard(request, env, true);
  if (s instanceof Response) return s;
  const c = await ownCampaign(env, s.companyId, id);
  if (!c) return fail(404, 'Campaign not found.', 'NOT_FOUND');
  if (c.status !== 'draft') return fail(409, 'Only draft campaigns can be deleted. Cancel it instead.', 'INVALID_STATE');
  const inv = await env.DB.prepare('SELECT COUNT(*) AS n FROM invoices WHERE company_id = ? AND campaign_id = ?').bind(s.companyId, id).first<{ n: number }>();
  if ((inv?.n ?? 0) > 0) return fail(409, 'This campaign has invoices, so it cannot be deleted.', 'IN_USE');
  await env.DB.batch([
    env.DB.prepare('DELETE FROM campaign_screens WHERE campaign_id = ?').bind(id),
    env.DB.prepare('DELETE FROM campaigns WHERE id = ? AND company_id = ?').bind(id, s.companyId),
  ]);
  return json({ ok: true, message: 'Campaign deleted.' });
}

async function addScreen(request: Request, env: Env, id: string): Promise<Response> {
  const s = await guard(request, env, true);
  if (s instanceof Response) return s;
  const c = await ownCampaign(env, s.companyId, id);
  if (!c) return fail(404, 'Campaign not found.', 'NOT_FOUND');
  const b = await readBody(request);
  const inventoryId = String(b.inventory_id ?? '');
  const inv = await env.DB
    .prepare('SELECT id, name, rate FROM inventory WHERE id = ? AND company_id = ?')
    .bind(inventoryId, s.companyId)
    .first<{ id: string; name: string; rate: number }>();
  if (!inv) return fail(404, 'Screen not found.', 'NOT_FOUND');
  const dup = await env.DB.prepare('SELECT id FROM campaign_screens WHERE campaign_id = ? AND inventory_id = ?').bind(id, inventoryId).first();
  if (dup) return fail(409, 'This screen is already in the campaign.', 'DUPLICATE');

  if (!b.force) {
    const conflicts = await env.DB
      .prepare(
        `SELECT c2.name AS campaign_name, c2.start_date, c2.end_date
           FROM campaign_screens cs INNER JOIN campaigns c2 ON c2.id = cs.campaign_id
          WHERE cs.inventory_id = ? AND c2.company_id = ? AND c2.id != ?
            AND c2.status NOT IN ('cancelled','completed')
            AND c2.start_date <= ? AND c2.end_date >= ?`,
      )
      .bind(inventoryId, s.companyId, id, c.end_date, c.start_date)
      .all();
    if (conflicts.results.length > 0) {
      return json({ ok: false, error: 'CONFLICT', message: 'This screen is already booked in these dates.', conflicts: conflicts.results }, 409);
    }
  }
  const rate = Number.isFinite(Number(b.rate_applied)) && Number(b.rate_applied) >= 0 ? Number(b.rate_applied) : inv.rate || 0;
  await env.DB
    .prepare('INSERT INTO campaign_screens (id, campaign_id, inventory_id, rate_applied) VALUES (?,?,?,?)')
    .bind(crypto.randomUUID(), id, inventoryId, rate)
    .run();
  await log(env, s, id, 'Screen added', inv.name);
  return json({ ok: true, message: `${inv.name} added to the campaign.` });
}

async function removeScreen(request: Request, env: Env, id: string, csId: string): Promise<Response> {
  const s = await guard(request, env, true);
  if (s instanceof Response) return s;
  const c = await ownCampaign(env, s.companyId, id);
  if (!c) return fail(404, 'Campaign not found.', 'NOT_FOUND');
  const row = await env.DB
    .prepare('SELECT i.name FROM campaign_screens cs LEFT JOIN inventory i ON i.id = cs.inventory_id WHERE cs.id = ? AND cs.campaign_id = ?')
    .bind(csId, id)
    .first<{ name: string }>();
  if (!row) return fail(404, 'Screen not found in this campaign.', 'NOT_FOUND');
  await env.DB.prepare('DELETE FROM campaign_screens WHERE id = ? AND campaign_id = ?').bind(csId, id).run();
  await log(env, s, id, 'Screen removed', row.name ?? '');
  return json({ ok: true, message: 'Screen removed.' });
}

async function duplicate(request: Request, env: Env, id: string): Promise<Response> {
  const s = await guard(request, env, true);
  if (s instanceof Response) return s;
  const c = await ownCampaign(env, s.companyId, id);
  if (!c) return fail(404, 'Campaign not found.', 'NOT_FOUND');
  const b = await readBody(request);
  if (!isDate(b.start_date) || !isDate(b.end_date) || b.end_date < b.start_date) return fail(400, 'Please enter valid start and end dates.');
  const name = String(b.name ?? '').trim().slice(0, 120) || `${c.name} (Renewal)`;
  const newId = crypto.randomUUID();
  const screens = await env.DB.prepare('SELECT inventory_id, rate_applied FROM campaign_screens WHERE campaign_id = ?').bind(id).all<{ inventory_id: string; rate_applied: number }>();
  const stmts = [
    env.DB
      .prepare(`INSERT INTO campaigns (id, company_id, client_id, name, status, start_date, end_date, total_budget, currency, creative_url) VALUES (?,?,?,?,'draft',?,?,?,?,?)`)
      .bind(newId, s.companyId, c.client_id, name, b.start_date, b.end_date, c.total_budget || 0, c.currency || 'PKR', c.creative_url ?? null),
    ...screens.results.map((r) =>
      env.DB.prepare('INSERT INTO campaign_screens (id, campaign_id, inventory_id, rate_applied) VALUES (?,?,?,?)').bind(crypto.randomUUID(), newId, r.inventory_id, r.rate_applied),
    ),
  ];
  await env.DB.batch(stmts);
  await log(env, s, newId, 'Created as a renewal', `copied from ${c.name}`);
  await log(env, s, id, 'Renewed', `new campaign ${name}`);
  return json({ ok: true, id: newId, message: 'Renewal campaign created as a draft.' });
}

/* ---------------- router ---------------- */

export async function handleCampaignRoutes(request: Request, env: Env, url: URL): Promise<Response | null> {
  const path = url.pathname;
  if (!path.startsWith('/api/campaigns/')) return null;
  const id = '([0-9a-fA-F-]{36})';
  try {
    let m = path.match(new RegExp(`^/api/campaigns/${id}$`));
    if (m) {
      if (request.method === 'GET') return await getOne(request, env, m[1]);
      if (request.method === 'PUT') return await edit(request, env, m[1]);
      if (request.method === 'DELETE') return await removeCampaign(request, env, m[1]);
    }
    m = path.match(new RegExp(`^/api/campaigns/${id}/status$`));
    if (m && request.method === 'PUT') return await setStatus(request, env, m[1]);
    m = path.match(new RegExp(`^/api/campaigns/${id}/screens$`));
    if (m && request.method === 'POST') return await addScreen(request, env, m[1]);
    m = path.match(new RegExp(`^/api/campaigns/${id}/screens/${id}$`));
    if (m && request.method === 'DELETE') return await removeScreen(request, env, m[1], m[2]);
    m = path.match(new RegExp(`^/api/campaigns/${id}/duplicate$`));
    if (m && request.method === 'POST') return await duplicate(request, env, m[1]);
  } catch {
    return fail(500, 'Unable to complete the request. Please try again.', 'CAMPAIGN_REQUEST_FAILED');
  }
  return null;
}
