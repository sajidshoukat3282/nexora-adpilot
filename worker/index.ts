import type { GeographicLocation } from '../src/domain/geography.types';
import { ProductionGeographyRepository } from '../src/repositories/GeographyRepository';
import { NominatimGeocodingProvider } from '../src/providers/NominatimGeocodingProvider';
import {
  createSession,
  resolveSession,
  revokeSession,
  clearSessionCookie,
  loadMembershipPermissions,
} from './auth/session';
import { handleTeamRoutes } from './team/teamRoutes';
import { hashPassword, verifyPassword } from './auth/password';
import {
  createPasswordResetToken,
  consumePasswordResetToken,
} from './auth/passwordReset';
import {
  createMagicLinkToken,
  consumeMagicLinkToken,
} from './auth/magicLink';
import {
  createEmailVerificationToken,
  consumeEmailVerificationToken,
} from './auth/emailVerification';
import { WeatherApiProvider } from './weather/WeatherApiProvider';
import { ProductionSubscriptionRepository } from '../src/repositories/production/SubscriptionRepository';
import {
  hasEntitlement,
  type EntitlementKey,
} from '../src/domain/subscription';

export interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  WEATHER_API_KEY?: string;
  BREVO_API_KEY?: string;
  AUTH_BASE_URL?: string;
  MAIL_FROM_EMAIL?: string;
  MAIL_FROM_NAME?: string;
  OWNER_MAGIC_LINK_EMAIL?: string;
  GEOAPIFY_API_KEY?: string; 
}

function json(data: unknown, status = 200, setCookie?: string): Response {
  const headers = new Headers({
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  if (setCookie) headers.set('Set-Cookie', setCookie);
  return new Response(JSON.stringify(data), { status, headers });
}

function createGeographyRepository(env: Env): ProductionGeographyRepository {
  return new ProductionGeographyRepository(env.DB, new NominatimGeocodingProvider());
}

function errorStatus(error: unknown): number {
  if (error instanceof Error && 'code' in error) {
    const code = (error as { code?: string }).code;
    if (code === 'INVALID_INPUT') return 400;
    if (code === 'NOT_FOUND') return 404;
    if (code === 'PROVIDER_RATE_LIMITED') return 429;
    if (code === 'PROVIDER_UNAVAILABLE' || code === 'DATABASE_UNAVAILABLE') return 503;
    if (code === 'PROVIDER_REQUEST_FAILED') return 502;
  }
  return 500;
}

function errorPayload(error: unknown) {
  if (error instanceof Error && 'code' in error) {
    return { ok: false, error: (error as { code?: string }).code ?? 'GEOGRAPHY_ERROR', message: error.message };
  }
  return { ok: false, error: 'GEOGRAPHY_ERROR', message: error instanceof Error ? error.message : String(error) };
}

async function sendMagicLinkEmail(env: Env, email: string, token: string): Promise<void> {
  if (!env.BREVO_API_KEY) throw new Error('EMAIL_PROVIDER_NOT_CONFIGURED');
  const baseUrl = env.AUTH_BASE_URL || 'http://localhost:5173';
  const verifyUrl = `${baseUrl}/#/auth/magic-link?token=${encodeURIComponent(token)}`;
  const senderEmail = env.MAIL_FROM_EMAIL || 'hello@nexoratechnologies.pk';
  const senderName = env.MAIL_FROM_NAME || 'Nexora AdPilot';
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { accept: 'application/json', 'api-key': env.BREVO_API_KEY, 'content-type': 'application/json' },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email }],
      subject: 'Your Nexora AdPilot sign-in link',
      htmlContent: `<p>Hello,</p><p>Use the secure link below to sign in to Nexora AdPilot:</p><p><a href="${verifyUrl}">Sign in to Nexora AdPilot</a></p><p>This link expires in 10 minutes and can only be used once.</p>`,
    }),
  });
  if (!response.ok) throw new Error('EMAIL_SEND_FAILED');
}

async function sendVerificationEmail(env: Env, email: string, token: string): Promise<void> {
  if (!env.BREVO_API_KEY) throw new Error('EMAIL_PROVIDER_NOT_CONFIGURED');
  const baseUrl = (env.AUTH_BASE_URL || 'http://localhost:5173').replace(/\/$/, '');
  const verifyUrl = `${baseUrl}/#/auth/verify-email?token=${encodeURIComponent(token)}`;
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { accept: 'application/json', 'api-key': env.BREVO_API_KEY, 'content-type': 'application/json' },
    body: JSON.stringify({
      sender: { name: env.MAIL_FROM_NAME || 'Nexora AdPilot', email: env.MAIL_FROM_EMAIL || 'hello@nexoratechnologies.pk' },
      to: [{ email }],
      subject: 'Verify your Nexora AdPilot account',
      htmlContent: `<p>Welcome to Nexora AdPilot!</p><p>Please confirm your email address to activate your account:</p><p><a href="${verifyUrl}">Verify my email</a></p><p>This link expires in 60 minutes and can only be used once.</p>`,
    }),
  });
  if (!response.ok) throw new Error('EMAIL_SEND_FAILED');
}

async function sendPasswordResetEmail(env: Env, email: string, token: string): Promise<void> {
  if (!env.BREVO_API_KEY) throw new Error('EMAIL_PROVIDER_NOT_CONFIGURED');
  const baseUrl = env.AUTH_BASE_URL || 'http://localhost:5173';
  const resetUrl = `${baseUrl}/#/auth/reset-password?token=${encodeURIComponent(token)}`;
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { accept: 'application/json', 'api-key': env.BREVO_API_KEY, 'content-type': 'application/json' },
    body: JSON.stringify({
      sender: { name: env.MAIL_FROM_NAME || 'Nexora AdPilot', email: env.MAIL_FROM_EMAIL || 'hello@nexoratechnologies.pk' },
      to: [{ email }],
      subject: 'Reset your Nexora AdPilot password',
      htmlContent: `<p>Hello,</p><p>We received a request to reset your Nexora AdPilot client password.</p><p><a href="${resetUrl}">Reset my password</a></p><p>This link expires in 10 minutes and can only be used once.</p>`,
    }),
  });
  if (!response.ok) throw new Error('EMAIL_SEND_FAILED');
}

async function requestPasswordReset(request: Request, env: Env): Promise<Response> {
  const genericMessage = 'If an eligible client account exists for this email, password reset instructions will be sent.';
  try {
    const body = await request.json() as { email?: unknown };
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ ok: true, message: genericMessage });
    const account = await env.DB.prepare(`SELECT id, email FROM accounts WHERE LOWER(email) = ? AND status = 'active' LIMIT 1`).bind(email).first<{ id: string; email: string }>();
    if (account) {
      const membership = await env.DB.prepare(`SELECT id FROM company_memberships WHERE account_id = ? AND account_type = 'client' AND status = 'active' LIMIT 1`).bind(account.id).first<{ id: string }>();
      if (membership) {
        try {
          const reset = await createPasswordResetToken(env.DB, account.id);
          await sendPasswordResetEmail(env, account.email, reset.token);
        } catch { }
      }
    }
    return json({ ok: true, message: genericMessage });
  } catch { return json({ ok: true, message: genericMessage }); }
}

