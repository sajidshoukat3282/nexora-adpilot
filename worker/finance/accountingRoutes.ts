import type { Env } from '../index';
import { resolveSession, type SessionContext } from '../auth/session';

/**
 * Finance "Phase A": vendors, bills (payables) and cash / bank accounts.
 * Tables are created on first use. Every query is scoped by
 * `session.companyId` (from the signed-in session, never from the request).
 */

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}
const fail = (status: number, message: string, error = 'INVALID_INPUT') => json({ ok: false, error, message }, status);

let tablesReady = false;
async function ensureTables(db: D1Database): Promise<void> {
  if (tablesReady) return;
  const stmts = [
    `CREATE TABLE IF NOT EXISTS vendors (
       id TEXT PRIMARY KEY, company_id TEXT NOT NULL, name TEXT NOT NULL,
       contact_name TEXT, phone TEXT, email TEXT, ntn TEXT, category TEXT, notes TEXT,
       created_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS bills (
       id TEXT PRIMARY KEY, company_id TEXT NOT NULL, vendor_id TEXT NOT NULL,
       bill_number TEXT, bill_date TEXT NOT NULL, due_date TEXT NOT NULL,
       subtotal REAL NOT NULL DEFAULT 0, tax_amount REAL NOT NULL DEFAULT 0,
       total_amount REAL NOT NULL DEFAULT 0, amount_paid REAL NOT NULL DEFAULT 0,
       currency TEXT NOT NULL DEFAULT 'PKR', status TEXT NOT NULL DEFAULT 'unpaid',
       notes TEXT, created_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS bill_payments (
       id TEXT PRIMARY KEY, company_id TEXT NOT NULL, bill_id TEXT NOT NULL,
       amount REAL NOT NULL, payment_date TEXT NOT NULL, method TEXT,
       account_id TEXT, reference_no TEXT, created_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS cash_accounts (
       id TEXT PRIMARY KEY, company_id TEXT NOT NULL, name TEXT NOT NULL,
       kind TEXT NOT NULL DEFAULT 'bank', opening_balance REAL NOT NULL DEFAULT 0,
       currency TEXT NOT NULL DEFAULT 'PKR', created_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS account_transactions (
       id TEXT PRIMARY KEY, company_id TEXT NOT NULL, account_id TEXT NOT NULL,
       tx_date TEXT NOT NULL, direction TEXT NOT NULL, amount REAL NOT NULL,
       description TEXT, ref_type TEXT, ref_id TEXT, created_at TEXT NOT NULL)`,
  ];
  for (const s of stmts) await db.prepare(s).run();
  tablesReady = true;
}

const money = (v: unknown): number | null => {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100) / 100;
};
const text = (v: unknown, max = 200): string => String(v ?? '').trim().slice(0, max);
const isDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const today = () => new Date().toISOString().slice(0, 10);

