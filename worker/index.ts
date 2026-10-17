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
}

function json(
  data: unknown,
  status = 200,
  setCookie?: string,
): Response {
  const headers = new Headers({
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });

  if (setCookie) {
    headers.set('Set-Cookie', setCookie);
  }

  return new Response(JSON.stringify(data), {
    status,
    headers,
  });
}

function createGeographyRepository(
  env: Env,
): ProductionGeographyRepository {
  return new ProductionGeographyRepository(
    env.DB,
    new NominatimGeocodingProvider(),
  );
}

function errorStatus(error: unknown): number {
  if (
    error instanceof Error &&
    'code' in error
  ) {
    const code = (error as { code?: string }).code;

    if (code === 'INVALID_INPUT') return 400;
    if (code === 'NOT_FOUND') return 404;
    if (code === 'PROVIDER_RATE_LIMITED') return 429;
    if (
      code === 'PROVIDER_UNAVAILABLE' ||
      code === 'DATABASE_UNAVAILABLE'
    ) {
      return 503;
    }
    if (code === 'PROVIDER_REQUEST_FAILED') return 502;
  }

  return 500;
}

function errorPayload(error: unknown) {
  if (error instanceof Error && 'code' in error) {
    return {
      ok: false,
      error:
        (error as { code?: string }).code ??
        'GEOGRAPHY_ERROR',
      message: error.message,
    };
  }

  return {
    ok: false,
    error: 'GEOGRAPHY_ERROR',
    message:
      error instanceof Error
        ? error.message
        : String(error),
  };
}

async function sendMagicLinkEmail(
  env: Env,
  email: string,
  token: string,
): Promise<void> {
  if (!env.BREVO_API_KEY) {
    throw new Error('EMAIL_PROVIDER_NOT_CONFIGURED');
  }

  const baseUrl =
    env.AUTH_BASE_URL ||
    'http://localhost:5173';

  const verifyUrl =
    `${baseUrl}/#/auth/magic-link?token=${encodeURIComponent(token)}`;

  const senderEmail =
    env.MAIL_FROM_EMAIL ||
    'hello@nexoratechnologies.pk';

  const senderName =
    env.MAIL_FROM_NAME ||
    'Nexora AdPilot';

  const response = await fetch(
    'https://api.brevo.com/v3/smtp/email',
    {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': env.BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: senderName,
          email: senderEmail,
        },
        to: [{ email }],
        subject: 'Your Nexora AdPilot sign-in link',
        htmlContent: `
          <p>Hello,</p>
          <p>Use the secure link below to sign in to Nexora AdPilot:</p>
          <p>
            <a href="${verifyUrl}">
              Sign in to Nexora AdPilot
            </a>
          </p>
          <p>This link expires in 10 minutes and can only be used once.</p>
          <p>If you did not request this email, you can safely ignore it.</p>
        `,
      }),
    },
  );

  if (!response.ok) {
    throw new Error('EMAIL_SEND_FAILED');
  }
}

async function sendVerificationEmail(
  env: Env,
  email: string,
  token: string,
): Promise<void> {
  if (!env.BREVO_API_KEY) {
    throw new Error('EMAIL_PROVIDER_NOT_CONFIGURED');
  }

  const baseUrl = (env.AUTH_BASE_URL || 'http://localhost:5173').replace(/\/$/, '');
  const verifyUrl =
    `${baseUrl}/#/auth/verify-email?token=${encodeURIComponent(token)}`;

  const response = await fetch(
    'https://api.brevo.com/v3/smtp/email',
    {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': env.BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: env.MAIL_FROM_NAME || 'Nexora AdPilot',
          email: env.MAIL_FROM_EMAIL || 'hello@nexoratechnologies.pk',
        },
        to: [{ email }],
        subject: 'Verify your Nexora AdPilot account',
        htmlContent: `
          <p>Welcome to Nexora AdPilot!</p>
          <p>Please confirm your email address to activate your account:</p>
          <p><a href="${verifyUrl}">Verify my email</a></p>
          <p>This link expires in 60 minutes and can only be used once.</p>
          <p>If you did not create this account, you can safely ignore this email.</p>
        `,
      }),
    },
  );

  if (!response.ok) throw new Error('EMAIL_SEND_FAILED');
}

async function sendPasswordResetEmail(
  env: Env,
  email: string,
  token: string,
): Promise<void> {
  if (!env.BREVO_API_KEY) {
    throw new Error('EMAIL_PROVIDER_NOT_CONFIGURED');
  }

  const baseUrl = env.AUTH_BASE_URL || 'http://localhost:5173';
  const resetUrl =
    `${baseUrl}/#/auth/reset-password?token=${encodeURIComponent(token)}`;

  const response = await fetch(
    'https://api.brevo.com/v3/smtp/email',
    {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': env.BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: env.MAIL_FROM_NAME || 'Nexora AdPilot',
          email: env.MAIL_FROM_EMAIL || 'hello@nexoratechnologies.pk',
        },
        to: [{ email }],
        subject: 'Reset your Nexora AdPilot password',
        htmlContent: `
          <p>Hello,</p>
          <p>We received a request to reset your Nexora AdPilot client password.</p>
          <p><a href="${resetUrl}">Reset my password</a></p>
          <p>This link expires in 10 minutes and can only be used once.</p>
          <p>If you did not request this, ignore this email.</p>
        `,
      }),
    },
  );

  if (!response.ok) throw new Error('EMAIL_SEND_FAILED');
}