async function confirmPasswordReset(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json() as { token?: unknown; password?: unknown; };
    const token = typeof body.token === 'string' ? body.token.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (!token || password.length < 12) return json({ ok: false, error: 'INVALID_INPUT', message: 'A valid reset token and a password of at least 12 characters are required.' }, 400);
    const accountId = await consumePasswordResetToken(env.DB, token);
    if (!accountId) return json({ ok: false, error: 'INVALID_OR_EXPIRED_TOKEN', message: 'This password reset link is invalid, expired, or already used.' }, 400);
    const eligible = await env.DB.prepare(`SELECT a.id FROM accounts a WHERE a.id = ? AND a.status = 'active' AND EXISTS (SELECT 1 FROM company_memberships m WHERE m.account_id = a.id AND m.account_type = 'client' AND m.status = 'active') AND NOT EXISTS (SELECT 1 FROM company_memberships owner_membership WHERE owner_membership.account_id = a.id AND owner_membership.account_type = 'owner' AND owner_membership.status = 'active') LIMIT 1`).bind(accountId).first<{ id: string }>();
    if (!eligible) return json({ ok: false, error: 'RESET_NOT_ALLOWED', message: 'Password reset is not available for this account.' }, 400);
    const passwordHash = await hashPassword(password);
    const now = new Date().toISOString();
    await env.DB.batch([
      env.DB.prepare(`UPDATE accounts SET password_hash = ?, updated_at = ? WHERE id = ? AND status = 'active'`).bind(passwordHash, now, accountId),
      env.DB.prepare(`UPDATE sessions SET revoked_at = ? WHERE account_id = ? AND revoked_at IS NULL`).bind(now, accountId),
    ]);
    return json({ ok: true, message: 'Password reset successful. Please sign in with your new password.' });
  } catch { return json({ ok: false, error: 'PASSWORD_RESET_FAILED', message: 'Unable to reset the password.' }, 500); }
}

async function verifyMagicLink(request: Request, env: Env): Promise<Response> {
  try {
    const body = (await request.json()) as { token?: unknown; };
    const token = typeof body.token === 'string' ? body.token.trim() : '';
    if (!token) return json({ ok: false, error: 'INVALID_INPUT', message: 'Magic link token is required.' }, 400);
    const accountId = await consumeMagicLinkToken(env.DB, token);
    if (!accountId) return json({ ok: false, error: 'INVALID_OR_EXPIRED_TOKEN', message: 'This sign-in link is invalid or has expired.' }, 401);
    const account = await env.DB.prepare(`SELECT id, email, status FROM accounts WHERE id = ? LIMIT 1`).bind(accountId).first<{ id: string; email: string; status: string; }>();
    if (!account || account.status !== 'active' || !isConfiguredMagicLinkOwner(env, account.email)) return json({ ok: false, error: 'MAGIC_LINK_NOT_ALLOWED', message: 'Magic link authentication is not available for this account.' }, 403);
    const membership = await env.DB.prepare(`SELECT id, company_id, role, designation, account_type, status FROM company_memberships WHERE account_id = ? AND status = 'active' ORDER BY created_at ASC LIMIT 1`).bind(account.id).first<{ id: string; company_id: string; role: string; designation: string; account_type: 'owner' | 'employee' | 'client'; status: string; }>();
    if (!membership) return json({ ok: false, error: 'NO_ACTIVE_MEMBERSHIP', message: 'No active company membership was found.' }, 403);
    if (membership.account_type !== 'owner') return json({ ok: false, error: 'MAGIC_LINK_NOT_ALLOWED', message: 'Magic link authentication is not available for this account.' }, 403);
    const session = await createSession(env.DB, account.id, membership.id);
    await env.DB.prepare(`UPDATE accounts SET last_login_at = ? WHERE id = ?`).bind(new Date().toISOString(), account.id).run();
    return json({ ok: true, authenticated: true, account: { id: account.id, email: account.email }, company: { id: membership.company_id }, membership: { id: membership.id, role: membership.role, designation: membership.designation, accountType: membership.account_type }, session, expiresAt: session.expiresAt }, 200, session.setCookie);
  } catch { return json({ ok: false, error: 'MAGIC_LINK_VERIFICATION_FAILED', message: 'Unable to verify the sign-in link.' }, 500); }
}

function isConfiguredMagicLinkOwner(env: Env, email: string): boolean {
  const ownerEmail = env.OWNER_MAGIC_LINK_EMAIL?.trim().toLowerCase();
  return Boolean(ownerEmail) && email === ownerEmail;
}