async function body(request: Request): Promise<Record<string, unknown>> {
  try {
    const b = await request.json();
    return b && typeof b === 'object' ? (b as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

type Guard = { session: SessionContext } | { response: Response };
async function guard(request: Request, env: Env, write: boolean): Promise<Guard> {
  const session = await resolveSession(request, env.DB);
  if (!session) return { response: json({ ok: false, error: 'UNAUTHENTICATED', message: 'No active authenticated session.' }, 401) };
  if (session.accountType === 'client') return { response: fail(403, 'Not available for client accounts.', 'FORBIDDEN') };
  const need = write ? 'finance.manage' : 'finance.view';
  if (!session.permissions.includes(need as never) && !session.permissions.includes('finance.manage' as never)) {
    return { response: fail(403, `You do not have permission to ${write ? 'change' : 'view'} finance data.`, 'FORBIDDEN') };
  }
  return { session };
}

/* ---------------- vendors ---------------- */

async function listVendors(env: Env, companyId: string): Promise<Response> {
  const rows = await env.DB
    .prepare(
      `SELECT v.*,
              COALESCE((SELECT SUM(b.total_amount - b.amount_paid) FROM bills b WHERE b.vendor_id = v.id AND b.company_id = v.company_id), 0) AS outstanding,
              COALESCE((SELECT COUNT(*) FROM bills b WHERE b.vendor_id = v.id AND b.company_id = v.company_id), 0) AS bill_count
         FROM vendors v WHERE v.company_id = ? ORDER BY v.name COLLATE NOCASE`,
    )
    .bind(companyId)
    .all();
  return json({ ok: true, data: rows.results });
}

async function saveVendor(request: Request, env: Env, companyId: string, id?: string): Promise<Response> {
  const b = await body(request);
  const name = text(b.name, 120);
  if (!name) return fail(400, 'Vendor name is required.');
  const vals = [name, text(b.contact_name, 100), text(b.phone, 40), text(b.email, 120), text(b.ntn, 30), text(b.category, 60), text(b.notes, 300)];
  if (id) {
    const res = await env.DB
      .prepare('UPDATE vendors SET name=?, contact_name=?, phone=?, email=?, ntn=?, category=?, notes=? WHERE id=? AND company_id=?')
      .bind(...vals, id, companyId)
      .run();
    if (!res.meta?.changes) return fail(404, 'Vendor not found.', 'NOT_FOUND');
    return json({ ok: true, message: 'Vendor updated.' });
  }
  const newId = crypto.randomUUID();
  await env.DB
    .prepare('INSERT INTO vendors (id, company_id, name, contact_name, phone, email, ntn, category, notes, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)')
    .bind(newId, companyId, ...vals, new Date().toISOString())
    .run();
  return json({ ok: true, message: 'Vendor added.', id: newId });
}

async function deleteVendor(env: Env, companyId: string, id: string): Promise<Response> {
  const used = await env.DB.prepare('SELECT COUNT(*) AS n FROM bills WHERE vendor_id = ? AND company_id = ?').bind(id, companyId).first<{ n: number }>();
  if ((used?.n ?? 0) > 0) return fail(409, 'This vendor has bills, so it cannot be deleted.', 'IN_USE');
  await env.DB.prepare('DELETE FROM vendors WHERE id = ? AND company_id = ?').bind(id, companyId).run();
  return json({ ok: true, message: 'Vendor deleted.' });
}

/* ---------------- bills ---------------- */

function billStatus(total: number, paid: number, due: string): string {
  if (paid >= total - 0.005) return 'paid';
  if (due < today()) return 'overdue';
  return paid > 0 ? 'partial' : 'unpaid';
}

async function listBills(env: Env, companyId: string): Promise<Response> {
  const rows = await env.DB
    .prepare(
      `SELECT b.*, v.name AS vendor_name
         FROM bills b INNER JOIN vendors v ON v.id = b.vendor_id
        WHERE b.company_id = ? ORDER BY b.due_date ASC, b.created_at DESC`,
    )
    .bind(companyId)
    .all<Record<string, any>>();
  const data = rows.results.map((r) => ({ ...r, status: billStatus(r.total_amount, r.amount_paid, r.due_date) }));
  return json({ ok: true, data });
}

async function createBill(request: Request, env: Env, companyId: string): Promise<Response> {
  const b = await body(request);
  const vendorId = text(b.vendor_id, 60);
  const vendor = await env.DB.prepare('SELECT id FROM vendors WHERE id = ? AND company_id = ?').bind(vendorId, companyId).first();
  if (!vendor) return fail(400, 'Please choose a vendor.');
  const subtotal = money(b.subtotal);
  const tax = money(b.tax_amount ?? 0);
  if (subtotal === null || subtotal <= 0) return fail(400, 'Amount must be greater than zero.');
  if (tax === null || tax < 0) return fail(400, 'Tax cannot be negative.');
  if (!isDate(b.bill_date) || !isDate(b.due_date)) return fail(400, 'Bill date and due date are required.');
  const total = Math.round((subtotal + tax) * 100) / 100;
  const company = await env.DB.prepare('SELECT default_currency FROM companies WHERE id = ?').bind(companyId).first<{ default_currency: string }>();
  const currency = text(b.currency, 3).toUpperCase() || company?.default_currency || 'PKR';
  const id = crypto.randomUUID();
  await env.DB
    .prepare(
      `INSERT INTO bills (id, company_id, vendor_id, bill_number, bill_date, due_date, subtotal, tax_amount, total_amount, amount_paid, currency, status, notes, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,0,?,'unpaid',?,?)`,
    )
    .bind(id, companyId, vendorId, text(b.bill_number, 60), b.bill_date, b.due_date, subtotal, tax, total, currency, text(b.notes, 300), new Date().toISOString())
    .run();
  return json({ ok: true, message: 'Bill added.', id });
}

async function deleteBill(env: Env, companyId: string, id: string): Promise<Response> {
  const paid = await env.DB.prepare('SELECT amount_paid FROM bills WHERE id = ? AND company_id = ?').bind(id, companyId).first<{ amount_paid: number }>();
  if (!paid) return fail(404, 'Bill not found.', 'NOT_FOUND');
  if (paid.amount_paid > 0) return fail(409, 'A bill with payments cannot be deleted.', 'IN_USE');
  await env.DB.prepare('DELETE FROM bills WHERE id = ? AND company_id = ?').bind(id, companyId).run();
  return json({ ok: true, message: 'Bill deleted.' });
}

async function payBill(request: Request, env: Env, session: SessionContext, id: string): Promise<Response> {
  const companyId = session.companyId;
  const b = await body(request);
  const bill = await env.DB
    .prepare('SELECT total_amount, amount_paid, due_date, bill_number FROM bills WHERE id = ? AND company_id = ?')
    .bind(id, companyId)
    .first<{ total_amount: number; amount_paid: number; due_date: string; bill_number: string }>();
  if (!bill) return fail(404, 'Bill not found.', 'NOT_FOUND');
  const amount = money(b.amount);
  const outstanding = Math.round((bill.total_amount - bill.amount_paid) * 100) / 100;
  if (amount === null || amount <= 0) return fail(400, 'Enter a payment amount.');
  if (amount > outstanding + 0.005) return fail(400, `The payment is more than the amount due (${outstanding}).`);
  const date = isDate(b.payment_date) ? b.payment_date : today();
  let accountId = text(b.account_id, 60);
  if (accountId) {
    const acc = await env.DB.prepare('SELECT id FROM cash_accounts WHERE id = ? AND company_id = ?').bind(accountId, companyId).first();
    if (!acc) accountId = '';
  }
  const paymentId = crypto.randomUUID();
  const now = new Date().toISOString();
  const stmts = [
    env.DB
      .prepare('INSERT INTO bill_payments (id, company_id, bill_id, amount, payment_date, method, account_id, reference_no, created_at) VALUES (?,?,?,?,?,?,?,?,?)')
      .bind(paymentId, companyId, id, amount, date, text(b.method, 40), accountId || null, text(b.reference_no, 60), now),
    env.DB
      .prepare('UPDATE bills SET amount_paid = ROUND(amount_paid + ?, 2) WHERE id = ? AND company_id = ?')
      .bind(amount, id, companyId),
  ];
  if (accountId) {
    stmts.push(
      env.DB
        .prepare(`INSERT INTO account_transactions (id, company_id, account_id, tx_date, direction, amount, description, ref_type, ref_id, created_at) VALUES (?,?,?,?, 'out', ?, ?, 'bill_payment', ?, ?)`)
        .bind(crypto.randomUUID(), companyId, accountId, date, amount, `Bill payment ${bill.bill_number || ''}`.trim(), paymentId, now),
    );
  }
  await env.DB.batch(stmts);
  const left = Math.round((outstanding - amount) * 100) / 100;
  return json({ ok: true, message: left <= 0.005 ? 'Bill paid in full.' : `Payment recorded. ${left} still due.` });
}

/* ---------------- accounts ---------------- */

async function listAccounts(env: Env, companyId: string): Promise<Response> {
  const rows = await env.DB
    .prepare(
      `SELECT a.*,
              a.opening_balance
              + COALESCE((SELECT SUM(amount) FROM account_transactions t WHERE t.account_id = a.id AND t.direction = 'in'), 0)
              - COALESCE((SELECT SUM(amount) FROM account_transactions t WHERE t.account_id = a.id AND t.direction = 'out'), 0) AS balance
         FROM cash_accounts a WHERE a.company_id = ? ORDER BY a.created_at ASC`,
    )
    .bind(companyId)
    .all();
  return json({ ok: true, data: rows.results });
}

async function createAccount(request: Request, env: Env, companyId: string): Promise<Response> {
  const b = await body(request);
  const name = text(b.name, 80);
  if (!name) return fail(400, 'Account name is required.');
  const kind = ['cash', 'bank', 'wallet'].includes(String(b.kind)) ? String(b.kind) : 'bank';
  const opening = money(b.opening_balance ?? 0);
  if (opening === null) return fail(400, 'Opening balance must be a number.');
  const company = await env.DB.prepare('SELECT default_currency FROM companies WHERE id = ?').bind(companyId).first<{ default_currency: string }>();
  const id = crypto.randomUUID();
  await env.DB
    .prepare('INSERT INTO cash_accounts (id, company_id, name, kind, opening_balance, currency, created_at) VALUES (?,?,?,?,?,?,?)')
    .bind(id, companyId, name, kind, opening, company?.default_currency || 'PKR', new Date().toISOString())
    .run();
  return json({ ok: true, message: 'Account added.', id });
}

async function deleteAccount(env: Env, companyId: string, id: string): Promise<Response> {
  const used = await env.DB.prepare('SELECT COUNT(*) AS n FROM account_transactions WHERE account_id = ? AND company_id = ?').bind(id, companyId).first<{ n: number }>();
  if ((used?.n ?? 0) > 0) return fail(409, 'This account has transactions, so it cannot be deleted.', 'IN_USE');
  await env.DB.prepare('DELETE FROM cash_accounts WHERE id = ? AND company_id = ?').bind(id, companyId).run();
  return json({ ok: true, message: 'Account deleted.' });
}

async function listTransactions(env: Env, companyId: string, accountId: string): Promise<Response> {
  const rows = await env.DB
    .prepare(
      `SELECT * FROM account_transactions WHERE company_id = ? ${accountId ? 'AND account_id = ?' : ''}
        ORDER BY tx_date DESC, created_at DESC LIMIT 200`,
    )
    .bind(...(accountId ? [companyId, accountId] : [companyId]))
    .all();
  return json({ ok: true, data: rows.results });
}

async function addTransaction(request: Request, env: Env, companyId: string, accountId: string): Promise<Response> {
  const acc = await env.DB.prepare('SELECT id FROM cash_accounts WHERE id = ? AND company_id = ?').bind(accountId, companyId).first();
  if (!acc) return fail(404, 'Account not found.', 'NOT_FOUND');
  const b = await body(request);
  const amount = money(b.amount);
  if (amount === null || amount <= 0) return fail(400, 'Amount must be greater than zero.');
  const direction = b.direction === 'out' ? 'out' : 'in';
  const date = isDate(b.tx_date) ? b.tx_date : today();
  await env.DB
    .prepare(`INSERT INTO account_transactions (id, company_id, account_id, tx_date, direction, amount, description, ref_type, ref_id, created_at) VALUES (?,?,?,?,?,?,?, 'manual', NULL, ?)`)
    .bind(crypto.randomUUID(), companyId, accountId, date, direction, amount, text(b.description, 200), new Date().toISOString())
    .run();
  return json({ ok: true, message: direction === 'in' ? 'Money in recorded.' : 'Money out recorded.' });
}

async function deleteTransaction(env: Env, companyId: string, id: string): Promise<Response> {
  const tx = await env.DB.prepare('SELECT ref_type FROM account_transactions WHERE id = ? AND company_id = ?').bind(id, companyId).first<{ ref_type: string }>();
  if (!tx) return fail(404, 'Transaction not found.', 'NOT_FOUND');
  if (tx.ref_type !== 'manual') return fail(409, 'Only manual entries can be deleted.', 'IN_USE');
  await env.DB.prepare('DELETE FROM account_transactions WHERE id = ? AND company_id = ?').bind(id, companyId).run();
  return json({ ok: true, message: 'Entry deleted.' });
}

/* ---------------- client payments -> accounts ---------------- */

async function unlinkedPayments(env: Env, companyId: string): Promise<Response> {
  const rows = await env.DB
    .prepare(
      `SELECT p.id, p.amount, p.payment_date, p.payment_method, i.invoice_number, i.currency, c.name AS client_name
         FROM invoice_payments p
         INNER JOIN invoices i ON i.id = p.invoice_id
         INNER JOIN clients c ON c.id = i.client_id
        WHERE i.company_id = ?
          AND NOT EXISTS (SELECT 1 FROM account_transactions t WHERE t.ref_type = 'invoice_payment' AND t.ref_id = p.id)
        ORDER BY p.payment_date DESC LIMIT 100`,
    )
    .bind(companyId)
    .all();
  return json({ ok: true, data: rows.results });
}

async function depositPayment(request: Request, env: Env, companyId: string, paymentId: string): Promise<Response> {
  const b = await body(request);
  const accountId = text(b.account_id, 60);
  const acc = await env.DB.prepare('SELECT id FROM cash_accounts WHERE id = ? AND company_id = ?').bind(accountId, companyId).first();
  if (!acc) return fail(400, 'Please choose an account.');
  const pay = await env.DB
    .prepare(
      `SELECT p.amount, p.payment_date, i.invoice_number, c.name AS client_name
         FROM invoice_payments p
         INNER JOIN invoices i ON i.id = p.invoice_id
         INNER JOIN clients c ON c.id = i.client_id
        WHERE p.id = ? AND i.company_id = ?`,
    )
    .bind(paymentId, companyId)
    .first<{ amount: number; payment_date: string; invoice_number: string; client_name: string }>();
  if (!pay) return fail(404, 'Payment not found.', 'NOT_FOUND');
  const exists = await env.DB
    .prepare(`SELECT id FROM account_transactions WHERE ref_type = 'invoice_payment' AND ref_id = ? AND company_id = ?`)
    .bind(paymentId, companyId)
    .first();
  if (exists) return fail(409, 'This payment is already recorded in an account.', 'ALREADY_LINKED');
  await env.DB
    .prepare(`INSERT INTO account_transactions (id, company_id, account_id, tx_date, direction, amount, description, ref_type, ref_id, created_at) VALUES (?,?,?,?, 'in', ?, ?, 'invoice_payment', ?, ?)`)
    .bind(
      crypto.randomUUID(),
      companyId,
      accountId,
      String(pay.payment_date).slice(0, 10) || today(),
      pay.amount,
      `Payment from ${pay.client_name} (${pay.invoice_number})`,
      paymentId,
      new Date().toISOString(),
    )
    .run();
  return json({ ok: true, message: 'Payment added to the account.' });
}

/* ---------------- router ---------------- */

export async function handleAccountingRoutes(request: Request, env: Env, url: URL): Promise<Response | null> {
  const path = url.pathname;
  if (!path.startsWith('/api/accounting/')) return null;
  const method = request.method;
  const write = method !== 'GET';
  try {
    const g = await guard(request, env, write);
    if ('response' in g) return g.response;
    const { session } = g;
    const cid = session.companyId;
    await ensureTables(env.DB);

    if (path === '/api/accounting/vendors') {
      if (method === 'GET') return await listVendors(env, cid);
      if (method === 'POST') return await saveVendor(request, env, cid);
    }
    let m = path.match(/^\/api\/accounting\/vendors\/([0-9a-fA-F-]{36})$/);
    if (m) {
      if (method === 'PUT') return await saveVendor(request, env, cid, m[1]);
      if (method === 'DELETE') return await deleteVendor(env, cid, m[1]);
    }

    if (path === '/api/accounting/bills') {
      if (method === 'GET') return await listBills(env, cid);
      if (method === 'POST') return await createBill(request, env, cid);
    }
    m = path.match(/^\/api\/accounting\/bills\/([0-9a-fA-F-]{36})$/);
    if (m && method === 'DELETE') return await deleteBill(env, cid, m[1]);
    m = path.match(/^\/api\/accounting\/bills\/([0-9a-fA-F-]{36})\/pay$/);
    if (m && method === 'POST') return await payBill(request, env, session, m[1]);

    if (path === '/api/accounting/accounts') {
      if (method === 'GET') return await listAccounts(env, cid);
      if (method === 'POST') return await createAccount(request, env, cid);
    }
    m = path.match(/^\/api\/accounting\/accounts\/([0-9a-fA-F-]{36})$/);
    if (m && method === 'DELETE') return await deleteAccount(env, cid, m[1]);
    m = path.match(/^\/api\/accounting\/accounts\/([0-9a-fA-F-]{36})\/transactions$/);
    if (m && method === 'POST') return await addTransaction(request, env, cid, m[1]);

    if (path === '/api/accounting/payments/unlinked' && method === 'GET') return await unlinkedPayments(env, cid);
    m = path.match(/^\/api\/accounting\/payments\/([0-9a-fA-F-]{36})\/deposit$/);
    if (m && method === 'POST') return await depositPayment(request, env, cid, m[1]);

    if (path === '/api/accounting/transactions' && method === 'GET') {
      return await listTransactions(env, cid, text(url.searchParams.get('account_id'), 60));
    }
    m = path.match(/^\/api\/accounting\/transactions\/([0-9a-fA-F-]{36})$/);
    if (m && method === 'DELETE') return await deleteTransaction(env, cid, m[1]);
  } catch {
    return fail(500, 'Unable to complete the request. Please try again.', 'ACCOUNTING_REQUEST_FAILED');
  }
  return null;
}