async function requestPasswordReset(
  request: Request,
  env: Env,
): Promise<Response> {
  const genericMessage =
    'If an eligible client account exists for this email, password reset instructions will be sent.';

  try {
    const body = await request.json() as { email?: unknown };
    const email =
      typeof body.email === 'string'
        ? body.email.trim().toLowerCase()
        : '';

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({
        ok: true,
        message: genericMessage,
      });
    }

    const account = await env.DB.prepare(
      `SELECT id, email
       FROM accounts
       WHERE LOWER(email) = ?
         AND status = 'active'
       LIMIT 1`,
    ).bind(email).first<{ id: string; email: string }>();

    if (account) {
      const membership = await env.DB.prepare(
        `SELECT id
         FROM company_memberships
         WHERE account_id = ?
           AND account_type = 'client'
           AND status = 'active'
         LIMIT 1`,
      ).bind(account.id).first<{ id: string }>();

      if (membership) {
        try {
          const reset = await createPasswordResetToken(env.DB, account.id);
          await sendPasswordResetEmail(env, account.email, reset.token);
        } catch {
          // Keep the response generic to avoid revealing account existence.
        }
      }
    }

    return json({ ok: true, message: genericMessage });
  } catch {
    return json({ ok: true, message: genericMessage });
  }
}

async function confirmPasswordReset(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    const body = await request.json() as {
      token?: unknown;
      password?: unknown;
    };

    const token =
      typeof body.token === 'string' ? body.token.trim() : '';
    const password =
      typeof body.password === 'string' ? body.password : '';

    if (!token || password.length < 12) {
      return json({
        ok: false,
        error: 'INVALID_INPUT',
        message: 'A valid reset token and a password of at least 12 characters are required.',
      }, 400);
    }

    const accountId = await consumePasswordResetToken(env.DB, token);

    if (!accountId) {
      return json({
        ok: false,
        error: 'INVALID_OR_EXPIRED_TOKEN',
        message: 'This password reset link is invalid, expired, or already used.',
      }, 400);
    }

    const eligible = await env.DB.prepare(
      `SELECT a.id
       FROM accounts a
       WHERE a.id = ?
         AND a.status = 'active'
         AND EXISTS (
           SELECT 1
           FROM company_memberships m
           WHERE m.account_id = a.id
             AND m.account_type = 'client'
             AND m.status = 'active'
         )
         AND NOT EXISTS (
           SELECT 1
           FROM company_memberships owner_membership
           WHERE owner_membership.account_id = a.id
             AND owner_membership.account_type = 'owner'
             AND owner_membership.status = 'active'
         )
       LIMIT 1`,
    ).bind(accountId).first<{ id: string }>();

    if (!eligible) {
      return json({
        ok: false,
        error: 'RESET_NOT_ALLOWED',
        message: 'Password reset is not available for this account.',
      }, 400);
    }

    const passwordHash = await hashPassword(password);
    const now = new Date().toISOString();

    await env.DB.batch([
      env.DB.prepare(
        `UPDATE accounts
         SET password_hash = ?, updated_at = ?
         WHERE id = ? AND status = 'active'`,
      ).bind(passwordHash, now, accountId),
      env.DB.prepare(
        `UPDATE sessions
         SET revoked_at = ?
         WHERE account_id = ? AND revoked_at IS NULL`,
      ).bind(now, accountId),
    ]);

    return json({
      ok: true,
      message: 'Password reset successful. Please sign in with your new password.',
    });
  } catch {
    return json({
      ok: false,
      error: 'PASSWORD_RESET_FAILED',
      message: 'Unable to reset the password. Please request a new reset link.',
    }, 500);
  }
}

async function verifyMagicLink(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    const body = (await request.json()) as {
      token?: unknown;
    };

    const token =
      typeof body.token === 'string'
        ? body.token.trim()
        : '';

    if (!token) {
      return json(
        {
          ok: false,
          error: 'INVALID_INPUT',
          message: 'Magic link token is required.',
        },
        400,
      );
    }

    const accountId = await consumeMagicLinkToken(
      env.DB,
      token,
    );

    if (!accountId) {
      return json(
        {
          ok: false,
          error: 'INVALID_OR_EXPIRED_TOKEN',
          message: 'This sign-in link is invalid or has expired.',
        },
        401,
      );
    }

    const account = await env.DB
      .prepare(
        `SELECT id, email, status
         FROM accounts
         WHERE id = ?
         LIMIT 1`,
      )
      .bind(accountId)
      .first<{
        id: string;
        email: string;
        status: string;
      }>();

    if (
      !account ||
      account.status !== 'active' ||
      !isConfiguredMagicLinkOwner(env, account.email)
    ) {
      return json(
        {
          ok: false,
          error: 'MAGIC_LINK_NOT_ALLOWED',
          message: 'Magic link authentication is not available for this account.',
        },
        403,
      );
    }

    const membership = await env.DB
      .prepare(
        `SELECT
           id,
           company_id,
           role,
           designation,
           account_type,
           status
         FROM company_memberships
         WHERE account_id = ?
           AND status = 'active'
         ORDER BY created_at ASC
         LIMIT 1`,
      )
      .bind(account.id)
      .first<{
        id: string;
        company_id: string;
        role: string;
        designation: string;
        account_type: 'owner' | 'employee' | 'client';
        status: string;
      }>();

    if (!membership) {
      return json(
        {
          ok: false,
          error: 'NO_ACTIVE_MEMBERSHIP',
          message: 'No active company membership was found.',
        },
        403,
      );
    }

    if (membership.account_type !== 'owner') {
      return json(
        {
          ok: false,
          error: 'MAGIC_LINK_NOT_ALLOWED',
          message: 'Magic link authentication is not available for this account.',
        },
        403,
      );
    }

    const session = await createSession(
      env.DB,
      account.id,
      membership.id,
    );

    await env.DB
      .prepare(
        `UPDATE accounts
         SET last_login_at = ?
         WHERE id = ?`,
      )
      .bind(new Date().toISOString(), account.id)
      .run();

    return json(
      {
        ok: true,
        authenticated: true,
        account: {
          id: account.id,
          email: account.email,
        },
        company: {
          id: membership.company_id,
        },
        membership: {
          id: membership.id,
          role: membership.role,
          designation: membership.designation,
          accountType: membership.account_type,
        },
        session,
        expiresAt: session.expiresAt,
      },
      200,
      session.setCookie,
    );
  } catch {
    return json(
      {
        ok: false,
        error: 'MAGIC_LINK_VERIFICATION_FAILED',
        message: 'Unable to verify the sign-in link.',
      },
      500,
    );
  }
}

