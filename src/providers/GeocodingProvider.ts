/**
 * Nexora AdPilot - Function #10: GeocodingProvider Abstraction & HTTP Adapter
 * Handles actual external geocoding provider requests server-side without leaking secrets.
 */

import { Coordinates, GeocodingResult } from '../domain/geography.types';
import { GeographyDomainError } from '../domain/GeographyErrors';

export interface IGeocodingProvider {
  forwardGeocode(addressText: string): Promise<GeocodingResult | null>;
  reverseGeocode(coordinates: Coordinates): Promise<GeocodingResult | null>;
}

export interface GeocodingProviderConfig {
  apiKey?: string;
  endpointUrl?: string;
  timeoutMs?: number;
}

export class HttpGeocodingProvider implements IGeocodingProvider {
  private config: GeocodingProviderConfig;

  constructor(config?: GeocodingProviderConfig) {
    this.config = config || {};
  }

  private ensureConfigured(): void {
    if (!this.config.apiKey || !this.config.endpointUrl) {
      throw new GeographyDomainError(
        'PROVIDER_UNAVAILABLE',
        'Geocoding provider credentials or endpoint URL are not configured in server environment bindings.'
      );
    }
  }

  async forwardGeocode(addressText: string): Promise<GeocodingResult | null> {
    if (!addressText || addressText.trim() === '') {
      throw new GeographyDomainError('INVALID_INPUT', 'Address text cannot be empty for forward geocoding.');
    }

    this.ensureConfigured();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs || 8000);

    try {
      const targetUrl = `${this.config.endpointUrl}/forward?q=${encodeURIComponent(addressText)}`;
      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Accept': 'application/json',
          'User-Agent': 'Nexora-AdPilot-Server/1.0'
        },
        signal: controller.signal
      });

      if (response.status === 429) {
        throw new GeographyDomainError('PROVIDER_RATE_LIMITED', 'Geocoding provider rate limit exceeded (HTTP 429).');
      }
      if (response.status >= 400 && response.status < 500) {
        throw new GeographyDomainError('PROVIDER_REQUEST_FAILED', `Geocoding provider client error response: HTTP ${response.status}`);
      }
      if (response.status >= 500) {
        throw new GeographyDomainError('PROVIDER_REQUEST_FAILED', `Geocoding provider server error response: HTTP ${response.status}`);
      }

      const rawJson: unknown = await response.json();
      return this.mapAndValidateProviderResponse(rawJson);

    } catch (err) {
      if (err instanceof GeographyDomainError) throw err;
      if (err instanceof Error && err.name === 'AbortError') {
        throw new GeographyDomainError('PROVIDER_REQUEST_FAILED', 'Geocoding provider request timed out.');
      }
      throw new GeographyDomainError('PROVIDER_REQUEST_FAILED', `Network or provider request failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      clearTimeout(timeout);
    }
  }

  async reverseGeocode(coordinates: Coordinates): Promise<GeocodingResult | null> {
    this.ensureConfigured();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs || 8000);

    try {
      const targetUrl = `${this.config.endpointUrl}/reverse?lat=${coordinates.latitude}&lon=${coordinates.longitude}`;
      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Accept': 'application/json',
          'User-Agent': 'Nexora-AdPilot-Server/1.0'
        },
        signal: controller.signal
      });

      if (response.status === 429) {
        throw new GeographyDomainError('PROVIDER_RATE_LIMITED', 'Geocoding provider rate limit exceeded (HTTP 429).');
      }
      if (response.status >= 400 && response.status < 500) {
        throw new GeographyDomainError('PROVIDER_REQUEST_FAILED', `Geocoding provider client error response: HTTP ${response.status}`);
      }
      if (response.status >= 500) {
        throw new GeographyDomainError('PROVIDER_REQUEST_FAILED', `Geocoding provider server error response: HTTP ${response.status}`);
      }

      const rawJson: unknown = await response.json();
      return this.mapAndValidateProviderResponse(rawJson);

    } catch (err) {
      if (err instanceof GeographyDomainError) throw err;
      if (err instanceof Error && err.name === 'AbortError') {
        throw new GeographyDomainError('PROVIDER_REQUEST_FAILED', 'Geocoding provider request timed out.');
      }
      throw new GeographyDomainError('PROVIDER_REQUEST_FAILED', `Network or provider request failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      clearTimeout(timeout);
    }
  }

  private mapAndValidateProviderResponse(payload: unknown): GeocodingResult | null {
    if (!payload || typeof payload !== 'object') {
      throw new GeographyDomainError('MALFORMED_EXTERNAL_DATA', 'Provider returned non-object JSON payload.');
    }

    const data = payload as Record<string, unknown>;
    if (data.status === 'ZERO_RESULTS' || !data.result) {
      return null;
    }

    const res = data.result as Record<string, unknown>;
    const lat = Number(res.latitude ?? res.lat);
    const lon = Number(res.longitude ?? res.lon ?? res.lng);

    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      throw new GeographyDomainError('MALFORMED_EXTERNAL_DATA', 'Provider returned malformed or out-of-bound geographic coordinates.');
    }

    if (typeof res.countryCode !== 'string' || typeof res.countryName !== 'string' || typeof res.formattedAddress !== 'string') {
      throw new GeographyDomainError('MALFORMED_EXTERNAL_DATA', 'Provider payload missing required baseline schema attributes (countryCode, countryName, formattedAddress).');
    }

    return {
      coordinates: { latitude: lat, longitude: lon },
      countryCode: res.countryCode,
      countryName: res.countryName,
      stateProvinceRegion: typeof res.stateProvinceRegion === 'string' ? res.stateProvinceRegion : undefined,
      stateProvinceCode: typeof res.stateProvinceCode === 'string' ? res.stateProvinceCode : undefined,
      countyDistrict: typeof res.countyDistrict === 'string' ? res.countyDistrict : undefined,
      city: typeof res.city === 'string' ? res.city : undefined,
      postalCode: typeof res.postalCode === 'string' ? res.postalCode : undefined,
      areaNeighborhood: typeof res.areaNeighborhood === 'string' ? res.areaNeighborhood : undefined,
      externalPlaceId: typeof res.externalPlaceId === 'string' ? res.externalPlaceId : undefined,
      formattedAddress: res.formattedAddress
    };
  }
}
