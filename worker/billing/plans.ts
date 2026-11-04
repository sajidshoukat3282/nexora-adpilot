import type { Env } from '../index';
import { resolveSession } from '../auth/session';
import { PLAN_ENTITLEMENTS, PLAN_LIMITS, type EntitlementKey, type PlanId } from '../../src/domain/subscription';

/**
 * Plan locks for PAID companies. Trial companies are handled by trialGate; old companies
 * (no subscription row) and ids in AI_UNLIMITED_COMPANY_IDS are never limited.
 * Limits and features live in src/domain/subscription.ts (PLAN_LIMITS, PLAN_ENTITLEMENTS).
 */

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

interface FeatureRule { prefix: string; all?: boolean; key: EntitlementKey; label: string }

/** all = blocks every request, otherwise only requests that change data. */
const FEATURE_RULES: FeatureRule[] = [
  { prefix: '/api/admin/api-keys', all: true, key: 'api', label: 'API access' },
  { prefix: '/api/client-portal', all: true, key: 'client_portal', label: 'The client portal' },
  { prefix: '/api/expenses', key: 'finance', label: 'Expenses and finance reports' },
  { prefix: '/api/reports/', key: 'analytics', label: 'Saved and emailed reports' },
  { prefix: '/api/ops/field', key: 'field_verification', label: 'Field photos with GPS check' },
  { prefix: '/api/ops/proofs', key: 'proof_of_play', label: 'Proof of play' },
  { prefix: '/api/marketplace', key: 'marketplace', label: 'The public marketplace page' },
];

async function paidPlan(env: Env, companyId: string): Promise<PlanId | null> {
  const free = String((env as unknown as { AI_UNLIMITED_COMPANY_IDS?: string }).AI_UNLIMITED_COMPANY_IDS || '').split(',').map((x) => x.trim()).filter(Boolean);
  if (free.includes(companyId)) return null;
  const sub = await env.DB.prepare('SELECT plan_id, status FROM subscriptions WHERE company_id = ? LIMIT 1').bind(companyId).first<{ plan_id: string; status: string }>();
  if (!sub || !['trial', 'active', 'past_due'].includes(sub.status)) return null;
  return sub.plan_id in PLAN_LIMITS ? (sub.plan_id as PlanId) : null;
}

async function count(env: Env, sql: string, companyId: string): Promise<number> {
  const r = await env.DB.prepare(sql).bind(companyId).first<{ n: number }>();
  return Number(r?.n) || 0;
}

/** Runs before API calls. Returns a ready answer when the plan blocks the request, otherwise null. */
export async function planGate(request: Request, env: Env, url: URL): Promise<Response | null> {
  const m = request.method;
  const path = url.pathname;
  if (!path.startsWith('/api/') || m === 'OPTIONS') return null;
  const isWrite = m !== 'GET' && m !== 'HEAD';
  const rule = FEATURE_RULES.find((r) => path.startsWith(r.prefix) && (r.all || isWrite));
  const isScreen = m === 'POST' && path === '/api/inventory';
  const isInvite = m === 'POST' && path === '/api/team/invite';
  if (!rule && !isScreen && !isInvite) return null;
  try {
    const s = await resolveSession(request, env.DB);
    if (!s) return null;
    const planId = await paidPlan(env, s.companyId);
    if (!planId) return null;
    if (rule && !PLAN_ENTITLEMENTS[planId].includes(rule.key)) {
      return json({ ok: false, error: 'PLAN_LOCKED', requires: rule.key, upgrade: true, message: rule.label + ' is not included in your current plan. Upgrade your plan to use it.' }, 403);
    }
    const limits = PLAN_LIMITS[planId];
    if (isScreen && limits.screens !== null) {
      const n = await count(env, 'SELECT COUNT(*) AS n FROM inventory WHERE company_id = ?', s.companyId);
      if (n >= limits.screens) return json({ ok: false, error: 'PLAN_LIMIT', upgrade: true, message: 'Your plan allows up to ' + limits.screens + ' screens. Upgrade your plan to add more.' }, 403);
    }
    if (isInvite && limits.seats !== null) {
      const n = await count(env, "SELECT COUNT(*) AS n FROM company_memberships WHERE company_id = ? AND status = 'active' AND account_type != 'client'", s.companyId);
      if (n >= limits.seats) return json({ ok: false, error: 'PLAN_LIMIT', upgrade: true, message: 'Your plan allows up to ' + limits.seats + ' team members. Upgrade your plan to invite more.' }, 403);
    }
    return null;
  } catch { return null; }
}
