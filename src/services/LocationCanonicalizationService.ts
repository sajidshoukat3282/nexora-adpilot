import { GeocodingResult, validateCoordinates } from '../domain/geography.types';
import { GeographyDomainError } from '../domain/geography.errors';
import { CanonicalLocationSnapshot } from '../domain/locationSnapshot.types';

export class LocationCanonicalizationService {
  public canonicalize(result: GeocodingResult | null | undefined): CanonicalLocationSnapshot {
    if (!result) {
      throw new GeographyDomainError('INVALID_INPUT', 'Geocoding result cannot be null or undefined.');
    }

    if (!result.coordinates) {
      throw new GeographyDomainError('INVALID_INPUT', 'Coordinates are missing from geocoding result.');
    }

    try {
      validateCoordinates(result.coordinates.latitude, result.coordinates.longitude);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid coordinates.';
      throw new GeographyDomainError('INVALID_INPUT', message);
    }

    if (!result.countryCode || typeof result.countryCode !== 'string' || result.countryCode.trim() === '') {
      throw new GeographyDomainError('INVALID_INPUT', 'Country code is missing or empty.');
    }

    if (!result.countryName || typeof result.countryName !== 'string' || result.countryName.trim() === '') {
      throw new GeographyDomainError('INVALID_INPUT', 'Country name is missing or empty.');
    }

    const trimmedCountryCode = result.countryCode.trim().toUpperCase();
    const trimmedCountryName = result.countryName.trim();

    const snapshot: CanonicalLocationSnapshot = {
      coordinates: {
        latitude: result.coordinates.latitude,
        longitude: result.coordinates.longitude
      },
      countryCode: trimmedCountryCode,
      countryName: trimmedCountryName
    };

    if (result.stateProvince !== undefined && result.stateProvince !== null) {
      const trimmed = result.stateProvince.trim();
      if (trimmed !== '') snapshot.stateProvince = trimmed;
    }

    if (result.stateProvinceCode !== undefined && result.stateProvinceCode !== null) {
      const trimmed = result.stateProvinceCode.trim();
      if (trimmed !== '') snapshot.stateProvinceCode = trimmed;
    }

    if (result.countyDistrict !== undefined && result.countyDistrict !== null) {
      const trimmed = result.countyDistrict.trim();
      if (trimmed !== '') snapshot.countyDistrict = trimmed;
    }

    if (result.city !== undefined && result.city !== null) {
      const trimmed = result.city.trim();
      if (trimmed !== '') snapshot.city = trimmed;
    }

    if (result.postalCode !== undefined && result.postalCode !== null) {
      const trimmed = result.postalCode.trim();
      if (trimmed !== '') snapshot.postalCode = trimmed;
    }

    if (result.area !== undefined && result.area !== null) {
      const trimmed = result.area.trim();
      if (trimmed !== '') snapshot.area = trimmed;
    }

    if (result.externalPlaceId !== undefined && result.externalPlaceId !== null) {
      const placeIdStr = String(result.externalPlaceId).trim();
      if (placeIdStr !== '') {
        snapshot.providerMetadata = {
          provider: 'nominatim',
          placeId: placeIdStr
        };
      }
    }

    return snapshot;
  }
}
