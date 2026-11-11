import type { Env } from '../index';
import { resolveSession } from '../auth/session';
import { companyStorageBytes } from '../files/fileRoutes';
import { PLAN_LIMITS, type PlanId } from '../../src/domain/subscription';

type Cfg = Env & { PADDLE_API_KEY?: string; PADDLE_ENV?: string; PADDLE_PRICES?: string };
type Cycle = 'monthly' | 'annual';

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const fail = (status: number, error: string, message: string) => json({ ok: false, error, message }, status);

/** Paddle SANDBOX price ids. For live, set the PADDLE_PRICES variable (JSON, same shape) and PADDLE_ENV=production. */
const SANDBOX_PRICES: Record<string, Record<Cycle, string>> = {
  starter: { monthly: 'pri_01m5tge2g5ege8vv4hshj8pht1', annual: 'pri_01m5tgkn5v8tak1hs11d0j7gwd' },
  professional: { monthly: 'pri_01m5thb646tzfm1gxyazk4sh80', annual: 'pri_01m5thea9cf9r47ctv1jjptqvt' },
  business: { monthly: 'pri_01m5thpe242zxbkv7ajmsrnkp0', annual: 'pri_01m5thrsxt696jh7e7mbrvre5s' },
  enterprise: { monthly: 'pri_01m73z81d3qx630hqb2cyeqk6y', annual: 'pri_01m73zepsxtwtwz82z6eb832kv' },
};

function prices(cfg: Cfg): Record<string, Record<Cycle, string>> {
  try { if (cfg.PADDLE_PRICES) return JSON.parse(cfg.PADDLE_PRICES); } catch { /* use sandbox ids */ }
  return SANDBOX_PRICES;
}

const apiBase = (cfg: Cfg) => (cfg.PADDLE_ENV === 'production' ? 'https://api.paddle.com' : 'https://sandbox-api.paddle.com');

async function count(env: Env, sql: string, companyId: string): Promise<number> {
  const r = await env.DB.prepare(sql).bind(companyId).first<{ n: number }>();
  return Number(r?.n) || 0;
}

async function usageOf(env: Env, companyId: string) {
  const screens = await count(env, 'SELECT COUNT(*) AS n FROM inventory WHERE company_id = ?', companyId);
  const seats = await count(env, "SELECT COUNT(*) AS n FROM company_memberships WHERE company_id = ? AND status = 'active' AND account_type != 'client'", companyId);
  let storageMb = 0;
  try { storageMb = Math.round(((await companyStorageBytes(env, companyId)) / (1024 * 1024)) * 10) / 10; } catch { /* ignore */ }
  return { screens, seats, storageMb };
}

interface SubRow { plan_id: string; status: string; billing_cycle: string; renews_at: string | null; paddle_subscription_id: string | null; paddle_customer_id: string | null }

export async function handleBillingRoutes(request: Request, env: Env, url: URL): Promise<Response | null> {
  const path = url.pathname;
  if (!path.startsWith('/api/billing/')) return null;
  const s = await resolveSession(request, env.DB);
  if (!s) return fail(401, 'UNAUTHENTICATED', 'Please sign in again.');
  if (s.accountType === 'client') return fail(403, 'FORBIDDEN', 'Billing is for company staff only.');
  const cfg = env as Cfg;

  const sub = await env.DB.prepare(
    'SELECT plan_id, status, billing_cycle, renews_at, paddle_subscription_id, paddle_customer_id FROM subscriptions WHERE company_id = ? LIMIT 1',
  ).bind(s.companyId).first<SubRow>();

  if (path === '/api/billing/usage' && request.method === 'GET') {
    const limits = sub && sub.plan_id in PLAN_LIMITS ? PLAN_LIMITS[sub.plan_id as PlanId] : null;
    return json({
      ok: true,
      subscription: sub ? { plan: sub.plan_id, status: sub.status, cycle: sub.billing_cycle, renewsAt: sub.renews_at, paid: !!sub.paddle_subscription_id } : null,
      limits,
      usage: await usageOf(env, s.companyId),
    });
  }

  if (request.method !== 'POST') return null;
  if (!s.permissions.includes('company.manage')) return fail(403, 'FORBIDDEN', 'Only the account owner or an admin can manage billing.');
  const key = cfg.PADDLE_API_KEY;
  if (!key) return fail(500, 'NOT_CONFIGURED', 'Billing is not configured yet.');
  if (!sub || !sub.paddle_subscription_id) return fail(409, 'NO_SUBSCRIPTION', 'You do not have a paid subscription yet. Use Upgrade to subscribe.');
  const headers = { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' };

  if (path === '/api/billing/portal') {
    if (!sub.paddle_customer_id) return fail(409, 'NO_CUSTOMER', 'No billing profile found for this company.');
    const res = await fetch(apiBase(cfg) + '/customers/' + sub.paddle_customer_id + '/portal-sessions', {
      method: 'POST', headers, body: JSON.stringify({ subscription_ids: [sub.paddle_subscription_id] }),
    });
    const body = (await res.json().catch(() => null)) as { data?: { urls?: { general?: { overview?: string } } } } | null;
    const link = body?.data?.urls?.general?.overview;
    if (!res.ok || !link) return fail(502, 'PADDLE_ERROR', 'Could not open the billing portal. Please try again.');
    return json({ ok: true, url: link });
  }

  if (path === '/api/billing/change-plan') {
    const b = (await request.json().catch(() => ({}))) as { plan?: string; cycle?: string };
    const plan = String(b.plan || '');
    const cycle = b.cycle === 'annual' ? 'annual' : b.cycle === 'monthly' ? 'monthly' : null;
    const priceId = cycle ? prices(cfg)[plan]?.[cycle] : null;
    if (!cycle || !priceId || !(plan in PLAN_LIMITS)) return fail(400, 'BAD_REQUEST', 'Choose a valid plan and billing period.');
    if (sub.plan_id === plan && sub.billing_cycle === cycle) return fail(400, 'SAME_PLAN', 'You are already on this plan.');

    const limits = PLAN_LIMITS[plan as PlanId];
    const u = await usageOf(env, s.companyId);
    if (limits.screens !== null && u.screens > limits.screens) {
      return fail(409, 'OVER_LIMIT', 'You have ' + u.screens + ' screens but this plan allows ' + limits.screens + '. Remove some screens first.');
    }
    if (limits.seats !== null && u.seats > limits.seats) {
      return fail(409, 'OVER_LIMIT', 'You have ' + u.seats + ' team members but this plan allows ' + limits.seats + '. Remove some members first.');
    }

    const res = await fetch(apiBase(cfg) + '/subscriptions/' + sub.paddle_subscription_id, {
      method: 'PATCH', headers,
      body: JSON.stringify({ items: [{ price_id: priceId, quantity: 1 }], proration_billing_mode: 'prorated_immediately' }),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as { error?: { detail?: string } } | null;
      console.error('paddle change-plan failed', res.status, err?.error?.detail);
      return fail(502, 'PADDLE_ERROR', 'Paddle could not change the plan. ' + (err?.error?.detail || 'Please try again.'));
    }
    return json({ ok: true, message: 'Plan change requested. It will show in your account in a few seconds.' });
  }

  return null;
}
