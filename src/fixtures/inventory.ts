import type { MediaAsset, InventoryPackage, AssetBooking, MaintenanceBlock } from "@/domain";
import { COMPANY } from "./company";
import { isoDaysAgo, daysFromNow } from "./helpers";

function asset(input: Omit<MediaAsset, "companyId" | "createdAt" | "updatedAt" | "packageIds">): MediaAsset {
  return {
    ...input,
    companyId: COMPANY.id,
    packageIds: [],
    createdAt: isoDaysAgo(200),
    updatedAt: isoDaysAgo(3),
  };
}

export const ASSETS: MediaAsset[] = [
  asset({
    id: "asset-lhr-01", code: "LHR-MM-014", name: "Gulberg Boulevard LED Tower", mediaType: "led_billboard",
    location: { address: "Main Boulevard, Gulberg III", city: "Lahore", geo: { lat: 31.5074, lng: 74.3453 } },
    indoor: false, dimensions: { widthFt: 40, heightFt: 20 }, resolution: { widthPx: 1920, heightPx: 960 },
    orientation: "landscape", operationalStatus: "online",
    pricing: { baseDailyRateCents: 6500000, premiumTimeMultiplier: 1.3, currency: "PKR" } as any,
    audience: { estimatedDailyImpressions: 182000, trafficNote: "Peak commuter corridor, both directions" },
    photos: ["led_billboard"],
  }),
  asset({
    id: "asset-lhr-02", code: "LHR-MM-021", name: "MM Alam Road Digital Screen", mediaType: "digital_street_screen",
    location: { address: "MM Alam Road", city: "Lahore", geo: { lat: 31.5052, lng: 74.3487 } },
    indoor: false, dimensions: { widthFt: 20, heightFt: 12 }, resolution: { widthPx: 1280, heightPx: 768 },
    orientation: "landscape", operationalStatus: "online",
    pricing: { baseDailyRateCents: 3800000, premiumTimeMultiplier: 1.2, currency: "PKR" } as any,
    audience: { estimatedDailyImpressions: 94000, trafficNote: "High footfall retail strip" },
    photos: ["digital_street"],
  }),
  asset({
    id: "asset-lhr-03", code: "LHR-BB-007", name: "Ferozepur Road Billboard", mediaType: "billboard",
    location: { address: "Ferozepur Road, near Kalma Chowk", city: "Lahore", geo: { lat: 31.4993, lng: 74.3352 } },
    indoor: false, dimensions: { widthFt: 48, heightFt: 24 }, orientation: "landscape", operationalStatus: "online",
    pricing: { baseDailyRateCents: 2800000, premiumTimeMultiplier: 1.0, currency: "PKR" } as any,
    audience: { estimatedDailyImpressions: 121000, trafficNote: "Major arterial road, heavy traffic" },
    photos: ["billboard"],
  }),
  asset({
    id: "asset-lhr-04", code: "LHR-ML-002", name: "Packages Mall Atrium Screen", mediaType: "mall",
    location: { address: "Packages Mall, Walton Road", city: "Lahore", geo: { lat: 31.4808, lng: 74.3573 } },
    indoor: true, dimensions: { widthFt: 16, heightFt: 9 }, resolution: { widthPx: 1920, heightPx: 1080 },
    orientation: "landscape", operationalStatus: "online",
    pricing: { baseDailyRateCents: 4200000, premiumTimeMultiplier: 1.4, currency: "PKR" } as any,
    audience: { estimatedDailyImpressions: 56000, trafficNote: "Premium mall, weekend peak" },
    photos: ["mall_screen"],
  }),
  asset({
    id: "asset-lhr-05", code: "LHR-BS-011", name: "Liberty Chowk Bus Shelter", mediaType: "bus_shelter",
    location: { address: "Liberty Chowk", city: "Lahore", geo: { lat: 31.5060, lng: 74.3436 } },
    indoor: false, dimensions: { widthFt: 6, heightFt: 4 }, orientation: "portrait", operationalStatus: "maintenance",
    pricing: { baseDailyRateCents: 900000, premiumTimeMultiplier: 1.0, currency: "PKR" } as any,
    audience: { estimatedDailyImpressions: 31000, trafficNote: "Transit hub, pedestrian heavy" },
    photos: ["bus_shelter"],
  }),
  asset({
    id: "asset-lhr-06", code: "LHR-AP-001", name: "Allama Iqbal Airport Arrivals", mediaType: "airport",
    location: { address: "Allama Iqbal International Airport", city: "Lahore", geo: { lat: 31.5216, lng: 74.4036 } },
    indoor: true, dimensions: { widthFt: 12, heightFt: 7 }, resolution: { widthPx: 1920, heightPx: 1080 },
    orientation: "landscape", operationalStatus: "online",
    pricing: { baseDailyRateCents: 51000, premiumTimeMultiplier: 1.3, currency: "USD" } as any,
    audience: { estimatedDailyImpressions: 38000, trafficNote: "International arrivals hall" },
    photos: ["airport_screen"],
  }),
  asset({
    id: "asset-khi-01", code: "KHI-MM-030", name: "Shahrah-e-Faisal LED Tower", mediaType: "led_billboard",
    location: { address: "Shahrah-e-Faisal, near Metropole", city: "Karachi", geo: { lat: 24.8657, lng: 67.0508 } },
    indoor: false, dimensions: { widthFt: 45, heightFt: 22 }, resolution: { widthPx: 1920, heightPx: 960 },
    orientation: "landscape", operationalStatus: "online",
    pricing: { baseDailyRateCents: 7200000, premiumTimeMultiplier: 1.3, currency: "PKR" } as any,
    audience: { estimatedDailyImpressions: 210000, trafficNote: "Main commercial artery" },
    photos: ["led_billboard"],
  }),
  asset({
    id: "asset-khi-02", code: "KHI-MM-041", name: "Clifton Beachfront Digital Screen", mediaType: "digital_street_screen",
    location: { address: "Do Darya, Clifton", city: "Karachi", geo: { lat: 24.8138, lng: 67.0299 } },
    indoor: false, dimensions: { widthFt: 22, heightFt: 12 }, resolution: { widthPx: 1280, heightPx: 768 },
    orientation: "landscape", operationalStatus: "online",
    pricing: { baseDailyRateCents: 4000000, premiumTimeMultiplier: 1.2, currency: "PKR" } as any,
    audience: { estimatedDailyImpressions: 87000, trafficNote: "Weekend leisure destination" },
    photos: ["digital_street"],
  }),
  asset({
    id: "asset-khi-03", code: "KHI-BB-014", name: "II Chundrigar Road Billboard", mediaType: "billboard",
    location: { address: "I.I. Chundrigar Road", city: "Karachi", geo: { lat: 24.8508, lng: 66.9928 } },
    indoor: false, dimensions: { widthFt: 50, heightFt: 25 }, orientation: "landscape", operationalStatus: "online",
    pricing: { baseDailyRateCents: 3400000, premiumTimeMultiplier: 1.0, currency: "PKR" } as any,
    audience: { estimatedDailyImpressions: 143000, trafficNote: "Financial district, weekday peak" },
    photos: ["billboard"],
  }),
  asset({
    id: "asset-khi-04", code: "KHI-ML-006", name: "Dolmen Mall Clifton Screen", mediaType: "mall",
    location: { address: "Dolmen Mall, Clifton", city: "Karachi", geo: { lat: 24.8210, lng: 67.0280 } },
    indoor: true, dimensions: { widthFt: 18, heightFt: 10 }, resolution: { widthPx: 1920, heightPx: 1080 },
    orientation: "landscape", operationalStatus: "online",
    pricing: { baseDailyRateCents: 4500000, premiumTimeMultiplier: 1.4, currency: "PKR" } as any,
    audience: { estimatedDailyImpressions: 68000, trafficNote: "Premium mall, family weekend traffic" },
    photos: ["mall_screen"],
  }),
  asset({
    id: "asset-khi-05", code: "KHI-TR-009", name: "Karachi BRT Green Line Wrap", mediaType: "vehicle_transit",
    location: { address: "Green Line BRT Corridor", city: "Karachi", geo: { lat: 24.9020, lng: 67.0850 } },
    indoor: false, dimensions: { widthFt: 30, heightFt: 8 }, orientation: "landscape", operationalStatus: "online",
    pricing: { baseDailyRateCents: 1600000, premiumTimeMultiplier: 1.0, currency: "PKR" } as any,
    audience: { estimatedDailyImpressions: 45000, trafficNote: "High-frequency transit route" },
    photos: ["transit"],
  }),
  asset({
    id: "asset-khi-06", code: "KHI-WS-003", name: "Tariq Road Wallscape", mediaType: "wallscape",
    location: { address: "Tariq Road", city: "Karachi", geo: { lat: 24.8735, lng: 67.0563 } },
    indoor: false, dimensions: { widthFt: 60, heightFt: 40 }, orientation: "portrait", operationalStatus: "online",
    pricing: { baseDailyRateCents: 2200000, premiumTimeMultiplier: 1.0, currency: "PKR" } as any,
    audience: { estimatedDailyImpressions: 76000, trafficNote: "Dense retail corridor" },
    photos: ["wallscape"],
  }),
  asset({
    id: "asset-isb-01", code: "ISB-MM-018", name: "Jinnah Avenue LED Tower", mediaType: "led_billboard",
    location: { address: "Jinnah Avenue, Blue Area", city: "Islamabad", geo: { lat: 33.7089, lng: 73.0563 } },
    indoor: false, dimensions: { widthFt: 38, heightFt: 19 }, resolution: { widthPx: 1920, heightPx: 960 },
    orientation: "landscape", operationalStatus: "online",
    pricing: { baseDailyRateCents: 5800000, premiumTimeMultiplier: 1.3, currency: "PKR" } as any,
    audience: { estimatedDailyImpressions: 96000, trafficNote: "Central business district" },
    photos: ["led_billboard"],
  }),
  asset({
    id: "asset-isb-02", code: "ISB-MM-025", name: "Blue Area Digital Screen", mediaType: "digital_street_screen",
    location: { address: "Blue Area", city: "Islamabad", geo: { lat: 33.7104, lng: 73.0497 } },
    indoor: false, dimensions: { widthFt: 20, heightFt: 11 }, resolution: { widthPx: 1280, heightPx: 768 },
    orientation: "landscape", operationalStatus: "offline",
    pricing: { baseDailyRateCents: 3500000, premiumTimeMultiplier: 1.2, currency: "PKR" } as any,
    audience: { estimatedDailyImpressions: 61000, trafficNote: "Office district, weekday peak" },
    photos: ["digital_street"],
  }),
  asset({
    id: "asset-isb-03", code: "ISB-BB-005", name: "Faizabad Interchange Billboard", mediaType: "billboard",
    location: { address: "Faizabad Interchange", city: "Islamabad", geo: { lat: 33.6693, lng: 73.0763 } },
    indoor: false, dimensions: { widthFt: 46, heightFt: 23 }, orientation: "landscape", operationalStatus: "online",
    pricing: { baseDailyRateCents: 3100000, premiumTimeMultiplier: 1.0, currency: "PKR" } as any,
    audience: { estimatedDailyImpressions: 158000, trafficNote: "Twin-city gateway interchange" },
    photos: ["billboard"],
  }),
  asset({
    id: "asset-isb-04", code: "ISB-ML-003", name: "Centaurus Mall Screen", mediaType: "mall",
    location: { address: "The Centaurus, F-8", city: "Islamabad", geo: { lat: 33.7089, lng: 73.0645 } },
    indoor: true, dimensions: { widthFt: 17, heightFt: 9 }, resolution: { widthPx: 1920, heightPx: 1080 },
    orientation: "landscape", operationalStatus: "online",
    pricing: { baseDailyRateCents: 4400000, premiumTimeMultiplier: 1.4, currency: "PKR" } as any,
    audience: { estimatedDailyImpressions: 51000, trafficNote: "Premium retail & office tower" },
    photos: ["mall_screen"],
  }),
  asset({
    id: "asset-isb-05", code: "ISB-AP-002", name: "Islamabad Airport Departures", mediaType: "airport",
    location: { address: "Islamabad International Airport", city: "Islamabad", geo: { lat: 33.5490, lng: 72.8250 } },
    indoor: true, dimensions: { widthFt: 14, heightFt: 8 }, resolution: { widthPx: 1920, heightPx: 1080 },
    orientation: "landscape", operationalStatus: "online",
    pricing: { baseDailyRateCents: 55000, premiumTimeMultiplier: 1.3, currency: "USD" } as any,
    audience: { estimatedDailyImpressions: 42000, trafficNote: "Departures hall, business travellers" },
    photos: ["airport_screen"],
  }),
  asset({
    id: "asset-isb-06", code: "ISB-SF-008", name: "F-7 Markaz Street Furniture", mediaType: "street_furniture",
    location: { address: "F-7 Markaz", city: "Islamabad", geo: { lat: 33.7180, lng: 73.0563 } },
    indoor: false, dimensions: { widthFt: 5, heightFt: 3.5 }, orientation: "portrait", operationalStatus: "online",
    pricing: { baseDailyRateCents: 850000, premiumTimeMultiplier: 1.0, currency: "PKR" } as any,
    audience: { estimatedDailyImpressions: 24000, trafficNote: "Upscale neighbourhood market" },
    photos: ["street_furniture"],
  }),
];

