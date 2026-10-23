import type { Env } from '../index';
import { creditCheck, logCreditEvent } from '../credit/creditRoutes';
import { resolveSession, type SessionContext } from '../auth/session';
import { availability, cleanSlots, ensureSlotsColumn } from '../campaigns/campaignSlots';
import { log as logCampaign } from '../campaigns/campaignRoutes';

/**
 * Real proposals: create / edit / send / accept / reject, revise (duplicate) and
 * convert an accepted proposal into a campaign (client, dates, screens and slots).
 * Tables are created on first use. Every query is scoped by `session.companyId`.
 */

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
const fail = (status: number, message: string, error = 'INVALID_INPUT') => json({ ok: false, error, message }, status);

const isDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const dayNum = (iso: string) => Math.floor(new Date(iso.slice(0, 10) + 'T00:00:00Z').getTime() / 86400000);
const days = (s: string, e: string) => Math.max(1, dayNum(e) - dayNum(s) + 1);
const r2 = (n: unknown) => Math.round((Number(n) || 0) * 100) / 100;
const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();
const str = (v: unknown, max: number): string | null => {
  const s = String(v ?? '').trim().slice(0, max);
  return s ? s : null;
};

let ready = false;
async function ensure(db: D1Database): Promise<void> {
  if (ready) return;
  await db.prepare(`CREATE TABLE IF NOT EXISTS proposals (
    id TEXT PRIMARY KEY, company_id TEXT NOT NULL, code TEXT NOT NULL, client_id TEXT NOT NULL,
    campaign_name TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'draft', start_date TEXT NOT NULL, end_date TEXT NOT NULL,
    discount_pct REAL NOT NULL DEFAULT 0, tax_rate REAL NOT NULL DEFAULT 0, valid_until TEXT, currency TEXT NOT NULL DEFAULT 'PKR',
    terms TEXT, notes TEXT, campaign_id TEXT, revision_of TEXT, sent_at TEXT, decided_at TEXT, created_by TEXT,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`).run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS proposal_items (
    id TEXT PRIMARY KEY, proposal_id TEXT NOT NULL, inventory_id TEXT NOT NULL, description TEXT,
    slots INTEGER NOT NULL DEFAULT 1, rate REAL NOT NULL DEFAULT 0, days INTEGER NOT NULL DEFAULT 1)`).run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS proposal_activity (
    id TEXT PRIMARY KEY, company_id TEXT NOT NULL, proposal_id TEXT NOT NULL, actor_email TEXT, action TEXT NOT NULL, detail TEXT, created_at TEXT NOT NULL)`).run();
  ready = true;
}

export const NEXT: Record<string, string[]> = {
  draft: ['sent'],
  sent: ['accepted', 'rejected', 'draft'],
  accepted: [],
  rejected: ['draft'],
  expired: ['draft'],
};

async function guard(request: Request, env: Env): Promise<SessionContext | Response> {
  const s = await resolveSession(request, env.DB);
  if (!s) return json({ ok: false, error: 'UNAUTHENTICATED' }, 401);
  if (s.accountType === 'client' || !s.permissions.includes('proposals.manage')) return fail(403, 'You do not have permission to manage proposals.', 'FORBIDDEN');
  return s;
}

async function rows<T = any>(env: Env, sql: string, ...b: unknown[]): Promise<T[]> {
  return ((await env.DB.prepare(sql).bind(...b).all<T>()).results ?? []) as T[];
}
async function one<T = any>(env: Env, sql: string, ...b: unknown[]): Promise<T | null> {
  return (await env.DB.prepare(sql).bind(...b).first<T>()) ?? null;
}

export function totals(items: { rate: number; slots: number; days: number }[], discountPct: number, taxRate: number) {
  const subtotal = r2(items.reduce((a, i) => a + (Number(i.rate) || 0) * (Number(i.slots) || 1) * (Number(i.days) || 1), 0));
  const discount = r2(subtotal * (Math.min(100, Math.max(0, discountPct)) / 100));
  const taxable = subtotal - discount;
  const tax = r2(taxable * (Math.min(100, Math.max(0, taxRate)) / 100));
  return { subtotal, discount, tax, total: r2(taxable + tax) };
}

