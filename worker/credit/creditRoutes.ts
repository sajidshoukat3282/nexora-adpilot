import type { Env } from '../index';
import { logAudit } from '../admin/adminRoutes';
import { resolveSession, type SessionContext } from '../auth/session';

/**
 * Client credit risk.
 * - Per client: limit, outstanding, overdue, ageing buckets, payment behaviour,
 *   exposure (outstanding + accepted proposals not yet booked + unbilled booked/live campaigns),
 *   a 0-100 risk score, a level, a suggested limit and an optional booking hold.
 * - Limit changes are recorded with who, when and why.
 * - `creditCheck` is used by campaign creation and proposal conversion to enforce the limit.
 * Every query is scoped by `session.companyId`.
 */

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const fail = (status: number, message: string, error = 'INVALID_INPUT') => json({ ok: false, error, message }, status);

const dayNum = (iso: string) => Math.floor(new Date(String(iso).slice(0, 10) + 'T00:00:00Z').getTime() / 86400000);
const todayIso = () => new Date().toISOString().slice(0, 10);
const r2 = (n: unknown) => Math.round((Number(n) || 0) * 100) / 100;
const now = () => new Date().toISOString();

let ready = false;
async function ensure(db: D1Database): Promise<void> {
  if (ready) return;
  await db.prepare(`CREATE TABLE IF NOT EXISTS credit_limit_history (
    id TEXT PRIMARY KEY, company_id TEXT NOT NULL, client_id TEXT NOT NULL, kind TEXT NOT NULL,
    old_limit REAL, new_limit REAL, reason TEXT, actor_email TEXT, created_at TEXT NOT NULL)`).run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS client_credit_flags (
    client_id TEXT PRIMARY KEY, company_id TEXT NOT NULL, on_hold INTEGER NOT NULL DEFAULT 0, hold_reason TEXT, updated_at TEXT NOT NULL)`).run();
  ready = true;
}

async function rows<T = any>(env: Env, sql: string, ...binds: unknown[]): Promise<T[]> {
  const r = await env.DB.prepare(sql).bind(...binds).all<T>();
  return (r.results ?? []) as T[];
}
async function safeRows<T = any>(env: Env, sql: string, ...binds: unknown[]): Promise<T[]> {
  try { return await rows<T>(env, sql, ...binds); } catch { return []; }
}

async function guard(request: Request, env: Env, perm: string): Promise<SessionContext | Response> {
  const s = await resolveSession(request, env.DB);
  if (!s) return json({ ok: false, error: 'UNAUTHENTICATED' }, 401);
  if (s.accountType === 'client' || !s.permissions.includes(perm)) return fail(403, 'You do not have permission to use credit risk.', 'FORBIDDEN');
  return s;
}

export type RiskLevel = 'none' | 'low' | 'watch' | 'high' | 'critical';

export interface ClientRisk {
  id: string;
  name: string;
  currency: string;
  credit_limit: number;
  outstanding: number;
  outstanding_balance: number; // legacy alias of outstanding
  overdue: number;
  overdue_count: number;
  oldest_overdue_days: number;
  ageing: { current: number; d1_30: number; d31_60: number; d61_90: number; d90: number };
  accepted_proposals: number;
  unbilled_campaigns: number;
  exposure: number;
  utilization: number;
  headroom: number | null;
  avg_delay_days: number | null;
  on_time_pct: number | null;
  paid_invoices: number;
  last_payment_date: string | null;
  billed_12m: number;
  score: number;
  level: RiskLevel;
  on_hold: boolean;
  hold_reason: string | null;
  suggested_limit: number | null;
  phone: string | null;
  email: string | null;
}

const levelOf = (score: number, hasHistory: boolean): RiskLevel => {
  if (!hasHistory) return 'none';
  if (score >= 75) return 'critical';
  if (score >= 50) return 'high';
  if (score >= 25) return 'watch';
  return 'low';
};

/** Builds the risk picture for every client (or just one). */
export async function snapshot(env: Env, companyId: string, onlyClient?: string): Promise<ClientRisk[]> {
  await ensure(env.DB);
  const today = todayIso();
  const tNum = dayNum(today);
  const cFilter = onlyClient ? ' AND c.id = ?' : '';
  const cBinds: unknown[] = onlyClient ? [companyId, onlyClient] : [companyId];
  const defCur = (await rows<any>(env, 'SELECT default_currency FROM companies WHERE id = ? LIMIT 1', companyId))[0]?.default_currency || 'PKR';
  const clients = await rows<any>(env, `SELECT c.id, c.name, c.credit_limit, c.currency, c.phone, c.email FROM clients c WHERE c.company_id = ?${cFilter}`, ...cBinds);
  if (!clients.length) return [];
  const flags = await safeRows<any>(env, 'SELECT client_id, on_hold, hold_reason FROM client_credit_flags WHERE company_id = ?', companyId);
  const flagBy = new Map(flags.map((f) => [f.client_id, f]));

  const invs = await safeRows<any>(env, `SELECT id, client_id, campaign_id, issue_date, due_date, total_amount, amount_paid, status FROM invoices WHERE company_id = ? AND status != 'cancelled'`, companyId);
  const pays = await safeRows<any>(env, `SELECT p.invoice_id, p.amount, p.payment_date FROM invoice_payments p INNER JOIN invoices i ON i.id = p.invoice_id WHERE i.company_id = ?`, companyId);
  const lastPay = new Map<string, string>();
  for (const p of pays) {
    const d = String(p.payment_date || '').slice(0, 10);
    if (d && (!lastPay.get(p.invoice_id) || d > (lastPay.get(p.invoice_id) as string))) lastPay.set(p.invoice_id, d);
  }

  const props = await safeRows<any>(env, `SELECT id, client_id, discount_pct, tax_rate FROM proposals WHERE company_id = ? AND status = 'accepted' AND campaign_id IS NULL`, companyId);
  const propItems = props.length ? await safeRows<any>(env, `SELECT proposal_id, rate, slots, days FROM proposal_items WHERE proposal_id IN (SELECT id FROM proposals WHERE company_id = ? AND status = 'accepted' AND campaign_id IS NULL)`, companyId) : [];
  const propTotal = new Map<string, number>();
  for (const p of props) {
    const sub = propItems.filter((i) => i.proposal_id === p.id).reduce((a, i) => a + (Number(i.rate) || 0) * (Number(i.slots) || 1) * (Number(i.days) || 1), 0);
    const afterDisc = sub * (1 - Math.min(100, Math.max(0, Number(p.discount_pct) || 0)) / 100);
    const total = afterDisc * (1 + Math.min(100, Math.max(0, Number(p.tax_rate) || 0)) / 100);
    propTotal.set(p.client_id, (propTotal.get(p.client_id) ?? 0) + total);
  }

  const camps = await safeRows<any>(env, `SELECT id, client_id, total_budget FROM campaigns WHERE company_id = ? AND status IN ('booked','live')`, companyId);
  const invByCamp = new Map<string, number>();
  for (const i of invs) if (i.campaign_id) invByCamp.set(i.campaign_id, (invByCamp.get(i.campaign_id) ?? 0) + (Number(i.total_amount) || 0));
  const unbilled = new Map<string, number>();
  for (const c of camps) unbilled.set(c.client_id, (unbilled.get(c.client_id) ?? 0) + Math.max(0, (Number(c.total_budget) || 0) - (invByCamp.get(c.id) ?? 0)));

  const out: ClientRisk[] = [];
  for (const c of clients) {
    const mine = invs.filter((i) => i.client_id === c.id);
    const ageing = { current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90: 0 };
    let outstanding = 0, overdue = 0, overdueCount = 0, oldest = 0;
    const delays: number[] = [];
    let paidN = 0, onTime = 0, lastPayment: string | null = null, billed12 = 0;
    for (const i of mine) {
      const bal = Math.max(0, (Number(i.total_amount) || 0) - (Number(i.amount_paid) || 0));
      if (tNum - dayNum(i.issue_date) <= 365) billed12 += Number(i.total_amount) || 0;
      if (i.status !== 'paid' && bal > 0.009) {
        outstanding += bal;
        const late = i.due_date ? tNum - dayNum(i.due_date) : 0;
        if (late <= 0) ageing.current += bal;
        else {
          overdue += bal; overdueCount += 1; oldest = Math.max(oldest, late);
          if (late <= 30) ageing.d1_30 += bal; else if (late <= 60) ageing.d31_60 += bal; else if (late <= 90) ageing.d61_90 += bal; else ageing.d90 += bal;
        }
      }
      const lp = lastPay.get(i.id);
      if (lp) {
        if (!lastPayment || lp > lastPayment) lastPayment = lp;
        if ((i.status === 'paid' || bal <= 0.009) && i.due_date) {
          const d = dayNum(lp) - dayNum(i.due_date);
          delays.push(d); paidN += 1; if (d <= 0) onTime += 1;
        }
      }
    }
    const limit = Number(c.credit_limit) || 0;
    const accepted = propTotal.get(c.id) ?? 0;
    const unb = unbilled.get(c.id) ?? 0;
    const exposure = outstanding + accepted + unb;
    const utilization = limit > 0 ? Math.round((exposure / limit) * 100) : exposure > 0 ? 100 : 0;
    const avgDelay = delays.length ? Math.round((delays.reduce((a, b) => a + b, 0) / delays.length) * 10) / 10 : null;
    const onTimePct = paidN ? Math.round((onTime / paidN) * 100) : null;

    // Score 0-100 (higher means riskier).
    const utilPart = limit > 0 ? Math.min(100, (exposure / limit) * 100) : exposure > 0 ? 40 : 0;
    const oldestPart = oldest > 90 ? 100 : oldest > 60 ? 75 : oldest > 30 ? 50 : oldest > 0 ? 25 : 0;
    const sharePart = outstanding > 0 ? (overdue / outstanding) * 100 : 0;
    const delayPart = avgDelay != null ? Math.min(100, Math.max(0, avgDelay) / 60 * 100) : 0;
    const latePart = onTimePct != null ? 100 - onTimePct : 0;
    const score = Math.round(utilPart * 0.35 + oldestPart * 0.3 + sharePart * 0.15 + delayPart * 0.12 + latePart * 0.08);
    const hasHistory = mine.length > 0 || exposure > 0 || limit > 0;
    const f = flagBy.get(c.id);

    let suggested: number | null = null;
    if (billed12 > 0) {
      const base = (billed12 / 12) * 2;
      suggested = Math.max(0, Math.round((base * (1 - score / 200)) / 1000) * 1000);
    }

    out.push({
      id: c.id, name: c.name, currency: defCur,
      credit_limit: limit, outstanding: r2(outstanding), outstanding_balance: r2(outstanding),
      overdue: r2(overdue), overdue_count: overdueCount, oldest_overdue_days: oldest,
      ageing: { current: r2(ageing.current), d1_30: r2(ageing.d1_30), d31_60: r2(ageing.d31_60), d61_90: r2(ageing.d61_90), d90: r2(ageing.d90) },
      accepted_proposals: r2(accepted), unbilled_campaigns: r2(unb), exposure: r2(exposure), utilization,
      headroom: limit > 0 ? r2(limit - exposure) : null,
      avg_delay_days: avgDelay, on_time_pct: onTimePct, paid_invoices: paidN, last_payment_date: lastPayment, billed_12m: r2(billed12),
      score, level: levelOf(score, hasHistory), on_hold: !!f?.on_hold, hold_reason: f?.hold_reason ?? null,
      suggested_limit: suggested, phone: c.phone ?? null, email: c.email ?? null,
    });
  }
  return out;
}

export interface CreditVerdict { blocked: boolean; message: string; exposure: number; limit: number; headroom: number | null }

/** Used by campaign creation and proposal conversion. `addAmount` is new exposure not yet counted. */
export async function creditCheck(env: Env, companyId: string, clientId: string, addAmount: number): Promise<CreditVerdict> {
  try {
    const [r] = await snapshot(env, companyId, clientId);
    if (!r) return { blocked: false, message: '', exposure: 0, limit: 0, headroom: null };
    if (r.on_hold) return { blocked: true, message: `${r.name} is on a booking hold${r.hold_reason ? ` (${r.hold_reason})` : ''}.`, exposure: r.exposure, limit: r.credit_limit, headroom: r.headroom };
    if (r.credit_limit > 0 && r.exposure + addAmount > r.credit_limit + 0.009) {
      const over = Math.round(r.exposure + addAmount - r.credit_limit);
      return { blocked: true, message: `This booking would put ${r.name} over the credit limit by ${r.currency} ${over.toLocaleString('en-US')}.`, exposure: r.exposure, limit: r.credit_limit, headroom: r.headroom };
    }
    return { blocked: false, message: '', exposure: r.exposure, limit: r.credit_limit, headroom: r.headroom };
  } catch {
    return { blocked: false, message: '', exposure: 0, limit: 0, headroom: null };
  }
}

export async function logCreditEvent(env: Env, s: SessionContext, clientId: string, kind: string, oldLimit: number | null, newLimit: number | null, reason: string) {
  try {
    await ensure(env.DB);
    await env.DB.prepare('INSERT INTO credit_limit_history (id, company_id, client_id, kind, old_limit, new_limit, reason, actor_email, created_at) VALUES (?,?,?,?,?,?,?,?,?)')
      .bind(crypto.randomUUID(), s.companyId, clientId, kind, oldLimit, newLimit, reason.slice(0, 300), (s as any).email ?? null, now()).run();
    const nm = (await env.DB.prepare('SELECT name FROM clients WHERE id = ? AND company_id = ?').bind(clientId, s.companyId).first<{ name: string }>())?.name ?? '';
    const label = kind === 'limit' ? 'Credit limit changed' : kind === 'hold' ? 'Booking hold set' : kind === 'release' ? 'Booking hold released' : 'Credit exception approved';
    await logAudit(env, s.companyId, s.accountId, label, kind === 'limit' ? `${nm}: ${oldLimit ?? 0} to ${newLimit ?? 0}` : `${nm}${reason ? ': ' + reason : ''}`);
  } catch { /* ignore */ }
}

/** Short HTML block for the weekly digest: clients at High / Critical risk. */
export async function riskDigestHtml(env: Env, companyId: string, esc: (v: unknown) => string): Promise<string> {
  try {
    const all = await snapshot(env, companyId);
    const top = all.filter((c) => c.level === 'high' || c.level === 'critical' || c.on_hold || (c.credit_limit > 0 && c.utilization >= 80)).sort((a, b) => b.score - a.score).slice(0, 5);
    if (!top.length) return '';
    const li = (t: string) => `<tr><td style="padding:5px 0;font-size:12px;color:#333;border-bottom:1px solid #e4dccb">${t}</td></tr>`;
    return `<div style="font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:#a8914f;font-weight:bold;margin:18px 0 6px">Credit risk watch</div><table style="width:100%;border-collapse:collapse">${top
      .map((c) => li(`<b>${esc(c.name)}</b>: ${esc(c.currency)} ${Math.round(c.overdue).toLocaleString('en-US')} overdue, ${c.credit_limit > 0 ? `${c.utilization}% of limit used` : 'no limit set'}${c.on_hold ? ', on hold' : ''}`))
      .join('')}</table>`;
  } catch { return ''; }
}

export async function handleCreditRoutes(request: Request, env: Env, url: URL): Promise<Response | null> {
  const path = url.pathname;
  const m = request.method;
  const limitMatch = path.match(/^\/api\/crm\/clients\/([^/]+)\/credit-limit$/);
  const subMatch = path.match(/^\/api\/credit-risk\/([^/]+)(?:\/(hold|history))?$/);
  const isList = path === '/api/credit-risk' && m === 'GET';
  const isCheck = path === '/api/credit-risk/check' && m === 'POST';
  const isLimit = !!limitMatch && m === 'PUT';
  if (!isList && !isCheck && !isLimit && !(subMatch && !isCheck)) return null;
  try {
    if (isList) {
      const s = await guard(request, env, 'finance.view');
      if (s instanceof Response) return s;
      const data = await snapshot(env, s.companyId);
      const cur = (await safeRows<{ default_currency: string }>(env, 'SELECT default_currency FROM companies WHERE id = ? LIMIT 1', s.companyId))[0]?.default_currency || 'PKR';
      return json({ ok: true, data, currency: cur });
    }
    if (isCheck) {
      const s = await guard(request, env, 'finance.view');
      if (s instanceof Response) return s;
      const b = (await request.json().catch(() => ({}))) as any;
      return json({ ok: true, ...(await creditCheck(env, s.companyId, String(b.client_id ?? ''), Math.max(0, Number(b.amount) || 0))) });
    }
    if (isLimit) {
      const s = await guard(request, env, 'finance.manage');
      if (s instanceof Response) return s;
      await ensure(env.DB);
      const id = decodeURIComponent((limitMatch as RegExpMatchArray)[1]);
      const b = (await request.json().catch(() => ({}))) as any;
      const next = Number(b.credit_limit);
      if (!Number.isFinite(next) || next < 0 || next > 1e12) return fail(400, 'Please enter a valid credit limit.');
      const c = await env.DB.prepare('SELECT credit_limit FROM clients WHERE id = ? AND company_id = ?').bind(id, s.companyId).first<{ credit_limit: number }>();
      if (!c) return fail(404, 'Client not found.', 'NOT_FOUND');
      await env.DB.prepare(`UPDATE clients SET credit_limit = ?, updated_at = datetime('now') WHERE id = ? AND company_id = ?`).bind(next, id, s.companyId).run();
      await logCreditEvent(env, s, id, 'limit', Number(c.credit_limit) || 0, next, String(b.reason ?? ''));
      return json({ ok: true });
    }
    // /api/credit-risk/:id[/hold|/history]
    const id = decodeURIComponent((subMatch as RegExpMatchArray)[1]);
    const sub = (subMatch as RegExpMatchArray)[2];
    if (sub === 'hold' && m === 'PUT') {
      const s = await guard(request, env, 'finance.manage');
      if (s instanceof Response) return s;
      await ensure(env.DB);
      const b = (await request.json().catch(() => ({}))) as any;
      const c = await env.DB.prepare('SELECT id FROM clients WHERE id = ? AND company_id = ?').bind(id, s.companyId).first();
      if (!c) return fail(404, 'Client not found.', 'NOT_FOUND');
      const on = b.on_hold ? 1 : 0;
      const reason = String(b.reason ?? '').slice(0, 200);
      await env.DB.prepare('INSERT INTO client_credit_flags (client_id, company_id, on_hold, hold_reason, updated_at) VALUES (?,?,?,?,?) ON CONFLICT(client_id) DO UPDATE SET on_hold=excluded.on_hold, hold_reason=excluded.hold_reason, updated_at=excluded.updated_at')
        .bind(id, s.companyId, on, on ? reason : null, now()).run();
      await logCreditEvent(env, s, id, on ? 'hold' : 'release', null, null, reason);
      return json({ ok: true });
    }
    if (m === 'GET' && (!sub || sub === 'history')) {
      const s = await guard(request, env, 'finance.view');
      if (s instanceof Response) return s;
      await ensure(env.DB);
      const [risk] = await snapshot(env, s.companyId, id);
      if (!risk) return fail(404, 'Client not found.', 'NOT_FOUND');
      const history = await safeRows<any>(env, 'SELECT id, kind, old_limit, new_limit, reason, actor_email, created_at FROM credit_limit_history WHERE company_id = ? AND client_id = ? ORDER BY created_at DESC LIMIT 50', s.companyId, id);
      const open = await safeRows<any>(env, `SELECT id, invoice_number, issue_date, due_date, total_amount, amount_paid FROM invoices WHERE company_id = ? AND client_id = ? AND status NOT IN ('paid','cancelled') AND (total_amount - amount_paid) > 0.009 ORDER BY due_date ASC LIMIT 50`, s.companyId, id);
      const today = dayNum(todayIso());
      return json({
        ok: true, risk, history,
        open_invoices: open.map((i) => ({ id: i.id, invoice_number: i.invoice_number, due_date: i.due_date, balance: r2(i.total_amount - i.amount_paid), days_late: Math.max(0, today - dayNum(i.due_date)) })),
      });
    }
    return null;
  } catch {
    return fail(500, 'Unable to complete the request. Please try again.', 'CREDIT_REQUEST_FAILED');
  }
}
