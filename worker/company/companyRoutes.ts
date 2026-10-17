import type { Env } from '../index';
import { resolveSession } from '../auth/session';

/**
 * Company profile (letterhead details printed on invoices and reports).
 *
 * Isolation rule: every query is scoped by `session.companyId`, which comes
 * from the signed-in session on the server and is NEVER read from the request.
 */

interface ProfileRow {
  legal_name: string;
  owner_name: string;
  address: string;
  city: string;
  province: string;
  postal_code: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  ntn: string;
  strn: string;
  bank_name: string;
  bank_account_title: string;
  bank_iban: string;
  invoice_prefix: string;
  default_tax_rate: number;
  payment_terms_days: number;
  invoice_footer: string;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

function fail(status: number, error: string, message: string): Response {
  return json({ ok: false, error, message }, status);
}

function toProfile(row: ProfileRow) {
  const complete = Boolean(
    row.legal_name.trim() &&
      row.address.trim() &&
      row.city.trim() &&
      row.phone.trim(),
  );
  return {
    legalName: row.legal_name,
    ownerName: row.owner_name,
    address: row.address,
    city: row.city,
    province: row.province,
    postalCode: row.postal_code,
    country: row.country,
    phone: row.phone,
    email: row.email,
    website: row.website,
    ntn: row.ntn,
    strn: row.strn,
    bankName: row.bank_name,
    bankAccountTitle: row.bank_account_title,
    bankIban: row.bank_iban,
    invoicePrefix: row.invoice_prefix,
    defaultTaxRate: row.default_tax_rate,
    paymentTermsDays: row.payment_terms_days,
    invoiceFooter: row.invoice_footer,
    complete,
  };
}

async function loadProfile(
  db: D1Database,
  companyId: string,
): Promise<ProfileRow> {
  const row = await db
    .prepare(
      `SELECT legal_name, owner_name, address, city, province, postal_code,
              country, phone, email, website, ntn, strn, bank_name,
              bank_account_title, bank_iban, invoice_prefix, default_tax_rate,
              payment_terms_days, invoice_footer
       FROM company_profiles
       WHERE company_id = ?
       LIMIT 1`,
    )
    .bind(companyId)
    .first<ProfileRow>();

  if (row) return row;

  // No profile saved yet: start from the company name chosen at signup.
  const company = await db
    .prepare('SELECT name FROM companies WHERE id = ? LIMIT 1')
    .bind(companyId)
    .first<{ name: string }>();

  return {
    legal_name: company?.name ?? '',
    owner_name: '',
    address: '',
    city: '',
    province: '',
    postal_code: '',
    country: 'Pakistan',
    phone: '',
    email: '',
    website: '',
    ntn: '',
    strn: '',
    bank_name: '',
    bank_account_title: '',
    bank_iban: '',
    invoice_prefix: 'INV-',
    default_tax_rate: 18,
    payment_terms_days: 30,
    invoice_footer: '',
  };
}

async function readBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    return body && typeof body === 'object'
      ? (body as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function text(body: Record<string, unknown>, key: string, max: number): string {
  const value = body[key];
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

async function getProfile(request: Request, env: Env): Promise<Response> {
  const session = await resolveSession(request, env.DB);
  if (!session) return fail(401, 'UNAUTHENTICATED', 'Please sign in.');

  const row = await loadProfile(env.DB, session.companyId);
  return json({ ok: true, profile: toProfile(row) });
}

async function saveProfile(request: Request, env: Env): Promise<Response> {
  const session = await resolveSession(request, env.DB);
  if (!session) return fail(401, 'UNAUTHENTICATED', 'Please sign in.');
  if (!session.permissions.includes('company.manage')) {
    return fail(403, 'FORBIDDEN', 'Only the company owner can edit the company profile.');
  }

  const body = await readBody(request);

  const legalName = text(body, 'legalName', 120);
  const address = text(body, 'address', 300);
  const city = text(body, 'city', 80);
  const phone = text(body, 'phone', 40);
  const email = text(body, 'email', 120);
  const invoicePrefix = text(body, 'invoicePrefix', 10) || 'INV-';

  if (!legalName) return fail(400, 'VALIDATION', 'Company name is required.');
  if (!address) return fail(400, 'VALIDATION', 'Address is required.');
  if (!city) return fail(400, 'VALIDATION', 'City is required.');
  if (!phone) return fail(400, 'VALIDATION', 'Phone number is required.');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return fail(400, 'VALIDATION', 'Company email looks invalid.');
  }
  if (!/^[A-Za-z0-9-]{1,10}$/.test(invoicePrefix)) {
    return fail(400, 'VALIDATION', 'Invoice prefix can use letters, numbers and dash only (max 10).');
  }

  const taxRate = Number(body.defaultTaxRate);
  const defaultTaxRate =
    Number.isFinite(taxRate) && taxRate >= 0 && taxRate <= 100 ? taxRate : 18;

  const termsRaw = Number(body.paymentTermsDays);
  const paymentTermsDays =
    Number.isInteger(termsRaw) && termsRaw >= 0 && termsRaw <= 365 ? termsRaw : 30;

  const now = new Date().toISOString();

  await env.DB
    .prepare(
      `INSERT INTO company_profiles (
         company_id, legal_name, owner_name, address, city, province,
         postal_code, country, phone, email, website, ntn, strn, bank_name,
         bank_account_title, bank_iban, invoice_prefix, default_tax_rate,
         payment_terms_days, invoice_footer, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(company_id) DO UPDATE SET
         legal_name = excluded.legal_name,
         owner_name = excluded.owner_name,
         address = excluded.address,
         city = excluded.city,
         province = excluded.province,
         postal_code = excluded.postal_code,
         country = excluded.country,
         phone = excluded.phone,
         email = excluded.email,
         website = excluded.website,
         ntn = excluded.ntn,
         strn = excluded.strn,
         bank_name = excluded.bank_name,
         bank_account_title = excluded.bank_account_title,
         bank_iban = excluded.bank_iban,
         invoice_prefix = excluded.invoice_prefix,
         default_tax_rate = excluded.default_tax_rate,
         payment_terms_days = excluded.payment_terms_days,
         invoice_footer = excluded.invoice_footer,
         updated_at = excluded.updated_at`,
    )
    .bind(
      session.companyId,
      legalName,
      text(body, 'ownerName', 80),
      address,
      city,
      text(body, 'province', 80),
      text(body, 'postalCode', 20),
      text(body, 'country', 80) || 'Pakistan',
      phone,
      email,
      text(body, 'website', 120),
      text(body, 'ntn', 30),
      text(body, 'strn', 30),
      text(body, 'bankName', 80),
      text(body, 'bankAccountTitle', 120),
      text(body, 'bankIban', 40),
      invoicePrefix,
      defaultTaxRate,
      paymentTermsDays,
      text(body, 'invoiceFooter', 300),
      now,
      now,
    )
    .run();

  const row = await loadProfile(env.DB, session.companyId);
  return json({ ok: true, message: 'Company profile saved.', profile: toProfile(row) });
}

export async function handleCompanyRoutes(
  request: Request,
  env: Env,
  url: URL,
): Promise<Response | null> {
  if (url.pathname !== '/api/company/profile') return null;

  try {
    if (request.method === 'GET') return await getProfile(request, env);
    if (request.method === 'PUT') return await saveProfile(request, env);
    return fail(405, 'METHOD_NOT_ALLOWED', 'Method not allowed.');
  } catch {
    return fail(500, 'COMPANY_REQUEST_FAILED', 'Unable to complete the request. Please try again.');
  }
}