async function activity(env: Env, s: SessionContext, id: string, action: string, detail = '') {
  try {
    const a = await one<{ email: string }>(env, 'SELECT email FROM accounts WHERE id=? LIMIT 1', s.accountId);
    await env.DB.prepare('INSERT INTO proposal_activity (id, company_id, proposal_id, actor_email, action, detail, created_at) VALUES (?,?,?,?,?,?,?)')
      .bind(crypto.randomUUID(), s.companyId, id, a?.email ?? null, action, detail.slice(0, 300), now()).run();
  } catch { /* never break the action */ }
}

/** A sent proposal past its valid-until date becomes expired. */
async function expireOld(env: Env, companyId: string) {
  await env.DB.prepare(`UPDATE proposals SET status='expired', updated_at=? WHERE company_id=? AND status='sent' AND valid_until IS NOT NULL AND valid_until < ?`)
    .bind(now(), companyId, today()).run();
}

async function nextCode(env: Env, companyId: string): Promise<string> {
  const r = await rows<{ code: string }>(env, 'SELECT code FROM proposals WHERE company_id=?', companyId);
  let max = 0;
  for (const x of r) {
    const n = Number(String(x.code).replace(/\D/g, ''));
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `PRO-${String(max + 1).padStart(4, '0')}`;
}

interface Parsed {
  client_id: string; campaign_name: string; start_date: string; end_date: string; discount_pct: number; tax_rate: number;
  valid_until: string | null; currency: string; terms: string | null; notes: string | null;
  items: { inventory_id: string; description: string | null; slots: number; rate: number; days: number }[];
}

async function parse(env: Env, s: SessionContext, b: Record<string, any>): Promise<Parsed | Response> {
  const campaign_name = str(b.campaign_name, 120);
  if (!campaign_name) return fail(400, 'Campaign name is required.');
  if (!b.client_id) return fail(400, 'Please choose a client.');
  const client = await one(env, 'SELECT id FROM clients WHERE id=? AND company_id=?', String(b.client_id), s.companyId);
  if (!client) return fail(400, 'Client not found.');
  if (!isDate(b.start_date) || !isDate(b.end_date) || b.end_date < b.start_date) return fail(400, 'Please enter valid start and end dates.');
  if (b.valid_until && !isDate(b.valid_until)) return fail(400, 'The valid-until date is not valid.');
  const raw = Array.isArray(b.items) ? b.items.slice(0, 100) : [];
  if (raw.length === 0) return fail(400, 'Add at least one screen to the proposal.');
  const items: Parsed['items'] = [];
  const seen = new Set<string>();
  for (const x of raw) {
    const inv = await one<{ id: string; name: string; city: string | null }>(env, 'SELECT id, name, city FROM inventory WHERE id=? AND company_id=?', String(x?.inventory_id ?? ''), s.companyId);
    if (!inv) return fail(400, 'One of the screens was not found.');
    if (seen.has(inv.id)) return fail(400, `${inv.name} is added twice.`);
    seen.add(inv.id);
    items.push({
      inventory_id: inv.id,
      description: `${inv.name}${inv.city ? `, ${inv.city}` : ''}`,
      slots: cleanSlots(x.slots),
      rate: Math.max(0, Number(x.rate) || 0),
      days: Math.max(1, Math.min(3650, Math.floor(Number(x.days)) || days(b.start_date, b.end_date))),
    });
  }
  return {
    client_id: String(b.client_id), campaign_name, start_date: b.start_date, end_date: b.end_date,
    discount_pct: Math.min(100, Math.max(0, Number(b.discount_pct) || 0)), tax_rate: Math.min(100, Math.max(0, Number(b.tax_rate) || 0)),
    valid_until: b.valid_until ? String(b.valid_until) : null, currency: String(b.currency || 'PKR').slice(0, 3).toUpperCase(),
    terms: str(b.terms, 2000), notes: str(b.notes, 1000), items,
  };
}

async function withItems(env: Env, p: any) {
  const items = await rows(env, `SELECT pi.id, pi.inventory_id, pi.description, pi.slots, pi.rate, pi.days, i.name, i.city, i.screen_type
      FROM proposal_items pi LEFT JOIN inventory i ON i.id = pi.inventory_id WHERE pi.proposal_id=?`, p.id);
  const t = totals(items as any, p.discount_pct, p.tax_rate);
  return { items, ...t };
}

async function list(request: Request, env: Env): Promise<Response> {
  const s = await guard(request, env);
  if (s instanceof Response) return s;
  await ensure(env.DB);
  await expireOld(env, s.companyId);
  const ps = await rows(env, `SELECT p.*, c.name AS client_name FROM proposals p LEFT JOIN clients c ON c.id=p.client_id WHERE p.company_id=? ORDER BY p.created_at DESC LIMIT 500`, s.companyId);
  const its = await rows<any>(env, `SELECT pi.proposal_id, pi.rate, pi.slots, pi.days FROM proposal_items pi INNER JOIN proposals p ON p.id=pi.proposal_id WHERE p.company_id=?`, s.companyId);
  const out = ps.map((p: any) => {
    const mine = its.filter((i) => i.proposal_id === p.id);
    return { ...p, screens: mine.length, ...totals(mine, p.discount_pct, p.tax_rate) };
  });
  return json({ ok: true, proposals: out });
}

async function getOne(request: Request, env: Env, id: string): Promise<Response> {
  const s = await guard(request, env);
  if (s instanceof Response) return s;
  await ensure(env.DB);
  await expireOld(env, s.companyId);
  const p = await one<any>(env, `SELECT p.*, c.name AS client_name, c.email AS client_email, c.phone AS client_phone FROM proposals p LEFT JOIN clients c ON c.id=p.client_id WHERE p.id=? AND p.company_id=?`, id, s.companyId);
  if (!p) return fail(404, 'Proposal not found.', 'NOT_FOUND');
  const detail = await withItems(env, p);
  const act = await rows(env, 'SELECT id, actor_email, action, detail, created_at FROM proposal_activity WHERE company_id=? AND proposal_id=? ORDER BY created_at DESC LIMIT 60', s.companyId, id);
  const campaign = p.campaign_id ? await one(env, 'SELECT id, name FROM campaigns WHERE id=? AND company_id=?', p.campaign_id, s.companyId) : null;
  return json({ ok: true, proposal: p, ...detail, nextStatuses: NEXT[p.status] ?? [], activity: act, campaign });
}

async function insertItems(env: Env, id: string, items: Parsed['items']) {
  return items.map((i) =>
    env.DB.prepare('INSERT INTO proposal_items (id, proposal_id, inventory_id, description, slots, rate, days) VALUES (?,?,?,?,?,?,?)').bind(crypto.randomUUID(), id, i.inventory_id, i.description, i.slots, i.rate, i.days),
  );
}

async function create(request: Request, env: Env): Promise<Response> {
  const s = await guard(request, env);
  if (s instanceof Response) return s;
  await ensure(env.DB);
  const p = await parse(env, s, (await request.json().catch(() => ({}))) as Record<string, any>);
  if (p instanceof Response) return p;
  const id = crypto.randomUUID();
  const code = await nextCode(env, s.companyId);
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO proposals (id, company_id, code, client_id, campaign_name, status, start_date, end_date, discount_pct, tax_rate, valid_until, currency, terms, notes, created_by, created_at, updated_at)
      VALUES (?,?,?,?,?,'draft',?,?,?,?,?,?,?,?,?,?,?)`).bind(id, s.companyId, code, p.client_id, p.campaign_name, p.start_date, p.end_date, p.discount_pct, p.tax_rate, p.valid_until, p.currency, p.terms, p.notes, s.accountId, now(), now()),
    ...(await insertItems(env, id, p.items)),
  ]);
  await activity(env, s, id, 'Proposal created', code);
  return json({ ok: true, id, code });
}

async function edit(request: Request, env: Env, id: string): Promise<Response> {
  const s = await guard(request, env);
  if (s instanceof Response) return s;
  await ensure(env.DB);
  const cur = await one<any>(env, 'SELECT status FROM proposals WHERE id=? AND company_id=?', id, s.companyId);
  if (!cur) return fail(404, 'Proposal not found.', 'NOT_FOUND');
  if (cur.status !== 'draft') return fail(409, 'Only draft proposals can be edited. Use Revise to make a changed copy.', 'INVALID_STATE');
  const p = await parse(env, s, (await request.json().catch(() => ({}))) as Record<string, any>);
  if (p instanceof Response) return p;
  await env.DB.batch([
    env.DB.prepare(`UPDATE proposals SET client_id=?, campaign_name=?, start_date=?, end_date=?, discount_pct=?, tax_rate=?, valid_until=?, currency=?, terms=?, notes=?, updated_at=? WHERE id=? AND company_id=?`)
      .bind(p.client_id, p.campaign_name, p.start_date, p.end_date, p.discount_pct, p.tax_rate, p.valid_until, p.currency, p.terms, p.notes, now(), id, s.companyId),
    env.DB.prepare('DELETE FROM proposal_items WHERE proposal_id=?').bind(id),
    ...(await insertItems(env, id, p.items)),
  ]);
  await activity(env, s, id, 'Proposal edited');
  return json({ ok: true });
}

async function setStatus(request: Request, env: Env, id: string): Promise<Response> {
  const s = await guard(request, env);
  if (s instanceof Response) return s;
  await ensure(env.DB);
  const p = await one<any>(env, 'SELECT status, valid_until FROM proposals WHERE id=? AND company_id=?', id, s.companyId);
  if (!p) return fail(404, 'Proposal not found.', 'NOT_FOUND');
  const b = (await request.json().catch(() => ({}))) as Record<string, any>;
  const to = String(b.status ?? '');
  if (!(NEXT[p.status] ?? []).includes(to)) return fail(409, `A ${p.status} proposal cannot move to ${to}.`, 'INVALID_STATE');
  if (to === 'sent') {
    const n = await one<{ n: number }>(env, 'SELECT COUNT(*) n FROM proposal_items WHERE proposal_id=?', id);
    if (!n?.n) return fail(409, 'Add at least one screen before sending.', 'INVALID_STATE');
  }
  const sentAt = to === 'sent' ? now() : null;
  const decided = to === 'accepted' || to === 'rejected' ? now() : null;
  await env.DB.prepare('UPDATE proposals SET status=?, sent_at=COALESCE(?, sent_at), decided_at=?, updated_at=? WHERE id=? AND company_id=?')
    .bind(to, sentAt, decided, now(), id, s.companyId).run();
  await activity(env, s, id, `Marked ${to}`);
  return json({ ok: true, message: `Proposal marked ${to}.` });
}

async function remove(request: Request, env: Env, id: string): Promise<Response> {
  const s = await guard(request, env);
  if (s instanceof Response) return s;
  await ensure(env.DB);
  const p = await one<any>(env, 'SELECT status FROM proposals WHERE id=? AND company_id=?', id, s.companyId);
  if (!p) return fail(404, 'Proposal not found.', 'NOT_FOUND');
  if (p.status !== 'draft') return fail(409, 'Only draft proposals can be deleted.', 'INVALID_STATE');
  await env.DB.batch([
    env.DB.prepare('DELETE FROM proposal_items WHERE proposal_id=?').bind(id),
    env.DB.prepare('DELETE FROM proposal_activity WHERE proposal_id=? AND company_id=?').bind(id, s.companyId),
    env.DB.prepare('DELETE FROM proposals WHERE id=? AND company_id=?').bind(id, s.companyId),
  ]);
  return json({ ok: true });
}

async function revise(request: Request, env: Env, id: string): Promise<Response> {
  const s = await guard(request, env);
  if (s instanceof Response) return s;
  await ensure(env.DB);
  const p = await one<any>(env, 'SELECT * FROM proposals WHERE id=? AND company_id=?', id, s.companyId);
  if (!p) return fail(404, 'Proposal not found.', 'NOT_FOUND');
  const items = await rows<any>(env, 'SELECT inventory_id, description, slots, rate, days FROM proposal_items WHERE proposal_id=?', id);
  const nid = crypto.randomUUID();
  const code = await nextCode(env, s.companyId);
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO proposals (id, company_id, code, client_id, campaign_name, status, start_date, end_date, discount_pct, tax_rate, valid_until, currency, terms, notes, revision_of, created_by, created_at, updated_at)
      VALUES (?,?,?,?,?,'draft',?,?,?,?,NULL,?,?,?,?,?,?,?)`).bind(nid, s.companyId, code, p.client_id, `${p.campaign_name} (Revised)`.slice(0, 120), p.start_date, p.end_date, p.discount_pct, p.tax_rate, p.currency, p.terms, p.notes, id, s.accountId, now(), now()),
    ...items.map((i) => env.DB.prepare('INSERT INTO proposal_items (id, proposal_id, inventory_id, description, slots, rate, days) VALUES (?,?,?,?,?,?,?)').bind(crypto.randomUUID(), nid, i.inventory_id, i.description, i.slots, i.rate, i.days)),
  ]);
  await activity(env, s, nid, 'Created as a revision', `copied from ${p.code}`);
  await activity(env, s, id, 'Revised', `new proposal ${code}`);
  return json({ ok: true, id: nid, code });
}

