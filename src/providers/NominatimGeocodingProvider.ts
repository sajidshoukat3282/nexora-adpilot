import { GeographyDomainError } from '../domain/geography.errors';
import { validateCoordinates } from '../domain/geography.types';
import type { Coordinates, GeocodingResult } from '../domain/geography.types';
import type { IGeocodingProvider } from './GeocodingProvider';

const DEFAULT_BASE_URL = 'https://nominatim.openstreetmap.org';

export const NOMINATIM_USER_AGENT =
  'Nexora-AdPilot/1.0 (nexoratechnologies.pk)';

type ErrorCode = ConstructorParameters<typeof GeographyDomainError>[0];
type JsonObject = Record<string, unknown>;

export interface NominatimGeocodingProviderOptions {
  fetchFn?: typeof fetch;
  baseUrl?: string;
}

const fail = (code: ErrorCode, message: string): never => {
  throw new GeographyDomainError(code, message);
};

const isObject = (value: unknown): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const text = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() !== ''
    ? value.trim()
    : undefined;

const parseCoordinate = (
  value: unknown,
  min: number,
  max: number,
  label: string,
): number => {
  const n =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim() !== ''
        ? Number(value)
        : Number.NaN;

  if (!Number.isFinite(n) || n < min || n > max) {
    return fail(
      'MALFORMED_EXTERNAL_DATA',
      `Nominatim returned an invalid ${label}`,
    );
  }

  return n;
};

const mapResult = (raw: unknown): GeocodingResult => {
  if (!isObject(raw)) {
    return fail(
      'MALFORMED_EXTERNAL_DATA',
      'Nominatim result is not an object',
    );
  }

  const latitude = parseCoordinate(raw.lat, -90, 90, 'latitude');
  const longitude = parseCoordinate(raw.lon, -180, 180, 'longitude');

  const address = isObject(raw.address) ? raw.address : {};

  const countryCode = text(address.country_code)?.toUpperCase();
  const countryName = text(address.country);
  const formattedAddress = text(raw.display_name);

  if (
    !countryCode ||
    !/^[A-Z]{2}$/.test(countryCode) ||
    !countryName ||
    !formattedAddress
  ) {
    return fail(
      'MALFORMED_EXTERNAL_DATA',
      'Nominatim result is missing country or display name',
    );
  }

  const stateProvinceRegion =
    text(address.state) ?? text(address.region);

  const stateProvinceCode = text(address['ISO3166-2-lvl4']);

  const countyDistrict =
    text(address.county) ?? text(address.state_district);

  const city =
    text(address.city) ??
    text(address.town) ??
    text(address.municipality) ??
    text(address.village);

  const postalCode = text(address.postcode);

  const areaNeighborhood =
    text(address.suburb) ?? text(address.neighbourhood);

  const externalPlaceId =
    typeof raw.place_id === 'number' && Number.isFinite(raw.place_id)
      ? String(raw.place_id)
      : text(raw.place_id);

  return {
    coordinates: {
      latitude,
      longitude,
    },
    countryCode,
    countryName,
    formattedAddress,

    ...(stateProvinceRegion !== undefined && {
      stateProvinceRegion,
    }),

    ...(stateProvinceCode !== undefined && {
      stateProvinceCode,
    }),

    ...(countyDistrict !== undefined && {
      countyDistrict,
    }),

    ...(city !== undefined && {
      city,
    }),

    ...(postalCode !== undefined && {
      postalCode,
    }),

    ...(areaNeighborhood !== undefined && {
      areaNeighborhood,
    }),

    ...(externalPlaceId !== undefined && {
      externalPlaceId,
    }),
  };
};

export class NominatimGeocodingProvider
  implements IGeocodingProvider
{
  private readonly fetchFn: typeof fetch;
  private readonly baseUrl: string;

  constructor(
    options: NominatimGeocodingProviderOptions = {},
  ) {
    this.fetchFn =
      options.fetchFn ??
      ((input, init) => fetch(input, init));

    this.baseUrl =
      options.baseUrl ?? DEFAULT_BASE_URL;
  }

  async forwardGeocode(
    addressText: string,
  ): Promise<GeocodingResult | null> {
    const query =
      typeof addressText === 'string'
        ? addressText.trim()
        : '';

    if (!query) {
      return fail(
        'INVALID_INPUT',
        'Address text is required',
      );
    }

    const url = new URL(
      '/search',
      this.baseUrl,
    );

    url.searchParams.set(
      'format',
      'jsonv2',
    );

    url.searchParams.set(
      'addressdetails',
      '1',
    );

    url.searchParams.set(
      'q',
      query,
    );

    const body = await this.request(url);

    if (!Array.isArray(body)) {
      return fail(
        'MALFORMED_EXTERNAL_DATA',
        'Nominatim search response is not an array',
      );
    }

    if (body.length === 0) {
      return null;
    }

    return mapResult(body[0]);
  }

  async reverseGeocode(
    coordinates: Coordinates,
  ): Promise<GeocodingResult | null> {
    if (!validateCoordinates(coordinates)) {
      return fail(
        'INVALID_INPUT',
        'Coordinates are invalid',
      );
    }

    const url = new URL(
      '/reverse',
      this.baseUrl,
    );

    url.searchParams.set(
      'format',
      'jsonv2',
    );

    url.searchParams.set(
      'addressdetails',
      '1',
    );

    url.searchParams.set(
      'lat',
      String(coordinates.latitude),
    );

    url.searchParams.set(
      'lon',
      String(coordinates.longitude),
    );

    const body = await this.request(url);

    if (!isObject(body)) {
      return fail(
        'MALFORMED_EXTERNAL_DATA',
        'Nominatim reverse response is not an object',
      );
    }

    if (typeof body.error === 'string') {
      return null;
    }

    return mapResult(body);
  }

  private async request(
    url: URL,
  ): Promise<unknown> {
    let response: Response;

    try {
      response = await this.fetchFn(
        url.toString(),
        {
          headers: {
            'User-Agent': NOMINATIM_USER_AGENT,
            Accept: 'application/json',
          },
        },
      );
    } catch {
      return fail(
        'PROVIDER_REQUEST_FAILED',
        'Nominatim request failed',
      );
    }

    if (response.status === 429) {
      return fail(
        'PROVIDER_RATE_LIMITED',
        'Nominatim rate limit exceeded',
      );
    }

    if (!response.ok) {
      return fail(
        'PROVIDER_REQUEST_FAILED',
        `Nominatim responded with HTTP ${response.status}`,
      );
    }

    try {
      return await response.json();
    } catch {
      return fail(
        'MALFORMED_EXTERNAL_DATA',
        'Nominatim response is not valid JSON',
      );
    }
  }
}
