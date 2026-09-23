import type {
  MediaAsset, InventoryPackage, AssetBooking, MaintenanceBlock,
  AvailabilityResult, MediaType, AssetOperationalStatus, ID, InventorySite,
  InventoryRateCard, InventoryAvailabilityQuery, InventoryAvailabilityWindow, InventoryFoundationSummary,
} from "@/domain";

export interface AssetFilters {
  search?: string;
  mediaTypes?: MediaType[];
  category?: "static" | "digital" | "all";
  indoor?: "indoor" | "outdoor" | "all";
  operationalStatus?: AssetOperationalStatus[];
  city?: string;
}

export interface InventoryRepository {
  listSites(search?: string): Promise<InventorySite[]>;
  getSite(id: ID): Promise<InventorySite | null>;
  listRateCards(activeOnly?: boolean): Promise<InventoryRateCard[]>;
  getAvailability(query: InventoryAvailabilityQuery): Promise<InventoryAvailabilityWindow[]>;
  getFoundationSummary(): Promise<InventoryFoundationSummary>;
  listAssets(filters?: AssetFilters): Promise<MediaAsset[]>;
  getAsset(id: ID): Promise<MediaAsset | null>;
  listPackages(): Promise<InventoryPackage[]>;
  listBookingsForAsset(assetId: ID): Promise<AssetBooking[]>;
  listMaintenanceForAsset(assetId: ID): Promise<MaintenanceBlock[]>;
  checkAvailability(assetId: ID, startDate: string, endDate: string): Promise<AvailabilityResult>;
  createBooking(input: { assetId: ID; campaignId: ID; startDate: string; endDate: string }): Promise<AssetBooking>;
  cancelBooking(bookingId: ID): Promise<void>;
}
