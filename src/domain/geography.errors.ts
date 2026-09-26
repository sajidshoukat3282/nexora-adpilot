/**
 * Nexora AdPilot - Function #10: Geography & Geocoding Domain Errors
 */

export type GeographyErrorCode = 
  | 'INVALID_INPUT'
  | 'NOT_FOUND'
  | 'PROVIDER_UNAVAILABLE'
  | 'PROVIDER_RATE_LIMITED'
  | 'PROVIDER_REQUEST_FAILED'
  | 'DATABASE_UNAVAILABLE'
  | 'MALFORMED_EXTERNAL_DATA'
  | 'MALFORMED_DATABASE_RECORD';

export class GeographyDomainError extends Error {
  constructor(public code: GeographyErrorCode, message: string) {
    super(message);
    this.name = 'GeographyDomainError';
  }
}
