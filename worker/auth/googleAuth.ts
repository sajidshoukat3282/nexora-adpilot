import type { Env } from '../index';
import { createSession } from './session';

/**
 * Sign in with Google (optional). Works only for accounts that already exist (same verified email).
 * Turned on when GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set in the Worker settings.
 * Flow: /api/auth/google/start -> Google -> /api/auth/google/callback -> session cookie -> app.
 */

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

const STATE_COOKIE = 'adpilot_g_state';
const configured = (env: Env): boolean => !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);

const back = (origin: string, code: string, cookies: string[] = []): Response => {
  const h = new Headers({ Location: `${origin}/#/login?google=${code}`, 'cache-control': 'no-store' });
  for (const c of cookies) h.append('Set-Cookie', c);
  return new Response(null, { status: 302, headers: h });
};

const readCookie = (request: Request, name: string): string => {
  const raw = request.headers.get('cookie') || '';
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return '';
};

function decodePayload(jwt: string): any {
  try {
    const p = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(decodeURIComponent(escape(atob(p + '='.repeat((4 - (p.length % 4)) % 4)))));
  } catch { return null; }
}

export async function handleGoogleAuth(request: Request, env: Env, url: URL): Promise<Response | null> {
  const path = url.pathname;
  if (path === '/api/auth/providers' && request.method === 'GET') return json({ ok: true, google: configured(env) });
  if (path !== '/api/auth/google/start' && path !== '/api/auth/google/callback') return null;
  if (request.method !== 'GET') return json({ ok: false }, 405);
  const origin = url.origin;
  if (!configured(env)) return back(origin, 'off');
  const redirectUri = `${origin}/api/auth/google/callback`;

  if (path === '/api/auth/google/start') {
    const state = crypto.randomUUID().replace(/-/g, '');
    const q = new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID as string, redirect_uri: redirectUri, response_type: 'code', scope: 'openid email', state, prompt: 'select_account' });
    const h = new Headers({ Location: `https://accounts.google.com/o/oauth2/v2/auth?${q.toString()}`, 'cache-control': 'no-store' });
    h.append('Set-Cookie', `${STATE_COOKIE}=${state}; Path=/api/auth/google; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);
    return new Response(null, { status: 302, headers: h });
  }

  const clear = `${STATE_COOKIE}=; Path=/api/auth/google; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
  try {
    const code = url.searchParams.get('code') || '';
    const state = url.searchParams.get('state') || '';
    if (url.searchParams.get('error') || !code) return back(origin, 'cancelled', [clear]);
    if (!state || state !== readCookie(request, STATE_COOKIE)) return back(origin, 'failed', [clear]);
    const tr = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code, client_id: env.GOOGLE_CLIENT_ID as string, client_secret: env.GOOGLE_CLIENT_SECRET as string, redirect_uri: redirectUri, grant_type: 'authorization_code' }).toString(),
    });
    if (!tr.ok) return back(origin, 'failed', [clear]);
    const tok: any = await tr.json();
    // The id_token comes straight from Google over HTTPS, so its content can be trusted here.
    const claims = decodePayload(String(tok.id_token || ''));
    const issOk = claims && (claims.iss === 'https://accounts.google.com' || claims.iss === 'accounts.google.com');
    if (!claims || !issOk || claims.aud !== env.GOOGLE_CLIENT_ID || claims.email_verified !== true || typeof claims.email !== 'string') return back(origin, 'failed', [clear]);
    const email = claims.email.trim().toLowerCase();
    const account = await env.DB.prepare('SELECT id, status FROM accounts WHERE LOWER(email) = ? LIMIT 1').bind(email).first<{ id: string; status: string }>();
    if (!account || account.status !== 'active') return back(origin, 'noaccount', [clear]);
    const ms = await env.DB.prepare(`SELECT id FROM company_memberships WHERE account_id = ? AND status = 'active' ORDER BY created_at ASC`).bind(account.id).all<{ id: string }>();
    const list = ms.results ?? [];
    if (list.length === 0) return back(origin, 'nomembership', [clear]);
    if (list.length > 1) return back(origin, 'multiple', [clear]);
    const session = await createSession(env.DB, account.id, list[0].id);
    await env.DB.prepare('UPDATE accounts SET last_login_at = ? WHERE id = ?').bind(new Date().toISOString(), account.id).run();
    const h = new Headers({ Location: `${origin}/#/`, 'cache-control': 'no-store' });
    h.append('Set-Cookie', session.setCookie);
    h.append('Set-Cookie', clear);
    return new Response(null, { status: 302, headers: h });
  } catch {
    return back(origin, 'failed', [clear]);
  }
}