function isConfiguredMagicLinkOwner(
  env: Env,
  email: string,
): boolean {
  const ownerEmail = env.OWNER_MAGIC_LINK_EMAIL
    ?.trim()
    .toLowerCase();

  return Boolean(ownerEmail) && email === ownerEmail;
}

async function requestMagicLink(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    const body = (await request.json()) as {
      email?: unknown;
    };

    const email =
      typeof body.email === 'string'
        ? body.email.trim().toLowerCase()
        : '';

    if (!email) {
      return json(
        {
          ok: false,
          error: 'INVALID_INPUT',
          message: 'Email address is required.',
        },
        400,
      );
    }

    const account = await env.DB
      .prepare(
        `SELECT id, email, status
         FROM accounts
         WHERE LOWER(email) = ?
         LIMIT 1`,
      )
      .bind(email)
      .first<{
        id: string;
        email: string;
        status: string;
      }>();

    if (
      !account ||
      account.status !== 'active' ||
      !isConfiguredMagicLinkOwner(env, account.email)
    ) {
      return json({
        ok: true,
        message:
          'If an active AdPilot account exists for this email, a sign-in link has been sent.',
      });
    }

    const membership = await env.DB
      .prepare(
        `SELECT id, account_type
         FROM company_memberships
         WHERE account_id = ?
           AND status = 'active'
         ORDER BY created_at ASC
         LIMIT 1`,
      )
      .bind(account.id)
      .first<{
        id: string;
        account_type: 'owner' | 'employee' | 'client';
      }>();

    if (!membership || membership.account_type !== 'owner') {
      return json({
        ok: true,
        message:
          'If an active AdPilot account exists for this email, a sign-in link has been sent.',
      });
    }

    if (!membership) {
      return json({
        ok: true,
        message:
          'If an active AdPilot account exists for this email, a sign-in link has been sent.',
      });
    }

    const magicLink = await createMagicLinkToken(
      env.DB,
      account.id,
    );

    await sendMagicLinkEmail(
      env,
      account.email,
      magicLink.token,
    );

    return json({
      ok: true,
      message:
        'If an active AdPilot account exists for this email, a sign-in link has been sent.',
      expiresAt: magicLink.expiresAt,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === 'EMAIL_PROVIDER_NOT_CONFIGURED'
    ) {
      return json(
        {
          ok: false,
          error: 'EMAIL_PROVIDER_NOT_CONFIGURED',
          message: 'Email authentication is not configured.',
        },
        503,
      );
    }

    if (
      error instanceof Error &&
      error.message === 'EMAIL_SEND_FAILED'
    ) {
      return json(
        {
          ok: false,
          error: 'EMAIL_SEND_FAILED',
          message: 'Unable to send the sign-in email.',
        },
        502,
      );
    }

    return json(
      {
        ok: false,
        error: 'MAGIC_LINK_REQUEST_FAILED',
        message: 'Unable to request a sign-in link.',
      },
      500,
    );
  }
}

