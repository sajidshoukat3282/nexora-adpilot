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

export interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
}

function json(
  data: unknown,
  status = 200,
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
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

export default {
  async fetch(
    request: Request,
    env: Env,
  ): Promise<Response> {
    const url = new URL(request.url);

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

        return new Response(
          JSON.stringify({
            ok: true,
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

      return json({
        ok: true,
        authenticated: true,
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
