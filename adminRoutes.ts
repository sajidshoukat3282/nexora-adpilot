import type { Env } from '../index';
import { resolveSession, type SessionContext } from '../auth/session';

/**
 * Admin & Roles extras: audit log, invite expiry, security overview,
 * workspace setup status and default-currency change.
 *
 * Isolation rule: every query is scoped by `session.companyId` (from the
 * signed-in session, never from the request).
 */

const CURRENCIES = ['PKR', 'USD', 'GBP', 'EUR', 'AED', 'CAD', 'AUD', 'SAR', 'QAR', 'INR', 'CNY', 'JPY', 'CHF', 'ZAR', 'TRY'];

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

async function ensureAuditTable(db: D1Database): Promise<void> {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS audit_log (
         id TEXT PRIMARY KEY,
         company_id TEXT NOT NULL,
         actor_email TEXT,
         action TEXT NOT NULL,
         detail TEXT,
         created_at TEXT NOT NULL
       )`,
    )
    .run();
}

/** Best-effort audit entry. Never throws, never blocks the real action. */
export async function logAudit(
  env: Env,
  companyId: string,
  accountId: string | null,
  action: string,
  detail = '',
): Promise<void> {
  try {
    await ensureAuditTable(env.DB);
    let actor: string | null = null;
    if (accountId) {
      const row = await env.DB.prepare('SELECT email FROM accounts WHERE id = ? LIMIT 1').bind(accountId).first<{ email: string }>();
      actor = row?.email ?? null;
    }
    await env.DB
      .prepare('INSERT INTO audit_log (id, company_id, actor_email, action, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(crypto.randomUUID(), companyId, actor, action, detail.slice(0, 300), new Date().toISOString())
      .run();
  } catch {
    /* auditing must never break the request */
  }
}

/** Email of a membership (used to describe team actions in the log). */
export async function memberEmail(env: Env, membershipId: string): Promise<string> {
  try {
    const row = await env.DB
      .prepare('SELECT a.email FROM company_memberships cm INNER JOIN accounts a ON a.id = cm.account_id WHERE cm.id = ? LIMIT 1')
      .bind(membershipId)
      .first<{ email: string }>();
    return row?.email ?? '';
  } catch {
    return '';
  }
}

async function count(env: Env, table: string, companyId: string): Promise<number> {
  try {
    const row = await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE company_id = ?`).bind(companyId).first<{ n: number }>();
    return row?.n ?? 0;
  } catch {
    return 0;
  }
}

async function requireSession(request: Request, env: Env): Promise<SessionContext | Response> {
  const session = await resolveSession(request, env.DB);
  if (!session) return json({ ok: false, error: 'UNAUTHENTICATED', message: 'No active authenticated session.' }, 401);
  return session;
}

async function setupStatus(request: Request, env: Env): Promise<Response> {
  const session = await requireSession(request, env);
  if (session instanceof Response) return session;
  const id = session.companyId;
  const profile = await env.DB
    .prepare('SELECT legal_name, address, city, phone FROM company_profiles WHERE company_id = ? LIMIT 1')
    .bind(id)
    .first<{ legal_name: string; address: string; city: string; phone: string }>()
    .catch(() => null);
  const profileComplete = !!(profile && profile.legal_name && profile.address && profile.city && profile.phone);
  let team = 0;
  try {
    const row = await env.DB
      .prepare(`SELECT COUNT(*) AS n FROM company_memberships WHERE company_id = ? AND account_type = 'employee' AND status IN ('invited','active','suspended')`)
      .bind(id)
      .first<{ n: number }>();
    team = row?.n ?? 0;
  } catch {
    /* ignore */
  }
  return json({
    ok: true,
    status: {
      profile: profileComplete,
      clients: await count(env, 'clients', id),
      leads: await count(env, 'leads', id),
      screens: await count(env, 'inventory', id),
      campaigns: await count(env, 'campaigns', id),
      invoices: await count(env, 'invoices', id),
      payments: await count(env, 'invoice_payments', id),
      expenses: await count(env, 'expenses', id),
      team,
    },
  });
}

