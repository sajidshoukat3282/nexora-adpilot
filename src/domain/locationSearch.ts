import type { ID } from "./shared";
import type {
  GeographyLevel,
  GeographyPath,
  GeographyScope,
  GeoCoordinate,
} from "./geography";

export interface LocationSearchQuery {
  text: string;
  levels?: GeographyLevel[];
  countryCode?: string;
  parentId?: ID;
  limit?: number;
}

/** Provider-neutral result returned by a geocoder/geography service. */
export interface LocationSearchResult {
  id: ID;
  name: string;
  level: GeographyLevel;
  countryCode?: string;
  coordinates?: GeoCoordinate;
  path: GeographyPath;
  providerRef?: string;
}

export interface LocationSearchResponse {
  results: LocationSearchResult[];
  query: LocationSearchQuery;
  provider: string;
  hasMore: boolean;
}

export interface LocationResolution {
  result: LocationSearchResult;
  scope: GeographyScope;
}

/**
 * The application talks to this boundary, never directly to a map/geocoding
 * vendor. A real provider can be introduced later without changing domain
 * models or inventory/planning code.
 */
export interface LocationSearchProvider {
  search(query: LocationSearchQuery): Promise<LocationSearchResponse>;
  resolve(resultId: ID): Promise<LocationResolution | null>;
  reverseGeocode?(coordinate: GeoCoordinate): Promise<LocationSearchResult | null>;
}

export function normalizeLocationSearchQuery(query: LocationSearchQuery): LocationSearchQuery {
  const text = query.text.trim();
  if (!text) throw new Error("Location search text is required.");

  return {
    ...query,
    text,
    countryCode: query.countryCode?.trim().toUpperCase() || undefined,
    limit: Math.min(Math.max(query.limit ?? 10, 1), 50),
  };
}

export function selectionToGeographyScope(result: LocationSearchResult): GeographyScope {
  return { nodeId: result.id, path: result.path };
}
