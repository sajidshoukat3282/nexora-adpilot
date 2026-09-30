/**
 * Nexora AdPilot - Production GeographyRepository
 * D1-backed geography search, lookup, geocoding and persistence.
 */

import {
  GeographicLocation,
  GeographySearchParams,
  IGeographyRepository,
  GeocodingResult,
  Coordinates,
  validateCoordinates,
  validateCountryCode,
} from '../domain/geography.types';
import { GeographyDomainError } from '../domain/geography.errors';
import { IGeocodingProvider } from '../providers/GeocodingProvider';
import {
  GeographyDbRow,
  mapAndValidateDbRow,
} from './GeographyDbMapper';

interface D1DatabaseBinding {
  prepare(query: string): {
    bind(...args: unknown[]): {
      all<T>(): Promise<{ results: T[] }>;
      first<T>(): Promise<T | null>;
    };
  };
}

export class ProductionGeographyRepository
  implements IGeographyRepository
{
  private readonly db: D1DatabaseBinding;
  private readonly provider: IGeocodingProvider;

  constructor(
    dbBinding: D1DatabaseBinding,
    provider: IGeocodingProvider,
  ) {
    if (!dbBinding) {
      throw new GeographyDomainError(
        'DATABASE_UNAVAILABLE',
        'Cloudflare D1 database binding is required for ProductionGeographyRepository.',
      );
    }

    if (!provider) {
      throw new GeographyDomainError(
        'PROVIDER_UNAVAILABLE',
        'A geocoding provider is required for ProductionGeographyRepository.',
      );
    }

    this.db = dbBinding;
    this.provider = provider;
  }

  async search(
    params: GeographySearchParams,
  ): Promise<GeographicLocation[]> {
    let query =
      'SELECT * FROM geography_locations WHERE 1=1';

    const bindings: unknown[] = [];

    if (params.countryCode) {
      if (!validateCountryCode(params.countryCode)) {
        throw new GeographyDomainError(
          'INVALID_INPUT',
          `Invalid countryCode format supplied for search: ${params.countryCode}`,
        );
      }

      query += ' AND country_code = ?';
      bindings.push(params.countryCode);
    }

    if (params.countryName) {
      query += ' AND country_name LIKE ?';
      bindings.push(`%${params.countryName}%`);
    }

    if (params.stateProvince) {
      query += ' AND state_province_region LIKE ?';
      bindings.push(`%${params.stateProvince}%`);
    }

    if (params.stateProvinceCode) {
      query += ' AND state_province_code = ?';
      bindings.push(params.stateProvinceCode);
    }

    if (params.countyDistrict) {
      query += ' AND county_district LIKE ?';
      bindings.push(`%${params.countyDistrict}%`);
    }

    if (params.city) {
      query += ' AND city LIKE ?';
      bindings.push(`%${params.city}%`);
    }

    if (params.postalCode) {
      query += ' AND postal_code = ?';
      bindings.push(params.postalCode);
    }

    if (params.area) {
      query += ' AND area_neighborhood LIKE ?';
      bindings.push(`%${params.area}%`);
    }

    if (params.locationType) {
      query += ' AND location_type = ?';
      bindings.push(params.locationType);
    }

    if (params.parentId) {
      query += ' AND parent_id = ?';
      bindings.push(params.parentId);
    }

    if (params.query) {
      query +=
        ' AND (country_name LIKE ? OR city LIKE ? OR area_neighborhood LIKE ? OR postal_code LIKE ?)';

      const wildcard = `%${params.query}%`;

      bindings.push(
        wildcard,
        wildcard,
        wildcard,
