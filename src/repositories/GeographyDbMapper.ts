/**
 * Nexora AdPilot - Function #10: Database Row Representation and Strict Normalizer
 */

import { GeographicLocation, validateCoordinates, LocationType } from '../domain/geography.types';
import { GeographyDomainError } from '../domain/GeographyErrors';

export interface GeographyDbRow {
  id: unknown;
  country_code: unknown;
  country_name: unknown;
  state_province_region: unknown;
  state_province_code: unknown;
  county_district: unknown;
  city: unknown;
  postal_code: unknown;
  area_neighborhood: unknown;
  latitude: unknown;
  longitude: unknown;
  timezone: unknown;
  place_id: unknown;
  location_type: unknown;
  parent_id: unknown;
}

export function mapAndValidateDbRow(row: GeographyDbRow): GeographicLocation {
  if (!row || typeof row !== 'object') {
    throw new GeographyDomainError('MALFORMED_DATABASE_RECORD', 'Database record is null or not an object.');
  }

  if (typeof row.id !== 'string' || typeof row.country_code !== 'string' || typeof row.country_name !== 'string' || typeof row.location_type !== 'string') {
    throw new GeographyDomainError('MALFORMED_DATABASE_RECORD', 'Database record missing mandatory string fields (id, country_code, country_name, location_type).');
  }

  let coordinates = null;
  if (row.latitude !== null && row.latitude !== undefined && row.longitude !== null && row.longitude !== undefined) {
    const lat = Number(row.latitude);
    const lon = Number(row.longitude);
    if (isNaN(lat) || isNaN(lon)) {
      throw new GeographyDomainError('MALFORMED_DATABASE_RECORD', `Malformed coordinates stored in database for location id: ${row.id}`);
    }
    const candidateCoords = { latitude: lat, longitude: lon };
    if (!validateCoordinates(candidateCoords)) {
      throw new GeographyDomainError('MALFORMED_DATABASE_RECORD', `Database coordinates out of valid range for location id: ${row.id}`);
    }
    coordinates = candidateCoords;
  }

  return {
    id: row.id,
    countryCode: row.country_code,
    countryName: row.country_name,
    stateProvinceRegion: typeof row.state_province_region === 'string' ? row.state_province_region : undefined,
    stateProvinceCode: typeof row.state_province_code === 'string' ? row.state_province_code : undefined,
    countyDistrict: typeof row.county_district === 'string' ? row.county_district : undefined,
    city: typeof row.city === 'string' ? row.city : undefined,
    postalCode: typeof row.postal_code === 'string' ? row.postal_code : undefined,
    areaNeighborhood: typeof row.area_neighborhood === 'string' ? row.area_neighborhood : undefined,
    coordinates,
    timezone: typeof row.timezone === 'string' ? row.timezone : undefined,
    placeId: typeof row.place_id === 'string' ? row.place_id : undefined,
    locationType: row.location_type as LocationType,
    parentId: typeof row.parent_id === 'string' ? row.parent_id : undefined
  };
}
