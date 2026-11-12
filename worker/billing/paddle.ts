import type { Env } from '../index';

type J = Record<string, any>;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

/** Paddle SANDBOX product ids -> AdPilot plan. The live Paddle account will have different ids. */
const PRODUCT_PLAN: Record<string, 'starter' | 'professional' | 'business' | 'enterprise'> = {
  pro_01m5tfz1yk13xb8v4pnh4d65y2: 'starter',
  pro_01m5th3d18qyad9n1gz1yagx92: 'professional',
  pro_01m5thj72d31n14ssnjsprbqmw: 'business',
  pro_01m73ys30nxwdmavqxzb64x0se: 'enterprise',
  // LIVE account products
  pro_01m76a057sm4rbrmdh9q20vbzt: 'starter',
  pro_01m78jcaz2m08kwp214cpyyjjb: 'professional',
  pro_01m78jsvg3b0e3kd76686x9kc8: 'business',
  pro_01m78k5j4dsw2b8byb056xkbxy: 'enterprise',
};

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

async function verifySignature(raw: string, header: string | null, secret: string): Promise<boolean> {
  if (!header) return false;
  const parts: Record<string, string> = {};
  for (const p of header.split(';')) {
    const i = p.indexOf('=');
    if (i > 0) parts[p.slice(0, i).trim()] = p.slice(i + 1).trim();
  }
  const ts = parts.ts;
  const h1 = parts.h1;
  if (!ts || !h1) return false;
  const age = Math.abs(Date.now() / 1000 - Number(ts));
  if (!Number.isFinite(age) || age > 300) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(ts + ':' + raw));
  const hex = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
  return safeEqual(hex, h1);
}

async function findCompanyId(db: D1Database, d: J): Promise<string | null> {
  const cd: J | null = d.custom_data && typeof d.custom_data === 'object' ? d.custom_data : null;
  const fromData = cd && typeof cd.company_id === 'string' ? cd.company_id : null;
  if (fromData) {
    const c = await db.prepare('SELECT id FROM companies WHERE id = ? LIMIT 1').bind(fromData).first<{ id: string }>();
    if (c) return c.id;
  }
  const subId = typeof d.subscription_id === 'string' ? d.subscription_id : typeof d.id === 'string' && d.id.startsWith('sub_') ? d.id : null;
  if (subId) {
    const s = await db.prepare('SELECT company_id FROM subscriptions WHERE paddle_subscription_id = ? LIMIT 1').bind(subId).first<{ company_id: string }>();
    if (s) return s.company_id;
  }
  return null;
}

async function applyEvent(db: D1Database, evt: J): Promise<void> {
  const type = String(evt.event_type || '');
  const d: J = evt.data || {};
  const isSub = type.startsWith('subscription.');
  if (!isSub && type !== 'transaction.completed') return;

  const companyId = await findCompanyId(db, d);
  if (!companyId) { console.error('paddle webhook: company not found for', type); return; }

  const item: J = (Array.isArray(d.items) ? d.items[0] : null) || {};
  const price: J = item.price || {};
  const plan = PRODUCT_PLAN[String(price.product_id || '')];
  if (!plan) { console.error('paddle webhook: unknown product', price.product_id); return; }
  const cycle = price.billing_cycle && price.billing_cycle.interval === 'year' ? 'annual' : 'monthly';

  let status = 'active';
  let payment = 'paid';
  if (isSub) {
    switch (String(d.status)) {
      case 'active': status = 'active'; payment = 'paid'; break;
      case 'trialing': status = 'trial'; payment = 'pending'; break;
      case 'past_due': status = 'past_due'; payment = 'failed'; break;
      case 'paused': status = 'paused'; payment = 'unknown'; break;
      case 'canceled': status = 'cancelled'; payment = 'unknown'; break;
      default: return;
    }
  }

  const now = new Date().toISOString();
  const subId = isSub ? (d.id ?? null) : (d.subscription_id ?? null);
  const renewsAt = isSub ? (d.next_billed_at ?? null) : (d.billing_period && d.billing_period.ends_at) || null;
  const cancelAt = isSub ? (d.canceled_at || (d.scheduled_change && d.scheduled_change.action === 'cancel' ? d.scheduled_change.effective_at : null) || null) : null;
  const startsAt = d.started_at || d.created_at || now;

  await db.prepare(
    `INSERT INTO subscriptions (id, company_id, plan_id, status, billing_cycle, payment_status, paddle_customer_id, paddle_subscription_id, paddle_price_id, starts_at, renews_at, cancellation_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(company_id) DO UPDATE SET
       plan_id = excluded.plan_id, status = excluded.status, billing_cycle = excluded.billing_cycle,
       payment_status = excluded.payment_status,
       paddle_customer_id = COALESCE(excluded.paddle_customer_id, subscriptions.paddle_customer_id),
       paddle_subscription_id = COALESCE(excluded.paddle_subscription_id, subscriptions.paddle_subscription_id),
       paddle_price_id = excluded.paddle_price_id,
       renews_at = COALESCE(excluded.renews_at, subscriptions.renews_at),
       cancellation_at = excluded.cancellation_at,
       updated_at = excluded.updated_at`
  ).bind(crypto.randomUUID(), companyId, plan, status, cycle, payment, d.customer_id ?? null, subId, price.id ?? null, startsAt, renewsAt, cancelAt, now, now).run();

  const companyPlan = status === 'cancelled' ? 'trial' : 'growth';
  await db.prepare(`UPDATE companies SET plan = ?, updated_at = ? WHERE id = ? AND plan != 'enterprise'`).bind(companyPlan, now, companyId).run();
}

/** POST /api/paddle/webhook : called by Paddle, signed, no login. */
export async function handlePaddleWebhook(request: Request, env: Env, url: URL): Promise<Response | null> {
  if (url.pathname !== '/api/paddle/webhook' || request.method !== 'POST') return null;
  const secret = (env as Env & { PADDLE_WEBHOOK_SECRET?: string }).PADDLE_WEBHOOK_SECRET;
  if (!secret) return json({ ok: false, error: 'NOT_CONFIGURED' }, 503);
  const raw = await request.text();
  if (!(await verifySignature(raw, request.headers.get('Paddle-Signature'), secret))) return json({ ok: false, error: 'BAD_SIGNATURE' }, 401);
  let evt: J;
  try { evt = JSON.parse(raw); } catch { return json({ ok: false, error: 'BAD_JSON' }, 400); }
  try {
    await applyEvent(env.DB, evt);
  } catch (e) {
    console.error('paddle webhook failed', e);
    return json({ ok: false, error: 'PROCESSING_FAILED' }, 500);
  }
  return json({ ok: true });
}
