import { describe, expect, it, vi } from 'vitest';
import {
  NOMINATIM_USER_AGENT,
  NominatimGeocodingProvider,
} from '../src/providers/NominatimGeocodingProvider';

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const makeProvider = (fetchMock: unknown) =>
  new NominatimGeocodingProvider({
    fetchFn: fetchMock as typeof fetch,
  });

const lahore = {
  place_id: 123456,
  lat: '31.5203696',
  lon: '74.3587473',
  display_name: 'Lahore, Punjab, Pakistan',
  address: {
    city: 'Lahore',
    county: 'Lahore District',
    state: 'Punjab',
    'ISO3166-2-lvl4': 'PK-PB',
    postcode: '54000',
    suburb: 'Gulberg',
    country: 'Pakistan',
    country_code: 'pk',
  },
};

describe('NominatimGeocodingProvider', () => {
  it('maps a forward search result and sends the expected request', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json([lahore]));

    const result = await makeProvider(fetchMock).forwardGeocode(
      'Gulberg, Lahore & more',
    );

    const [calledUrl, init] = fetchMock.mock.calls[0] as [
      string,
      { headers: Record<string, string> },
    ];

    const url = new URL(calledUrl);

    expect(url.origin + url.pathname).toBe(
      'https://nominatim.openstreetmap.org/search',
    );
    expect(url.searchParams.get('format')).toBe('jsonv2');
    expect(url.searchParams.get('addressdetails')).toBe('1');
    expect(url.searchParams.get('q')).toBe('Gulberg, Lahore & more');
    expect(calledUrl.includes('&more')).toBe(false);
    expect(init.headers['User-Agent']).toBe(NOMINATIM_USER_AGENT);

    expect(result).toEqual({
      coordinates: {
        latitude: 31.5203696,
        longitude: 74.3587473,
      },
      countryCode: 'PK',
      countryName: 'Pakistan',
      stateProvinceRegion: 'Punjab',
      stateProvinceCode: 'PK-PB',
      countyDistrict: 'Lahore District',
      city: 'Lahore',
      postalCode: '54000',
      areaNeighborhood: 'Gulberg',
      externalPlaceId: '123456',
      formattedAddress: 'Lahore, Punjab, Pakistan',
    });
  });

  it('rejects empty address text without calling Nominatim', async () => {
    const fetchMock = vi.fn();

    await expect(
      makeProvider(fetchMock).forwardGeocode('   '),
    ).rejects.toMatchObject({
      code: 'INVALID_INPUT',
    });

    expect(fetchMock.mock.calls.length).toBe(0);
  });

  it('returns null when Nominatim finds no results', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json([]));

    expect(
      await makeProvider(fetchMock).forwardGeocode('zzzz nowhere'),
    ).toBeNull();
  });

  it('throws MALFORMED_EXTERNAL_DATA for malformed or out-of-range coordinates', async () => {
    for (const bad of [
      { ...lahore, lat: 'abc' },
      { ...lahore, lon: undefined },
      { ...lahore, lat: '95' },
    ]) {
      const fetchMock = vi.fn().mockResolvedValue(json([bad]));

      await expect(
        makeProvider(fetchMock).forwardGeocode('x'),
      ).rejects.toMatchObject({
        code: 'MALFORMED_EXTERNAL_DATA',
      });
    }
  });

  it('maps HTTP 429 to PROVIDER_RATE_LIMITED', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({}, 429));

    await expect(
      makeProvider(fetchMock).forwardGeocode('x'),
    ).rejects.toMatchObject({
      code: 'PROVIDER_RATE_LIMITED',
    });
  });

  it('maps other HTTP failures and network errors to PROVIDER_REQUEST_FAILED', async () => {
    const http500 = vi.fn().mockResolvedValue(json({}, 500));

    await expect(
      makeProvider(http500).forwardGeocode('x'),
    ).rejects.toMatchObject({
      code: 'PROVIDER_REQUEST_FAILED',
    });

    const network = vi.fn().mockRejectedValue(new Error('boom'));

    await expect(
      makeProvider(network).forwardGeocode('x'),
    ).rejects.toMatchObject({
      code: 'PROVIDER_REQUEST_FAILED',
    });
  });

  it('maps a reverse result and sends the expected request', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(lahore));

    const result = await makeProvider(fetchMock).reverseGeocode({
      latitude: 31.52,
      longitude: 74.35,
    });

    const url = new URL(
      (fetchMock.mock.calls[0] as [string])[0],
    );

    expect(url.origin + url.pathname).toBe(
      'https://nominatim.openstreetmap.org/reverse',
    );
    expect(url.searchParams.get('format')).toBe('jsonv2');
    expect(url.searchParams.get('addressdetails')).toBe('1');
    expect(url.searchParams.get('lat')).toBe('31.52');
    expect(url.searchParams.get('lon')).toBe('74.35');

    expect(result?.countryCode).toBe('PK');
    expect(result?.city).toBe('Lahore');
    expect(result?.coordinates).toEqual({
      latitude: 31.5203696,
      longitude: 74.3587473,
    });
  });

  it('rejects invalid reverse coordinates and returns null for no-result responses', async () => {
    const neverCalled = vi.fn();

    await expect(
      makeProvider(neverCalled).reverseGeocode({
        latitude: 200,
        longitude: 0,
      }),
    ).rejects.toMatchObject({
      code: 'INVALID_INPUT',
    });

    expect(neverCalled.mock.calls.length).toBe(0);

    const noResult = vi
      .fn()
      .mockResolvedValue(json({ error: 'Unable to geocode' }));

    expect(
      await makeProvider(noResult).reverseGeocode({
        latitude: 0,
        longitude: 0,
      }),
    ).toBeNull();
  });
});
