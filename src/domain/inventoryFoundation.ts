import type { ID, TenantScoped, Timestamps } from "./shared";
import type { GeoPoint, MediaCategory, MediaType, AssetOperationalStatus, MediaAsset } from "./inventory";
import type { PhysicalDimensionRecord } from "./physicalDimensions";

export type InventorySiteStatus = "active" | "inactive" | "maintenance";
export type InventoryOwnershipType = "owned" | "managed" | "leased" | "partner";

export interface InventorySiteLocation {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  stateProvinceRegion?: string;
  countyDistrict?: string;
  postalCode?: string;
  countryCode: string;
  geo: GeoPoint;
  timezone?: string;
}

export interface InventorySite extends Timestamps, TenantScoped {
  id: ID;
  code: string;
  name: string;
  location: InventorySiteLocation;
  status: InventorySiteStatus;
  ownershipType: InventoryOwnershipType;
  ownerOrganizationId?: ID;
  operatorOrganizationId?: ID;
  notes?: string;
}

export interface InventoryPartyRef {
  organizationId?: ID;
  contactId?: ID;
  name: string;
}

export interface InventoryOwnershipOperator {
  ownership: InventoryPartyRef;
  operator?: InventoryPartyRef;
}

export type {
  RateUnit as RateCardUnit,
  RateCardEntry,
  InventoryRateCard,
} from "./rateCards";

export interface TechnicalCapabilities {
  brightnessNits?: number;
  refreshRateHz?: number;
  supportedFileTypes?: string[];
  supportedCodecs?: string[];
  audioSupported?: boolean;
  connectivity?: Array<"ethernet" | "wifi" | "cellular" | "fiber" | "other">;
  playerId?: ID;
  cmsIntegrationKey?: string;
  nativeResolution?: { widthPx: number; heightPx: number };
  supportedResolutions?: Array<{ widthPx: number; heightPx: number }>;
  operatingNotes?: string;
}

export interface InventoryAssetRecord extends Timestamps, TenantScoped {
  id: ID;
  siteId: ID;
  asset: MediaAsset;
  /** Canonical physical dimensions for new inventory records. */
  physicalDimensions?: PhysicalDimensionRecord;
  category: MediaCategory;
  mediaType: MediaType;
  operationalStatus: AssetOperationalStatus;
  ownershipOperator: InventoryOwnershipOperator;
  rateCardId?: ID;
  technicalCapabilities?: TechnicalCapabilities;
}

export interface InventoryAvailabilityWindow {
  startDate: string;
  endDate: string;
  status: "available" | "reserved" | "confirmed" | "maintenance" | "blocked";
  bookingId?: ID;
  reason?: string;
}

export interface InventoryAvailabilityQuery {
  assetId?: ID;
  siteId?: ID;
  startDate: string;
  endDate: string;
}

export interface InventoryFoundationSummary {
  sites: number;
  assets: number;
  activeAssets: number;
  digitalAssets: number;
  staticAssets: number;
}
