import type { Env } from '../index';
import { resolveSession, type SessionContext } from '../auth/session';
import { snapshot } from '../credit/creditRoutes';

/**
 * Real notifications.
 * - Stored in `app_notifications` (one row per event, deduplicated by `dedupe_key`).
 * - Read / archived state is kept per person in `notification_state`.
 * - Staff notifications are generated from live data (overdue invoices, payments, proposals,
 *   credit limits, campaigns, leads) when the list is requested, plus events that other modules
 *   push through `notify`. Client notifications are generated for the signed-in client only.
 * - Each person can mute categories (`notification_prefs`).
 * Every query is scoped by `session.companyId`.
 */

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const fail = (status: number, message: string, error = 'INVALID_INPUT') => json({ ok: false, error, message }, status);

const dayNum = (iso: string) => Math.floor(new Date(String(iso).slice(0, 10) + 'T00:00:00Z').getTime() / 86400000);
const isoOf = (n: number) => new Date(n * 86400000).toISOString().slice(0, 10);
const todayIso = () => new Date().toISOString().slice(0, 10);
const nowIso = () => new Date().toISOString();
const money = (n: number, cur: string) => `${cur} ${Math.round(Number(n) || 0).toLocaleString('en-US')}`;

export const CATEGORIES = ['finance', 'credit', 'campaign', 'proposal', 'crm', 'client', 'system'] as const;
const CATEGORY_PERM: Record<string, string | null> = { finance: 'finance.view', credit: 'finance.view', campaign: 'campaigns.manage', proposal: 'proposals.manage', crm: 'crm.manage', client: null, system: null };

let ready = false;
async function ensure(db: D1Database): Promise<void> {
  if (ready) return;
  await db.prepare(`CREATE TABLE IF NOT EXISTS app_notifications (
    id TEXT PRIMARY KEY, company_id TEXT NOT NULL, audience TEXT NOT NULL DEFAULT 'staff', client_id TEXT,
    dedupe_key TEXT NOT NULL, severity TEXT NOT NULL, category TEXT NOT NULL, title TEXT NOT NULL,
    detail TEXT, link_path TEXT, created_at TEXT NOT NULL)`).run();
  await db.prepare('CREATE UNIQUE INDEX IF NOT EXISTS ux_app_notif_key ON app_notifications(company_id, dedupe_key)').run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS notification_state (
    notification_id TEXT NOT NULL, account_id TEXT NOT NULL, read_at TEXT, archived INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (notification_id, account_id))`).run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS notification_prefs (
    account_id TEXT NOT NULL, company_id TEXT NOT NULL, muted TEXT, PRIMARY KEY (account_id, company_id))`).run();
  ready = true;
}

async function rows<T = any>(env: Env, sql: string, ...binds: unknown[]): Promise<T[]> {
  const r = await env.DB.prepare(sql).bind(...binds).all<T>();
  return (r.results ?? []) as T[];
}
async function safeRows<T = any>(env: Env, sql: string, ...binds: unknown[]): Promise<T[]> {
  try { return await rows<T>(env, sql, ...binds); } catch { return []; }
}

export interface NotifyInput {
  audience?: 'staff' | 'client';
  clientId?: string | null;
  key: string;
  severity?: 'info' | 'success' | 'warning' | 'critical';
  category: (typeof CATEGORIES)[number];
  title: string;
  detail?: string;
  link?: string;
}

