import type {
  InventoryAvailabilityQuery,
  InventoryAvailabilityWindow,
  InventoryFoundationSummary,
  InventoryRateCard,
  InventorySite,
} from "@/domain";
import { ASSETS } from "@/fixtures/inventory";
import { COMPANY } from "@/fixtures/company";
import { daysFromNow, isoDaysAgo } from "@/fixtures/helpers";

const SITES: InventorySite[] = [
  {
    id: "site-lhr-gulberg", companyId: COMPANY.id, code: "LHR-GUL-001", name: "Gulberg Boulevard",
    location: { addressLine1: "Main Boulevard, Gulberg III", city: "Lahore", stateProvinceRegion: "Punjab", postalCode: "54660", countryCode: "PK", geo: { lat: 31.5074, lng: 74.3453 }, timezone: "Asia/Karachi" },
    status: "active", ownershipType: "managed", createdAt: isoDaysAgo(240), updatedAt: isoDaysAgo(5),
  },
  {
    id: "site-khi-shahrah", companyId: COMPANY.id, code: "KHI-SHF-001", name: "Shahrah-e-Faisal Corridor",
    location: { addressLine1: "Shahrah-e-Faisal", city: "Karachi", stateProvinceRegion: "Sindh", countryCode: "PK", geo: { lat: 24.8657, lng: 67.0508 }, timezone: "Asia/Karachi" },
    status: "active", ownershipType: "owned", createdAt: isoDaysAgo(220), updatedAt: isoDaysAgo(5),
  },
  {
    id: "site-isb-blue", companyId: COMPANY.id, code: "ISB-BLU-001", name: "Blue Area / Jinnah Avenue",
    location: { addressLine1: "Jinnah Avenue, Blue Area", city: "Islamabad", stateProvinceRegion: "Islamabad Capital Territory", countryCode: "PK", geo: { lat: 33.7089, lng: 73.0563 }, timezone: "Asia/Karachi" },
    status: "active", ownershipType: "partner", createdAt: isoDaysAgo(210), updatedAt: isoDaysAgo(6),
  },
];

const RATE_CARDS: InventoryRateCard[] = [
  {
    id: "ratecard-default-pkr", companyId: COMPANY.id, name: "Standard PKR Inventory", currency: "PKR",
    status: "active", validity: { effectiveFrom: daysFromNow(-90) }, scopes: [{ type: "company", referenceId: COMPANY.id }], version: 1,
    entries: [
      { id: "rate-daily", code: "DAILY", label: "Daily placement", unit: "daily", amount: { amountMinor: 30000, currency: "PKR" }, active: true, sortOrder: 1, createdAt: isoDaysAgo(90), updatedAt: isoDaysAgo(90) },
      { id: "rate-cpm", code: "CPM", label: "CPM", unit: "cpm", amount: { amountMinor: 2500, currency: "PKR" }, active: true, sortOrder: 2, createdAt: isoDaysAgo(90), updatedAt: isoDaysAgo(90) },
      { id: "rate-weekly", code: "WEEKLY", label: "Weekly placement", unit: "weekly", amount: { amountMinor: 180000, currency: "PKR" }, active: true, sortOrder: 3, createdAt: isoDaysAgo(90), updatedAt: isoDaysAgo(90) },
    ],
    createdAt: isoDaysAgo(90), updatedAt: isoDaysAgo(2),
  },
];

export class DemoInventoryFoundationRepository {
  async listSites(search?: string): Promise<InventorySite[]> {
    const q = search?.trim().toLowerCase();
    if (!q) return SITES;
    return SITES.filter((site) => `${site.name} ${site.code} ${site.location.city}`.toLowerCase().includes(q));
  }

  async getSite(id: string): Promise<InventorySite | null> {
    return SITES.find((site) => site.id === id) ?? null;
  }

  async listRateCards(activeOnly = false): Promise<InventoryRateCard[]> {
    return activeOnly ? RATE_CARDS.filter((card) => card.status === "active") : RATE_CARDS;
  }

  async getAvailability(query: InventoryAvailabilityQuery): Promise<InventoryAvailabilityWindow[]> {
    const assets = query.assetId ? ASSETS.filter((a) => a.id === query.assetId) : ASSETS.filter((a) => !query.siteId || a.siteId === query.siteId);
    return assets.map((asset) => ({
      startDate: query.startDate,
      endDate: query.endDate,
      status: asset.operationalStatus === "maintenance" ? "maintenance" : asset.operationalStatus === "offline" ? "blocked" : "available",
      reason: asset.operationalStatus === "offline" ? "Asset is operationally offline" : undefined,
    }));
  }

  async getFoundationSummary(): Promise<InventoryFoundationSummary> {
    return {
      sites: SITES.length,
      assets: ASSETS.length,
      activeAssets: ASSETS.filter((a) => a.operationalStatus === "online").length,
      digitalAssets: ASSETS.filter((a) => a.mediaType === "led_billboard" || a.mediaType === "digital_street_screen").length,
      staticAssets: ASSETS.filter((a) => a.mediaType !== "led_billboard" && a.mediaType !== "digital_street_screen").length,
    };
  }
}
