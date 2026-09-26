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
  public readonly code: GeographyErrorCode;
  public readonly details?: unknown;

  constructor(code: GeographyErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'GeographyDomainError';
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, GeographyDomainError.prototype);
  }
}
