/**
 * Nexora AdPilot - Production GeographyRepository
 * Complete parameter filtering, D1 strict row validation, and server-side provider composition.
 */

import { 
  GeographicLocation, 
  GeographySearchParams, 
  IGeographyRepository, 
  GeocodingResult, 
  Coordinates,
  validateCoordinates,
  validateCountryCode
} from '../domain/geography.types';
import { GeographyDomainError } from '../domain/geography.errors';
import { IGeocodingProvider } from '../providers/GeocodingProvider';
import { GeographyDbRow, mapAndValidateDbRow } from './GeographyDbMapper';

interface D1DatabaseBinding {
  prepare(query: string): {
    bind(...args: unknown[]): {
      all<T>(): Promise<{ results: T[] }>;
      first<T>(): Promise<T | null>;
    };
  };
}

export class ProductionGeographyRepository implements IGeographyRepository {
  private db: D1DatabaseBinding;
  private provider: IGeocodingProvider;

  constructor(dbBinding: D1DatabaseBinding, provider: IGeocodingProvider) {
    if (!dbBinding) {
      throw new GeographyDomainError('DATABASE_UNAVAILABLE', 'Cloudflare D1 database binding is required for ProductionGeographyRepository.');
    }
    this.db = dbBinding;
    this.provider = provider;
  }

  async search(params: GeographySearchParams): Promise<GeographicLocation[]> {
    let query = 'SELECT * FROM geography_locations WHERE 1=1';
    const bindings: unknown[] = [];

    if (params.countryCode) {
      if (!validateCountryCode(params.countryCode)) {
        throw new GeographyDomainError('INVALID_INPUT', `Invalid countryCode format supplied for search: ${params.countryCode}`);
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
      query += ' AND (country_name LIKE ? OR city LIKE ? OR area_neighborhood LIKE ? OR postal_code LIKE ?)';
      const wildcard = `%${params.query}%`;
      bindings.push(wildcard, wildcard, wildcard, wildcard);
    }

    try {
      const { results } = await this.db.prepare(query).bind(...bindings).all<GeographyDbRow>();
      if (!results || !Array.isArray(results)) {
        return [];
      }
      return results.map(row => mapAndValidateDbRow(row));
    } catch (err) {
      if (err instanceof GeographyDomainError) throw err;
      throw new GeographyDomainError('DATABASE_UNAVAILABLE', `D1 query execution failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async getById(id: string): Promise<GeographicLocation | null> {
    if (!id || typeof id !== 'string') {
      throw new GeographyDomainError('INVALID_INPUT', 'A valid non-empty string ID must be provided to getById.');
    }

    try {
      const row = await this.db.prepare('SELECT * FROM geography_locations WHERE id = ?').bind(id).first<GeographyDbRow>();
      if (!row) return null;
      return mapAndValidateDbRow(row);
    } catch (err) {
      if (err instanceof GeographyDomainError) throw err;
      throw new GeographyDomainError('DATABASE_UNAVAILABLE', `D1 getById execution failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async forwardGeocode(addressText: string): Promise<GeocodingResult | null> {
    return this.provider.forwardGeocode(addressText);
  }

  async reverseGeocode(coordinates: Coordinates): Promise<GeocodingResult | null> {
    if (!validateCoordinates(coordinates)) {
      throw new GeographyDomainError('INVALID_INPUT', `Coordinates are out of valid range: Lat (${coordinates.latitude}), Lng (${coordinates.longitude}).`);
    }
    return this.provider.reverseGeocode(coordinates);
  }
}
