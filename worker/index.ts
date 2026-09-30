import type { GeographicLocation } from '../src/domain/geography.types';
import { ProductionGeographyRepository } from '../src/repositories/GeographyRepository';
import { NominatimGeocodingProvider } from '../src/providers/NominatimGeocodingProvider';

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
