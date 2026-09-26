export interface Coordinates {
  latitude: number;
  longitude: number;
}

export type LocationType =
  | 'country'
  | 'state_province'
  | 'county_district'
  | 'city'
  | 'postal_code'
  | 'area';

export interface GeographicLocation {
  id: string;
  countryCode: string;
  countryName: string;
  stateProvinceRegion?: string;
  stateProvinceCode?: string;
  countyDistrict?: string;
  city?: string;
  postalCode?: string;
  areaNeighborhood?: string;
  coordinates?: Coordinates | null;
  timezone?: string;
  placeId?: string;
  locationType: LocationType;
  parentId?: string;
}

export interface GeocodingResult {
  coordinates: Coordinates;
  countryCode: string;
  countryName: string;
  stateProvinceRegion?: string;
  stateProvinceCode?: string;
  countyDistrict?: string;
  city?: string;
  postalCode?: string;
  areaNeighborhood?: string;
  externalPlaceId?: string;
  formattedAddress: string;
}

export interface GeographySearchParams {
  countryCode?: string;
  countryName?: string;
  stateProvince?: string;
  stateProvinceCode?: string;
  countyDistrict?: string;
  city?: string;
  postalCode?: string;
  area?: string;
  locationType?: LocationType;
  parentId?: string;
  query?: string;
}

export interface IGeographyRepository {
  search(params: GeographySearchParams): Promise<GeographicLocation[]>;
  getById(id: string): Promise<GeographicLocation | null>;
  forwardGeocode(addressText: string): Promise<GeocodingResult | null>;
  reverseGeocode(coordinates: Coordinates): Promise<GeocodingResult | null>;
}

export function validateCoordinates(coords: Coordinates): boolean {
  return (
    typeof coords.latitude === 'number' &&
    !isNaN(coords.latitude) &&
    coords.latitude >= -90 &&
    coords.latitude <= 90 &&
    typeof coords.longitude === 'number' &&
    !isNaN(coords.longitude) &&
    coords.longitude >= -180 &&
    coords.longitude <= 180
  );
}

export function validateCountryCode(countryCode: string): boolean {
  return typeof countryCode === 'string' && /^[A-Z]{2}$/.test(countryCode);
}
