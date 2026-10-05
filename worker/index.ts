import type { GeographicLocation } from '../src/domain/geography.types';
import { ProductionGeographyRepository } from '../src/repositories/GeographyRepository';
import { NominatimGeocodingProvider } from '../src/providers/NominatimGeocodingProvider';
import {
  createSession,
  resolveSession,
  revokeSession,
  clearSessionCookie,
} from './auth/session';
import { verifyPassword } from './auth/password';
import {
  createMagicLinkToken,
  consumeMagicLinkToken,
} from './auth/magicLink';
import { WeatherApiProvider } from './weather/WeatherApiProvider';

export interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  WEATHER_API_KEY?: string;
  BREVO_API_KEY?: string;
  AUTH_BASE_URL?: string;
  MAIL_FROM_EMAIL?: string;
  MAIL_FROM_NAME?: string;
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

    if (!account || account.status !== 'active') {
      return json(
        {
          ok: false,
          error: 'ACCOUNT_INACTIVE',
          message: 'This account is not active.',
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

    if (!account || account.status !== 'active') {
      return json({
        ok: true,
        message:
          'If an active AdPilot account exists for this email, a sign-in link has been sent.',
      });
    }

    const membership = await env.DB
      .prepare(
        `SELECT id
         FROM company_memberships
         WHERE account_id = ?
           AND status = 'active'
         ORDER BY created_at ASC
         LIMIT 1`,
      )
      .bind(account.id)
      .first<{ id: string }>();

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

        const permissions =
          membership.account_type === 'owner'
            ? [
                'crm.view',
                'crm.manage',
                'inventory.view',
                'inventory.manage',
                'campaigns.view',
                'campaigns.manage',
                'proposals.view',
                'proposals.manage',
                'creative.view',
                'creative.manage',
                'operations.view',
                'operations.manage',
                'reports.view',
                'reports.download',
                'reports.send',
                'finance.view',
                'finance.manage',
                'client_portal.view',
                'admin.view',
                'admin.manage',
              ]
            : [];

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