/** Adds a notification once. The same `key` for the same company never creates a second row. */
export async function notify(env: Env, companyId: string, n: NotifyInput): Promise<void> {
  try {
    await ensure(env.DB);
    await env.DB.prepare(`INSERT OR IGNORE INTO app_notifications (id, company_id, audience, client_id, dedupe_key, severity, category, title, detail, link_path, created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(crypto.randomUUID(), companyId, n.audience ?? 'staff', n.clientId ?? null, n.key.slice(0, 160), n.severity ?? 'info', n.category, n.title.slice(0, 140), (n.detail ?? '').slice(0, 300), n.link ?? null, nowIso()).run();
  } catch { /* notifications are best effort */ }
}

export async function clientIdOf(env: Env, s: SessionContext): Promise<string | null> {
  const r = await env.DB.prepare('SELECT client_id FROM company_memberships WHERE id = ? AND account_id = ? AND company_id = ?')
    .bind(s.membershipId, s.accountId, s.companyId).first<{ client_id: string | null }>();
  return r?.client_id ?? null;
}

const lastRun = new Map<string, number>();
const due = (key: string, ms: number): boolean => {
  const t = Date.now();
  if ((lastRun.get(key) ?? 0) + ms > t) return false;
  lastRun.set(key, t);
  return true;
};

export async function generateStaff(env: Env, companyId: string): Promise<void> {
  if (!due('s:' + companyId, 3 * 60 * 1000)) return;
  await ensure(env.DB);
  const today = todayIso();
  const tNum = dayNum(today);
  const cur = (await safeRows<{ default_currency: string }>(env, 'SELECT default_currency FROM companies WHERE id = ? LIMIT 1', companyId))[0]?.default_currency || 'PKR';

  const od = await safeRows<any>(env, `SELECT i.id, i.invoice_number, i.due_date, (i.total_amount - i.amount_paid) bal, c.name cname
    FROM invoices i LEFT JOIN clients c ON c.id = i.client_id
    WHERE i.company_id = ? AND i.status NOT IN ('paid','cancelled') AND (i.total_amount - i.amount_paid) > 0.009 AND i.due_date < ? ORDER BY i.due_date ASC LIMIT 40`, companyId, today);
  for (const i of od) {
    const late = tNum - dayNum(i.due_date);
    await notify(env, companyId, { key: `overdue:${i.id}`, severity: late > 30 ? 'critical' : 'warning', category: 'finance', title: 'Invoice overdue', detail: `${i.invoice_number} from ${i.cname ?? 'a client'} is ${late} days overdue (${money(i.bal, cur)}).`, link: '/finance' });
  }
  const pays = await safeRows<any>(env, `SELECT p.id, p.amount, i.invoice_number, c.name cname FROM invoice_payments p INNER JOIN invoices i ON i.id = p.invoice_id LEFT JOIN clients c ON c.id = i.client_id
    WHERE i.company_id = ? AND substr(p.payment_date,1,10) >= ? ORDER BY p.payment_date DESC LIMIT 40`, companyId, isoOf(tNum - 7));
  for (const p of pays) await notify(env, companyId, { key: `pay:${p.id}`, severity: 'success', category: 'finance', title: 'Payment received', detail: `${money(p.amount, cur)} from ${p.cname ?? 'a client'} for ${p.invoice_number}.`, link: '/finance' });

  const sent = await safeRows<any>(env, `SELECT p.id, p.code, p.valid_until, p.sent_at, c.name cname FROM proposals p LEFT JOIN clients c ON c.id = p.client_id WHERE p.company_id = ? AND p.status = 'sent' LIMIT 100`, companyId);
  for (const p of sent) {
    if (p.valid_until) {
      const left = dayNum(p.valid_until) - tNum;
      if (left >= 0 && left <= 3) await notify(env, companyId, { key: `pexp:${p.id}`, severity: 'warning', category: 'proposal', title: 'Proposal expiring soon', detail: `${p.code} for ${p.cname ?? 'a client'} expires in ${left} day${left === 1 ? '' : 's'}.`, link: '/proposals' });
    }
    if (p.sent_at && tNum - dayNum(p.sent_at) >= 5) await notify(env, companyId, { key: `pnr:${p.id}`, severity: 'info', category: 'proposal', title: 'Follow up on a proposal', detail: `${p.code} for ${p.cname ?? 'a client'} was sent ${tNum - dayNum(p.sent_at)} days ago with no reply.`, link: '/proposals' });
  }

  try {
    for (const c of await snapshot(env, companyId)) {
      if (c.credit_limit > 0 && c.utilization >= 100) await notify(env, companyId, { key: `credit100:${c.id}`, severity: 'critical', category: 'credit', title: 'Credit limit exceeded', detail: `${c.name} is at ${c.utilization}% of the credit limit.`, link: '/clients/credit-risk' });
      else if (c.credit_limit > 0 && c.utilization >= 80) await notify(env, companyId, { key: `credit80:${c.id}`, severity: 'warning', category: 'credit', title: 'Credit limit almost reached', detail: `${c.name} has used ${c.utilization}% of the credit limit.`, link: '/clients/credit-risk' });
    }
  } catch { /* ignore */ }

  const soon = await safeRows<any>(env, `SELECT id, name, status, start_date, end_date FROM campaigns WHERE company_id = ? AND status IN ('booked','live') AND (start_date BETWEEN ? AND ? OR end_date BETWEEN ? AND ?) LIMIT 60`, companyId, today, isoOf(tNum + 3), today, isoOf(tNum + 3));
  for (const c of soon) {
    if (c.status === 'booked' && c.start_date >= today && c.start_date <= isoOf(tNum + 3)) await notify(env, companyId, { key: `cstart:${c.id}`, severity: 'info', category: 'campaign', title: 'Campaign starting soon', detail: `${c.name} starts on ${c.start_date}.`, link: `/campaigns/${c.id}` });
    if (c.status === 'live' && c.end_date >= today && c.end_date <= isoOf(tNum + 3)) await notify(env, companyId, { key: `cend:${c.id}`, severity: 'info', category: 'campaign', title: 'Campaign ending soon', detail: `${c.name} ends on ${c.end_date}. Consider renewing it.`, link: `/campaigns/${c.id}` });
  }
  const leads = await safeRows<any>(env, `SELECT id, company_name FROM leads WHERE company_id = ? AND substr(created_at,1,10) >= ? ORDER BY created_at DESC LIMIT 20`, companyId, isoOf(tNum - 3));
  for (const l of leads) await notify(env, companyId, { key: `lead:${l.id}`, severity: 'info', category: 'crm', title: 'New lead', detail: `${l.company_name} was added to the pipeline.`, link: '/crm' });

  try {
    const old = isoOf(tNum - 90);
    await env.DB.prepare('DELETE FROM notification_state WHERE notification_id IN (SELECT id FROM app_notifications WHERE company_id = ? AND substr(created_at,1,10) < ?)').bind(companyId, old).run();
    await env.DB.prepare('DELETE FROM app_notifications WHERE company_id = ? AND substr(created_at,1,10) < ?').bind(companyId, old).run();
  } catch { /* ignore */ }
}

export async function generateClient(env: Env, companyId: string, clientId: string): Promise<void> {
  if (!due(`c:${companyId}:${clientId}`, 2 * 60 * 1000)) return;
  await ensure(env.DB);
  const today = todayIso();
  const tNum = dayNum(today);
  const from = isoOf(tNum - 30);
  const mk = (key: string, severity: NotifyInput['severity'], title: string, detail: string, link: string) =>
    notify(env, companyId, { audience: 'client', clientId, key, severity, category: 'client', title, detail, link });
  const invs = await safeRows<any>(env, `SELECT id, invoice_number, due_date, total_amount, amount_paid, currency, status, issue_date FROM invoices WHERE company_id = ? AND client_id = ? AND status NOT IN ('cancelled','draft') AND (substr(issue_date,1,10) >= ? OR (status != 'paid' AND substr(due_date,1,10) < ?)) LIMIT 60`, companyId, clientId, from, today);
  for (const i of invs) {
    await mk(`cinv:${i.id}`, 'info', 'New invoice', `${i.invoice_number} for ${money(i.total_amount, i.currency || 'PKR')} is due on ${String(i.due_date).slice(0, 10)}.`, 'invoices');
    if (i.status !== 'paid' && i.due_date && String(i.due_date).slice(0, 10) < today) await mk(`coverdue:${i.id}`, 'warning', 'Invoice overdue', `${i.invoice_number} was due on ${String(i.due_date).slice(0, 10)}.`, 'invoices');
  }
  const pays = await safeRows<any>(env, `SELECT p.id, p.amount, i.invoice_number, i.currency FROM invoice_payments p INNER JOIN invoices i ON i.id = p.invoice_id WHERE i.company_id = ? AND i.client_id = ? AND substr(p.payment_date,1,10) >= ? LIMIT 40`, companyId, clientId, from);
  for (const p of pays) await mk(`cpay:${p.id}`, 'success', 'Payment received', `We received ${money(p.amount, p.currency || 'PKR')} for ${p.invoice_number}. Thank you.`, 'payments');
  const props = await safeRows<any>(env, `SELECT id, code, campaign_name FROM proposals WHERE company_id = ? AND client_id = ? AND status = 'sent' LIMIT 20`, companyId, clientId);
  for (const p of props) await mk(`cprop:${p.id}`, 'info', 'New proposal', `${p.code}: ${p.campaign_name} is ready for your review.`, 'proposals');
  const cre = await safeRows<any>(env, `SELECT c.id, c.name, c.version FROM campaign_creatives c INNER JOIN campaigns k ON k.id = c.campaign_id WHERE c.company_id = ? AND k.client_id = ? AND c.status = 'client_review' LIMIT 20`, companyId, clientId);
  for (const c of cre) await mk(`ccre:${c.id}:${c.version}`, 'warning', 'Creative waiting for your review', `${c.name} needs your approval.`, 'campaigns');
  const live = await safeRows<any>(env, `SELECT id, name FROM campaigns WHERE company_id = ? AND client_id = ? AND status = 'live' LIMIT 20`, companyId, clientId);
  for (const c of live) await mk(`clive:${c.id}`, 'success', 'Campaign is live', `${c.name} is now running.`, 'campaigns');
}

async function mutedOf(env: Env, s: SessionContext): Promise<string[]> {
  const r = await env.DB.prepare('SELECT muted FROM notification_prefs WHERE account_id = ? AND company_id = ?').bind(s.accountId, s.companyId).first<{ muted: string | null }>();
  try { const a = JSON.parse(r?.muted || '[]'); return Array.isArray(a) ? a.map(String) : []; } catch { return []; }
}

export async function handleNotificationRoutes(request: Request, env: Env, url: URL): Promise<Response | null> {
  const path = url.pathname;
  if (!path.startsWith('/api/notifications')) return null;
  const m = request.method;
  try {
    const s = await resolveSession(request, env.DB);
    if (!s) return json({ ok: false, error: 'UNAUTHENTICATED' }, 401);
    await ensure(env.DB);
    const isClient = s.accountType === 'client';
    const clientId = isClient ? await clientIdOf(env, s) : null;
    if (isClient && !clientId) return json({ ok: true, items: [], unread: 0, muted: [] });

    if (path === '/api/notifications' && m === 'GET') {
      if (isClient) await generateClient(env, s.companyId, clientId as string);
      else await generateStaff(env, s.companyId);
      const muted = await mutedOf(env, s);
      const allowed = isClient ? ['client'] : CATEGORIES.filter((c) => !CATEGORY_PERM[c] || s.permissions.includes(CATEGORY_PERM[c] as any)).filter((c) => c !== 'client');
      const cats = allowed.filter((c) => !muted.includes(c));
      if (!cats.length) return json({ ok: true, items: [], unread: 0, muted, categories: allowed });
      const ph = cats.map(() => '?').join(',');
      const items = await rows<any>(env, `SELECT n.id, n.severity, n.category, n.title, n.detail, n.link_path, n.created_at, CASE WHEN st.read_at IS NULL THEN 0 ELSE 1 END AS read
        FROM app_notifications n LEFT JOIN notification_state st ON st.notification_id = n.id AND st.account_id = ?
        WHERE n.company_id = ? AND n.audience = ? ${isClient ? 'AND n.client_id = ?' : ''} AND n.category IN (${ph}) AND COALESCE(st.archived, 0) = 0
        ORDER BY n.created_at DESC LIMIT 150`, s.accountId, s.companyId, isClient ? 'client' : 'staff', ...(isClient ? [clientId] : []), ...cats);
      const out = items.map((n) => ({ ...n, read: !!n.read }));
      return json({ ok: true, items: out, unread: out.filter((n) => !n.read).length, muted, categories: allowed });
    }

    if ((path === '/api/notifications/read' || path === '/api/notifications/archive') && m === 'POST') {
      const b = (await request.json().catch(() => ({}))) as any;
      const archive = path.endsWith('/archive');
      const ids: string[] = Array.isArray(b.ids) ? b.ids.map(String).slice(0, 200) : [];
      let targets = ids;
      if (b.all) {
        const base = await rows<{ id: string }>(env, `SELECT n.id FROM app_notifications n LEFT JOIN notification_state st ON st.notification_id = n.id AND st.account_id = ?
          WHERE n.company_id = ? AND n.audience = ? ${isClient ? 'AND n.client_id = ?' : ''} AND ${archive ? 'st.read_at IS NOT NULL' : 'st.read_at IS NULL'} LIMIT 500`,
          s.accountId, s.companyId, isClient ? 'client' : 'staff', ...(isClient ? [clientId] : []));
        targets = base.map((x) => x.id);
      }
      if (targets.length) {
        // only touch notifications that belong to this company
        const ph = targets.map(() => '?').join(',');
        const own = await rows<{ id: string }>(env, `SELECT id FROM app_notifications WHERE company_id = ? AND id IN (${ph})`, s.companyId, ...targets);
        const stmts = own.map((o) => archive
          ? env.DB.prepare('INSERT INTO notification_state (notification_id, account_id, read_at, archived) VALUES (?,?,?,1) ON CONFLICT(notification_id, account_id) DO UPDATE SET archived = 1, read_at = COALESCE(read_at, excluded.read_at)').bind(o.id, s.accountId, nowIso())
          : env.DB.prepare('INSERT INTO notification_state (notification_id, account_id, read_at, archived) VALUES (?,?,?,0) ON CONFLICT(notification_id, account_id) DO UPDATE SET read_at = COALESCE(read_at, excluded.read_at)').bind(o.id, s.accountId, nowIso()));
        if (stmts.length) await env.DB.batch(stmts);
      }
      return json({ ok: true });
    }

    if (path === '/api/notifications/prefs' && m === 'PUT') {
      const b = (await request.json().catch(() => ({}))) as any;
      const muted = (Array.isArray(b.muted) ? b.muted : []).map(String).filter((c: string) => (CATEGORIES as readonly string[]).includes(c));
      await env.DB.prepare('INSERT INTO notification_prefs (account_id, company_id, muted) VALUES (?,?,?) ON CONFLICT(account_id, company_id) DO UPDATE SET muted = excluded.muted')
        .bind(s.accountId, s.companyId, JSON.stringify(muted)).run();
      return json({ ok: true, muted });
    }
    return fail(404, 'Not found.', 'NOT_FOUND');
  } catch {
    return fail(500, 'Unable to complete the request. Please try again.', 'NOTIFICATION_REQUEST_FAILED');
  }
}
