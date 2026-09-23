import type { ID, Timestamps } from "./shared";

/** Global geography levels used by OOH/DOOH inventory and planning. */
export type GeographyLevel =
  | "country"
  | "state_province_region"
  | "county_district"
  | "city"
  | "postal_code"
  | "area_neighborhood";

export interface GeoCoordinate {
  lat: number;
  lng: number;
}

export interface GeoBoundingBox {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface GeographyNode extends Timestamps {
  id: ID;
  level: GeographyLevel;
  name: string;
  countryCode?: string;
  parentId?: ID;
  coordinates?: GeoCoordinate;
  boundingBox?: GeoBoundingBox;
  providerRef?: string;
}

export interface GeographyPathItem {
  level: GeographyLevel;
  name: string;
  id?: ID;
  countryCode?: string;
}

export interface GeographyPath {
  items: GeographyPathItem[];
}

export interface GeographySelection {
  node: GeographyNode;
  path: GeographyPath;
}

export interface GeographyRadius {
  center: GeoCoordinate;
  radiusMeters: number;
}

export interface GeographyPolygon {
  coordinates: GeoCoordinate[];
}

export interface GeographyScope {
  nodeId?: ID;
  path?: GeographyPath;
  radius?: GeographyRadius;
  polygon?: GeographyPolygon;
}

export function isGeographyLevel(value: string): value is GeographyLevel {
  return [
    "country",
    "state_province_region",
    "county_district",
    "city",
    "postal_code",
    "area_neighborhood",
  ].includes(value);
}

export function geographyPathLabel(path: GeographyPath): string {
  return path.items.map((item) => item.name).join(" · ");
}
