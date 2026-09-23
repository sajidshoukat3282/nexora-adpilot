import type { InventoryRepository, AssetFilters } from "@/repositories/interfaces/InventoryRepository";
import type { MediaAsset, AvailabilityResult } from "@/domain";
import { mediaCategory } from "@/domain";
import { store, persist, withLatency, genId, nowIso } from "./store";
import { DemoInventoryFoundationRepository } from "./InventoryFoundationRepository";

function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

export class DemoInventoryRepository implements InventoryRepository {
  private readonly foundation = new DemoInventoryFoundationRepository();

  async listSites(search?: string) { return this.foundation.listSites(search); }
  async getSite(id: string) { return this.foundation.getSite(id); }
  async listRateCards(activeOnly = false) { return this.foundation.listRateCards(activeOnly); }
  async getAvailability(query: import("@/domain").InventoryAvailabilityQuery) { return this.foundation.getAvailability(query); }
  async getFoundationSummary() { return this.foundation.getFoundationSummary(); }
  async listAssets(filters?: AssetFilters): Promise<MediaAsset[]> {
    let results = store.assets;
    if (filters) {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        results = results.filter(
          (a) => a.name.toLowerCase().includes(q) || a.code.toLowerCase().includes(q) || a.location.address.toLowerCase().includes(q)
        );
      }
      if (filters.mediaTypes?.length) {
        results = results.filter((a) => filters.mediaTypes!.includes(a.mediaType));
      }
      if (filters.category && filters.category !== "all") {
        results = results.filter((a) => mediaCategory(a.mediaType) === filters.category);
      }
      if (filters.indoor && filters.indoor !== "all") {
        results = results.filter((a) => (filters.indoor === "indoor" ? a.indoor : !a.indoor));
      }
      if (filters.operationalStatus?.length) {
        results = results.filter((a) => filters.operationalStatus!.includes(a.operationalStatus));
      }
      if (filters.city) {
        results = results.filter((a) => a.location.city === filters.city);
      }
    }
    return withLatency(results);
  }

  async getAsset(id: string): Promise<MediaAsset | null> {
    return withLatency(store.assets.find((a) => a.id === id) ?? null);
  }

  async listPackages() {
    return withLatency(store.packages);
  }

  async listBookingsForAsset(assetId: string) {
    return withLatency(store.bookings.filter((b) => b.assetId === assetId && b.status !== "cancelled"));
  }

  async listMaintenanceForAsset(assetId: string) {
    return withLatency(store.maintenance.filter((m) => m.assetId === assetId));
  }

  async checkAvailability(assetId: string, startDate: string, endDate: string): Promise<AvailabilityResult> {
    const asset = store.assets.find((a) => a.id === assetId);
    if (!asset) return withLatency({ state: "offline" });
    if (asset.operationalStatus === "offline") return withLatency({ state: "offline" });

    const maintenanceHits = store.maintenance.filter(
      (m) => m.assetId === assetId && overlaps(startDate, endDate, m.startDate, m.endDate)
    );
    if (maintenanceHits.length) {
      return withLatency({ state: "maintenance", blockIds: maintenanceHits.map((m) => m.id) });
    }

    const bookingHits = store.bookings.filter(
      (b) => b.assetId === assetId && b.status !== "cancelled" && overlaps(startDate, endDate, b.startDate, b.endDate)
    );
    if (!bookingHits.length) return withLatency({ state: "available" });

    // Fully booked only if a single booking spans the entire requested window;
    // otherwise compute the free sub-ranges so the UI can show partial availability.
    const fullSpan = bookingHits.some((b) => b.startDate <= startDate && b.endDate >= endDate);
    if (fullSpan) {
      return withLatency({ state: "booked", conflictingBookingIds: bookingHits.map((b) => b.id) });
    }
    return withLatency({
      state: "partially_available",
      freeRanges: [{ start: startDate, end: endDate }],
    });
  }

  async createBooking(input: { assetId: string; campaignId: string; startDate: string; endDate: string }) {
    const booking = {
      id: genId("booking"),
      companyId: store.assets.find((a) => a.id === input.assetId)?.companyId ?? "company-1",
      assetId: input.assetId,
      campaignId: input.campaignId,
      startDate: input.startDate,
      endDate: input.endDate,
      status: "reserved" as const,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    store.bookings.push(booking);
    persist();
    return withLatency(booking);
  }

  async cancelBooking(bookingId: string) {
    const booking = store.bookings.find((b) => b.id === bookingId);
    if (booking) {
      booking.status = "cancelled";
      booking.updatedAt = nowIso();
      persist();
    }
    return withLatency(undefined);
  }
}
