import type { Env } from '../index';
import { riskDigestHtml } from '../credit/creditRoutes';
import { resolveSession, type SessionContext } from '../auth/session';

/**
 * Analytics and reports. One call returns everything the Reports page needs for a
 * period (KPIs with previous-period comparison, 12-month trend, top clients and
 * screens, receivables aging, profit and loss, campaign performance, inventory
 * occupancy, sales funnel). Also: client statement, weekly email digest (preview,
 * send now, history, scheduled run) and saved report views.
 * Every query is scoped by `session.companyId`.
 */

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
const fail = (status: number, message: string, error = 'INVALID_INPUT') => json({ ok: false, error, message }, status);

const isDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const dayNum = (iso: string) => Math.floor(new Date(String(iso).slice(0, 10) + 'T00:00:00Z').getTime() / 86400000);
const isoOf = (n: number) => new Date(n * 86400000).toISOString().slice(0, 10);
const todayIso = () => new Date().toISOString().slice(0, 10);
const r2 = (n: unknown) => Math.round((Number(n) || 0) * 100) / 100;
const overlapDays = (aS: string, aE: string, bS: string, bE: string) => Math.max(0, Math.min(dayNum(aE), dayNum(bE)) - Math.max(dayNum(aS), dayNum(bS)) + 1);

