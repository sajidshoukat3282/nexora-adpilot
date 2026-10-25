import type { Env } from '../index';
import { resolveSession } from './session';
import { logAudit } from '../admin/adminRoutes';
import { MIN_PASSWORD_LENGTH, hashPassword, verifyPassword } from './password';

/**
 * Own password for a signed-in person (for example the owner who signs in by e-mail link and wants a password too).
 * - GET  /api/auth/password-status : { has_password }
 * - POST /api/auth/set-password    : { password, current_password? }. If a password already exists, the current one is required.
 *   Other sessions of this account are signed out; this one stays.
 */

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const fail = (status: number, message: string, error = 'INVALID_INPUT') => json({ ok: false, error, message }, status);

export async function handlePasswordRoutes(request: Request, env: Env, url: URL): Promise<Response | null> {
  const path = url.pathname;
  if (path !== '/api/auth/password-status' && path !== '/api/auth/set-password') return null;
  try {
    const s = await resolveSession(request, env.DB);
    if (!s) return json({ ok: false, error: 'UNAUTHENTICATED' }, 401);
    const acc = await env.DB.prepare('SELECT id, password_hash FROM accounts WHERE id = ? AND status = \'active\'').bind(s.accountId).first<{ id: string; password_hash: string | null }>();
    if (!acc) return fail(404, 'Account not found.', 'NOT_FOUND');

    if (path === '/api/auth/password-status' && request.method === 'GET') return json({ ok: true, has_password: Boolean(acc.password_hash) });

    if (path === '/api/auth/set-password' && request.method === 'POST') {
      const b = (await request.json().catch(() => ({}))) as { password?: unknown; current_password?: unknown };
      const password = typeof b.password === 'string' ? b.password : '';
      const current = typeof b.current_password === 'string' ? b.current_password : '';
      if (password.length < MIN_PASSWORD_LENGTH || password.length > 256) return fail(400, `Password must contain ${MIN_PASSWORD_LENGTH} to 256 characters.`);
      if (acc.password_hash) {
        if (!current) return fail(400, 'Enter your current password.', 'CURRENT_REQUIRED');
        if (!(await verifyPassword(current, acc.password_hash))) return fail(403, 'Your current password is not correct.', 'WRONG_PASSWORD');
      }
      const hash = await hashPassword(password);
      const now = new Date().toISOString();
      await env.DB.batch([
        // Being signed in proves control of the e-mail, so a missing verification date is filled in.
        env.DB.prepare('UPDATE accounts SET password_hash = ?, email_verified_at = COALESCE(email_verified_at, ?), updated_at = ? WHERE id = ?').bind(hash, now, now, acc.id),
        env.DB.prepare('UPDATE sessions SET revoked_at = ? WHERE account_id = ? AND revoked_at IS NULL AND id != ?').bind(now, acc.id, s.sessionId),
      ]);
      await logAudit(env, s.companyId, s.accountId, acc.password_hash ? 'Password changed' : 'Password set');
      return json({ ok: true, message: 'Password saved. Other devices were signed out.' });
    }
    return fail(405, 'Method not allowed.', 'METHOD_NOT_ALLOWED');
  } catch {
    return fail(500, 'Unable to save the password. Please try again.', 'PASSWORD_FAILED');
  }
}
