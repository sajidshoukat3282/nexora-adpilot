import type { Env } from '../index';
import { ensureTrialColumn } from '../trial/trial';
import { resolveSession, type SessionContext } from '../auth/session';

/**
 * Platform Admin (for the product owner only). Shows company METADATA across all companies:
 * names, owner e-mail, plan, sign-up and last login dates, team size and simple counts, storage used.
 * It never returns clients, invoices, amounts, rates or any other business data of a company.
 * Access: the signed-in account e-mail must be listed in the PLATFORM_ADMINS setting (comma separated).
 */

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

async function rows<T = any>(env: Env, sql: string, ...binds: unknown[]): Promise<T[]> {
  try { const r = await env.DB.prepare(sql).bind(...binds).all<T>(); return (r.results ?? []) as T[]; } catch { return []; }
}

async function adminSession(request: Request, env: Env): Promise<{ s: SessionContext | null; admin: boolean }> {
  const s = await resolveSession(request, env.DB);
  if (!s) return { s: null, admin: false };
  const list = (env.PLATFORM_ADMINS || '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);
  if (list.length === 0) return { s, admin: false };
  const a = await env.DB.prepare('SELECT email FROM accounts WHERE id = ? LIMIT 1').bind(s.accountId).first<{ email: string }>().catch(() => null);
  return { s, admin: !!a && list.includes(String(a.email).toLowerCase()) };
}

async function overview(env: Env): Promise<Response> {
  await ensureTrialColumn(env.DB);
  const companies = await rows(env, 'SELECT id, name, plan, seats_used, seats_limit, created_at, trial_ends_at FROM companies ORDER BY created_at DESC LIMIT 1000');
  const owners = await rows(env, `SELECT cm.company_id, a.email, a.last_login_at FROM company_memberships cm JOIN accounts a ON a.id = cm.account_id WHERE cm.account_type = 'owner' AND cm.status = 'active'`);
  const logins = await rows(env, `SELECT cm.company_id, MAX(a.last_login_at) AS last_login, COUNT(*) AS members FROM company_memberships cm JOIN accounts a ON a.id = cm.account_id WHERE cm.status = 'active' AND cm.account_type != 'client' GROUP BY cm.company_id`);
  const count = async (table: string): Promise<Map<string, number>> => new Map((await rows(env, `SELECT company_id, COUNT(*) AS n FROM ${table} GROUP BY company_id`)).map((r: any) => [r.company_id, Number(r.n)]));
  const [screens, campaigns, clients, invoices] = await Promise.all([count('inventory'), count('campaigns'), count('clients'), count('invoices')]);
  const storage = new Map((await rows(env, 'SELECT company_id, SUM(size) AS bytes FROM uploaded_files GROUP BY company_id')).map((r: any) => [r.company_id, Number(r.bytes) || 0]));
  const ownerBy = new Map<string, string>();
  for (const o of owners) if (!ownerBy.has(o.company_id)) ownerBy.set(o.company_id, o.email);
  const loginBy = new Map(logins.map((l: any) => [l.company_id, l]));
  const out = companies.map((c: any) => ({
    id: c.id, name: c.name, plan: c.plan, trial_ends_at: c.trial_ends_at ?? null, owner_email: ownerBy.get(c.id) ?? null, created_at: c.created_at,
    last_login: (loginBy.get(c.id) as any)?.last_login ?? null, team: (loginBy.get(c.id) as any)?.members ?? 0,
    screens: screens.get(c.id) ?? 0, campaigns: campaigns.get(c.id) ?? 0, clients: clients.get(c.id) ?? 0, invoices: invoices.get(c.id) ?? 0,
    storage_bytes: storage.get(c.id) ?? 0,
  }));
  const now = Date.now();
  const days = (iso: string | null) => (iso ? (now - new Date(iso).getTime()) / 86400000 : 9999);
  const monthStart = new Date(); monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0);
  const weeks: { week: string; n: number }[] = [];
  for (let i = 7; i >= 0; i--) {
    const from = now - (i + 1) * 7 * 86400000, to = now - i * 7 * 86400000;
    weeks.push({ week: new Date(to).toISOString().slice(0, 10), n: out.filter((c) => { const t = new Date(c.created_at).getTime(); return t > from && t <= to; }).length });
  }
  return json({
    ok: true,
    totals: {
      companies: out.length,
      active_7d: out.filter((c) => days(c.last_login) <= 7).length,
      new_this_month: out.filter((c) => new Date(c.created_at).getTime() >= monthStart.getTime()).length,
      trial: out.filter((c) => c.plan === 'trial').length,
      storage_bytes: out.reduce((s, c) => s + c.storage_bytes, 0),
    },
    weeks, companies: out,
  });
}

export async function handlePlatformRoutes(request: Request, env: Env, url: URL): Promise<Response | null> {
  if (!url.pathname.startsWith('/api/platform/')) return null;
  if (request.method !== 'GET') return json({ ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);
  try {
    const { s, admin } = await adminSession(request, env);
    if (!s) return json({ ok: false, error: 'UNAUTHENTICATED' }, 401);
    if (url.pathname === '/api/platform/me') return json({ ok: true, admin });
    if (!admin) return json({ ok: false, error: 'FORBIDDEN', message: 'You do not have access to the platform panel.' }, 403);
    if (url.pathname === '/api/platform/overview') return await overview(env);
    return json({ ok: false, error: 'NOT_FOUND', message: 'API route not found.' }, 404);
  } catch {
    return json({ ok: false, error: 'SERVER_ERROR' }, 500);
  }
}
