import type { Env } from '../index';
import { resolveSession, type SessionContext } from '../auth/session';
import { clientIdOf, notify } from '../notifications/notificationRoutes';
import { totals } from '../proposals/proposalRoutes';
import { log as logCampaign } from '../campaigns/campaignRoutes';

/**
 * Client Portal API. Only signed-in client accounts can use it, and every query is limited to
 * that one client (company_id AND client_id), so a client can never see another client's data.
 * Read-only except for: approving or rejecting a creative, accepting or declining a proposal,
 * telling us a payment was made (a note for the finance team, it does not change any balance),
 * and sending a message.
 */

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const fail = (status: number, message: string, error = 'INVALID_INPUT') => json({ ok: false, error, message }, status);
const todayIso = () => new Date().toISOString().slice(0, 10);
const nowIso = () => new Date().toISOString();
const dayNum = (iso: string) => Math.floor(new Date(String(iso).slice(0, 10) + 'T00:00:00Z').getTime() / 86400000);
const r2 = (n: unknown) => Math.round((Number(n) || 0) * 100) / 100;
const text = (v: unknown, max: number): string => String(v ?? '').trim().slice(0, max);

let ready = false;
async function ensure(db: D1Database): Promise<void> {
  if (ready) return;
  await db.prepare(`CREATE TABLE IF NOT EXISTS portal_payment_notices (
    id TEXT PRIMARY KEY, company_id TEXT NOT NULL, client_id TEXT NOT NULL, invoice_id TEXT NOT NULL,
    amount REAL, method TEXT, reference TEXT, note TEXT, status TEXT NOT NULL DEFAULT 'pending', created_at TEXT NOT NULL)`).run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS portal_messages (
    id TEXT PRIMARY KEY, company_id TEXT NOT NULL, client_id TEXT NOT NULL, subject TEXT, body TEXT NOT NULL, created_at TEXT NOT NULL)`).run();
  ready = true;
}

async function rows<T = any>(env: Env, sql: string, ...binds: unknown[]): Promise<T[]> {
  const r = await env.DB.prepare(sql).bind(...binds).all<T>();
  return (r.results ?? []) as T[];
}
async function safeRows<T = any>(env: Env, sql: string, ...binds: unknown[]): Promise<T[]> {
  try { return await rows<T>(env, sql, ...binds); } catch { return []; }
}
async function one<T = any>(env: Env, sql: string, ...binds: unknown[]): Promise<T | null> {
  try { return (await env.DB.prepare(sql).bind(...binds).first<T>()) ?? null; } catch { return null; }
}

interface Ctx { s: SessionContext; clientId: string; email: string }

async function letterhead(env: Env, companyId: string) {
  const p = await one<any>(env, `SELECT legal_name, address, city, country, phone, email, ntn, bank_name, bank_account_title, bank_iban, invoice_footer FROM company_profiles WHERE company_id = ? LIMIT 1`, companyId);
  const c = await one<any>(env, 'SELECT name, default_currency FROM companies WHERE id = ? LIMIT 1', companyId);
  const br = await one<any>(env, 'SELECT logo_file_id FROM company_branding WHERE company_id = ?', companyId);
  return {
    logoUrl: br?.logo_file_id ? `/api/files/${br.logo_file_id}/logo` : '',
    name: p?.legal_name || c?.name || 'Your account manager',
    address: [p?.address, p?.city, p?.country].filter(Boolean).join(', '),
    phone: p?.phone ?? '', email: p?.email ?? '', ntn: p?.ntn ?? '',
    bankName: p?.bank_name ?? '', bankTitle: p?.bank_account_title ?? '', bankIban: p?.bank_iban ?? '',
    footer: p?.invoice_footer ?? '', currency: c?.default_currency || 'PKR',
  };
}

async function staffNotify(env: Env, c: Ctx, n: { key: string; category: 'finance' | 'campaign' | 'proposal' | 'client'; severity?: 'info' | 'success' | 'warning'; title: string; detail: string; link: string }) {
  const cl = await one<{ name: string }>(env, 'SELECT name FROM clients WHERE id = ? AND company_id = ?', c.clientId, c.s.companyId);
  await notify(env, c.s.companyId, { key: n.key, category: n.category, severity: n.severity ?? 'info', title: n.title, detail: `${cl?.name ?? 'A client'}: ${n.detail}`, link: n.link });
}

export async function handlePortalRoutes(request: Request, env: Env, url: URL): Promise<Response | null> {
  const path = url.pathname;
  if (!path.startsWith('/api/client-portal')) return null;
  const m = request.method;
  try {
    const s = await resolveSession(request, env.DB);
    if (!s) return json({ ok: false, error: 'UNAUTHENTICATED' }, 401);
    if (s.accountType !== 'client') return fail(403, 'The client portal is only for client accounts.', 'UNAUTHORIZED_CLIENT');
    await ensure(env.DB);
    const clientId = await clientIdOf(env, s);
    if (!clientId) return fail(403, 'This account is not linked to a client.', 'UNAUTHORIZED_CLIENT');
    const acc = await one<{ email: string }>(env, 'SELECT email FROM accounts WHERE id = ? LIMIT 1', s.accountId);
    const c: Ctx = { s, clientId, email: acc?.email ?? '' };
    const cid = s.companyId;
    const today = todayIso();
    const sub = path.replace('/api/client-portal', '') || '/';
    const body = async () => ((await request.json().catch(() => ({}))) as Record<string, any>);

    if (sub === '/overview' && m === 'GET') {
      const lh = await letterhead(env, cid);
      const client = await one<any>(env, 'SELECT id, name, email, phone FROM clients WHERE id = ? AND company_id = ?', clientId, cid);
      const invs = await safeRows<any>(env, `SELECT id, invoice_number, due_date, total_amount, amount_paid, status FROM invoices WHERE company_id = ? AND client_id = ? AND status NOT IN ('cancelled','draft')`, cid, clientId);
      let outstanding = 0, overdue = 0, next: any = null;
      for (const i of invs) {
        const bal = Math.max(0, (Number(i.total_amount) || 0) - (Number(i.amount_paid) || 0));
        if (i.status === 'paid' || bal <= 0.009) continue;
        outstanding += bal;
        if (i.due_date && String(i.due_date).slice(0, 10) < today) overdue += bal;
        if (!next || String(i.due_date) < String(next.due_date)) next = { id: i.id, invoice_number: i.invoice_number, due_date: String(i.due_date).slice(0, 10), balance: r2(bal) };
      }
      const paid = await one<{ t: number }>(env, `SELECT COALESCE(SUM(p.amount),0) t FROM invoice_payments p INNER JOIN invoices i ON i.id = p.invoice_id WHERE i.company_id = ? AND i.client_id = ?`, cid, clientId);
      const active = await one<{ n: number }>(env, `SELECT COUNT(*) n FROM campaigns WHERE company_id = ? AND client_id = ? AND status = 'live'`, cid, clientId);
      const pend = await one<{ n: number }>(env, `SELECT COUNT(*) n FROM campaign_creatives c INNER JOIN campaigns k ON k.id = c.campaign_id WHERE c.company_id = ? AND k.client_id = ? AND c.status = 'client_review'`, cid, clientId);
      const props = await one<{ n: number }>(env, `SELECT COUNT(*) n FROM proposals WHERE company_id = ? AND client_id = ? AND status = 'sent'`, cid, clientId);
      return json({ ok: true, client, company: lh, kpis: { active_campaigns: active?.n ?? 0, outstanding: r2(outstanding), overdue: r2(overdue), total_paid: r2(paid?.t ?? 0), next_due: next, pending_creatives: pend?.n ?? 0, open_proposals: props?.n ?? 0 } });
    }

    if (sub === '/campaigns' && m === 'GET') {
      const data = await safeRows<any>(env, `SELECT k.id, k.name, k.status, k.start_date, k.end_date, k.total_budget, k.currency,
        (SELECT COUNT(*) FROM campaign_screens cs WHERE cs.campaign_id = k.id) AS screens,
        (SELECT COUNT(*) FROM campaign_creatives cc WHERE cc.campaign_id = k.id AND cc.status = 'client_review') AS pending_creatives
        FROM campaigns k WHERE k.company_id = ? AND k.client_id = ? AND k.status != 'draft' ORDER BY k.start_date DESC`, cid, clientId);
      return json({ ok: true, data });
    }

    const camp = sub.match(/^\/campaigns\/([0-9a-fA-F-]{36})(?:\/creatives\/([0-9a-fA-F-]{36})\/decision)?$/);
    if (camp) {
      const k = await one<any>(env, `SELECT id, name, status, start_date, end_date, total_budget, currency FROM campaigns WHERE id = ? AND company_id = ? AND client_id = ? AND status != 'draft'`, camp[1], cid, clientId);
      if (!k) return fail(404, 'Campaign not found.', 'NOT_FOUND');
      if (!camp[2] && m === 'GET') {
        const screens = await safeRows<any>(env, `SELECT cs.slots, cs.rate_applied, i.name, i.city, i.screen_type FROM campaign_screens cs LEFT JOIN inventory i ON i.id = cs.inventory_id WHERE cs.campaign_id = ?`, k.id);
        const creatives = await safeRows<any>(env, `SELECT id, name, url, status, version, updated_at FROM campaign_creatives WHERE company_id = ? AND campaign_id = ? ORDER BY created_at DESC`, cid, k.id);
        let proofs = await safeRows<any>(env, `SELECT p.id, p.proof_date, p.photo_url, p.notes, p.geo_ok, p.taken_at, i.name screen_name, i.city FROM campaign_proofs p LEFT JOIN inventory i ON i.id = p.inventory_id WHERE p.company_id = ? AND p.campaign_id = ? ORDER BY p.proof_date DESC LIMIT 60`, cid, k.id);
        if (proofs.length === 0) proofs = await safeRows<any>(env, `SELECT p.id, p.proof_date, p.photo_url, p.notes, i.name screen_name, i.city FROM campaign_proofs p LEFT JOIN inventory i ON i.id = p.inventory_id WHERE p.company_id = ? AND p.campaign_id = ? ORDER BY p.proof_date DESC LIMIT 60`, cid, k.id);
        return json({ ok: true, campaign: k, screens, creatives, proofs });
      }
      if (camp[2] && m === 'POST') {
        const b = await body();
        const to = String(b.decision ?? '');
        if (to !== 'approved' && to !== 'rejected') return fail(400, 'Please choose approve or reject.');
        const comment = text(b.comment, 300);
        if (to === 'rejected' && !comment) return fail(400, 'Please tell us what needs to change.');
        const cr = await one<any>(env, 'SELECT id, name, status FROM campaign_creatives WHERE id = ? AND company_id = ? AND campaign_id = ?', camp[2], cid, k.id);
        if (!cr) return fail(404, 'Creative not found.', 'NOT_FOUND');
        if (cr.status !== 'client_review') return fail(409, 'This creative is not waiting for your review.', 'INVALID_STATE');
        await env.DB.batch([
          env.DB.prepare('UPDATE campaign_creatives SET status = ?, updated_at = ? WHERE id = ? AND company_id = ?').bind(to, nowIso(), cr.id, cid),
          env.DB.prepare('INSERT INTO creative_reviews (id, company_id, creative_id, from_status, to_status, comment, actor_email, created_at) VALUES (?,?,?,?,?,?,?,?)')
            .bind(crypto.randomUUID(), cid, cr.id, cr.status, to, comment || null, c.email, nowIso()),
        ]);
        await logCampaign(env, s, k.id, `Client ${to} a creative`, cr.name);
        await staffNotify(env, c, { key: `cdec:${cr.id}:${to}:${Date.now()}`, category: 'campaign', severity: to === 'approved' ? 'success' : 'warning', title: `Client ${to} a creative`, detail: `${cr.name} in ${k.name}${comment ? `: ${comment}` : ''}`, link: `/campaigns/${k.id}` });
        return json({ ok: true });
      }
    }

    if (sub === '/proposals' && m === 'GET') {
      const list = await safeRows<any>(env, `SELECT p.id, p.code, p.campaign_name, p.status, p.start_date, p.end_date, p.valid_until, p.currency, p.discount_pct, p.tax_rate, p.sent_at, p.decided_at FROM proposals p WHERE p.company_id = ? AND p.client_id = ? AND p.status != 'draft' ORDER BY p.created_at DESC`, cid, clientId);
      const out = [];
      for (const p of list) {
        const items = await safeRows<any>(env, 'SELECT rate, slots, days FROM proposal_items WHERE proposal_id = ?', p.id);
        out.push({ ...p, total: totals(items, p.discount_pct, p.tax_rate).total, screens: items.length });
      }
      return json({ ok: true, data: out });
    }
    const prop = sub.match(/^\/proposals\/([0-9a-fA-F-]{36})(\/decision)?$/);
    if (prop) {
      const p = await one<any>(env, `SELECT p.*, c.name client_name, c.email client_email, c.phone client_phone FROM proposals p LEFT JOIN clients c ON c.id = p.client_id WHERE p.id = ? AND p.company_id = ? AND p.client_id = ? AND p.status != 'draft'`, prop[1], cid, clientId);
      if (!p) return fail(404, 'Proposal not found.', 'NOT_FOUND');
      if (!prop[2] && m === 'GET') {
        const items = await safeRows<any>(env, `SELECT pi.id, pi.inventory_id, pi.description, pi.slots, pi.rate, pi.days, i.name, i.city, i.screen_type FROM proposal_items pi LEFT JOIN inventory i ON i.id = pi.inventory_id WHERE pi.proposal_id = ?`, p.id);
        const t = totals(items, p.discount_pct, p.tax_rate);
        return json({ ok: true, proposal: p, items, ...t, nextStatuses: [], activity: [], campaign: null, company: await letterhead(env, cid) });
      }
      if (prop[2] && m === 'POST') {
        const b = await body();
        const to = String(b.decision ?? '');
        if (to !== 'accepted' && to !== 'rejected') return fail(400, 'Please choose accept or decline.');
        if (p.status !== 'sent') return fail(409, 'This proposal can no longer be changed.', 'INVALID_STATE');
        if (p.valid_until && String(p.valid_until).slice(0, 10) < today) return fail(409, 'This proposal has expired. Please ask us for a new one.', 'INVALID_STATE');
        const name = text(b.name, 80);
        const comment = text(b.comment, 300);
        if (to === 'accepted' && name.length < 2) return fail(400, 'Please type your full name to accept.');
        await env.DB.prepare('UPDATE proposals SET status = ?, decided_at = ?, updated_at = ? WHERE id = ? AND company_id = ? AND status = ?').bind(to, nowIso(), nowIso(), p.id, cid, 'sent').run();
        try {
          await env.DB.prepare('INSERT INTO proposal_activity (id, company_id, proposal_id, actor_email, action, detail, created_at) VALUES (?,?,?,?,?,?,?)')
            .bind(crypto.randomUUID(), cid, p.id, c.email, to === 'accepted' ? 'Client accepted online' : 'Client declined online', (to === 'accepted' ? `Accepted by ${name}` : comment).slice(0, 300), nowIso()).run();
        } catch { /* ignore */ }
        await staffNotify(env, c, { key: `pdec:${p.id}:${to}`, category: 'proposal', severity: to === 'accepted' ? 'success' : 'warning', title: to === 'accepted' ? 'Proposal accepted by client' : 'Proposal declined by client', detail: `${p.code}${to === 'accepted' ? ` accepted by ${name}` : comment ? `: ${comment}` : ''}`, link: '/proposals' });
        return json({ ok: true });
      }
    }

    if (sub === '/invoices' && m === 'GET') {
      const data = await safeRows<any>(env, `SELECT id, invoice_number, issue_date, due_date, total_amount, amount_paid, currency, status FROM invoices WHERE company_id = ? AND client_id = ? AND status NOT IN ('draft','cancelled') ORDER BY issue_date DESC`, cid, clientId);
      return json({ ok: true, data: data.map((i) => ({ ...i, balance: r2(Math.max(0, i.total_amount - i.amount_paid)), status: i.status !== 'paid' && i.due_date && String(i.due_date).slice(0, 10) < today && i.total_amount - i.amount_paid > 0.009 ? 'overdue' : i.status })) });
    }
    const inv = sub.match(/^\/invoices\/([0-9a-fA-F-]{36})(\/paid-notice)?$/);
    if (inv) {
      const i = await one<any>(env, `SELECT * FROM invoices WHERE id = ? AND company_id = ? AND client_id = ? AND status NOT IN ('draft','cancelled')`, inv[1], cid, clientId);
      if (!i) return fail(404, 'Invoice not found.', 'NOT_FOUND');
      if (!inv[2] && m === 'GET') {
        const items = await safeRows<any>(env, 'SELECT description, quantity, rate, amount FROM invoice_items WHERE invoice_id = ?', i.id);
        const payments = await safeRows<any>(env, 'SELECT id, amount, payment_date, payment_method, reference_no FROM invoice_payments WHERE invoice_id = ? ORDER BY payment_date DESC', i.id);
        const notices = await safeRows<any>(env, 'SELECT id, amount, method, reference, status, created_at FROM portal_payment_notices WHERE company_id = ? AND client_id = ? AND invoice_id = ? ORDER BY created_at DESC LIMIT 10', cid, clientId, i.id);
        const client = await one<any>(env, 'SELECT name, email, phone, address FROM clients WHERE id = ?', clientId);
        return json({ ok: true, invoice: { ...i, balance: r2(Math.max(0, i.total_amount - i.amount_paid)) }, items, payments, notices, client, company: await letterhead(env, cid) });
      }
      if (inv[2] && m === 'POST') {
        const b = await body();
        const ref = text(b.reference, 80);
        if (!ref) return fail(400, 'Please enter the payment reference or transaction ID.');
        const open = await one<{ n: number }>(env, `SELECT COUNT(*) n FROM portal_payment_notices WHERE company_id = ? AND client_id = ? AND invoice_id = ? AND status = 'pending'`, cid, clientId, i.id);
        if ((open?.n ?? 0) >= 5) return fail(409, 'We already have several payment notes for this invoice. We will confirm them shortly.', 'INVALID_STATE');
        const amount = Math.max(0, Number(b.amount) || 0);
        await env.DB.prepare('INSERT INTO portal_payment_notices (id, company_id, client_id, invoice_id, amount, method, reference, note, status, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)')
          .bind(crypto.randomUUID(), cid, clientId, i.id, amount, text(b.method, 40) || null, ref, text(b.note, 200) || null, 'pending', nowIso()).run();
        await staffNotify(env, c, { key: `pnote:${i.id}:${ref}`, category: 'finance', severity: 'info', title: 'Client says a payment was made', detail: `${i.invoice_number}${amount ? `, ${i.currency || 'PKR'} ${Math.round(amount).toLocaleString('en-US')}` : ''}, reference ${ref}. Please check your bank and record the payment.`, link: '/finance' });
        return json({ ok: true, message: 'Thank you. We will confirm your payment shortly.' });
      }
    }

    if (sub === '/payments' && m === 'GET') {
      const data = await safeRows<any>(env, `SELECT p.id, p.amount, p.payment_date, p.payment_method, p.reference_no, i.invoice_number, i.currency FROM invoice_payments p INNER JOIN invoices i ON i.id = p.invoice_id WHERE i.company_id = ? AND i.client_id = ? ORDER BY p.payment_date DESC`, cid, clientId);
      return json({ ok: true, data });
    }

    if (sub === '/statement' && m === 'GET') {
      const invoices = await safeRows<any>(env, `SELECT id, invoice_number, issue_date, due_date, total_amount, amount_paid, currency, status FROM invoices WHERE company_id = ? AND client_id = ? AND status NOT IN ('draft','cancelled') ORDER BY issue_date ASC`, cid, clientId);
      const payments = await safeRows<any>(env, `SELECT p.amount, p.payment_date, p.payment_method, p.reference_no, i.invoice_number FROM invoice_payments p INNER JOIN invoices i ON i.id = p.invoice_id WHERE i.company_id = ? AND i.client_id = ? ORDER BY p.payment_date ASC`, cid, clientId);
      const client = await one<any>(env, 'SELECT name, email, phone, address FROM clients WHERE id = ?', clientId);
      return json({ ok: true, invoices, payments, client, company: await letterhead(env, cid), as_of: today });
    }

    if (sub === '/messages') {
      if (m === 'GET') return json({ ok: true, data: await safeRows<any>(env, 'SELECT id, subject, body, created_at FROM portal_messages WHERE company_id = ? AND client_id = ? ORDER BY created_at DESC LIMIT 30', cid, clientId) });
      if (m === 'POST') {
        const b = await body();
        const msg = text(b.body, 1000);
        if (msg.length < 3) return fail(400, 'Please write your message.');
        const recent = await one<{ n: number }>(env, `SELECT COUNT(*) n FROM portal_messages WHERE company_id = ? AND client_id = ? AND created_at > ?`, cid, clientId, new Date(Date.now() - 3600000).toISOString());
        if ((recent?.n ?? 0) >= 10) return fail(429, 'You have sent many messages in the last hour. Please try again later.', 'RATE_LIMITED');
        const subject = text(b.subject, 100);
        const id = crypto.randomUUID();
        await env.DB.prepare('INSERT INTO portal_messages (id, company_id, client_id, subject, body, created_at) VALUES (?,?,?,?,?,?)').bind(id, cid, clientId, subject || null, msg, nowIso()).run();
        await staffNotify(env, c, { key: `pmsg:${id}`, category: 'client', severity: 'info', title: 'New message from a client', detail: `${subject ? subject + ': ' : ''}${msg.slice(0, 160)}`, link: '/crm' });
        return json({ ok: true, message: 'Message sent. We will get back to you soon.' });
      }
    }
    return fail(404, 'Not found.', 'NOT_FOUND');
  } catch {
    return fail(500, 'Unable to complete the request. Please try again.', 'PORTAL_REQUEST_FAILED');
  }
}
