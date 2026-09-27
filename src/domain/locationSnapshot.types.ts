import { Coordinates } from './geography.types';

export interface ProviderMetadata {
  provider: string;
  placeId?: string;
}

export interface CanonicalLocationSnapshot {
  coordinates: Coordinates;
  countryCode: string;
  countryName: string;
  stateProvince?: string;
  stateProvinceCode?: string;
  countyDistrict?: string;
  city?: string;
  postalCode?: string;
  area?: string;
  providerMetadata?: ProviderMetadata;
}
