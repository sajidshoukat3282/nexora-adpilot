import type { ID, Timestamps, TenantScoped } from "./shared";
import type { TechnicalCapabilities } from "./inventoryFoundation";
import type { PhysicalDimensionRecord } from "./physicalDimensions";
import type { DigitalResolutionCapabilities, DigitalResolutionRecord } from "./digitalResolution";

export type MediaCategory = "static" | "digital";

export type MediaType =
  | "led_billboard"
  | "digital_street_screen"
  | "billboard"
  | "hoarding"
  | "wallscape"
  | "bus_shelter"
  | "street_furniture"
  | "transit"
  | "mall"
  | "airport"
  | "retail"
  | "vehicle_transit"
  | "custom";

export const MEDIA_TYPE_LABELS: Record<MediaType, string> = {
  led_billboard: "LED Billboard",
  digital_street_screen: "Digital Street Screen",
  billboard: "Billboard",
  hoarding: "Hoarding",
  wallscape: "Wallscape",
  bus_shelter: "Bus Shelter",
  street_furniture: "Street Furniture",
  transit: "Transit",
  mall: "Mall",
  airport: "Airport",
  retail: "Retail",
  vehicle_transit: "Vehicle / Transit",
  custom: "Custom",
};

export const DIGITAL_MEDIA_TYPES: MediaType[] = ["led_billboard", "digital_street_screen"];

export function mediaCategory(type: MediaType): MediaCategory {
  return DIGITAL_MEDIA_TYPES.includes(type) ? "digital" : "static";
}

/** Operational status of the physical asset — independent of booking calendar. */
export type AssetOperationalStatus = "online" | "offline" | "maintenance";

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface MediaAsset extends Timestamps, TenantScoped {
  id: ID;
  code: string; // e.g. "LHR-MM-014"
  name: string;
  mediaType: MediaType;
  location: {
    address: string;
    city: string;
    geo: GeoPoint;
  };
  indoor: boolean;
  /** Legacy feet-based fields retained for Phase 1 compatibility. */
  dimensions: { widthFt: number; heightFt: number };
  /** Canonical physical measurement; intentionally separate from pixel resolution. */
  physicalDimensions?: PhysicalDimensionRecord;
  /** Legacy native pixel resolution retained for Phase 1 compatibility. */
  resolution?: { widthPx: number; heightPx: number }; // digital only
  /** Canonical digital resolution/capability model; separate from physical dimensions. */
  digitalResolution?: DigitalResolutionRecord;
  supportedResolutions?: DigitalResolutionCapabilities;
  orientation: "landscape" | "portrait";
  operationalStatus: AssetOperationalStatus;
  pricing: {
    baseDailyRateCents: number;
    premiumTimeMultiplier: number; // e.g. 1.25 for peak dayparts
  };
  audience: {
    estimatedDailyImpressions: number;
    trafficNote: string;
  };
  photos: string[]; // svg id references into the illustration set
  packageIds: ID[];
  siteId?: ID;
  rateCardId?: ID;
  ownerOrganizationId?: ID;
  operatorOrganizationId?: ID;
  technicalCapabilities?: TechnicalCapabilities;
  screenHealth?: ScreenHealthSnapshot; // digital only, mirrored from operations domain
}

export interface InventoryPackage extends Timestamps, TenantScoped {
  id: ID;
  name: string;
  description: string;
  assetIds: ID[];
  discountPct: number;
}

/**
 * A booking is an interval reservation against an asset — this is what makes
 * availability real (partial/interval-based) instead of a single boolean.
 * Overlap between two CONFIRMED bookings for the same asset is a conflict.
 */
export type BookingStatus = "reserved" | "confirmed" | "completed" | "cancelled";

export interface AssetBooking extends Timestamps, TenantScoped {
  id: ID;
  assetId: ID;
  campaignId: ID;
  startDate: string; // ISO date
  endDate: string; // ISO date, inclusive
  status: BookingStatus;
}

export interface MaintenanceBlock extends Timestamps, TenantScoped {
  id: ID;
  assetId: ID;
  startDate: string;
  endDate: string;
  reason: string;
}

export interface ScreenHealthSnapshot {
  lastHeartbeatAt: string;
  network: "good" | "degraded" | "offline";
  storagePct: number;
  temperatureC: number;
  playerVersion: string;
}

/** Computed (not stored) — derived by checking bookings + maintenance for a date range. */
export type AvailabilityResult =
  | { state: "available" }
  | { state: "partially_available"; freeRanges: Array<{ start: string; end: string }> }
  | { state: "booked"; conflictingBookingIds: ID[] }
  | { state: "maintenance"; blockIds: ID[] }
  | { state: "offline" };
