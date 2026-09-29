import {
  validateCoordinates,
} from '../domain/geography.types';
import type {
  GeocodingResult,
} from '../domain/geography.types';
import {
  GeographyDomainError,
} from '../domain/geography.errors';
import type {
  CanonicalLocationSnapshot,
} from '../domain/locationSnapshot.types';

export class LocationCanonicalizationService {
  public canonicalize(
    result: GeocodingResult | null | undefined,
  ): CanonicalLocationSnapshot {
    if (!result) {
      throw new GeographyDomainError(
        'INVALID_INPUT',
        'Geocoding result cannot be null or undefined.',
      );
    }

    if (!result.coordinates) {
      throw new GeographyDomainError(
        'INVALID_INPUT',
        'Coordinates are missing from geocoding result.',
      );
    }

    try {
      if (!validateCoordinates(result.coordinates)) {
        throw new GeographyDomainError(
          'INVALID_INPUT',
          'Invalid coordinates.',
        );
      }
    } catch (err: unknown) {
      if (err instanceof GeographyDomainError) {
        throw err;
      }

      const message =
        err instanceof Error
          ? err.message
          : 'Invalid coordinates.';

      throw new GeographyDomainError(
        'INVALID_INPUT',
        message,
      );
    }

    if (
      !result.countryCode ||
      typeof result.countryCode !== 'string' ||
      result.countryCode.trim() === ''
    ) {
      throw new GeographyDomainError(
        'INVALID_INPUT',
        'Country code is missing or empty.',
      );
    }

    if (
      !result.countryName ||
      typeof result.countryName !== 'string' ||
      result.countryName.trim() === ''
    ) {
      throw new GeographyDomainError(
        'INVALID_INPUT',
        'Country name is missing or empty.',
      );
    }

    const trimmedCountryCode =
      result.countryCode.trim().toUpperCase();

    const trimmedCountryName =
      result.countryName.trim();

    const snapshot: CanonicalLocationSnapshot = {
      coordinates: {
        latitude: result.coordinates.latitude,
        longitude: result.coordinates.longitude,
      },
      countryCode: trimmedCountryCode,
      countryName: trimmedCountryName,
    };

    const rawAny = result as any;

    if (
      rawAny.stateProvince !== undefined &&
      rawAny.stateProvince !== null
    ) {
      const trimmed =
        String(rawAny.stateProvince).trim();

      if (trimmed !== '') {
        snapshot.stateProvince = trimmed;
      }
    }

    if (
      result.stateProvinceCode !== undefined &&
      result.stateProvinceCode !== null
    ) {
      const trimmed =
        String(result.stateProvinceCode).trim();

      if (trimmed !== '') {
        snapshot.stateProvinceCode = trimmed;
      }
    }

    if (
      rawAny.countyDistrict !== undefined &&
      rawAny.countyDistrict !== null
    ) {
      const trimmed =
        String(rawAny.countyDistrict).trim();

      if (trimmed !== '') {
        snapshot.countyDistrict = trimmed;
      }
    }

    if (
      result.city !== undefined &&
      result.city !== null
    ) {
      const trimmed =
        String(result.city).trim();

      if (trimmed !== '') {
        snapshot.city = trimmed;
      }
    }

    if (
      result.postalCode !== undefined &&
      result.postalCode !== null
    ) {
      const trimmed =
        String(result.postalCode).trim();

      if (trimmed !== '') {
        snapshot.postalCode = trimmed;
      }
    }

    if (
      rawAny.area !== undefined &&
      rawAny.area !== null
    ) {
      const trimmed =
        String(rawAny.area).trim();

      if (trimmed !== '') {
        snapshot.area = trimmed;
      }
    }

    if (
      result.externalPlaceId !== undefined &&
      result.externalPlaceId !== null
    ) {
      const placeIdStr =
        String(result.externalPlaceId).trim();

      if (placeIdStr !== '') {
        snapshot.providerMetadata = {
          provider: 'nominatim',
          placeId: placeIdStr,
        };
      }
    }

    return snapshot;
  }
}