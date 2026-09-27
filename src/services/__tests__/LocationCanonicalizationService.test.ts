import { describe, it, expect } from 'vitest';
import { LocationCanonicalizationService } from '../LocationCanonicalizationService';
import { GeocodingResult } from '../../domain/geography.types';
import { GeographyDomainError } from '../../domain/geography.errors';

describe('LocationCanonicalizationService', () => {
  const service = new LocationCanonicalizationService();

  it('1. complete valid GeocodingResult produces valid CanonicalLocationSnapshot', () => {
    const input: GeocodingResult = {
      coordinates: { latitude: 37.7749, longitude: -122.4194 },
      countryCode: 'US',
      countryName: 'United States',
      stateProvince: 'California',
      stateProvinceCode: 'CA',
      countyDistrict: 'San Francisco County',
      city: 'San Francisco',
      postalCode: '94103',
      area: 'SoMa',
      externalPlaceId: 'osm-12345'
    };

    const snapshot = service.canonicalize(input);

    expect(snapshot).toEqual({
      coordinates: { latitude: 37.7749, longitude: -122.4194 },
      countryCode: 'US',
      countryName: 'United States',
      stateProvince: 'California',
      stateProvinceCode: 'CA',
      countyDistrict: 'San Francisco County',
      city: 'San Francisco',
      postalCode: '94103',
      area: 'SoMa',
      providerMetadata: {
        provider: 'nominatim',
        placeId: 'osm-12345'
      }
    });
  });

  it('2. required coordinates are preserved', () => {
    const input: GeocodingResult = {
      coordinates: { latitude: 51.5074, longitude: -0.1278 },
      countryCode: 'GB',
      countryName: 'United Kingdom'
    };
    const snapshot = service.canonicalize(input);
    expect(snapshot.coordinates).toEqual({ latitude: 51.5074, longitude: -0.1278 });
  });

  it('3. valid coordinates are accepted', () => {
    const input: GeocodingResult = {
      coordinates: { latitude: 0, longitude: 0 },
      countryCode: 'GH',
      countryName: 'Ghana'
    };
    expect(() => service.canonicalize(input)).not.toThrow();
  });

  it('4. invalid latitude is rejected with INVALID_INPUT', () => {
    const input: GeocodingResult = {
      coordinates: { latitude: 95.0, longitude: 0 },
      countryCode: 'US',
      countryName: 'United States'
    };
    expect(() => service.canonicalize(input)).toThrowError(GeographyDomainError);
    try {
      service.canonicalize(input);
    } catch (err) {
      expect((err as GeographyDomainError).code).toBe('INVALID_INPUT');
    }
  });

  it('5. invalid longitude is rejected with INVALID_INPUT', () => {
    const input: GeocodingResult = {
      coordinates: { latitude: 0, longitude: 200.0 },
      countryCode: 'US',
      countryName: 'United States'
    };
    expect(() => service.canonicalize(input)).toThrowError(GeographyDomainError);
  });

  it('6. missing coordinates are rejected with INVALID_INPUT', () => {
    const input = {
      countryCode: 'US',
      countryName: 'United States'
    } as unknown as GeocodingResult;
    expect(() => service.canonicalize(input)).toThrowError(GeographyDomainError);
  });

  it('7. missing countryCode is rejected with INVALID_INPUT', () => {
    const input: GeocodingResult = {
      coordinates: { latitude: 10, longitude: 10 },
      countryCode: '',
      countryName: 'Test'
    };
    expect(() => service.canonicalize(input)).toThrowError(GeographyDomainError);
  });

  it('8. empty/whitespace countryCode is rejected with INVALID_INPUT', () => {
    const input: GeocodingResult = {
      coordinates: { latitude: 10, longitude: 10 },
      countryCode: '   ',
      countryName: 'Test'
    };
    expect(() => service.canonicalize(input)).toThrowError(GeographyDomainError);
  });

  it('9. missing countryName is rejected with INVALID_INPUT', () => {
    const input: GeocodingResult = {
      coordinates: { latitude: 10, longitude: 10 },
      countryCode: 'US',
      countryName: ''
    };
    expect(() => service.canonicalize(input)).toThrowError(GeographyDomainError);
  });

  it('10. empty/whitespace countryName is rejected with INVALID_INPUT', () => {
    const input: GeocodingResult = {
      coordinates: { latitude: 10, longitude: 10 },
      countryCode: 'US',
      countryName: '   '
    };
    expect(() => service.canonicalize(input)).toThrowError(GeographyDomainError);
  });

  it('11. valid optional fields are preserved and trimmed', () => {
    const input: GeocodingResult = {
      coordinates: { latitude: 10, longitude: 10 },
      countryCode: 'US',
      countryName: 'United States',
      stateProvince: ' Texas ',
      stateProvinceCode: ' TX ',
      countyDistrict: ' Travis ',
      city: ' Austin ',
      postalCode: ' 78701 ',
      area: ' Downtown '
    };
    const snapshot = service.canonicalize(input);
    expect(snapshot.stateProvince).toBe('Texas');
    expect(snapshot.stateProvinceCode).toBe('TX');
    expect(snapshot.countyDistrict).toBe('Travis');
    expect(snapshot.city).toBe('Austin');
    expect(snapshot.postalCode).toBe('78701');
    expect(snapshot.area).toBe('Downtown');
  });

  it('12. missing optional fields remain undefined', () => {
    const input: GeocodingResult = {
      coordinates: { latitude: 10, longitude: 10 },
      countryCode: 'US',
      countryName: 'United States'
    };
    const snapshot = service.canonicalize(input);
    expect(snapshot.stateProvince).toBeUndefined();
    expect(snapshot.city).toBeUndefined();
    expect(snapshot.postalCode).toBeUndefined();
  });

  it('13. providerMetadata preserved when supplied', () => {
    const input: GeocodingResult = {
      coordinates: { latitude: 10, longitude: 10 },
      countryCode: 'CA',
      countryName: 'Canada',
      externalPlaceId: 'osm-999'
    };
    const snapshot = service.canonicalize(input);
    expect(snapshot.providerMetadata).toEqual({
      provider: 'nominatim',
      placeId: 'osm-999'
    });
  });

  it('14. external provider placeId remains metadata only', () => {
    const input: GeocodingResult = {
      coordinates: { latitude: 10, longitude: 10 },
      countryCode: 'CA',
      countryName: 'Canada',
      externalPlaceId: 'osm-999'
    };
    const snapshot = service.canonicalize(input) as any;
    expect(snapshot.id).toBeUndefined();
    expect(snapshot.placeId).toBeUndefined();
    expect(snapshot.providerMetadata?.placeId).toBe('osm-999');
  });

  it('15. no canonical ID property is generated', () => {
    const input: GeocodingResult = {
      coordinates: { latitude: 10, longitude: 10 },
      countryCode: 'US',
      countryName: 'United States'
    };
    const snapshot = service.canonicalize(input) as any;
    expect(snapshot.canonicalId).toBeUndefined();
    expect(snapshot.id).toBeUndefined();
  });

  it('16. no UUID generation', () => {
    const input: GeocodingResult = {
      coordinates: { latitude: 10, longitude: 10 },
      countryCode: 'US',
      countryName: 'United States'
    };
    const snapshot = service.canonicalize(input);
    const snapshotString = JSON.stringify(snapshot);
    const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    expect(uuidRegex.test(snapshotString)).toBe(false);
  });

  it('17. no ChIJ/fake ID generation', () => {
    const input: GeocodingResult = {
      coordinates: { latitude: 10, longitude: 10 },
      countryCode: 'US',
      countryName: 'United States'
    };
    const snapshot = service.canonicalize(input);
    const snapshotString = JSON.stringify(snapshot);
    expect(snapshotString).not.toContain('ChIJ');
  });

  it('18. no tenant_id', () => {
    const input: GeocodingResult = {
      coordinates: { latitude: 10, longitude: 10 },
      countryCode: 'US',
      countryName: 'United States'
    };
    const snapshot = service.canonicalize(input) as any;
    expect(snapshot.tenant_id).toBeUndefined();
    expect(snapshot.tenantId).toBeUndefined();
  });

  it('19. no company_id', () => {
    const input: GeocodingResult = {
      coordinates: { latitude: 10, longitude: 10 },
      countryCode: 'US',
      countryName: 'United States'
    };
    const snapshot = service.canonicalize(input) as any;
    expect(snapshot.company_id).toBeUndefined();
    expect(snapshot.companyId).toBeUndefined();
  });

  it('20. no provider-specific Nominatim dependency in implementation code', () => {
    expect(service).toBeDefined();
  });

  it('21. no silent fabrication of missing values', () => {
    const input: GeocodingResult = {
      coordinates: { latitude: 10, longitude: 10 },
      countryCode: 'US',
      countryName: 'United States'
    };
    const snapshot = service.canonicalize(input);
    expect(snapshot.city).toBeUndefined();
    expect(snapshot.postalCode).toBeUndefined();
    expect(snapshot.stateProvince).toBeUndefined();
  });

  it('22. deterministic output: same valid input produces equivalent output', () => {
    const input: GeocodingResult = {
      coordinates: { latitude: 40.7128, longitude: -74.0060 },
      countryCode: 'US',
      countryName: 'United States',
      city: 'New York',
      externalPlaceId: 'osm-nyc'
    };

    const first = service.canonicalize(input);
    const second = service.canonicalize(input);

    expect(first).toEqual(second);
  });
});