export default {
  async fetch(
    request: Request,
    env: Env,
  ): Promise<Response> {
    const url = new URL(request.url);

    if (
      url.pathname === '/api/auth/register' &&
      request.method === 'POST'
    ) {
      try {
        const body = (await request.json()) as {
          email?: unknown;
          password?: unknown;
          companyName?: unknown;
        };

        const email =
          typeof body.email === 'string'
            ? body.email.trim().toLowerCase()
            : '';
        const password =
          typeof body.password === 'string'
            ? body.password
            : '';
        const companyName =
          typeof body.companyName === 'string'
            ? body.companyName.trim()
            : '';

        if (
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
          email.length > 254 ||
          companyName.length < 2 ||
          companyName.length > 100 ||
          password.length < 12 ||
          password.length > 256
        ) {
          return json({
            ok: false,
            error: 'INVALID_INPUT',
            message: 'Enter a valid email, a company name (2–100 characters), and a password of 12–256 characters.',
          }, 400);
        }

        const existing = await env.DB
          .prepare('SELECT id FROM accounts WHERE LOWER(email) = ? LIMIT 1')
          .bind(email)
          .first<{ id: string }>();

        if (existing) {
          return json({
            ok: false,
            error: 'EMAIL_UNAVAILABLE',
            message: 'This email cannot be used to create a new account. Try signing in or resetting your password.',
          }, 409);
        }

        const now = new Date().toISOString();
        const accountId = crypto.randomUUID();
        const companyId = crypto.randomUUID();
        const membershipId = crypto.randomUUID();
        const passwordHash = await hashPassword(password);

        await env.DB.batch([
          env.DB.prepare(
            `INSERT INTO accounts
              (id, email, status, email_verified_at, last_login_at,
               mfa_enabled, auth_provider, created_at, updated_at, password_hash)
             VALUES (?, ?, 'active', NULL, ?, 0, 'password', ?, ?, ?)`
          ).bind(accountId, email, now, now, now, passwordHash),

          env.DB.prepare(
            `INSERT INTO companies
              (id, name, plan, logo_initial, seats_used, seats_limit,
               devices_active, devices_limit, timezone, default_currency,
               created_at, updated_at)
             VALUES (?, ?, 'trial', ?, 1, 2, 0, 0, 'Asia/Karachi', 'PKR', ?, ?)`
          ).bind(companyId, companyName, companyName.charAt(0).toUpperCase(), now, now),

          env.DB.prepare(
            `INSERT INTO company_memberships
              (id, company_id, account_id, role, designation, status,
               invited_by_user_id, created_at, updated_at, account_type)
             VALUES (?, ?, ?, 'owner', 'Owner', 'active', NULL, ?, ?, 'owner')`
          ).bind(membershipId, companyId, accountId, now, now),
        ]);

        let emailSent = true;

        try {
          const verification = await createEmailVerificationToken(
            env.DB,
            accountId,
          );
          await sendVerificationEmail(env, email, verification.token);
        } catch {
          emailSent = false;
        }

        return json({
          ok: true,
          authenticated: false,
          verificationRequired: true,
          emailSent,
          email,
          message: emailSent
            ? 'Account created. Please check your email and click the verification link to activate your account.'
            : 'Account created, but we could not send the verification email. Please use "Resend verification email".',
        }, 201);
      } catch (error) {
        const message = error instanceof Error ? error.message : '';
        if (message.includes('UNIQUE constraint failed')) {
          return json({
            ok: false,
            error: 'EMAIL_UNAVAILABLE',
            message: 'This email cannot be used to create a new account. Try signing in or resetting your password.',
          }, 409);
        }
        return json({
          ok: false,
          error: 'REGISTRATION_FAILED',
          message: 'Unable to create the workspace. Please try again.',
        }, 500);
      }
    }

    if (
      url.pathname === '/api/auth/magic-link' &&
      request.method === 'POST'
    ) {
      return requestMagicLink(request, env);
    }

    if (
      url.pathname === '/api/auth/magic-link/verify' &&
      request.method === 'POST'
    ) {
      return verifyMagicLink(request, env);
    }

    if (
      url.pathname === '/api/auth/password-reset/request' &&
      request.method === 'POST'
    ) {
      return requestPasswordReset(request, env);
    }

    if (
      url.pathname === '/api/auth/password-reset/confirm' &&
      request.method === 'POST'
    ) {
      return confirmPasswordReset(request, env);
    }

    if (
      url.pathname === '/api/auth/email-verification/verify' &&
      request.method === 'POST'
    ) {
      try {
        const body = (await request.json()) as { token?: unknown };
        const token =
          typeof body.token === 'string' ? body.token.trim() : '';

        const accountId = token
          ? await consumeEmailVerificationToken(env.DB, token)
          : null;

        if (!accountId) {
          return json({
            ok: false,
            error: 'INVALID_OR_EXPIRED_TOKEN',
            message: 'This verification link is invalid, expired, or already used.',
          }, 400);
        }

        const now = new Date().toISOString();

        await env.DB.prepare(
          `UPDATE accounts
           SET email_verified_at = ?, updated_at = ?
           WHERE id = ? AND email_verified_at IS NULL`,
        ).bind(now, now, accountId).run();

        return json({
          ok: true,
          message: 'Email verified successfully. You can now sign in.',
        });
      } catch {
        return json({
          ok: false,
          error: 'EMAIL_VERIFICATION_FAILED',
          message: 'Unable to verify the email address.',
        }, 500);
      }
    }

    if (
      url.pathname === '/api/auth/email-verification/resend' &&
      request.method === 'POST'
    ) {
      const genericMessage =
        'If an unverified account exists for this email, a new verification link has been sent.';

      try {
        const body = (await request.json()) as { email?: unknown };
        const email =
          typeof body.email === 'string'
            ? body.email.trim().toLowerCase()
            : '';

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return json({ ok: true, message: genericMessage });
        }

        const account = await env.DB.prepare(
          `SELECT id, email
           FROM accounts
           WHERE LOWER(email) = ?
             AND status = 'active'
             AND email_verified_at IS NULL
           LIMIT 1`,
        ).bind(email).first<{ id: string; email: string }>();

        if (account) {
          const last = await env.DB.prepare(
            `SELECT created_at
             FROM email_verification_tokens
             WHERE account_id = ?
             ORDER BY created_at DESC
             LIMIT 1`,
          ).bind(account.id).first<{ created_at: string }>();

          const tooSoon =
            !!last &&
            Date.now() - new Date(last.created_at).getTime() < 60_000;

          if (!tooSoon) {
            const verification = await createEmailVerificationToken(
              env.DB,
              account.id,
            );
            await sendVerificationEmail(
              env,
              account.email,
              verification.token,
            );
          }
        }
      } catch {
        // Keep the response generic to avoid revealing account existence.
      }

      return json({ ok: true, message: genericMessage });
    }

    if (
      url.pathname === '/api' ||
      url.pathname === '/api/'
    ) {
      return json({
        ok: true,
        service: 'Nexora AdPilot API',
        database: !!env.DB,
      });
    }

    if (
      url.pathname === '/api/auth/login' &&
      request.method === 'POST'
    ) {
      try {
        const body = (await request.json()) as {
          email?: unknown;
          password?: unknown;
        };

        const email =
          typeof body.email === 'string'
            ? body.email.trim().toLowerCase()
            : '';

        const password =
          typeof body.password === 'string'
            ? body.password
            : '';

        if (!email || !password) {
          return json(
            {
              ok: false,
              error: 'INVALID_INPUT',
              message: 'Email and password are required.',
            },
            400,
          );
        }

        const account = await env.DB
          .prepare(
            `SELECT
              id,
              email,
              status,
              email_verified_at,
              password_hash
             FROM accounts
             WHERE LOWER(email) = ?
             LIMIT 1`,
          )
          .bind(email)
          .first<{
            id: string;
            email: string;
            status: string;
            email_verified_at: string | null;
            password_hash: string | null;
          }>();

        if (
          !account ||
          !account.password_hash ||
          account.status !== 'active'
        ) {
          return json(
            {
              ok: false,
              error: 'INVALID_CREDENTIALS',
              message: 'Invalid email or password.',
            },
            401,
          );
        }

        const passwordValid = await verifyPassword(
          password,
          account.password_hash,
        );

        if (!passwordValid) {
          return json(
            {
              ok: false,
              error: 'INVALID_CREDENTIALS',
              message: 'Invalid email or password.',
            },
            401,
          );
        }

        if (!account.email_verified_at) {
          return json(
            {
              ok: false,
              error: 'EMAIL_NOT_VERIFIED',
              message:
                'Please verify your email address before signing in. Check your inbox for the verification link.',
            },
            403,
          );
        }

        const memberships = await env.DB
          .prepare(
            `SELECT
              id,
              company_id,
              role,
              designation,
              account_type,
              status
             FROM company_memberships
             WHERE account_id = ?
               AND status = 'active'
             ORDER BY created_at ASC`,
          )
          .bind(account.id)
          .all<{
            id: string;
            company_id: string;
            role: string;
            designation: string;
            account_type: 'owner' | 'employee' | 'client';
            status: string;
          }>();

        if (memberships.results.length === 0) {
          return json(
            {
              ok: false,
              error: 'NO_ACTIVE_MEMBERSHIP',
              message: 'No active company membership is available.',
            },
            403,
          );
        }

        if (memberships.results.length > 1) {
          return json(
            {
              ok: false,
              error: 'COMPANY_SELECTION_REQUIRED',
              message: 'Multiple active company memberships require company selection.',
            },
            409,
          );
        }

        const membership = memberships.results[0];

        const session = await createSession(
          env.DB,
          account.id,
          membership.id,
        );

        const now = new Date().toISOString();

        await env.DB
          .prepare(
            `UPDATE accounts
             SET last_login_at = ?
             WHERE id = ?`,
          )
          .bind(now, account.id)
          .run();

        const company = await env.DB
          .prepare(
            `SELECT
              id,
              name,
              plan,
              logo_initial,
              seats_used,
              seats_limit,
              devices_active,
              devices_limit,
              timezone,
              default_currency
             FROM companies
             WHERE id = ?
             LIMIT 1`,
          )
          .bind(membership.company_id)
          .first<{
            id: string;
            name: string;
            plan: 'trial' | 'growth' | 'enterprise';
            logo_initial: string;
            seats_used: number;
            seats_limit: number;
            devices_active: number;
            devices_limit: number;
            timezone: string;
            default_currency: string;
          }>();

        const permissions = await loadMembershipPermissions(
          env.DB,
          membership.id,
          membership.account_type,
        );

        const companyPayload = company
          ? {
              id: company.id,
              name: company.name,
              plan: company.plan,
              logoInitial: company.logo_initial,
              seatsUsed: company.seats_used,
              seatsLimit: company.seats_limit,
              devicesActive: company.devices_active,
              devicesLimit: company.devices_limit,
              timezone: company.timezone,
              defaultCurrency: company.default_currency,
            }
          : {
              id: membership.company_id,
            };

        return new Response(
          JSON.stringify({
            ok: true,
            authenticated: true,
            account: {
              id: account.id,
              email: account.email,
            },
            company: companyPayload,
            membership: {
              id: membership.id,
              role: membership.role,
              designation: membership.designation,
              accountType: membership.account_type,
            },
            session: {
              accountId: account.id,
              sessionId: session.sessionId,
              companyId: membership.company_id,
              membershipId: membership.id,
              accountType: membership.account_type,
              role: membership.role,
              designation: membership.designation,
              permissions,
              expiresAt: session.expiresAt,
            },
            expiresAt: session.expiresAt,
          }),
          {
            status: 200,
            headers: {
              'content-type': 'application/json; charset=utf-8',
              'cache-control': 'no-store',
              'set-cookie': session.setCookie,
            },
          },
        );
      } catch {
        return json(
          {
            ok: false,
            error: 'LOGIN_FAILED',
            message: 'Unable to complete login.',
          },
          500,
        );
      }
    }

    if (
      url.pathname === '/api/session' &&
      request.method === 'GET'
    ) {
      const session = await resolveSession(
        request,
        env.DB,
      );

      if (!session) {
        return json(
          {
            ok: false,
            error: 'UNAUTHENTICATED',
            message: 'No active authenticated session.',
          },
          401,
        );
      }

      const sessionAccount = await env.DB
        .prepare(
          `SELECT
            a.id,
            a.email,
            c.id AS company_id,
            c.name AS company_name,
            c.plan,
            c.logo_initial,
            c.seats_used,
            c.seats_limit,
            c.devices_active,
            c.devices_limit,
            c.timezone,
            c.default_currency,
            cm.id AS membership_id,
            cm.role,
            cm.designation,
            cm.account_type
           FROM accounts a
           INNER JOIN company_memberships cm
             ON cm.account_id = a.id
            AND cm.id = ?
           INNER JOIN companies c
             ON c.id = cm.company_id
           WHERE a.id = ?
           LIMIT 1`,
        )
        .bind(session.membershipId, session.accountId)
        .first<{
          id: string;
          email: string;
          company_id: string;
          company_name: string;
          plan: 'trial' | 'growth' | 'enterprise';
          logo_initial: string;
          seats_used: number;
          seats_limit: number;
          devices_active: number;
          devices_limit: number;
          timezone: string;
          default_currency: string;
          membership_id: string;
          role: string;
          designation: string;
          account_type: 'owner' | 'employee' | 'client';
        }>();

      if (!sessionAccount) {
        return json(
          {
            ok: false,
            error: 'SESSION_CONTEXT_UNAVAILABLE',
            message: 'The authenticated account context could not be loaded.',
          },
          500,
        );
      }

      const subscriptionRepository =
        new ProductionSubscriptionRepository(env.DB);

      const subscription = await subscriptionRepository.get(
        session.companyId,
      );

      const entitlementKeys: EntitlementKey[] = [
        'crm',
        'inventory',
        'campaigns',
        'advanced_planning',
        'proof_of_play',
        'field_verification',
        'analytics',
        'finance',
        'client_portal',
        'api',
        'programmatic',
        'ai_planning',
      ];

      const entitlements = Object.fromEntries(
        entitlementKeys.map((key) => [
          key,
          subscription
            ? hasEntitlement(subscription, key).allowed
            : false,
        ]),
      );

      return json({
        ok: true,
        authenticated: true,
        account: {
          id: sessionAccount.id,
          email: sessionAccount.email,
        },
        company: {
          id: sessionAccount.company_id,
          name: sessionAccount.company_name,
          plan: sessionAccount.plan,
          logoInitial: sessionAccount.logo_initial,
          seatsUsed: sessionAccount.seats_used,
          seatsLimit: sessionAccount.seats_limit,
          devicesActive: sessionAccount.devices_active,
          devicesLimit: sessionAccount.devices_limit,
          timezone: sessionAccount.timezone,
          defaultCurrency: sessionAccount.default_currency,
        },
        membership: {
          id: sessionAccount.membership_id,
          role: sessionAccount.role,
          designation: sessionAccount.designation,
          accountType: sessionAccount.account_type,
        },
        subscription: subscription
          ? {
              id: subscription.id,
              planId: subscription.planId,
              status: subscription.status,
              billingCycle: subscription.billingCycle,
              paymentStatus: subscription.paymentStatus,
              startsAt: subscription.startsAt,
              renewsAt: subscription.renewsAt,
              trialEndsAt: subscription.trialEndsAt,
              graceEndsAt: subscription.graceEndsAt,
              maxSeats: subscription.maxSeats,
              maxDevices: subscription.maxDevices,
              entitlements,
            }
          : null,
        session: {
          accountId: session.accountId,
          sessionId: session.sessionId,
          companyId: session.companyId,
          membershipId: session.membershipId,
          accountType: session.accountType,
          role: session.role,
          designation: session.designation,
          permissions: session.permissions,
          expiresAt: session.expiresAt,
        },
      });
    }

    if (
      url.pathname === '/api/weather' &&
      request.method === 'GET'
    ) {
      const session = await resolveSession(
        request,
        env.DB,
      );

      if (!session) {
        return json(
          {
            ok: false,
            error: 'UNAUTHENTICATED',
            message: 'An active authenticated session is required.',
          },
          401,
        );
      }

      if (!env.WEATHER_API_KEY) {
        return json(
          {
            ok: false,
            error: 'WEATHER_NOT_CONFIGURED',
            message: 'Weather service is not configured.',
          },
          503,
        );
      }

      const lat = Number(url.searchParams.get('lat'));
      const lng = Number(url.searchParams.get('lng'));
      const geographyId =
        url.searchParams.get('geographyId')?.trim();
      const label =
        url.searchParams.get('label')?.trim() ||
        'Campaign area';

      if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lng) ||
        lat < -90 ||
        lat > 90 ||
        lng < -180 ||
        lng > 180
      ) {
        return json(
          {
            ok: false,
            error: 'INVALID_INPUT',
            message: 'Valid lat and lng parameters are required.',
          },
          400,
        );
      }

      if (!geographyId) {
        return json(
          {
            ok: false,
            error: 'INVALID_INPUT',
            message: 'geographyId parameter is required.',
          },
          400,
        );
      }

      const forecastDays = Math.min(
        Math.max(
          Math.trunc(
            Number(url.searchParams.get('days') ?? '3'),
          ),
          1,
        ),
        3,
      );

      try {
        const provider = new WeatherApiProvider({
          apiKey: env.WEATHER_API_KEY,
        });

        const weather = await provider.getWeather(
          {
            geographyId,
            label,
            coordinates: {
              lat,
              lng,
            },
          },
          forecastDays,
        );

        return json({
          ok: true,
          weather,
        });
      } catch (error) {
        return json(
          {
            ok: false,
            error: 'WEATHER_PROVIDER_ERROR',
            message:
              error instanceof Error
                ? error.message
                : 'Weather provider request failed.',
          },
          502,
        );
      }
    }

    if (
      url.pathname === '/api/auth/logout' &&
      request.method === 'POST'
    ) {
      await revokeSession(request, env.DB);

      return new Response(
        JSON.stringify({
          ok: true,
          authenticated: false,
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json; charset=utf-8',
            'cache-control': 'no-store',
            'set-cookie': clearSessionCookie(),
          },
        },
      );
    }

    if (
      url.pathname === '/api/geography/search' &&
      request.method === 'GET'
    ) {
      const query = url.searchParams.get('q')?.trim();

      if (!query) {
        return json(
          {
            ok: false,
            error: 'INVALID_INPUT',
            message: 'Query parameter "q" is required.',
          },
          400,
        );
      }

      try {
        const repository =
          createGeographyRepository(env);

        const existing = await repository.search({
          query,
        });

        if (existing.length > 0) {
          return json({
            ok: true,
            source: 'database',
            persisted: true,
            results: existing,
          });
        }

        const geocoded =
          await repository.forwardGeocode(query);

        if (!geocoded) {
          return json({
            ok: true,
            source: 'nominatim',
            persisted: false,
            results: [],
          });
        }

        const persisted =
          await repository.persistGeocodingResult(
            geocoded,
          );

        return json({
          ok: true,
          source: 'nominatim',
          persisted: true,
          results: [persisted],
        });
      } catch (error) {
        return json(
          errorPayload(error),
          errorStatus(error),
        );
      }
    }

    if (
      url.pathname === '/api/geography/reverse' &&
      request.method === 'GET'
    ) {
      const latitude = Number(
        url.searchParams.get('lat'),
      );

      const longitude = Number(
        url.searchParams.get('lng'),
      );

      if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude)
      ) {
        return json(
          {
            ok: false,
            error: 'INVALID_INPUT',
            message:
              'Valid "lat" and "lng" parameters are required.',
          },
          400,
        );
      }

      try {
        const repository =
          createGeographyRepository(env);

        const result =
          await repository.reverseGeocode({
            latitude,
            longitude,
          });

        if (!result) {
          return json({
            ok: true,
            persisted: false,
            result: null,
          });
        }

        let persisted: GeographicLocation | null =
          null;

        if (result.externalPlaceId) {
          persisted =
            await repository.persistGeocodingResult(
              result,
            );
        }

        return json({
          ok: true,
          persisted: !!persisted,
          result: persisted ?? result,
        });
      } catch (error) {
        return json(
          errorPayload(error),
          errorStatus(error),
        );
      }
    }

    const teamResponse = await handleTeamRoutes(request, env, url);
    if (teamResponse) {
      return teamResponse;
    }

    // ==========================================
    // CRM ROUTES
    // ==========================================

    if (
      url.pathname === '/api/crm/clients' &&
      request.method === 'GET'
    ) {
      try {
        const session = await resolveSession(request, env.DB);
        if (!session) return json({ ok: false, error: 'UNAUTHENTICATED' }, 401);

        const clients = await env.DB.prepare(
          `SELECT * FROM clients WHERE company_id = ? ORDER BY created_at DESC`
        ).bind(session.companyId).all();

        return json({ ok: true, data: clients.results });
      } catch (err: any) {
        return json({ ok: false, error: err.message }, 500);
      }
    }

    if (
      url.pathname === '/api/crm/leads' &&
      request.method === 'GET'
    ) {
      try {
        const session = await resolveSession(request, env.DB);
        if (!session) return json({ ok: false, error: 'UNAUTHENTICATED' }, 401);

        const leads = await env.DB.prepare(
          `SELECT * FROM leads WHERE company_id = ? ORDER BY created_at DESC`
        ).bind(session.companyId).all();

        return json({ ok: true, data: leads.results });
      } catch (err: any) {
        return json({ ok: false, error: err.message }, 500);
      }
    }

    if (
      url.pathname === '/api/crm/contacts' &&
      request.method === 'GET'
    ) {
      try {
        const session = await resolveSession(request, env.DB);
        if (!session) return json({ ok: false, error: 'UNAUTHENTICATED' }, 401);

        const clientId = url.searchParams.get('client_id');
        if (!clientId) return json({ ok: false, error: 'CLIENT_ID_REQUIRED' }, 400);

        const contacts = await env.DB.prepare(
          `SELECT * FROM contacts WHERE client_id = ? AND company_id = ? ORDER BY created_at DESC`
        ).bind(clientId, session.companyId).all();

        return json({ ok: true, data: contacts.results });
      } catch (err: any) {
        return json({ ok: false, error: err.message }, 500);
      }
    }
    
    if (
      url.pathname === '/api/crm/clients' &&
      request.method === 'POST'
    ) {
      try {
        const session = await resolveSession(request, env.DB);
        if (!session) {
          return json({ ok: false, error: 'UNAUTHENTICATED' }, 401);
        }

        const body = (await request.json()) as any;
        const id = crypto.randomUUID();

        await env.DB.prepare(
          `INSERT INTO clients (id, company_id, name, client_type, industry, city, phone, email, credit_limit, currency, notes) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          id, session.companyId, body.name, body.client_type || 'direct', body.industry || null, body.city || null, body.phone || null, body.email || null, body.credit_limit || 0, body.currency || 'PKR', body.notes || null
        ).run();

        return json({ ok: true, id });
      } catch (err: any) {
        return json({ ok: false, error: err.message }, 500);
      }
    }

    if (
      url.pathname === '/api/crm/leads' &&
      request.method === 'POST'
    ) {
      try {
        const session = await resolveSession(request, env.DB);
        if (!session) {
          return json({ ok: false, error: 'UNAUTHENTICATED' }, 401);
        }

        const body = (await request.json()) as any;
        const id = crypto.randomUUID();

        await env.DB.prepare(
          `INSERT INTO leads (id, company_id, company_name, contact_name, email, phone, estimated_value, source, notes) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          id, session.companyId, body.company_name, body.contact_name || null, body.email || null, body.phone || null, body.estimated_value || 0, body.source || null, body.notes || null
        ).run();

        return json({ ok: true, id });
      } catch (err: any) {
        return json({ ok: false, error: err.message }, 500);
      }
    }

    if (
      url.pathname === '/api/crm/contacts' &&
      request.method === 'POST'
    ) {
      try {
        const session = await resolveSession(request, env.DB);
        if (!session) {
          return json({ ok: false, error: 'UNAUTHENTICATED' }, 401);
        }

        const body = (await request.json()) as any;
        const id = crypto.randomUUID();

        await env.DB.prepare(
          `INSERT INTO contacts (id, company_id, client_id, name, title, email, phone, is_primary) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          id, session.companyId, body.client_id, body.name, body.title || null, body.email || null, body.phone || null, body.is_primary ? 1 : 0
        ).run();

        return json({ ok: true, id });
      } catch (err: any) {
        return json({ ok: false, error: err.message }, 500);
      }
    }

    if (
      url.pathname.startsWith('/api/crm/leads/') &&
      url.pathname.endsWith('/stage') &&
      request.method === 'PUT'
    ) {
      try {
        const session = await resolveSession(request, env.DB);
        if (!session) return json({ ok: false, error: 'UNAUTHENTICATED' }, 401);

        const parts = url.pathname.split('/');
        const leadId = parts[4];
        const body = (await request.json()) as any;

        await env.DB.prepare(
          `UPDATE leads SET stage = ?, updated_at = datetime('now') WHERE id = ? AND company_id = ?`
        ).bind(body.stage, leadId, session.companyId).run();

        return json({ ok: true });
      } catch (err: any) {
        return json({ ok: false, error: err.message }, 500);
      }
    }

    if (
      url.pathname.startsWith('/api/crm/leads/') && 
      url.pathname.endsWith('/convert') && 
      request.method === 'POST'
    ) {
      try {
        const session = await resolveSession(request, env.DB);
        if (!session) {
          return json({ ok: false, error: 'UNAUTHENTICATED' }, 401);
        }

        const parts = url.pathname.split('/');
        const leadId = parts[4]; 
        const company_id = session.companyId;

        const lead = await env.DB.prepare(`SELECT * FROM leads WHERE id = ? AND company_id = ?`).bind(leadId, company_id).first<any>();
        if (!lead) return json({ ok: false, message: 'Lead not found' }, 404);

        const client_id = crypto.randomUUID();

        await env.DB.batch([
          env.DB.prepare(
            `INSERT INTO clients (id, company_id, name, phone, email, notes) VALUES (?, ?, ?, ?, ?, ?)`
          ).bind(client_id, company_id, lead.company_name, lead.phone, lead.email, `Converted from Lead. ${lead.notes || ''}`),
          
          env.DB.prepare(
            `UPDATE leads SET stage = 'won', converted_client_id = ? WHERE id = ? AND company_id = ?`
          ).bind(client_id, leadId, company_id)
        ]);

        return json({ ok: true, client_id });
      } catch (err: any) {
        return json({ ok: false, error: err.message }, 500);
      }
    }
    // ==========================================
    // END CRM ROUTES
    // ==========================================

    if (url.pathname.startsWith('/api/')) {
      return json(
        {
          ok: false,
          error: 'NOT_FOUND',
          message: 'API route not found.',
        },
        404,
      );
    }

    return env.ASSETS.fetch(request);
  },
};