async function overview(request: Request, env: Env): Promise<Response> {
  const session = await requireSession(request, env);
  if (session instanceof Response) return session;
  if (!session.permissions.includes('company.manage')) {
    return json({ ok: false, error: 'FORBIDDEN', message: 'Only the workspace owner can view this.' }, 403);
  }
  const id = session.companyId;
  const now = new Date().toISOString();

  await ensureAuditTable(env.DB);
  const log = await env.DB
    .prepare('SELECT id, actor_email, action, detail, created_at FROM audit_log WHERE company_id = ? ORDER BY created_at DESC LIMIT 60')
    .bind(id)
    .all<{ id: string; actor_email: string | null; action: string; detail: string | null; created_at: string }>();

  const invites = await env.DB
    .prepare(
      `SELECT ti.membership_id, ti.expires_at
         FROM team_invitations ti
         INNER JOIN company_memberships cm ON cm.id = ti.membership_id
        WHERE ti.company_id = ? AND ti.used_at IS NULL AND cm.status = 'invited'`,
    )
    .bind(id)
    .all<{ membership_id: string; expires_at: string }>();

  const sessions = await env.DB
    .prepare(
      `SELECT COUNT(*) AS n FROM sessions s
         INNER JOIN company_memberships cm ON cm.id = s.membership_id
        WHERE cm.company_id = ? AND s.revoked_at IS NULL AND s.expires_at > ?`,
    )
    .bind(id, now)
    .first<{ n: number }>();

  const mfa = await env.DB
    .prepare(
      `SELECT COUNT(*) AS total, SUM(CASE WHEN a.mfa_enabled = 1 THEN 1 ELSE 0 END) AS enabled
         FROM company_memberships cm INNER JOIN accounts a ON a.id = cm.account_id
        WHERE cm.company_id = ? AND cm.account_type IN ('owner','employee') AND cm.status = 'active'`,
    )
    .bind(id)
    .first<{ total: number; enabled: number | null }>();

  const verified = await env.DB
    .prepare(
      `SELECT SUM(CASE WHEN a.email_verified_at IS NULL THEN 1 ELSE 0 END) AS unverified
         FROM company_memberships cm INNER JOIN accounts a ON a.id = cm.account_id
        WHERE cm.company_id = ? AND cm.account_type IN ('owner','employee') AND cm.status = 'active'`,
    )
    .bind(id)
    .first<{ unverified: number | null }>();

  return json({
    ok: true,
    auditLog: log.results.map((r) => ({ id: r.id, actor: r.actor_email, action: r.action, detail: r.detail, at: r.created_at })),
    invites: invites.results.map((r) => ({ membershipId: r.membership_id, expiresAt: r.expires_at })),
    security: {
      activeSessions: sessions?.n ?? 0,
      activeMembers: mfa?.total ?? 0,
      mfaEnabled: mfa?.enabled ?? 0,
      unverifiedEmails: verified?.unverified ?? 0,
    },
  });
}

async function changeCurrency(request: Request, env: Env): Promise<Response> {
  const session = await requireSession(request, env);
  if (session instanceof Response) return session;
  if (!session.permissions.includes('company.manage')) {
    return json({ ok: false, error: 'FORBIDDEN', message: 'Only the workspace owner can change the currency.' }, 403);
  }
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    /* ignore */
  }
  const next = String(body.currency ?? '').toUpperCase();
  if (!CURRENCIES.includes(next)) {
    return json({ ok: false, error: 'INVALID_INPUT', message: 'Unsupported currency.' }, 400);
  }
  const prev = await env.DB.prepare('SELECT default_currency FROM companies WHERE id = ? LIMIT 1').bind(session.companyId).first<{ default_currency: string }>();
  await env.DB.prepare('UPDATE companies SET default_currency = ?, updated_at = ? WHERE id = ?').bind(next, new Date().toISOString(), session.companyId).run();
  await logAudit(env, session.companyId, session.accountId, 'Default currency changed', `${prev?.default_currency ?? '?'} to ${next}`);
  return json({ ok: true, message: `Default currency is now ${next}.`, currency: next });
}

export async function handleAdminRoutes(request: Request, env: Env, url: URL): Promise<Response | null> {
  const path = url.pathname;
  try {
    if (path === '/api/admin/overview' && request.method === 'GET') return await overview(request, env);
    if (path === '/api/admin/setup-status' && request.method === 'GET') return await setupStatus(request, env);
    if (path === '/api/admin/currency' && request.method === 'POST') return await changeCurrency(request, env);
  } catch {
    return json({ ok: false, error: 'ADMIN_REQUEST_FAILED', message: 'Unable to complete the request.' }, 500);
  }
  return null;
}