async function convert(request: Request, env: Env, id: string): Promise<Response> {
  const s = await guard(request, env);
  if (s instanceof Response) return s;
  if (!s.permissions.includes('campaigns.manage')) return fail(403, 'You also need permission to manage campaigns.', 'FORBIDDEN');
  await ensure(env.DB);
  await ensureSlotsColumn(env.DB);
  const p = await one<any>(env, 'SELECT * FROM proposals WHERE id=? AND company_id=?', id, s.companyId);
  if (!p) return fail(404, 'Proposal not found.', 'NOT_FOUND');
  if (p.status !== 'accepted') return fail(409, 'Only an accepted proposal can be converted to a campaign.', 'INVALID_STATE');
  if (p.campaign_id) return fail(409, 'This proposal was already converted to a campaign.', 'INVALID_STATE');
  const b = (await request.json().catch(() => ({}))) as Record<string, any>;
  const items = await rows<any>(env, 'SELECT inventory_id, slots, rate FROM proposal_items WHERE proposal_id=?', id);
  // The accepted proposal is already counted in the client's exposure, so nothing extra is added here.
  const cv = await creditCheck(env, s.companyId, p.client_id, 0);
  if (cv.blocked) {
    if (!(b.credit_override && s.permissions.includes('finance.manage'))) {
      return json({ ok: false, error: 'CREDIT_LIMIT', message: cv.message, can_override: s.permissions.includes('finance.manage') }, 409);
    }
    await logCreditEvent(env, s, p.client_id, 'exception', cv.limit, cv.limit, `Converted ${p.code} over limit`);
  }
  if (!b.force) {
    const bad: string[] = [];
    for (const i of items) {
      const a = await availability(env, s.companyId, i.inventory_id, p.start_date, p.end_date, cleanSlots(i.slots));
      if (a && !a.fits) bad.push(`${a.name}: only ${a.free} of ${a.capacity} slot${a.capacity === 1 ? '' : 's'} free`);
    }
    if (bad.length) return json({ ok: false, error: 'CONFLICT', message: `Some screens are not free in these dates. ${bad.join('; ')}.`, conflicts: bad }, 409);
  }
  const t = totals(await rows<any>(env, 'SELECT rate, slots, days FROM proposal_items WHERE proposal_id=?', id), p.discount_pct, p.tax_rate);
  const cid = crypto.randomUUID();
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO campaigns (id, company_id, client_id, name, status, start_date, end_date, total_budget, currency, creative_url) VALUES (?,?,?,?,'draft',?,?,?,?,NULL)`)
      .bind(cid, s.companyId, p.client_id, p.campaign_name, p.start_date, p.end_date, t.total, p.currency),
    ...items.map((i) => env.DB.prepare('INSERT INTO campaign_screens (id, campaign_id, inventory_id, rate_applied, slots) VALUES (?,?,?,?,?)').bind(crypto.randomUUID(), cid, i.inventory_id, i.rate, cleanSlots(i.slots))),
    env.DB.prepare('UPDATE proposals SET campaign_id=?, updated_at=? WHERE id=? AND company_id=?').bind(cid, now(), id, s.companyId),
  ]);
  await activity(env, s, id, 'Converted to campaign', p.campaign_name);
  await logCampaign(env, s, cid, 'Created from proposal', p.code);
  return json({ ok: true, campaign_id: cid, message: 'Campaign created as a draft.' });
}

export async function handleProposalRoutes(request: Request, env: Env, url: URL): Promise<Response | null> {
  const path = url.pathname;
  if (path !== '/api/proposals' && !path.startsWith('/api/proposals/')) return null;
  const m = request.method;
  try {
    if (path === '/api/proposals') {
      if (m === 'GET') return await list(request, env);
      if (m === 'POST') return await create(request, env);
    }
    const g = path.match(/^\/api\/proposals\/([0-9a-fA-F-]{36})(?:\/(status|revise|convert))?$/);
    if (g) {
      const [, id, sub] = g;
      if (!sub && m === 'GET') return await getOne(request, env, id);
      if (!sub && m === 'PUT') return await edit(request, env, id);
      if (!sub && m === 'DELETE') return await remove(request, env, id);
      if (sub === 'status' && m === 'PUT') return await setStatus(request, env, id);
      if (sub === 'revise' && m === 'POST') return await revise(request, env, id);
      if (sub === 'convert' && m === 'POST') return await convert(request, env, id);
    }
  } catch (e) {
    console.error('proposals', e);
    return fail(500, 'Unable to complete the request. Please try again.', 'PROPOSAL_REQUEST_FAILED');
  }
  return null;
}
