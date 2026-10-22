import { getDefaultCurrency } from "@/lib/companyDefaults";

export type ScreenType = "digital" | "static";

export const DIGITAL_KINDS: { value: string; label: string }[] = [
  { value: "led_billboard", label: "LED billboard" },
  { value: "lcd_indoor", label: "LCD / indoor screen" },
  { value: "mall_airport", label: "Mall or airport screen" },
  { value: "bus_shelter_digital", label: "Digital bus shelter" },
  { value: "kiosk_lift", label: "Lift / kiosk screen" },
  { value: "video_wall", label: "Video wall" },
];

export const STATIC_KINDS: { value: string; label: string }[] = [
  { value: "unipole", label: "Unipole" },
  { value: "hoarding", label: "Hoarding" },
  { value: "gantry", label: "Gantry" },
  { value: "bridge_panel", label: "Bridge panel" },
  { value: "wall_wrap", label: "Wall wrap" },
  { value: "bus_shelter", label: "Bus shelter" },
  { value: "other", label: "Other" },
];

export const kindLabel = (type: ScreenType, kind?: string): string =>
  [...DIGITAL_KINDS, ...STATIC_KINDS].find((k) => k.value === kind)?.label ?? (type === "digital" ? "Digital screen" : "Static billboard");

export const RESOLUTIONS = ["1920x1080", "1080x1920", "3840x2160", "1280x720", "960x540", "custom"];
export const PLAYERS = ["Broadsign", "Xibo", "Scala", "Android box", "Raspberry Pi", "Other"];
export const NETWORKS = ["4G / SIM", "WiFi", "LAN cable", "Offline (USB)"];
export const LIGHTING = ["Front lit", "Back lit", "Non-lit"];
export const RATE_BASIS: { value: string; label: string }[] = [
  { value: "per_day", label: "Per day" },
  { value: "per_month", label: "Per month" },
  { value: "per_spot_day", label: "Per spot, per day" },
];

export const parseSpecs = (raw: unknown): Record<string, any> => {
  if (!raw) return {};
  if (typeof raw === "object") return raw as Record<string, any>;
  try {
    const v = JSON.parse(String(raw));
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
};

/** Turn a row from /api/inventory into the asset shape the page, map and drawer use. */
export function mapInventory(item: any): any {
  const specs = parseSpecs(item.specs);
  const type: ScreenType = item.screen_type === "static" ? "static" : "digital";
  const w = Number(specs.width);
  const h = Number(specs.height);
  const lat = Number(item.latitude) || 0;
  const lng = Number(item.longitude) || 0;
  return {
    id: item.id,
    name: item.name,
    code: `INV-${String(item.id).substring(0, 4).toUpperCase()}`,
    mediaType: type === "digital" ? "led_billboard" : "billboard",
    screenType: type,
    kind: specs.kind,
    kindLabel: kindLabel(type, specs.kind),
    specs,
    rawSize: item.size || "",
    location: {
      city: item.city || "Unknown",
      address: item.location || "No address provided",
      lat,
      lng,
      geo: { lat, lng },
    },
    pricing: {
      baseDailyRateCents: item.rate || 0,
      currency: item.currency || getDefaultCurrency(),
      premiumTimeMultiplier: 1,
      basis: specs.rate_basis || "per_day",
    },
    dimensions: { widthFt: w > 0 ? w : "--", heightFt: h > 0 ? h : "--", unit: specs.size_unit || "ft" },
    audience: {
      estimatedDailyImpressions: Number(specs.daily_traffic) || 0,
      trafficNote: "",
    },
    operationalStatus: item.status || "online",
  };
}

export const rateSuffix = (basis?: string): string =>
  basis === "per_month" ? "/month" : basis === "per_spot_day" ? "/spot/day" : "/day";

/** Short list of "label: value" lines for the detail drawer. */
export function specLines(asset: any): { label: string; value: string }[] {
  const s = asset?.specs ?? {};
  const out: { label: string; value: string }[] = [];
  const add = (label: string, value: unknown, suffix = "") => {
    if (value !== undefined && value !== null && String(value).trim() !== "") out.push({ label, value: `${value}${suffix}` });
  };
  add("Type", asset?.kindLabel);
  if (asset?.screenType === "digital") {
    add("Resolution", s.resolution === "custom" ? s.resolution_custom : s.resolution);
    add("Orientation", s.orientation);
    add("Pixel pitch", s.pixel_pitch, " mm");
    add("Loop", s.loop_seconds, " sec");
    add("Ad length", s.slot_seconds, " sec");
    add("Advertisers per loop", s.spots);
    if (s.hours_from || s.hours_to) add("Runs", `${s.hours_from || "?"} to ${s.hours_to || "?"}`);
    add("Content formats", s.formats);
    add("Max file size", s.max_file_mb, " MB");
    add("Player / CMS", s.player);
    add("Device ID", s.device_id);
    add("Network", s.network);
    add("Installed", s.install_date);
  } else {
    add("Faces", s.faces);
    add("Lighting", s.lighting);
    add("Facing", s.facing);
    add("Permit no.", s.permit_no);
    add("Permit expires", s.permit_expiry);
  }
  add("Owner / landlord", s.owner_name);
  add("Owner phone", s.owner_phone);
  add("Monthly rent", s.monthly_rent);
  add("Contract ends", s.contract_end);
  add("Notes", s.notes);
  return out;
}

/** Days until an ISO date (negative when past); null when empty / invalid. */
export function daysUntil(iso?: string, now = new Date()): number | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const d = new Date(iso + "T00:00:00Z").getTime();
  const t = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((d - t) / 86400000);
}