export const PACKAGES: InventoryPackage[] = [
  {
    id: "package-metro-3", companyId: COMPANY.id, name: "Metro Triple", description: "One LED billboard in each of Lahore, Karachi and Islamabad.",
    assetIds: ["asset-lhr-01", "asset-khi-01", "asset-isb-01"], discountPct: 12,
    createdAt: isoDaysAgo(120), updatedAt: isoDaysAgo(120),
  },
  {
    id: "package-mall-bundle", companyId: COMPANY.id, name: "Premium Mall Bundle", description: "Indoor mall screens across all three cities.",
    assetIds: ["asset-lhr-04", "asset-khi-04", "asset-isb-04"], discountPct: 15,
    createdAt: isoDaysAgo(100), updatedAt: isoDaysAgo(100),
  },
];

export const BOOKINGS: AssetBooking[] = [
  { id: "booking-1", companyId: COMPANY.id, assetId: "asset-lhr-01", campaignId: "campaign-1", startDate: daysFromNow(-10), endDate: daysFromNow(20), status: "confirmed", createdAt: isoDaysAgo(15), updatedAt: isoDaysAgo(15) },
  { id: "booking-2", companyId: COMPANY.id, assetId: "asset-khi-01", campaignId: "campaign-1", startDate: daysFromNow(-10), endDate: daysFromNow(20), status: "confirmed", createdAt: isoDaysAgo(15), updatedAt: isoDaysAgo(15) },
  { id: "booking-3", companyId: COMPANY.id, assetId: "asset-lhr-02", campaignId: "campaign-2", startDate: daysFromNow(-5), endDate: daysFromNow(10), status: "confirmed", createdAt: isoDaysAgo(12), updatedAt: isoDaysAgo(12) },
  { id: "booking-4", companyId: COMPANY.id, assetId: "asset-isb-03", campaignId: "campaign-3", startDate: daysFromNow(5), endDate: daysFromNow(35), status: "reserved", createdAt: isoDaysAgo(3), updatedAt: isoDaysAgo(3) },
  { id: "booking-5", companyId: COMPANY.id, assetId: "asset-khi-04", campaignId: "campaign-4", startDate: daysFromNow(-30), endDate: daysFromNow(-2), status: "completed", createdAt: isoDaysAgo(35), updatedAt: isoDaysAgo(2) },
];

export const MAINTENANCE_BLOCKS: MaintenanceBlock[] = [
  { id: "maint-1", companyId: COMPANY.id, assetId: "asset-lhr-05", startDate: daysFromNow(-2), endDate: daysFromNow(4), reason: "Panel replacement after storm damage", createdAt: isoDaysAgo(2), updatedAt: isoDaysAgo(2) },
];

export function assetById(id: string): MediaAsset | undefined {
  return ASSETS.find((a) => a.id === id);
}