let ready = false;
async function ensure(db: D1Database): Promise<void> {
  if (ready) return;
  await db.prepare(`CREATE TABLE IF NOT EXISTS report_email_log (
    id TEXT PRIMARY KEY, company_id TEXT NOT NULL, kind TEXT NOT NULL, recipients TEXT, status TEXT NOT NULL, error TEXT, created_at TEXT NOT NULL)`).run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS saved_reports (
    id TEXT PRIMARY KEY, company_id TEXT NOT NULL, name TEXT NOT NULL, report TEXT NOT NULL, params TEXT, created_at TEXT NOT NULL)`).run();
  try { await db.prepare('ALTER TABLE companies ADD COLUMN report_email_day TEXT').run(); } catch { /* exists */ }
  try { await db.prepare('ALTER TABLE companies ADD COLUMN report_extra_emails TEXT').run(); } catch { /* exists */ }
  ready = true;
}

async function guard(request: Request, env: Env, perm = 'finance.view'): Promise<SessionContext | Response> {
  const s = await resolveSession(request, env.DB);
  if (!s) return json({ ok: false, error: 'UNAUTHENTICATED' }, 401);
  if (s.accountType === 'client' || !s.permissions.includes(perm)) return fail(403, 'You do not have permission to view reports.', 'FORBIDDEN');
  return s;
}

async function rows<T = any>(env: Env, sql: string, ...binds: unknown[]): Promise<T[]> {
  const r = await env.DB.prepare(sql).bind(...binds).all<T>();
  return (r.results ?? []) as T[];
}
async function one<T = any>(env: Env, sql: string, ...binds: unknown[]): Promise<T | null> {
  return (await env.DB.prepare(sql).bind(...binds).first<T>()) ?? null;
}
async function safeRows<T = any>(env: Env, sql: string, ...binds: unknown[]): Promise<T[]> {
  try { return await rows<T>(env, sql, ...binds); } catch { return []; }
}

export async function companyCurrency(env: Env, companyId: string): Promise<string> {
  const c = await safeRows<{ default_currency: string }>(env, 'SELECT default_currency FROM companies WHERE id = ? LIMIT 1', companyId);
  return c[0]?.default_currency || 'PKR';
}

/* ---------------- period KPIs ---------------- */

async function periodKpis(env: Env, cid: string, from: string, to: string) {
  const invoiced = await one<{ t: number; n: number }>(env, `SELECT COALESCE(SUM(total_amount),0) t, COUNT(*) n FROM invoices WHERE company_id=? AND status!='cancelled' AND substr(issue_date,1,10) BETWEEN ? AND ?`, cid, from, to);
  const received = await one<{ t: number }>(env, `SELECT COALESCE(SUM(p.amount),0) t FROM invoice_payments p INNER JOIN invoices i ON i.id=p.invoice_id WHERE i.company_id=? AND substr(p.payment_date,1,10) BETWEEN ? AND ?`, cid, from, to);
  const expenses = await one<{ t: number }>(env, `SELECT COALESCE(SUM(amount),0) t FROM expenses WHERE company_id=? AND substr(expense_date,1,10) BETWEEN ? AND ?`, cid, from, to);
  const camps = await one<{ n: number }>(env, `SELECT COUNT(*) n FROM campaigns WHERE company_id=? AND status!='cancelled' AND start_date BETWEEN ? AND ?`, cid, from, to);
  const newClients = (await safeRows<{ n: number }>(env, `SELECT COUNT(*) n FROM clients WHERE company_id=? AND substr(created_at,1,10) BETWEEN ? AND ?`, cid, from, to))[0]?.n ?? 0;
  const newLeads = (await safeRows<{ n: number }>(env, `SELECT COUNT(*) n FROM leads WHERE company_id=? AND substr(created_at,1,10) BETWEEN ? AND ?`, cid, from, to))[0]?.n ?? 0;
  const rec = r2(received?.t);
  const exp = r2(expenses?.t);
  return {
    invoiced: r2(invoiced?.t),
    invoiceCount: invoiced?.n ?? 0,
    received: rec,
    expenses: exp,
    profit: r2(rec - exp),
    margin: rec > 0 ? Math.round(((rec - exp) / rec) * 100) : 0,
    campaignsStarted: camps?.n ?? 0,
    newClients,
    newLeads,
  };
}

async function summary(request: Request, env: Env, url: URL): Promise<Response> {
  const s = await guard(request, env);
  if (s instanceof Response) return s;
  await ensure(env.DB);
  const cid = s.companyId;
  const today = todayIso();
  let from = url.searchParams.get('from');
  let to = url.searchParams.get('to');
  if (!isDate(from) || !isDate(to)) {
    to = today;
    from = today.slice(0, 8) + '01';
  }
  if (to < from) return fail(400, 'The end date must be on or after the start date.');
  if (dayNum(to) - dayNum(from) > 1830) return fail(400, 'Please choose a period of 5 years or less.');
  const len = dayNum(to) - dayNum(from) + 1;
  const prevTo = isoOf(dayNum(from) - 1);
  const prevFrom = isoOf(dayNum(from) - len);

  const [cur, prev] = [await periodKpis(env, cid, from, to), await periodKpis(env, cid, prevFrom, prevTo)];

  // 12-month trend ending at the month of `to`
  const endY = Number(to.slice(0, 4));
  const endM = Number(to.slice(5, 7));
  const months: string[] = [];
  for (let i = 11; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(endY, endM - 1 - i, 1));
    months.push(d.toISOString().slice(0, 7));
  }
  const tFrom = months[0] + '-01';
  const mRec = await rows<{ m: string; t: number }>(env, `SELECT substr(p.payment_date,1,7) m, SUM(p.amount) t FROM invoice_payments p INNER JOIN invoices i ON i.id=p.invoice_id WHERE i.company_id=? AND substr(p.payment_date,1,10) BETWEEN ? AND ? GROUP BY m`, cid, tFrom, to);
  const mExp = await rows<{ m: string; t: number }>(env, `SELECT substr(expense_date,1,7) m, SUM(amount) t FROM expenses WHERE company_id=? AND substr(expense_date,1,10) BETWEEN ? AND ? GROUP BY m`, cid, tFrom, to);
  const mInv = await rows<{ m: string; t: number }>(env, `SELECT substr(issue_date,1,7) m, SUM(total_amount) t FROM invoices WHERE company_id=? AND status!='cancelled' AND substr(issue_date,1,10) BETWEEN ? AND ? GROUP BY m`, cid, tFrom, to);
  const pick = (arr: { m: string; t: number }[], m: string) => r2(arr.find((x) => x.m === m)?.t);
  const trend = months.map((m) => ({ month: m, invoiced: pick(mInv, m), received: pick(mRec, m), expenses: pick(mExp, m), profit: r2(pick(mRec, m) - pick(mExp, m)) }));

  // top clients (period)
  const topClients = await rows(env, `SELECT c.id, c.name, COALESCE(SUM(i.total_amount),0) invoiced, COUNT(i.id) invoices
      FROM invoices i INNER JOIN clients c ON c.id=i.client_id
     WHERE i.company_id=? AND i.status!='cancelled' AND substr(i.issue_date,1,10) BETWEEN ? AND ?
     GROUP BY c.id, c.name ORDER BY invoiced DESC LIMIT 8`, cid, from, to);
  const clientReceived = await rows<{ client_id: string; t: number }>(env, `SELECT i.client_id, SUM(p.amount) t FROM invoice_payments p INNER JOIN invoices i ON i.id=p.invoice_id WHERE i.company_id=? AND substr(p.payment_date,1,10) BETWEEN ? AND ? GROUP BY i.client_id`, cid, from, to);
  for (const c of topClients as any[]) { c.received = r2(clientReceived.find((x) => x.client_id === c.id)?.t); c.invoiced = r2(c.invoiced); }

  // receivables aging (as of today, all open invoices)
  const open = await rows<any>(env, `SELECT i.id, i.invoice_number, i.due_date, i.issue_date, i.total_amount, i.amount_paid, c.name client_name, c.id client_id
      FROM invoices i LEFT JOIN clients c ON c.id=i.client_id
     WHERE i.company_id=? AND i.status NOT IN ('paid','cancelled') AND (i.total_amount - i.amount_paid) > 0.009 ORDER BY i.due_date ASC`, cid);
  const buckets = [
    { key: 'current', label: 'Not yet due', amount: 0, count: 0 },
    { key: 'd30', label: '1-30 days', amount: 0, count: 0 },
    { key: 'd60', label: '31-60 days', amount: 0, count: 0 },
    { key: 'd90', label: '61-90 days', amount: 0, count: 0 },
    { key: 'd90p', label: 'Over 90 days', amount: 0, count: 0 },
  ];
  const agingRows = open.map((i) => {
    const bal = r2(i.total_amount - i.amount_paid);
    const late = dayNum(today) - dayNum(i.due_date);
    const b = late <= 0 ? buckets[0] : late <= 30 ? buckets[1] : late <= 60 ? buckets[2] : late <= 90 ? buckets[3] : buckets[4];
    b.amount = r2(b.amount + bal);
    b.count += 1;
    return { id: i.id, invoice_number: i.invoice_number, client_name: i.client_name ?? '-', issue_date: i.issue_date, due_date: i.due_date, balance: bal, days_late: Math.max(0, late) };
  });

  // profit and loss (period)
  const expByCat = await rows<{ category: string; t: number }>(env, `SELECT COALESCE(category,'Other') category, SUM(amount) t FROM expenses WHERE company_id=? AND substr(expense_date,1,10) BETWEEN ? AND ? GROUP BY category ORDER BY t DESC`, cid, from, to);

  // campaign performance (campaigns that overlap the period)
  const camps = await rows<any>(env, `SELECT c.id, c.name, c.status, c.start_date, c.end_date, c.total_budget, cl.name client_name
      FROM campaigns c LEFT JOIN clients cl ON cl.id=c.client_id
     WHERE c.company_id=? AND c.start_date <= ? AND c.end_date >= ? ORDER BY c.start_date DESC LIMIT 200`, cid, to, from);
  const campInv = await rows<any>(env, `SELECT campaign_id, SUM(total_amount) inv, SUM(amount_paid) paid FROM invoices WHERE company_id=? AND status!='cancelled' AND campaign_id IS NOT NULL GROUP BY campaign_id`, cid);
  const campExp = await rows<any>(env, `SELECT campaign_id, SUM(amount) t FROM expenses WHERE company_id=? AND campaign_id IS NOT NULL GROUP BY campaign_id`, cid);
  let slotCol = true;
  let campScr = await safeRows<any>(env, `SELECT cs.campaign_id, COUNT(*) n, SUM(COALESCE(cs.slots,1)) slots FROM campaign_screens cs INNER JOIN campaigns c ON c.id=cs.campaign_id WHERE c.company_id=? GROUP BY cs.campaign_id`, cid);
  if (campScr.length === 0) { slotCol = false; campScr = await safeRows<any>(env, `SELECT cs.campaign_id, COUNT(*) n, COUNT(*) slots FROM campaign_screens cs INNER JOIN campaigns c ON c.id=cs.campaign_id WHERE c.company_id=? GROUP BY cs.campaign_id`, cid); }
  void slotCol;
  const campaigns = camps.map((c) => {
    const inv = campInv.find((x) => x.campaign_id === c.id);
    const ex = r2(campExp.find((x) => x.campaign_id === c.id)?.t);
    const sc = campScr.find((x) => x.campaign_id === c.id);
    const received = r2(inv?.paid);
    return {
      id: c.id, name: c.name, status: c.status, client_name: c.client_name ?? '-', start_date: c.start_date, end_date: c.end_date,
      contract: r2(c.total_budget), invoiced: r2(inv?.inv), received, expenses: ex, profit: r2(received - ex),
      screens: sc?.n ?? 0, slots: sc?.slots ?? 0,
    };
  });

  // inventory occupancy (period)
  const inv = await rows<any>(env, `SELECT id, name, screen_type, city, specs, status, rate FROM inventory WHERE company_id=?`, cid);
  const bookings = await safeRows<any>(env, `SELECT cs.inventory_id, cs.rate_applied, COALESCE(cs.slots,1) slots, c.start_date, c.end_date FROM campaign_screens cs INNER JOIN campaigns c ON c.id=cs.campaign_id WHERE c.company_id=? AND c.status NOT IN ('cancelled') AND c.start_date <= ? AND c.end_date >= ?`, cid, to, from);
  const capOf = (t: string, specs: string | null) => {
    if (t === 'static') return 1;
    try { const n = Math.floor(Number(JSON.parse(specs || '{}').spots)); return Number.isFinite(n) && n >= 1 ? Math.min(n, 50) : 1; } catch { return 1; }
  };
  let allCap = 0;
  let allBooked = 0;
  const inventory = inv.map((x) => {
    const cap = capOf(x.screen_type, x.specs);
    const total = cap * len;
    let booked = 0;
    let revenue = 0;
    for (const b of bookings.filter((bk) => bk.inventory_id === x.id)) {
      const od = overlapDays(b.start_date, b.end_date, from!, to!);
      booked += od * b.slots;
      revenue += od * b.slots * (Number(b.rate_applied) || 0);
    }
    booked = Math.min(booked, total);
    allCap += total;
    allBooked += booked;
    return { id: x.id, name: x.name, type: x.screen_type === 'static' ? 'Static' : 'Digital', city: x.city ?? '-', status: x.status, capacity: cap, occupancy: total > 0 ? Math.round((booked / total) * 100) : 0, revenue: r2(revenue) };
  });
  const occupancy = allCap > 0 ? Math.round((allBooked / allCap) * 100) : 0;
  const topScreens = [...inventory].sort((a, b) => b.revenue - a.revenue).filter((x) => x.revenue > 0).slice(0, 8);

  // sales funnel
  const leadsByStage = await safeRows<{ stage: string; n: number; v: number }>(env, `SELECT COALESCE(stage,'lead') stage, COUNT(*) n, COALESCE(SUM(estimated_value),0) v FROM leads WHERE company_id=? GROUP BY stage`, cid);
  const campByStatus = await rows<{ status: string; n: number; v: number }>(env, `SELECT status, COUNT(*) n, COALESCE(SUM(total_budget),0) v FROM campaigns WHERE company_id=? GROUP BY status`, cid);
  const totalLeads = leadsByStage.reduce((a, x) => a + x.n, 0);
  const won = leadsByStage.find((x) => x.stage === 'won')?.n ?? 0;
  const activeCamps = campByStatus.filter((x) => x.status !== 'cancelled');
  const campCount = activeCamps.reduce((a, x) => a + x.n, 0);
  const campValue = activeCamps.reduce((a, x) => a + x.v, 0);

  return json({
    ok: true,
    currency: await companyCurrency(env, cid),
    period: { from, to, days: len, prevFrom, prevTo },
    kpis: { current: cur, previous: prev },
    outstanding: r2(open.reduce((a, i) => a + (i.total_amount - i.amount_paid), 0)),
    overdue: r2(agingRows.filter((i) => i.days_late > 0).reduce((a, i) => a + i.balance, 0)),
    trend,
    topClients,
    topScreens,
    aging: { buckets, rows: agingRows.slice(0, 200) },
    pnl: { revenue: cur.received, invoiced: cur.invoiced, expensesByCategory: expByCat.map((e) => ({ category: e.category, amount: r2(e.t) })), expenses: cur.expenses, net: cur.profit },
    campaigns,
    inventory: { occupancy, rows: inventory },
    funnel: {
      leads: leadsByStage.map((x) => ({ stage: x.stage, count: x.n, value: r2(x.v) })),
      totalLeads, won, conversion: totalLeads > 0 ? Math.round((won / totalLeads) * 100) : 0,
      campaignsByStatus: campByStatus.map((x) => ({ status: x.status, count: x.n, value: r2(x.v) })),
      campaignCount: campCount, avgCampaignValue: campCount > 0 ? r2(campValue / campCount) : 0,
    },
  });
}

/* ---------------- client statement ---------------- */

async function clientList(request: Request, env: Env): Promise<Response> {
  const s = await guard(request, env);
  if (s instanceof Response) return s;
  const list = await rows(env, 'SELECT id, name FROM clients WHERE company_id=? ORDER BY name COLLATE NOCASE LIMIT 500', s.companyId);
  return json({ ok: true, clients: list });
}

async function statement(request: Request, env: Env, url: URL, clientId: string): Promise<Response> {
  const s = await guard(request, env);
  if (s instanceof Response) return s;
  const cid = s.companyId;
  const client = await one<any>(env, 'SELECT id, name, email, phone, address FROM clients WHERE id=? AND company_id=?', clientId, cid);
  if (!client) return fail(404, 'Client not found.', 'NOT_FOUND');
  const today = todayIso();
  let from = url.searchParams.get('from');
  let to = url.searchParams.get('to');
  if (!isDate(from) || !isDate(to)) { to = today; from = today.slice(0, 4) + '-01-01'; }
  const invs = await rows<any>(env, `SELECT id, invoice_number, issue_date, due_date, total_amount, status FROM invoices WHERE company_id=? AND client_id=? AND status!='cancelled'`, cid, clientId);
  const pays = await rows<any>(env, `SELECT p.amount, p.payment_date, p.payment_method, p.reference_no, i.invoice_number FROM invoice_payments p INNER JOIN invoices i ON i.id=p.invoice_id WHERE i.company_id=? AND i.client_id=?`, cid, clientId);
  type Entry = { date: string; kind: 'invoice' | 'payment'; ref: string; description: string; debit: number; credit: number };
  const entries: Entry[] = [
    ...invs.map((i): Entry => ({ date: String(i.issue_date).slice(0, 10), kind: 'invoice', ref: i.invoice_number, description: `Invoice, due ${String(i.due_date).slice(0, 10)}`, debit: r2(i.total_amount), credit: 0 })),
    ...pays.map((p): Entry => ({ date: String(p.payment_date).slice(0, 10), kind: 'payment', ref: p.reference_no || p.invoice_number, description: `Payment received${p.payment_method ? ` (${p.payment_method})` : ''} for ${p.invoice_number}`, debit: 0, credit: r2(p.amount) })),
  ].sort((a, b) => (a.date === b.date ? (a.kind === 'invoice' ? -1 : 1) : a.date < b.date ? -1 : 1));
  let opening = 0;
  for (const e of entries) if (e.date < from) opening += e.debit - e.credit;
  opening = r2(opening);
  let bal = opening;
  const lines = entries.filter((e) => e.date >= from! && e.date <= to!).map((e) => { bal = r2(bal + e.debit - e.credit); return { ...e, balance: bal }; });
  return json({
    ok: true, currency: await companyCurrency(env, cid), client, period: { from, to }, opening, closing: bal,
    totals: { debit: r2(lines.reduce((a, l) => a + l.debit, 0)), credit: r2(lines.reduce((a, l) => a + l.credit, 0)) }, lines,
  });
}

/* ---------------- weekly digest e-mail ---------------- */

const esc = (v: unknown) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fmt = (n: number, cur: string) => `${cur} ${Math.round(Number(n) || 0).toLocaleString('en-US')}`;

export async function buildDigest(env: Env, companyId: string, companyName: string, days = 7): Promise<{ subject: string; html: string }> {
  const cur = await companyCurrency(env, companyId);
  const to = todayIso();
  const from = isoOf(dayNum(to) - (days - 1));
  const prevTo = isoOf(dayNum(from) - 1);
  const prevFrom = isoOf(dayNum(from) - days);
  const k = await periodKpis(env, companyId, from, to);
  const p = await periodKpis(env, companyId, prevFrom, prevTo);
  const open = await one<{ t: number; od: number }>(env, `SELECT COALESCE(SUM(total_amount-amount_paid),0) t, COALESCE(SUM(CASE WHEN due_date < ? THEN total_amount-amount_paid ELSE 0 END),0) od FROM invoices WHERE company_id=? AND status NOT IN ('paid','cancelled')`, to, companyId);
  const live = await one<{ n: number }>(env, `SELECT COUNT(*) n FROM campaigns WHERE company_id=? AND status='live'`, companyId);
  const endSoon = await rows<any>(env, `SELECT name, end_date FROM campaigns WHERE company_id=? AND status='live' AND end_date BETWEEN ? AND ? ORDER BY end_date LIMIT 5`, companyId, to, isoOf(dayNum(to) + 7));
  const topClient = await one<any>(env, `SELECT c.name, SUM(i.total_amount) t FROM invoices i INNER JOIN clients c ON c.id=i.client_id WHERE i.company_id=? AND i.status!='cancelled' AND substr(i.issue_date,1,10) BETWEEN ? AND ? GROUP BY c.id, c.name ORDER BY t DESC LIMIT 1`, companyId, from, to);
  const riskBlock = await riskDigestHtml(env, companyId, esc);
  const delta = (a: number, b: number) => (b > 0 ? `${a >= b ? '+' : ''}${Math.round(((a - b) / b) * 100)}% vs previous ${days} days` : 'no previous data');
  const card = (label: string, value: string, sub: string, gold = false) =>
    `<td style="width:50%;padding:6px"><div style="border-radius:10px;padding:14px;${gold ? 'background:#f1d68a;background:linear-gradient(135deg,#f1d68a,#c99b3b);' : 'background:#eceff2;background:linear-gradient(135deg,#eceff2,#a8aeb6);'}"><div style="font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:#4a4130;font-weight:bold">${esc(label)}</div><div style="font-size:20px;font-weight:bold;color:#1a1204;margin-top:4px">${esc(value)}</div><div style="font-size:10px;color:#4a4130;margin-top:2px">${esc(sub)}</div></div></td>`;
  const li = (t: string) => `<tr><td style="padding:5px 0;font-size:12px;color:#333;border-bottom:1px solid #e4dccb">${t}</td></tr>`;
  const html = `<div style="background:#f4f1ea;padding:24px 12px;font-family:Arial,Helvetica,sans-serif"><div style="max-width:620px;margin:0 auto;background:#fbf9f4;border-top:3px solid #c99b3b;border-radius:8px;padding:24px">
<div style="border-bottom:1px solid #e4dccb;padding-bottom:14px;margin-bottom:16px"><div style="font-size:18px;letter-spacing:.28em;font-weight:600;color:#1b1d21">WEEKLY DIGEST</div><div style="font-size:12px;color:#8a7a52;margin-top:4px">${esc(companyName)} &middot; ${from} to ${to}</div></div>
<table style="width:100%;border-collapse:collapse"><tr>${card('Collected', fmt(k.received, cur), delta(k.received, p.received), true)}${card('Expenses', fmt(k.expenses, cur), delta(k.expenses, p.expenses))}</tr><tr>${card('Net profit', fmt(k.profit, cur), `${k.margin}% margin`, true)}${card('Outstanding', fmt(open?.t ?? 0, cur), `${fmt(open?.od ?? 0, cur)} overdue`)}</tr></table>
<div style="font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:#a8914f;font-weight:bold;margin:18px 0 6px">Operations and sales</div>
<table style="width:100%;border-collapse:collapse">${li(`Live campaigns: <b>${live?.n ?? 0}</b>`)}${li(`Invoiced this period: <b>${esc(fmt(k.invoiced, cur))}</b> (${k.invoiceCount} invoices)`)}${li(`New leads: <b>${k.newLeads}</b> &middot; New clients: <b>${k.newClients}</b>`)}${topClient ? li(`Top client: <b>${esc(topClient.name)}</b> (${esc(fmt(topClient.t, cur))})`) : ''}</table>
${endSoon.length ? `<div style="font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:#a8914f;font-weight:bold;margin:18px 0 6px">Ending within 7 days</div><table style="width:100%;border-collapse:collapse">${endSoon.map((c) => li(`${esc(c.name)} <span style="color:#8a7a52">ends ${esc(c.end_date)}</span>`)).join('')}</table>` : ''}
${riskBlock}
<p style="font-size:10px;color:#9a9078;text-align:center;margin:22px 0 0">Automated report from Nexora AdPilot. Open Analytics &amp; Reports for full detail.</p></div></div>`;
  return { subject: `Weekly Digest: ${companyName}`, html };
}

async function logEmail(env: Env, companyId: string, kind: string, recipients: string[], status: string, error?: string) {
  try {
    await ensure(env.DB);
    await env.DB.prepare('INSERT INTO report_email_log (id, company_id, kind, recipients, status, error, created_at) VALUES (?,?,?,?,?,?,?)')
      .bind(crypto.randomUUID(), companyId, kind, recipients.join(', ').slice(0, 500), status, error ?? null, new Date().toISOString()).run();
  } catch { /* ignore */ }
}

export async function sendDigest(env: Env, companyId: string, companyName: string, recipients: string[], kind: string): Promise<{ ok: boolean; message: string }> {
  if (!env.BREVO_API_KEY) { await logEmail(env, companyId, kind, recipients, 'failed', 'Email provider not configured'); return { ok: false, message: 'Email sending is not configured on the server.' }; }
  if (recipients.length === 0) return { ok: false, message: 'No recipient email found.' };
  const d = await buildDigest(env, companyId, companyName);
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { accept: 'application/json', 'api-key': env.BREVO_API_KEY, 'content-type': 'application/json' },
    body: JSON.stringify({ sender: { name: 'Nexora AdPilot', email: env.MAIL_FROM_EMAIL || 'hello@nexoratechnologies.pk' }, to: recipients.map((email) => ({ email })), subject: d.subject, htmlContent: d.html }),
  });
  if (!res.ok) { await logEmail(env, companyId, kind, recipients, 'failed', `Provider answered ${res.status}`); return { ok: false, message: 'The email could not be sent. Please try again later.' }; }
  await logEmail(env, companyId, kind, recipients, 'sent');
  return { ok: true, message: `Digest sent to ${recipients.length} recipient${recipients.length === 1 ? '' : 's'}.` };
}

/** Called by the scheduled (cron) trigger. */
export async function runWeeklyDigests(env: Env): Promise<void> {
  await ensure(env.DB);
  const day = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const list = await rows<any>(env, `SELECT c.id, c.name, c.report_extra_emails, a.email AS owner_email FROM companies c JOIN company_memberships cm ON c.id = cm.company_id JOIN accounts a ON cm.account_id = a.id WHERE cm.account_type = 'owner' AND c.report_email_day = ?`, day);
  for (const c of list) {
    const to: string[] = [];
    if (c.owner_email) to.push(String(c.owner_email));
    for (const e of String(c.report_extra_emails ?? '').split(',').map((x) => x.trim()).filter(Boolean)) if (!to.includes(e)) to.push(e);
    try { await sendDigest(env, c.id, String(c.name || 'Nexora AdPilot'), to, 'scheduled'); } catch (err) { console.error('weekly digest', err); }
  }
}

async function recipientsFor(env: Env, s: SessionContext, onlyMe: boolean): Promise<string[]> {
  const me = await one<{ email: string }>(env, 'SELECT email FROM accounts WHERE id=? LIMIT 1', s.accountId);
  const out: string[] = me?.email ? [me.email] : [];
  if (onlyMe) return out;
  const co = await one<{ report_extra_emails: string | null }>(env, 'SELECT report_extra_emails FROM companies WHERE id=?', s.companyId);
  for (const e of String(co?.report_extra_emails ?? '').split(',').map((x) => x.trim()).filter((x) => /^\S+@\S+\.\S+$/.test(x))) if (!out.includes(e)) out.push(e);
  return out;
}

/* ---------------- router ---------------- */

export async function handleReportRoutes(request: Request, env: Env, url: URL): Promise<Response | null> {
  const path = url.pathname;
  if (!path.startsWith('/api/reports/')) return null;
  const m = request.method;
  try {
    if (path === '/api/reports/summary' && m === 'GET') return await summary(request, env, url);
    if (path === '/api/reports/clients' && m === 'GET') return await clientList(request, env);
    const st = path.match(/^\/api\/reports\/statement\/([0-9a-fA-F-]{36})$/);
    if (st && m === 'GET') return await statement(request, env, url, st[1]);

    if (path.startsWith('/api/reports/email/')) {
      const s = await guard(request, env, m === 'POST' && path.endsWith('/send') ? 'finance.manage' : 'finance.view');
      if (s instanceof Response) return s;
      await ensure(env.DB);
      const co = await one<{ name: string }>(env, 'SELECT name FROM companies WHERE id=?', s.companyId);
      const name = co?.name || 'Nexora AdPilot';
      if (path === '/api/reports/email/preview' && m === 'GET') return json({ ok: true, ...(await buildDigest(env, s.companyId, name)) });
      if (path === '/api/reports/email/history' && m === 'GET') return json({ ok: true, history: await rows(env, 'SELECT id, kind, recipients, status, error, created_at FROM report_email_log WHERE company_id=? ORDER BY created_at DESC LIMIT 30', s.companyId) });
      if (path === '/api/reports/email/send' && m === 'POST') {
        const b = (await request.json().catch(() => ({}))) as Record<string, any>;
        const onlyMe = b.to === 'me';
        const r = await sendDigest(env, s.companyId, name, await recipientsFor(env, s, onlyMe), onlyMe ? 'test' : 'manual');
        return json({ ok: r.ok, message: r.message }, r.ok ? 200 : 502);
      }
    }

    if (path === '/api/reports/saved') {
      const s = await guard(request, env);
      if (s instanceof Response) return s;
      await ensure(env.DB);
      if (m === 'GET') return json({ ok: true, saved: await rows(env, 'SELECT id, name, report, params, created_at FROM saved_reports WHERE company_id=? ORDER BY created_at DESC LIMIT 50', s.companyId) });
      if (m === 'POST') {
        const b = (await request.json().catch(() => ({}))) as Record<string, any>;
        const name = String(b.name ?? '').trim().slice(0, 60);
        const report = String(b.report ?? '').slice(0, 30);
        if (!name || !report) return fail(400, 'A name is required.');
        await env.DB.prepare('INSERT INTO saved_reports (id, company_id, name, report, params, created_at) VALUES (?,?,?,?,?,?)')
          .bind(crypto.randomUUID(), s.companyId, name, report, JSON.stringify(b.params ?? {}).slice(0, 1000), new Date().toISOString()).run();
        return json({ ok: true });
      }
    }
    const sv = path.match(/^\/api\/reports\/saved\/([0-9a-fA-F-]{36})$/);
    if (sv && m === 'DELETE') {
      const s = await guard(request, env);
      if (s instanceof Response) return s;
      await env.DB.prepare('DELETE FROM saved_reports WHERE id=? AND company_id=?').bind(sv[1], s.companyId).run();
      return json({ ok: true });
    }
  } catch (e) {
    console.error('reports', e);
    return fail(500, 'Unable to complete the request. Please try again.', 'REPORT_REQUEST_FAILED');
  }
  return null;
}