async function requestMagicLink(request: Request, env: Env): Promise<Response> {
  try {
    const body = (await request.json()) as { email?: unknown; };
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!email) return json({ ok: false, error: 'INVALID_INPUT', message: 'Email address is required.' }, 400);
    const account = await env.DB.prepare(`SELECT id, email, status FROM accounts WHERE LOWER(email) = ? LIMIT 1`).bind(email).first<{ id: string; email: string; status: string; }>();
    if (!account || account.status !== 'active' || !isConfiguredMagicLinkOwner(env, account.email)) return json({ ok: true, message: 'If an active AdPilot account exists for this email, a sign-in link has been sent.' });
    const membership = await env.DB.prepare(`SELECT id, account_type FROM company_memberships WHERE account_id = ? AND status = 'active' ORDER BY created_at ASC LIMIT 1`).bind(account.id).first<{ id: string; account_type: 'owner' | 'employee' | 'client'; }>();
    if (!membership || membership.account_type !== 'owner') return json({ ok: true, message: 'If an active AdPilot account exists for this email, a sign-in link has been sent.' });
    const magicLink = await createMagicLinkToken(env.DB, account.id);
    await sendMagicLinkEmail(env, account.email, magicLink.token);
    return json({ ok: true, message: 'If an active AdPilot account exists for this email, a sign-in link has been sent.', expiresAt: magicLink.expiresAt });
  } catch (error) {
    if (error instanceof Error && error.message === 'EMAIL_PROVIDER_NOT_CONFIGURED') return json({ ok: false, error: 'EMAIL_PROVIDER_NOT_CONFIGURED', message: 'Email authentication is not configured.' }, 503);
    if (error instanceof Error && error.message === 'EMAIL_SEND_FAILED') return json({ ok: false, error: 'EMAIL_SEND_FAILED', message: 'Unable to send the sign-in email.' }, 502);
    return json({ ok: false, error: 'MAGIC_LINK_REQUEST_FAILED', message: 'Unable to request a sign-in link.' }, 500);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // AUTH ROUTES
    if (url.pathname === '/api/auth/register' && request.method === 'POST') {
      try {
        const body = (await request.json()) as { email?: unknown; password?: unknown; companyName?: unknown; };
        const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
        const password = typeof body.password === 'string' ? body.password : '';
        const companyName = typeof body.companyName === 'string' ? body.companyName.trim() : '';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || companyName.length < 2 || companyName.length > 100 || password.length < 12 || password.length > 256) return json({ ok: false, error: 'INVALID_INPUT', message: 'Enter a valid email, a company name (2–100 characters), and a password of 12–256 characters.' }, 400);
        const existing = await env.DB.prepare('SELECT id FROM accounts WHERE LOWER(email) = ? LIMIT 1').bind(email).first<{ id: string }>();
        if (existing) return json({ ok: false, error: 'EMAIL_UNAVAILABLE', message: 'This email cannot be used to create a new account. Try signing in or resetting your password.' }, 409);
        const now = new Date().toISOString();
        const accountId = crypto.randomUUID();
        const companyId = crypto.randomUUID();
        const membershipId = crypto.randomUUID();
        const passwordHash = await hashPassword(password);
        await env.DB.batch([
          env.DB.prepare(`INSERT INTO accounts (id, email, status, email_verified_at, last_login_at, mfa_enabled, auth_provider, created_at, updated_at, password_hash) VALUES (?, ?, 'active', NULL, ?, 0, 'password', ?, ?, ?)`).bind(accountId, email, now, now, now, passwordHash),
          env.DB.prepare(`INSERT INTO companies (id, name, plan, logo_initial, seats_used, seats_limit, devices_active, devices_limit, timezone, default_currency, created_at, updated_at) VALUES (?, ?, 'trial', ?, 1, 2, 0, 0, 'Asia/Karachi', 'PKR', ?, ?)`).bind(companyId, companyName, companyName.charAt(0).toUpperCase(), now, now),
          env.DB.prepare(`INSERT INTO company_memberships (id, company_id, account_id, role, designation, status, invited_by_user_id, created_at, updated_at, account_type) VALUES (?, ?, ?, 'owner', 'Owner', 'active', NULL, ?, ?, 'owner')`).bind(membershipId, companyId, accountId, now, now),
        ]);
        let emailSent = true;
        try {
          const verification = await createEmailVerificationToken(env.DB, accountId);
          await sendVerificationEmail(env, email, verification.token);
        } catch { emailSent = false; }
        return json({ ok: true, authenticated: false, verificationRequired: true, emailSent, email, message: emailSent ? 'Account created. Please check your email and click the verification link to activate your account.' : 'Account created, but we could not send the verification email. Please use "Resend verification email".' }, 201);
      } catch (error) {
        const message = error instanceof Error ? error.message : '';
        if (message.includes('UNIQUE constraint failed')) return json({ ok: false, error: 'EMAIL_UNAVAILABLE', message: 'This email cannot be used to create a new account. Try signing in or resetting your password.' }, 409);
        return json({ ok: false, error: 'REGISTRATION_FAILED', message: 'Unable to create the workspace. Please try again.' }, 500);
      }
    }

    if (url.pathname === '/api/auth/magic-link' && request.method === 'POST') return requestMagicLink(request, env);
    if (url.pathname === '/api/auth/magic-link/verify' && request.method === 'POST') return verifyMagicLink(request, env);
    if (url.pathname === '/api/auth/password-reset/request' && request.method === 'POST') return requestPasswordReset(request, env);
    if (url.pathname === '/api/auth/password-reset/confirm' && request.method === 'POST') return confirmPasswordReset(request, env);

    if (url.pathname === '/api/auth/email-verification/verify' && request.method === 'POST') {
      try {
        const body = (await request.json()) as { token?: unknown };
        const token = typeof body.token === 'string' ? body.token.trim() : '';
        const accountId = token ? await consumeEmailVerificationToken(env.DB, token) : null;
        if (!accountId) return json({ ok: false, error: 'INVALID_OR_EXPIRED_TOKEN', message: 'This verification link is invalid, expired, or already used.' }, 400);
        const now = new Date().toISOString();
        await env.DB.prepare(`UPDATE accounts SET email_verified_at = ?, updated_at = ? WHERE id = ? AND email_verified_at IS NULL`).bind(now, now, accountId).run();
        return json({ ok: true, message: 'Email verified successfully. You can now sign in.' });
      } catch { return json({ ok: false, error: 'EMAIL_VERIFICATION_FAILED', message: 'Unable to verify the email address.' }, 500); }
    }

    if (url.pathname === '/api/auth/email-verification/resend' && request.method === 'POST') {
      const genericMessage = 'If an unverified account exists for this email, a new verification link has been sent.';
      try {
        const body = (await request.json()) as { email?: unknown };
        const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ ok: true, message: genericMessage });
        const account = await env.DB.prepare(`SELECT id, email FROM accounts WHERE LOWER(email) = ? AND status = 'active' AND email_verified_at IS NULL LIMIT 1`).bind(email).first<{ id: string; email: string }>();
        if (account) {
          const last = await env.DB.prepare(`SELECT created_at FROM email_verification_tokens WHERE account_id = ? ORDER BY created_at DESC LIMIT 1`).bind(account.id).first<{ created_at: string }>();
          const tooSoon = !!last && Date.now() - new Date(last.created_at).getTime() < 60_000;
          if (!tooSoon) {
            const verification = await createEmailVerificationToken(env.DB, account.id);
            await sendVerificationEmail(env, account.email, verification.token);
          }
        }
      } catch { }
      return json({ ok: true, message: genericMessage });
    }

    if (url.pathname === '/api' || url.pathname === '/api/') return json({ ok: true, service: 'Nexora AdPilot API', database: !!env.DB });

    if (url.pathname === '/api/auth/login' && request.method === 'POST') {
      try {
        const body = (await request.json()) as { email?: unknown; password?: unknown; };
        const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
        const password = typeof body.password === 'string' ? body.password : '';
        if (!email || !password) return json({ ok: false, error: 'INVALID_INPUT', message: 'Email and password are required.' }, 400);
        const account = await env.DB.prepare(`SELECT id, email, status, email_verified_at, password_hash FROM accounts WHERE LOWER(email) = ? LIMIT 1`).bind(email).first<{ id: string; email: string; status: string; email_verified_at: string | null; password_hash: string | null; }>();
        if (!account || !account.password_hash || account.status !== 'active') return json({ ok: false, error: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' }, 401);
        const passwordValid = await verifyPassword(password, account.password_hash);
        if (!passwordValid) return json({ ok: false, error: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' }, 401);
        if (!account.email_verified_at) return json({ ok: false, error: 'EMAIL_NOT_VERIFIED', message: 'Please verify your email address before signing in. Check your inbox for the verification link.' }, 403);
        const memberships = await env.DB.prepare(`SELECT id, company_id, role, designation, account_type, status FROM company_memberships WHERE account_id = ? AND status = 'active' ORDER BY created_at ASC`).bind(account.id).all<{ id: string; company_id: string; role: string; designation: string; account_type: 'owner' | 'employee' | 'client'; status: string; }>();
        if (memberships.results.length === 0) return json({ ok: false, error: 'NO_ACTIVE_MEMBERSHIP', message: 'No active company membership is available.' }, 403);
        if (memberships.results.length > 1) return json({ ok: false, error: 'COMPANY_SELECTION_REQUIRED', message: 'Multiple active company memberships require company selection.' }, 409);
        const membership = memberships.results[0];
        const session = await createSession(env.DB, account.id, membership.id);
        const now = new Date().toISOString();
        await env.DB.prepare(`UPDATE accounts SET last_login_at = ? WHERE id = ?`).bind(now, account.id).run();
        const company = await env.DB.prepare(`SELECT id, name, plan, logo_initial, seats_used, seats_limit, devices_active, devices_limit, timezone, default_currency FROM companies WHERE id = ? LIMIT 1`).bind(membership.company_id).first<{ id: string; name: string; plan: 'trial' | 'growth' | 'enterprise'; logo_initial: string; seats_used: number; seats_limit: number; devices_active: number; devices_limit: number; timezone: string; default_currency: string; }>();
        const permissions = await loadMembershipPermissions(env.DB, membership.id, membership.account_type);
        const companyPayload = company ? { id: company.id, name: company.name, plan: company.plan, logoInitial: company.logo_initial, seatsUsed: company.seats_used, seatsLimit: company.seats_limit, devicesActive: company.devices_active, devicesLimit: company.devices_limit, timezone: company.timezone, defaultCurrency: company.default_currency, } : { id: membership.company_id, };
        return new Response(JSON.stringify({ ok: true, authenticated: true, account: { id: account.id, email: account.email }, company: companyPayload, membership: { id: membership.id, role: membership.role, designation: membership.designation, accountType: membership.account_type }, session: { accountId: account.id, sessionId: session.sessionId, companyId: membership.company_id, membershipId: membership.id, accountType: membership.account_type, role: membership.role, designation: membership.designation, permissions, expiresAt: session.expiresAt }, expiresAt: session.expiresAt, }), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'set-cookie': session.setCookie, }, });
      } catch { return json({ ok: false, error: 'LOGIN_FAILED', message: 'Unable to complete login.' }, 500); }
    }

    if (url.pathname === '/api/session' && request.method === 'GET') {
      const session = await resolveSession(request, env.DB);
      if (!session) return json({ ok: false, error: 'UNAUTHENTICATED', message: 'No active authenticated session.' }, 401);
      const sessionAccount = await env.DB.prepare(`SELECT a.id, a.email, c.id AS company_id, c.name AS company_name, c.plan, c.logo_initial, c.seats_used, c.seats_limit, c.devices_active, c.devices_limit, c.timezone, c.default_currency, cm.id AS membership_id, cm.role, cm.designation, cm.account_type FROM accounts a INNER JOIN company_memberships cm ON cm.account_id = a.id AND cm.id = ? INNER JOIN companies c ON c.id = cm.company_id WHERE a.id = ? LIMIT 1`).bind(session.membershipId, session.accountId).first<{ id: string; email: string; company_id: string; company_name: string; plan: 'trial' | 'growth' | 'enterprise'; logo_initial: string; seats_used: number; seats_limit: number; devices_active: number; devices_limit: number; timezone: string; default_currency: string; membership_id: string; role: string; designation: string; account_type: 'owner' | 'employee' | 'client'; }>();
      if (!sessionAccount) return json({ ok: false, error: 'SESSION_CONTEXT_UNAVAILABLE', message: 'The authenticated account context could not be loaded.' }, 500);
      const subscriptionRepository = new ProductionSubscriptionRepository(env.DB);
      const subscription = await subscriptionRepository.get(session.companyId);
      const entitlementKeys: EntitlementKey[] = ['crm', 'inventory', 'campaigns', 'advanced_planning', 'proof_of_play', 'field_verification', 'analytics', 'finance', 'client_portal', 'api', 'programmatic', 'ai_planning'];
      const entitlements = Object.fromEntries(entitlementKeys.map((key) => [key, subscription ? hasEntitlement(subscription, key).allowed : false]));
      return json({ ok: true, authenticated: true, account: { id: sessionAccount.id, email: sessionAccount.email }, company: { id: sessionAccount.company_id, name: sessionAccount.company_name, plan: sessionAccount.plan, logoInitial: sessionAccount.logo_initial, seatsUsed: sessionAccount.seats_used, seatsLimit: sessionAccount.seats_limit, devicesActive: sessionAccount.devices_active, devicesLimit: sessionAccount.devices_limit, timezone: sessionAccount.timezone, defaultCurrency: sessionAccount.default_currency, }, membership: { id: sessionAccount.membership_id, role: sessionAccount.role, designation: sessionAccount.designation, accountType: sessionAccount.account_type, }, subscription: subscription ? { id: subscription.id, planId: subscription.planId, status: subscription.status, billingCycle: subscription.billingCycle, paymentStatus: subscription.paymentStatus, startsAt: subscription.startsAt, renewsAt: subscription.renewsAt, trialEndsAt: subscription.trialEndsAt, graceEndsAt: subscription.graceEndsAt, maxSeats: subscription.maxSeats, maxDevices: subscription.maxDevices, entitlements, } : null, session: { accountId: session.accountId, sessionId: session.sessionId, companyId: session.companyId, membershipId: session.membershipId, accountType: session.accountType, role: session.role, designation: session.designation, permissions: session.permissions, expiresAt: session.expiresAt, }, });
    }

    if (url.pathname === '/api/weather' && request.method === 'GET') {
      const session = await resolveSession(request, env.DB);
      if (!session) return json({ ok: false, error: 'UNAUTHENTICATED', message: 'An active authenticated session is required.' }, 401);
      if (!env.WEATHER_API_KEY) return json({ ok: false, error: 'WEATHER_NOT_CONFIGURED', message: 'Weather service is not configured.' }, 503);
      const lat = Number(url.searchParams.get('lat'));
      const lng = Number(url.searchParams.get('lng'));
      const geographyId = url.searchParams.get('geographyId')?.trim();
      const label = url.searchParams.get('label')?.trim() || 'Campaign area';
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return json({ ok: false, error: 'INVALID_INPUT', message: 'Valid lat and lng parameters are required.' }, 400);
      if (!geographyId) return json({ ok: false, error: 'INVALID_INPUT', message: 'geographyId parameter is required.' }, 400);
      const forecastDays = Math.min(Math.max(Math.trunc(Number(url.searchParams.get('days') ?? '3')), 1), 3);
      try {
        const provider = new WeatherApiProvider({ apiKey: env.WEATHER_API_KEY });
        const weather = await provider.getWeather({ geographyId, label, coordinates: { lat, lng, }, }, forecastDays);
        return json({ ok: true, weather, });
      } catch (error) { return json({ ok: false, error: 'WEATHER_PROVIDER_ERROR', message: error instanceof Error ? error.message : 'Weather provider request failed.' }, 502); }
    }

    if (url.pathname === '/api/auth/logout' && request.method === 'POST') {
      await revokeSession(request, env.DB);
      return new Response(JSON.stringify({ ok: true, authenticated: false, }), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'set-cookie': clearSessionCookie(), }, });
    }

    // GEOGRAPHY & LOCATION SEARCH
    if (url.pathname === '/api/geography/search' && request.method === 'GET') {
      const query = url.searchParams.get('q')?.trim();
      if (!query) return json({ ok: false, error: 'INVALID_INPUT', message: 'Query parameter "q" is required.' }, 400);
      
      try {
        if (env.GEOAPIFY_API_KEY) {
          const geoRes = await fetch(`https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(query)}&lang=en&limit=5&apiKey=${env.GEOAPIFY_API_KEY}`);
          const geoData = await geoRes.json();
          
          if (geoData && geoData.features) {
            const results = geoData.features.map((f: any) => {
              const formatted = f.properties.formatted || "";
              const addressParts = formatted.split(',').map((s: string) => s.trim());
              const city = f.properties.city || f.properties.town || f.properties.village || addressParts[addressParts.length - 3] || addressParts[addressParts.length - 2] || "Unknown";
              const lat = f.properties.lat || f.geometry?.coordinates?.[1] || null;
              const lon = f.properties.lon || f.geometry?.coordinates?.[0] || null;

              return {
                id: f.properties.place_id || crypto.randomUUID(),
                name: f.properties.name || f.properties.address_line1 || query,
                displayName: formatted || query,
                city: city,
                lat: lat,
                lng: lon,
                coordinates: { lat: lat, lng: lon }
              };
            });
            return json({ ok: true, source: 'geoapify', results });
          }
        }

        const repository = createGeographyRepository(env);
        const existing = await repository.search({ query });
        if (existing.length > 0) return json({ ok: true, source: 'database', persisted: true, results: existing });
        
        const nominatimRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5&accept-language=en`, {
          headers: { 'User-Agent': 'NexoraAdPilot/1.0' }
        });
        const nominatimData = await nominatimRes.json();

        if (!nominatimData || nominatimData.length === 0) {
          return json({ ok: true, source: 'nominatim', persisted: false, results: [] });
        }

        const results = nominatimData.map((item: any) => {
          const parts = item.display_name.split(',').map((s: string) => s.trim());
          const city = item.address?.city || item.address?.town || item.address?.state_district || parts[parts.length - 3] || parts[parts.length - 2] || "Unknown";
          return {
            id: item.place_id.toString(),
            name: parts[0],
            displayName: item.display_name,
            city: city,
            lat: Number(item.lat),
            lng: Number(item.lon),
            coordinates: { lat: Number(item.lat), lng: Number(item.lon) }
          };
        });
        return json({ ok: true, source: 'nominatim', persisted: false, results });
      } catch (error) {
        return json(errorPayload(error), errorStatus(error));
      }
    }

    if (url.pathname === '/api/geography/reverse' && request.method === 'GET') {
      const latitude = Number(url.searchParams.get('lat'));
      const longitude = Number(url.searchParams.get('lng'));
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return json({ ok: false, error: 'INVALID_INPUT', message: 'Valid "lat" and "lng" parameters are required.' }, 400);
      try {
        const repository = createGeographyRepository(env);
        const result = await repository.reverseGeocode({ latitude, longitude, });
        if (!result) return json({ ok: true, persisted: false, result: null, });
        let persisted: GeographicLocation | null = null;
        if (result.externalPlaceId) persisted = await repository.persistGeocodingResult(result);
        return json({ ok: true, persisted: !!persisted, result: persisted ?? result, });
      } catch (error) { return json(errorPayload(error), errorStatus(error)); }
    }

    const teamResponse = await handleTeamRoutes(request, env, url);
    if (teamResponse) return teamResponse;

    // ==========================================
    // CRM ROUTES
    // ==========================================
    if (url.pathname === '/api/crm/clients' && request.method === 'GET') {
      try {
        const session = await resolveSession(request, env.DB);
        if (!session) return json({ ok: false, error: 'UNAUTHENTICATED' }, 401);
        const clients = await env.DB.prepare(`SELECT * FROM clients WHERE company_id = ? ORDER BY created_at DESC`).bind(session.companyId).all();
        return json({ ok: true, data: clients.results });
      } catch (err: any) { return json({ ok: false, error: err.message }, 500); }
    }
    if (url.pathname === '/api/crm/leads' && request.method === 'GET') {
      try {
        const session = await resolveSession(request, env.DB);
        if (!session) return json({ ok: false, error: 'UNAUTHENTICATED' }, 401);
        const leads = await env.DB.prepare(`SELECT * FROM leads WHERE company_id = ? ORDER BY created_at DESC`).bind(session.companyId).all();
        return json({ ok: true, data: leads.results });
      } catch (err: any) { return json({ ok: false, error: err.message }, 500); }
    }
    if (url.pathname === '/api/crm/contacts' && request.method === 'GET') {
      try {
        const session = await resolveSession(request, env.DB);
        if (!session) return json({ ok: false, error: 'UNAUTHENTICATED' }, 401);
        const clientId = url.searchParams.get('client_id');
        if (!clientId) return json({ ok: false, error: 'CLIENT_ID_REQUIRED' }, 400);
        const contacts = await env.DB.prepare(`SELECT * FROM contacts WHERE client_id = ? AND company_id = ? ORDER BY created_at DESC`).bind(clientId, session.companyId).all();
        return json({ ok: true, data: contacts.results });
      } catch (err: any) { return json({ ok: false, error: err.message }, 500); }
    }
    if (url.pathname === '/api/crm/clients' && request.method === 'POST') {
      try {
        const session = await resolveSession(request, env.DB);
        if (!session) return json({ ok: false, error: 'UNAUTHENTICATED' }, 401);
        const body = (await request.json()) as any;
        const id = crypto.randomUUID();
        await env.DB.prepare(`INSERT INTO clients (id, company_id, name, client_type, industry, city, phone, email, credit_limit, currency, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(id, session.companyId, body.name, body.client_type || 'direct', body.industry || null, body.city || null, body.phone || null, body.email || null, body.credit_limit || 0, body.currency || 'PKR', body.notes || null).run();
        return json({ ok: true, id });
      } catch (err: any) { return json({ ok: false, error: err.message }, 500); }
    }
    if (url.pathname === '/api/crm/leads' && request.method === 'POST') {
      try {
        const session = await resolveSession(request, env.DB);
        if (!session) return json({ ok: false, error: 'UNAUTHENTICATED' }, 401);
        const body = (await request.json()) as any;
        const id = crypto.randomUUID();
        await env.DB.prepare(`INSERT INTO leads (id, company_id, company_name, contact_name, email, phone, estimated_value, source, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(id, session.companyId, body.company_name, body.contact_name || null, body.email || null, body.phone || null, body.estimated_value || 0, body.source || null, body.notes || null).run();
        return json({ ok: true, id });
      } catch (err: any) { return json({ ok: false, error: err.message }, 500); }
    }
    if (url.pathname === '/api/crm/contacts' && request.method === 'POST') {
      try {
        const session = await resolveSession(request, env.DB);
        if (!session) return json({ ok: false, error: 'UNAUTHENTICATED' }, 401);
        const body = (await request.json()) as any;
        const id = crypto.randomUUID();
        await env.DB.prepare(`INSERT INTO contacts (id, company_id, client_id, name, title, email, phone, is_primary) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).bind(id, session.companyId, body.client_id, body.name, body.title || null, body.email || null, body.phone || null, body.is_primary ? 1 : 0).run();
        return json({ ok: true, id });
      } catch (err: any) { return json({ ok: false, error: err.message }, 500); }
    }
    if (url.pathname.startsWith('/api/crm/leads/') && url.pathname.endsWith('/stage') && request.method === 'PUT') {
      try {
        const session = await resolveSession(request, env.DB);
        if (!session) return json({ ok: false, error: 'UNAUTHENTICATED' }, 401);
        const parts = url.pathname.split('/');
        const leadId = parts[4];
        const body = (await request.json()) as any;
        await env.DB.prepare(`UPDATE leads SET stage = ?, updated_at = datetime('now') WHERE id = ? AND company_id = ?`).bind(body.stage, leadId, session.companyId).run();
        return json({ ok: true });
      } catch (err: any) { return json({ ok: false, error: err.message }, 500); }
    }
    if (url.pathname.startsWith('/api/crm/leads/') && url.pathname.endsWith('/convert') && request.method === 'POST') {
      try {
        const session = await resolveSession(request, env.DB);
        if (!session) return json({ ok: false, error: 'UNAUTHENTICATED' }, 401);
        const parts = url.pathname.split('/');
        const leadId = parts[4]; 
        const company_id = session.companyId;
        const lead = await env.DB.prepare(`SELECT * FROM leads WHERE id = ? AND company_id = ?`).bind(leadId, company_id).first<any>();
        if (!lead) return json({ ok: false, message: 'Lead not found' }, 404);
        const client_id = crypto.randomUUID();
        await env.DB.batch([
          env.DB.prepare(`INSERT INTO clients (id, company_id, name, phone, email, notes) VALUES (?, ?, ?, ?, ?, ?)`).bind(client_id, company_id, lead.company_name, lead.phone, lead.email, `Converted from Lead. ${lead.notes || ''}`),
          env.DB.prepare(`UPDATE leads SET stage = 'won', converted_client_id = ? WHERE id = ? AND company_id = ?`).bind(client_id, leadId, company_id)
        ]);
        return json({ ok: true, client_id });
      } catch (err: any) { return json({ ok: false, error: err.message }, 500); }
    }

    // ==========================================
    // INVENTORY ROUTES
    // ==========================================
    if (url.pathname === '/api/inventory' && request.method === 'GET') {
      try {
        const session = await resolveSession(request, env.DB);
        if (!session) return json({ ok: false, error: 'UNAUTHENTICATED' }, 401);
        const items = await env.DB.prepare(`SELECT * FROM inventory WHERE company_id = ? ORDER BY created_at DESC`).bind(session.companyId).all();
        return json({ ok: true, data: items.results });
      } catch (err: any) { return json({ ok: false, error: err.message }, 500); }
    }
    if (url.pathname === '/api/inventory' && request.method === 'POST') {
      try {
        const session = await resolveSession(request, env.DB);
        if (!session) return json({ ok: false, error: 'UNAUTHENTICATED' }, 401);
        const body = (await request.json()) as any;
        const id = crypto.randomUUID();
        await env.DB.prepare(`INSERT INTO inventory (id, company_id, name, screen_type, city, location, latitude, longitude, geography_id, size, rate, currency, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(id, session.companyId, body.name, body.screen_type || 'digital', body.city || null, body.location || null, body.latitude || null, body.longitude || null, body.geography_id || null, body.size || null, body.rate || 0, body.currency || 'PKR', body.status || 'online').run();
        return json({ ok: true, id });
      } catch (err: any) { return json({ ok: false, error: err.message }, 500); }
    }

    // ==========================================
    // CAMPAIGNS ROUTES
    // ==========================================
    if (url.pathname === '/api/campaigns' && request.method === 'GET') {
      try {
        const session = await resolveSession(request, env.DB);
        if (!session) return json({ ok: false, error: 'UNAUTHENTICATED' }, 401);
        const campaigns = await env.DB.prepare(`
          SELECT c.*, cl.name as client_name 
          FROM campaigns c
          JOIN clients cl ON c.client_id = cl.id
          WHERE c.company_id = ? 
          ORDER BY c.created_at DESC
        `).bind(session.companyId).all();
        return json({ ok: true, data: campaigns.results });
      } catch (err: any) { return json({ ok: false, error: err.message }, 500); }
    }
    if (url.pathname === '/api/campaigns' && request.method === 'POST') {
      try {
        const session = await resolveSession(request, env.DB);
        if (!session) return json({ ok: false, error: 'UNAUTHENTICATED' }, 401);
        const body = (await request.json()) as any;
        const id = crypto.randomUUID();
        await env.DB.prepare(`
          INSERT INTO campaigns (id, company_id, client_id, name, status, start_date, end_date, total_budget, currency, creative_url) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          id, session.companyId, body.client_id, body.name, body.status || 'draft', 
          body.start_date, body.end_date, body.total_budget || 0, body.currency || 'PKR', body.creative_url || null
        ).run();

        if (body.screens && Array.isArray(body.screens)) {
          for (const screen of body.screens) {
            const csId = crypto.randomUUID();
            await env.DB.prepare(`
              INSERT INTO campaign_screens (id, campaign_id, inventory_id, rate_applied) 
              VALUES (?, ?, ?, ?)
            `).bind(csId, id, screen.inventory_id, screen.rate_applied || 0).run();
          }
        }
        return json({ ok: true, id });
      } catch (err: any) { return json({ ok: false, error: err.message }, 500); }
    }
    if (url.pathname === '/api/campaigns/check-availability' && request.method === 'POST') {
      try {
        const session = await resolveSession(request, env.DB);
        if (!session) return json({ ok: false, error: 'UNAUTHENTICATED' }, 401);
        const body = (await request.json()) as any;
        const inventory_ids = body.inventory_ids;
        const start_date = body.start_date;
        const end_date = body.end_date;
        if (!inventory_ids || inventory_ids.length === 0 || !start_date || !end_date) return json({ ok: false, error: 'INVALID_INPUT', message: 'Missing screens or dates.' }, 400);
        
        const placeholders = inventory_ids.map(() => '?').join(',');
        const query = `
          SELECT cs.inventory_id, c.name as campaign_name, c.start_date, c.end_date
          FROM campaign_screens cs
          JOIN campaigns c ON cs.campaign_id = c.id
          WHERE cs.inventory_id IN (${placeholders})
            AND c.company_id = ?
            AND c.status NOT IN ('cancelled', 'completed')
            AND (c.start_date <= ? AND c.end_date >= ?)
        `;
        const bindings = [...inventory_ids, session.companyId, end_date, start_date];
        const conflicts = await env.DB.prepare(query).bind(...bindings).all();
        return json({ ok: true, conflicts: conflicts.results });
      } catch (err: any) { return json({ ok: false, error: err.message }, 500); }
    }

    // ==========================================
    // FINANCE / INVOICES ROUTES (PROFESSIONAL)
    // ==========================================
    
    // 1. Get All Invoices
    if (url.pathname === '/api/invoices' && request.method === 'GET') {
      try {
        const session = await resolveSession(request, env.DB);
        if (!session) return json({ ok: false, error: 'UNAUTHENTICATED' }, 401);
        
        const invoices = await env.DB.prepare(`
          SELECT i.*, c.name as client_name 
          FROM invoices i
          JOIN clients c ON i.client_id = c.id
          WHERE i.company_id = ? 
          ORDER BY i.created_at DESC
        `).bind(session.companyId).all();
        
        const today = new Date().toISOString().split('T')[0];
        const processedInvoices = invoices.results.map((inv: any) => {
          if (inv.status !== 'paid' && inv.status !== 'draft' && inv.due_date < today) {
            return { ...inv, status: 'overdue' };
          }
          return inv;
        });

        return json({ ok: true, data: processedInvoices });
      } catch (err: any) { return json({ ok: false, error: err.message }, 500); }
    }

    // 2. Create Invoice
    if (url.pathname === '/api/invoices' && request.method === 'POST') {
      try {
        const session = await resolveSession(request, env.DB);
        if (!session) return json({ ok: false, error: 'UNAUTHENTICATED' }, 401);
        
        const body = (await request.json()) as any;
        const id = crypto.randomUUID();
        const invoice_number = `INV-${Math.floor(100000 + Math.random() * 900000)}`;
        
        let subtotal = 0;
        if (body.items && Array.isArray(body.items)) {
          body.items.forEach((item: any) => {
            subtotal += (Number(item.quantity) * Number(item.rate));
          });
        }
        
        const discount_amount = Number(body.discount_amount) || 0;
        const tax_rate = Number(body.tax_rate) || 0;
        const taxable_amount = Math.max(0, subtotal - discount_amount);
        const tax_amount = taxable_amount * (tax_rate / 100);
        const total_amount = taxable_amount + tax_amount;

        await env.DB.prepare(`
          INSERT INTO invoices (id, company_id, client_id, campaign_id, invoice_number, issue_date, due_date, status, subtotal, discount_amount, tax_rate, tax_amount, total_amount, amount_paid, currency, notes) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
        `).bind(
          id, session.companyId, body.client_id, body.campaign_id || null, invoice_number, 
          body.issue_date, body.due_date, body.status || 'draft', 
          subtotal, discount_amount, tax_rate, tax_amount, total_amount, body.currency || 'PKR', body.notes || null
        ).run();

        if (body.items && Array.isArray(body.items)) {
          for (const item of body.items) {
            const itemId = crypto.randomUUID();
            const amount = Number(item.quantity) * Number(item.rate);
            await env.DB.prepare(`
              INSERT INTO invoice_items (id, invoice_id, description, quantity, rate, amount) 
              VALUES (?, ?, ?, ?, ?, ?)
            `).bind(itemId, id, item.description, item.quantity, item.rate, amount).run();
          }
        }
        return json({ ok: true, id, invoice_number });
      } catch (err: any) { return json({ ok: false, error: err.message }, 500); }
    }

    // 3. Get Single Invoice (With Items, Payments & Company Info)
    if (url.pathname.startsWith('/api/invoices/') && request.method === 'GET') {
      try {
        const session = await resolveSession(request, env.DB);
        if (!session) return json({ ok: false, error: 'UNAUTHENTICATED' }, 401);
        
        const parts = url.pathname.split('/');
        const invoiceId = parts[3]; 
        
        const invoice = await env.DB.prepare(`
          SELECT i.*, 
                 c.name as client_name, c.email as client_email, c.phone as client_phone, c.address as client_address,
                 comp.name as company_name, comp.logo_initial as company_logo, comp.timezone
          FROM invoices i
          JOIN clients c ON i.client_id = c.id
          JOIN companies comp ON i.company_id = comp.id
          WHERE i.id = ? AND i.company_id = ?
        `).bind(invoiceId, session.companyId).first<any>();
        
        if (!invoice) return json({ ok: false, error: 'NOT_FOUND' }, 404);
        
        const items = await env.DB.prepare(`SELECT * FROM invoice_items WHERE invoice_id = ?`).bind(invoiceId).all();
        const payments = await env.DB.prepare(`SELECT * FROM invoice_payments WHERE invoice_id = ? ORDER BY payment_date DESC`).bind(invoiceId).all();
        
        const balance_due = invoice.total_amount - invoice.amount_paid;
        
        return json({ ok: true, data: { ...invoice, balance_due, items: items.results, payments: payments.results } });
      } catch (err: any) { return json({ ok: false, error: err.message }, 500); }
    }

    // 4. Record Payment
    if (url.pathname.startsWith('/api/invoices/') && url.pathname.endsWith('/payments') && request.method === 'POST') {
      try {
        const session = await resolveSession(request, env.DB);
        if (!session) return json({ ok: false, error: 'UNAUTHENTICATED' }, 401);
        
        const parts = url.pathname.split('/');
        const invoiceId = parts[3]; 
        const body = (await request.json()) as any;
        
        const invoice = await env.DB.prepare(`SELECT total_amount, amount_paid FROM invoices WHERE id = ? AND company_id = ?`).bind(invoiceId, session.companyId).first<any>();
        if (!invoice) return json({ ok: false, error: 'NOT_FOUND' }, 404);

        const paymentId = crypto.randomUUID();
        const payment_amount = Number(body.amount);
        
        await env.DB.prepare(`
          INSERT INTO invoice_payments (id, invoice_id, amount, payment_date, payment_method, reference_no, notes) 
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(paymentId, invoiceId, payment_amount, body.payment_date, body.payment_method, body.reference_no || null, body.notes || null).run();

        const new_amount_paid = invoice.amount_paid + payment_amount;
        let new_status = 'partially_paid';
        if (new_amount_paid >= invoice.total_amount) {
          new_status = 'paid';
        }

        await env.DB.prepare(`
          UPDATE invoices SET amount_paid = ?, status = ?, updated_at = datetime('now') WHERE id = ?
        `).bind(new_amount_paid, new_status, invoiceId).run();

        return json({ ok: true, id: paymentId });
      } catch (err: any) { return json({ ok: false, error: err.message }, 500); }
    }

    // ==========================================
    // EXPENSES ROUTES
    // ==========================================
    if (url.pathname === '/api/expenses' && request.method === 'GET') {
      try {
        const session = await resolveSession(request, env.DB);
        if (!session) return json({ ok: false, error: 'UNAUTHENTICATED' }, 401);
        const expenses = await env.DB.prepare(`SELECT * FROM expenses WHERE company_id = ? ORDER BY expense_date DESC`).bind(session.companyId).all();
        return json({ ok: true, data: expenses.results });
      } catch (err: any) { return json({ ok: false, error: err.message }, 500); }
    }
    if (url.pathname === '/api/expenses' && request.method === 'POST') {
      try {
        const session = await resolveSession(request, env.DB);
        if (!session) return json({ ok: false, error: 'UNAUTHENTICATED' }, 401);
        const body = (await request.json()) as any;
        const id = crypto.randomUUID();
        await env.DB.prepare(`
          INSERT INTO expenses (id, company_id, category, description, amount, expense_date, payment_method, reference_no, campaign_id) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          id, session.companyId, body.category, body.description || null, body.amount, 
          body.expense_date, body.payment_method || null, body.reference_no || null, body.campaign_id || null
        ).run();
        return json({ ok: true, id });
      } catch (err: any) { return json({ ok: false, error: err.message }, 500); }
    }
// ==========================================
// PAYMENTS ROUTES (NEW)
// ==========================================

// 1. Get All Payments
if (url.pathname === '/api/payments' && request.method === 'GET') {
  try {
    const session = await resolveSession(request, env.DB);
    if (!session) return json({ ok: false, error: 'UNAUTHENTICATED' }, 401);
    
    const payments = await env.DB.prepare(`
      SELECT p.*, i.invoice_number, c.name as client_name 
      FROM invoice_payments p
      JOIN invoices i ON p.invoice_id = i.id
      JOIN clients c ON i.client_id = c.id
      WHERE i.company_id = ? 
      ORDER BY p.payment_date DESC
    `).bind(session.companyId).all();
    
    return json({ ok: true, data: payments.results });
  } catch (err: any) { return json({ ok: false, error: err.message }, 500); }
}

// 2. Create Payment (Record Payment)
if (url.pathname === '/api/payments' && request.method === 'POST') {
  try {
    const session = await resolveSession(request, env.DB);
    if (!session) return json({ ok: false, error: 'UNAUTHENTICATED' }, 401);
    
    const body = (await request.json()) as any;
    const invoiceId = body.invoice_id;
    
    if (!invoiceId) return json({ ok: false, error: 'INVALID_INPUT', message: 'Invoice ID required' }, 400);

    const invoice = await env.DB.prepare(`SELECT total_amount, amount_paid FROM invoices WHERE id = ? AND company_id = ?`).bind(invoiceId, session.companyId).first<any>();
    if (!invoice) return json({ ok: false, error: 'NOT_FOUND', message: 'Invoice not found' }, 404);

    const paymentId = crypto.randomUUID();
    const payment_amount = Number(body.amount);
    
    await env.DB.prepare(`
      INSERT INTO invoice_payments (id, invoice_id, amount, payment_date, payment_method, reference_no, notes, received_by) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      paymentId, invoiceId, payment_amount, body.payment_date, body.payment_method, 
      body.reference_no || null, body.notes || null, body.received_by || null
    ).run();

    const new_amount_paid = invoice.amount_paid + payment_amount;
    let new_status = 'partially_paid';
    if (new_amount_paid >= invoice.total_amount) {
      new_status = 'paid';
    }

    await env.DB.prepare(`
      UPDATE invoices SET amount_paid = ?, status = ?, updated_at = datetime('now') WHERE id = ?
    `).bind(new_amount_paid, new_status, invoiceId).run();

    return json({ ok: true, id: paymentId });
  } catch (err: any) { return json({ ok: false, error: err.message }, 500); }
}
    // ==========================================
    // FINANCE METRICS / PROFIT & LOSS ROUTE
    // ==========================================
    if (url.pathname === '/api/finance/metrics' && request.method === 'GET') {
      try {
        const session = await resolveSession(request, env.DB);
        if (!session) return json({ ok: false, error: 'UNAUTHENTICATED' }, 401);
        
        // Total Revenue (Amount Paid by Clients)
        const revenueRes = await env.DB.prepare(`SELECT SUM(amount_paid) as total_revenue FROM invoices WHERE company_id = ? AND status != 'cancelled'`).bind(session.companyId).first<any>();
        const total_revenue = revenueRes?.total_revenue || 0;

        // Total Expenses
        const expenseRes = await env.DB.prepare(`SELECT SUM(amount) as total_expenses FROM expenses WHERE company_id = ?`).bind(session.companyId).first<any>();
        const total_expenses = expenseRes?.total_expenses || 0;

        // Pending / Unpaid Amount (Receivables)
        const pendingRes = await env.DB.prepare(`SELECT SUM(total_amount - amount_paid) as total_pending FROM invoices WHERE company_id = ? AND status NOT IN ('paid', 'cancelled')`).bind(session.companyId).first<any>();
        const total_pending = pendingRes?.total_pending || 0;

        const net_profit = total_revenue - total_expenses;

        return json({ 
          ok: true, 
          metrics: { 
            total_revenue, 
            total_expenses, 
            net_profit, 
            total_pending 
          } 
        });
      } catch (err: any) { return json({ ok: false, error: err.message }, 500); }
    }
    // ==========================================
    // END FINANCE ROUTES
    // ==========================================
// ==========================================
// CREDIT RISK ROUTE
// ==========================================
if (url.pathname === '/api/credit-risk' && request.method === 'GET') {
  try {
    const session = await resolveSession(request, env.DB);
    if (!session) return json({ ok: false, error: 'UNAUTHENTICATED' }, 401);

    // Har client ka total unpaid balance nikalain
    const clients = await env.DB.prepare(`
      SELECT 
        c.id, 
        c.name, 
        c.credit_limit,
        COALESCE(SUM(
          CASE 
            WHEN i.status != 'paid' AND i.status != 'cancelled' 
            THEN (i.total_amount - i.amount_paid) 
            ELSE 0 
          END
        ), 0) as outstanding_balance
      FROM clients c
      LEFT JOIN invoices i ON c.id = i.client_id AND i.company_id = c.company_id
      WHERE c.company_id = ?
      GROUP BY c.id
    `).bind(session.companyId).all();

    return json({ ok: true, data: clients.results });
  } catch (err: any) {
    return json({ ok: false, error: err.message }, 500);
  }
}
    // Credit Limit Update Route 
if (url.pathname.startsWith('/api/crm/clients/') && url.pathname.endsWith('/credit-limit') && request.method === 'PUT') {
  try {
    const session = await resolveSession(request, env.DB);
    if (!session) return json({ ok: false, error: 'UNAUTHENTICATED' }, 401);
    
    const parts = url.pathname.split('/');
    const clientId = parts[4]; // URL se client ID nikalain
    const body = (await request.json()) as any;
    
    await env.DB.prepare(`
      UPDATE clients SET credit_limit = ?, updated_at = datetime('now') WHERE id = ? AND company_id = ?
    `).bind(body.credit_limit, clientId, session.companyId).run();
    
    return json({ ok: true });
  } catch (err: any) { return json({ ok: false, error: err.message }, 500); }
}
    

// Yahan se Ledger ka code paste karein 👇
// ==========================================
// LEDGER ROUTE
// ==========================================
if (url.pathname === '/api/ledger' && request.method === 'GET') {
  try {
    const session = await resolveSession(request, env.DB);
    if (!session) return json({ ok: false, error: 'UNAUTHENTICATED' }, 401);

    const clientId = url.searchParams.get('client_id');
    const companyId = session.companyId;

    let clientFilter = "";
    const bindings: any[] = [companyId];

    if (clientId && clientId !== 'all') {
      clientFilter = " AND client_id = ?";
      bindings.push(clientId);
    }

    const invoices = await env.DB.prepare(`
      SELECT id, issue_date as date, invoice_number as reference, 'Invoice' as type, total_amount as amount, 'Debit' as entry_type
      FROM invoices 
      WHERE company_id = ? AND status != 'cancelled' ${clientFilter}
    `).bind(...bindings).all();

    const payments = await env.DB.prepare(`
      SELECT p.id, p.payment_date as date, i.invoice_number as reference, 'Payment' as type, p.amount, 'Credit' as entry_type, p.payment_method as method
      FROM invoice_payments p
      JOIN invoices i ON p.invoice_id = i.id
      WHERE i.company_id = ? ${clientFilter.replace('client_id', 'i.client_id')}
    `).bind(...bindings).all();

    let expensesData: any[] = [];
    if (!clientId || clientId === 'all') {
       const exp = await env.DB.prepare(`
         SELECT id, expense_date as date, category as reference, 'Expense' as type, amount, 'Debit' as entry_type
         FROM expenses WHERE company_id = ?
       `).bind(companyId).all();
       expensesData = exp.results || [];
    }

    const ledger = [...(invoices.results || []), ...(payments.results || []), ...expensesData].sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return json({ ok: true, data: ledger });
  } catch (err: any) {
    return json({ ok: false, error: err.message }, 500);
  }
}
// Yahan tak 👆


    if (url.pathname.startsWith('/api/')) return json({ ok: false, error: 'NOT_FOUND', message: 'API route not found.', }, 404);

    return env.ASSETS.fetch(request);
  },
  // ==========================================
// CRON JOB: AUTOMATED WEEKLY REPORTS
// ==========================================
async scheduled(event: any, env: Env, ctx: any) {
  try {
    // Aaj ka din check karein (e.g., 'Monday')
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    
    // Un companies ko dhoondein jinka aaj report bhejne ka din hai
    const companiesToEmail = await env.DB.prepare(`
      SELECT c.id, c.name, c.report_email_day, a.email as owner_email
      FROM companies c
      JOIN company_memberships cm ON c.id = cm.company_id
      JOIN accounts a ON cm.account_id = a.id
      WHERE cm.account_type = 'owner' AND c.report_email_day = ?
    `).bind(today).all();

    if (!companiesToEmail.results || companiesToEmail.results.length === 0) {
      return; // Aaj kisi ko email nahi bhejni
    }

    for (const company of companiesToEmail.results) {
      // 1. Pichlay 7 din ka data fetch karein
      const revenue = await env.DB.prepare(`SELECT SUM(amount_paid) as total FROM invoices WHERE company_id = ? AND updated_at >= date('now', '-7 days')`).bind(company.id).first<any>();
      const expenses = await env.DB.prepare(`SELECT SUM(amount) as total FROM expenses WHERE company_id = ? AND expense_date >= date('now', '-7 days')`).bind(company.id).first<any>();
      const activeCamps = await env.DB.prepare(`SELECT COUNT(*) as count FROM campaigns WHERE company_id = ? AND status IN ('live', 'booked')`).bind(company.id).first<any>();
      const newLeads = await env.DB.prepare(`SELECT COUNT(*) as count FROM leads WHERE company_id = ? AND created_at >= date('now', '-7 days')`).bind(company.id).first<any>();

      const revAmount = revenue?.total || 0;
      const expAmount = expenses?.total || 0;
      const profit = revAmount - expAmount;

      // 2. HTML Email tayyar karein
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <h2 style="color: #0f172a; text-align: center;">Weekly Business Digest 📊</h2>
          <p style="text-align: center; color: #666;">Here is what happened at <b>${company.name}</b> in the last 7 days.</p>
          
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="border-bottom: 2px solid #cbd5e1; padding-bottom: 10px; margin-top: 0;">Financial Summary</h3>
            <p><b>Revenue Collected:</b> <span style="color: #10b981; float: right;">PKR ${revAmount.toLocaleString()}</span></p>
            <p><b>Total Expenses:</b> <span style="color: #f43f5e; float: right;">PKR ${expAmount.toLocaleString()}</span></p>
            <p style="font-size: 18px; margin-top: 15px;"><b>Net Profit:</b> <span style="color: ${profit >= 0 ? '#0ea5e9' : '#f43f5e'}; float: right; font-weight: bold;">PKR ${profit.toLocaleString()}</span></p>
          </div>

          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="border-bottom: 2px solid #cbd5e1; padding-bottom: 10px; margin-top: 0;">Operations & Sales</h3>
            <p><b>Active Campaigns:</b> <span style="float: right; font-weight: bold;">${activeCamps?.count || 0}</span></p>
            <p><b>New Leads Generated:</b> <span style="float: right; font-weight: bold;">${newLeads?.count || 0}</span></p>
          </div>

          <p style="text-align: center; font-size: 12px; color: #94a3b8; margin-top: 30px;">
            This is an automated email from Nexora AdPilot.
          </p>
        </div>
      `;

      // 3. Email Bhejein (Brevo ke zariye)
      if (env.BREVO_API_KEY) {
        await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            accept: 'application/json',
            'api-key': env.BREVO_API_KEY,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            sender: { name: 'Nexora AdPilot', email: env.MAIL_FROM_EMAIL || 'hello@nexoratechnologies.pk' },
            to: [{ email: company.owner_email }],
            subject: `Weekly Report: ${company.name}`,
            htmlContent: emailHtml,
          }),
        });
      }
    }
  } catch (error) {
    console.error("Cron Job Error:", error);
  }
},
};
