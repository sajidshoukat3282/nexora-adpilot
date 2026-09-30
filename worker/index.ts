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
  const provider = new NominatimGeocodingProvider();

  return new ProductionGeographyRepository(
    env.DB,
    provider,
  );
}

export default {
  async fetch(
    request: Request,
    env: Env,
  ): Promise<Response> {
    const url = new URL(request.url);

    /*
     * Health/API check
     */
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

    /*
     * Geography search / geocoding
     *
     * Example:
     * /api/geography/search?q=Lahore
     */
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

        /*
         * First search our own D1 database.
         */
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

        /*
         * If D1 has no result, use the real
         * Nominatim provider.
         */
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

        /*
         * Persist only results that contain a real
         * provider place ID.
         */
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
          {
            ok: false,
            error:
              error instanceof Error
                ? error.name
                : 'GEOGRAPHY_ERROR',
            message:
              error instanceof Error
                ? error.message
                : String(error),
          },
          500,
        );
      }
    }

    /*
     * Reverse geocoding
     *
     * Example:
     * /api/geography/reverse?lat=31.5204&lng=74.3587
     */
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

        let persisted = null;

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
          {
            ok: false,
            error:
              error instanceof Error
                ? error.name
                : 'GEOGRAPHY_ERROR',
            message:
              error instanceof Error
                ? error.message
                : String(error),
          },
          500,
        );
      }
    }

    /*
     * All other /api/* routes.
     */
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

    /*
     * Frontend / SPA assets.
     */
    return env.ASSETS.fetch(request);
  },
};
