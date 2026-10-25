import type { Env } from '../index';
import { resolveSession } from '../auth/session';

/**
 * Free trial for NEW sign-ups only: 10 days, a few limits, then read-only (export always works).
 * Companies that existed before this feature have no trial end date, so they are never limited.
 * Every number is in TRIAL_LIMITS below, change it there.
 */

export const TRIAL_DAYS = 10;
export const TRIAL_LIMITS = { screens: 5, campaigns: 3, clients: 10, proposals: 5, invoices: 5, storage_mb: 100 };

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

let ready = false;
export async function ensureTrialColumn(db: D1Database): Promise<void> {
  if (ready) return;
  try { await db.prepare('ALTER TABLE companies ADD COLUMN trial_ends_at TEXT').run(); } catch { /* column exists */ }
  ready = true;
}

/** Called right after a new company is created. */
export async function startTrial(db: D1Database, companyId: string): Promise<void> {
  await ensureTrialColumn(db);
  const end = new Date(Date.now() + TRIAL_DAYS * 86400000).toISOString();
  await db.prepare('UPDATE companies SET trial_ends_at = ? WHERE id = ?').bind(end, companyId).run();
}

export interface TrialInfo { ends_at: string; days_left: number; expired: boolean }

/** null when the company is not on a trial (old companies and paid companies). */
export async function trialInfo(db: D1Database, companyId: string): Promise<TrialInfo | null> {
  try {
    await ensureTrialColumn(db);
    const r = await db.prepare('SELECT plan, trial_ends_at FROM companies WHERE id = ?').bind(companyId).first<{ plan: string; trial_ends_at: string | null }>();
    if (!r || !r.trial_ends_at || r.plan !== 'trial') return null;
    const ms = new Date(r.trial_ends_at).getTime() - Date.now();
    if (!Number.isFinite(ms)) return null;
    return { ends_at: r.trial_ends_at, days_left: Math.max(0, Math.ceil(ms / 86400000)), expired: ms <= 0 };
  } catch { return null; }
}

const COUNT_TABLE: Record<string, { table: string; limit: number; label: string }> = {
  'POST /api/inventory': { table: 'inventory', limit: TRIAL_LIMITS.screens, label: 'screens' },
  'POST /api/campaigns': { table: 'campaigns', limit: TRIAL_LIMITS.campaigns, label: 'campaigns' },
  'POST /api/crm/clients': { table: 'clients', limit: TRIAL_LIMITS.clients, label: 'clients' },
  'POST /api/invoices': { table: 'invoices', limit: TRIAL_LIMITS.invoices, label: 'invoices' },
  'POST /api/proposals': { table: 'proposals', limit: TRIAL_LIMITS.proposals, label: 'proposals' },
};

async function countOf(db: D1Database, table: string, companyId: string): Promise<number> {
  try {
    const r = await db.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE company_id = ?`).bind(companyId).first<{ n: number }>();
    return Number(r?.n) || 0;
  } catch { return 0; }
}

const SKIP_PREFIX = ['/api/auth/', '/api/export/', '/api/session', '/api/player/', '/api/public/', '/api/trial/', '/api/v1/', '/api/admin/api-keys'];

/** Runs before every API call that changes data. Returns a ready answer when the trial blocks it, otherwise null. */
export async function trialGate(request: Request, env: Env, url: URL): Promise<Response | null> {
  const m = request.method;
  if (m === 'GET' || m === 'HEAD' || m === 'OPTIONS') return null;
  const path = url.pathname;
  if (!path.startsWith('/api/') || SKIP_PREFIX.some((p) => path.startsWith(p))) return null;
  try {
    const s = await resolveSession(request, env.DB);
    if (!s || s.accountType === 'client') return null;
    const t = await trialInfo(env.DB, s.companyId);
    if (!t) return null;
    if (t.expired) {
      return json({ ok: false, error: 'TRIAL_EXPIRED', message: 'Your free trial has ended. Your data is safe and can be viewed. You can export all your data from Admin, or subscribe to continue.' }, 403);
    }
    if (path.startsWith('/api/marketplace/')) {
      return json({ ok: false, error: 'TRIAL_LIMIT', message: 'The public marketplace page is available on paid plans.' }, 403);
    }
    const rule = COUNT_TABLE[`${m} ${path}`];
    if (rule && (await countOf(env.DB, rule.table, s.companyId)) >= rule.limit) {
      return json({ ok: false, error: 'TRIAL_LIMIT', message: `The free trial allows ${rule.limit} ${rule.label}. Subscribe to add more.` }, 403);
    }
    return null;
  } catch { return null; }
}

/** GET /api/trial/status : drives the banner at the top of the app. */
export async function handleTrialRoutes(request: Request, env: Env, url: URL): Promise<Response | null> {
  if (url.pathname !== '/api/trial/status' || request.method !== 'GET') return null;
  const s = await resolveSession(request, env.DB);
  if (!s) return json({ ok: false, error: 'UNAUTHENTICATED' }, 401);
  const t = s.accountType === 'client' ? null : await trialInfo(env.DB, s.companyId);
  if (!t) return json({ ok: true, trial: false });
  return json({ ok: true, trial: true, ...t, limits: TRIAL_LIMITS, days_total: TRIAL_DAYS });
}
