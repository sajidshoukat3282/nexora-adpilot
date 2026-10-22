import React, { useState } from "react";
import { getDefaultCurrency } from "@/lib/companyDefaults";
import { FIN, ModalTitle } from "../finance/financeUi";
import {
  DIGITAL_KINDS,
  LIGHTING,
  NETWORKS,
  PLAYERS,
  RATE_BASIS,
  RESOLUTIONS,
  STATIC_KINDS,
  type ScreenType,
} from "./inventoryTools";

const CURRENCIES = ["PKR", "USD", "GBP", "EUR", "AED", "CAD", "AUD", "SAR", "QAR", "INR", "CNY", "JPY", "CHF", "ZAR", "TRY"];
const NUMERIC_SPECS = ["width", "height", "pixel_pitch", "loop_seconds", "slot_seconds", "spots", "max_file_mb", "faces", "daily_traffic", "monthly_rent"];

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div>
    <h4 className="mb-2 border-b border-[#22262d] pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#d9b45a]">{title}</h4>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{children}</div>
  </div>
);

const F: React.FC<{ label: string; wide?: boolean; children: React.ReactNode }> = ({ label, wide, children }) => (
  <div className={wide ? "col-span-2 sm:col-span-3" : ""}>
    <label className={FIN.label}>{label}</label>
    {children}
  </div>
);

/** Add a screen / billboard, or edit one when `asset` is given. */
export default function AddInventoryForm({ onClose, asset }: { onClose: () => void; asset?: any }) {
  const editing = !!asset;
  const [type, setType] = useState<ScreenType>(asset?.screenType ?? "digital");
  const [f, setF] = useState<any>({
    name: asset?.name ?? "",
    city: asset?.location?.city && asset.location.city !== "Unknown" ? asset.location.city : "",
    location: asset?.location?.address && asset.location.address !== "No address provided" ? asset.location.address : "",
    latitude: asset?.location?.lat ? String(asset.location.lat) : "",
    longitude: asset?.location?.lng ? String(asset.location.lng) : "",
    rate: asset ? String(asset.pricing.baseDailyRateCents) : "",
    currency: asset?.pricing?.currency ?? getDefaultCurrency(),
    status: asset?.operationalStatus ?? "online",
  });
  const [sp, setSp] = useState<Record<string, any>>({
    kind: "",
    size_unit: "ft",
    resolution: "1920x1080",
    orientation: "landscape",
    rate_basis: "per_day",
    ...(asset?.specs ?? {}),
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const setS = (k: string) => (e: any) => setSp({ ...sp, [k]: e.target.value });
  const setCore = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });
  const kinds = type === "digital" ? DIGITAL_KINDS : STATIC_KINDS;
  const input = (k: string, props: Record<string, any> = {}) => (
    <input className={FIN.input} value={sp[k] ?? ""} onChange={setS(k)} {...props} />
  );
  const select = (k: string, options: (string | { value: string; label: string })[], blank?: string) => (
    <select className={FIN.input} value={sp[k] ?? ""} onChange={setS(k)}>
      {blank !== undefined && <option value="">{blank}</option>}
      {options.map((o) => {
        const v = typeof o === "string" ? o : o.value;
        const l = typeof o === "string" ? o : o.label;
        return (
          <option key={v} value={v}>{l}</option>
        );
      })}
    </select>
  );

  const handleLocationSearch = async () => {
    if (!searchQuery) return;
    setSearching(true);
    setSearchError(null);
    setSearchResults([]);
    try {
      const res = await fetch(`/api/geography/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data.ok) {
        if (data.results && data.results.length > 0) setSearchResults(data.results);
        else setSearchError("No locations found. Try a different search, or type the city and address yourself.");
      } else {
        setSearchError(data.message || "Failed to search location.");
      }
    } catch {
      setSearchError("Network error. Could not connect.");
    } finally {
      setSearching(false);
    }
  };

  const selectLocation = (loc: any) => {
    const lat = loc.coordinates?.latitude || loc.coordinates?.lat || loc.lat || loc.properties?.lat || loc.latitude || "";
    const lng = loc.coordinates?.longitude || loc.coordinates?.lng || loc.lon || loc.longitude || loc.properties?.lon || "";
    let fullAddress = loc.formatted || loc.properties?.formatted || loc.display_name || loc.displayName;
    if (!fullAddress) {
      const parts = [
        loc.areaNeighborhood,
        loc.suburb,
        loc.city || loc.town || loc.village,
        loc.countyDistrict || loc.county,
        loc.stateProvinceRegion || loc.state,
        loc.countryName || loc.country,
      ].filter(Boolean);
      fullAddress = parts.join(", ") || searchQuery;
    }
    const cityName = loc.city || loc.town || loc.village || loc.countyDistrict || loc.properties?.city || loc.address?.city || "";
    setF({ ...f, location: fullAddress, city: cityName || f.city, latitude: String(lat), longitude: String(lng) });
    setSearchResults([]);
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setErr("");
    if (!f.name.trim()) return setErr("Please enter a name.");
    if (!(Number(f.rate) >= 0) || f.rate === "") return setErr("Please enter the rate.");

    const specs: Record<string, any> = { kind: sp.kind || "", size_unit: sp.size_unit || "ft" };
    const digitalKeys = ["resolution", "resolution_custom", "orientation", "pixel_pitch", "loop_seconds", "slot_seconds", "spots", "hours_from", "hours_to", "rate_basis", "formats", "max_file_mb", "player", "device_id", "network", "install_date"];
    const staticKeys = ["faces", "lighting", "facing", "permit_no", "permit_expiry"];
    const commonKeys = ["width", "height", "daily_traffic", "owner_name", "owner_phone", "monthly_rent", "contract_end", "notes"];
    for (const k of [...commonKeys, ...(type === "digital" ? digitalKeys : staticKeys)]) {
      const v = sp[k];
      if (v === undefined || v === null || String(v).trim() === "") continue;
      specs[k] = NUMERIC_SPECS.includes(k) ? Number(v) : String(v).trim();
    }
    if (type === "static") specs.rate_basis = sp.rate_basis === "per_month" ? "per_month" : "per_day";
    const size = specs.width && specs.height ? `${specs.width} x ${specs.height} ${specs.size_unit}` : "";

    setSaving(true);
    try {
      const res = await fetch(editing ? `/api/inventory/${asset.id}` : "/api/inventory", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: f.name.trim(),
          screen_type: type,
          city: f.city.trim(),
          location: f.location.trim(),
          latitude: f.latitude ? Number(f.latitude) : null,
          longitude: f.longitude ? Number(f.longitude) : null,
          size,
          rate: Number(f.rate),
          currency: f.currency,
          status: f.status,
          specs,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok !== false) {
        onClose();
      } else {
        setErr(data.message || "Could not save the screen.");
      }
    } catch {
      setErr("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editing || !window.confirm(`Delete ${asset.name}? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/inventory/${asset.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok !== false) onClose();
      else setErr(data.message || "Could not delete the screen.");
    } catch {
      setErr("Network error. Please try again.");
    }
  };

  return (
    <div className={`${FIN.modal} max-w-3xl`}>
      <ModalTitle>{editing ? "Edit Screen / Billboard" : "Add New Screen / Billboard"}</ModalTitle>

      <form onSubmit={handleSubmit} className="space-y-5">
        {err && <div className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-[12px] text-rose-300">{err}</div>}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={FIN.label}>Screen Name *</label>
            <input required className={FIN.input} value={f.name} onChange={setCore("name")} placeholder="e.g. Gulberg Boulevard Screen" maxLength={120} />
          </div>
          <div>
            <label className={FIN.label}>Screen Type</label>
            <div className="grid grid-cols-2 gap-1.5">
              {(["digital", "static"] as ScreenType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setType(t);
                    setSp({ ...sp, kind: "" });
                  }}
                  className={`rounded-lg border px-3 py-2 text-[12px] font-semibold transition ${
                    type === t
                      ? "border-[#c99b3b]/70 bg-[#c99b3b]/10 text-[#f1d68a]"
                      : "border-[#2b3038] bg-[#0f1216] text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {t === "digital" ? "Digital Screen" : "Static Billboard"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <Section title="Location">
          <div className="col-span-2 sm:col-span-3">
            <label className={FIN.label}>Search Location</label>
            <div className="flex gap-2">
              <input
                className={FIN.input}
                placeholder="e.g. Liberty Market Lahore"
                value={searchQuery}
                onChange={(e: any) => setSearchQuery(e.target.value)}
                onKeyDown={(e: any) => e.key === "Enter" && (e.preventDefault(), handleLocationSearch())}
              />
              <button type="button" onClick={handleLocationSearch} disabled={searching} className={FIN.btnGhost}>
                {searching ? "Searching..." : "Search"}
              </button>
            </div>
            {searchError && <p className="mt-1.5 text-[11px] text-rose-300">{searchError}</p>}
            {searchResults.length > 0 && (
              <div className="mt-1.5 max-h-40 overflow-y-auto rounded-lg border border-[#2b3038] bg-[#0f1216]">
                {searchResults.map((loc: any, i: number) => (
                  <div key={i} onClick={() => selectLocation(loc)} className="cursor-pointer border-b border-[#1d2128] p-2 text-[12px] text-zinc-200 hover:bg-white/5">
                    {loc.formatted || loc.properties?.formatted || loc.display_name || loc.displayName ||
                      [loc.areaNeighborhood, loc.suburb, loc.city, loc.countyDistrict, loc.stateProvinceRegion, loc.countryName].filter(Boolean).join(", ") ||
                      "Select this location"}
                  </div>
                ))}
              </div>
            )}
          </div>
          <F label="City"><input className={FIN.input} value={f.city} onChange={setCore("city")} maxLength={80} /></F>
          <F label="Latitude"><input className={FIN.input} value={f.latitude} onChange={setCore("latitude")} /></F>
          <F label="Longitude"><input className={FIN.input} value={f.longitude} onChange={setCore("longitude")} /></F>
          <F label="Address" wide><input className={FIN.input} value={f.location} onChange={setCore("location")} maxLength={300} /></F>
        </Section>

        <Section title="Size and type">
          <F label={type === "digital" ? "Screen kind" : "Billboard kind"}>{select("kind", kinds, "Choose...")}</F>
          <F label="Width"><input type="number" min="0" step="any" className={FIN.input} value={sp.width ?? ""} onChange={setS("width")} /></F>
          <F label="Height"><input type="number" min="0" step="any" className={FIN.input} value={sp.height ?? ""} onChange={setS("height")} /></F>
          <F label="Unit">{select("size_unit", ["ft", "m", "in"])}</F>
          <F label="Daily traffic (est. impressions)">{input("daily_traffic", { type: "number", min: "0" })}</F>
        </Section>

        {type === "digital" ? (
          <>
            <Section title="Display">
              <F label="Resolution">{select("resolution", RESOLUTIONS)}</F>
              {sp.resolution === "custom" && <F label="Custom resolution">{input("resolution_custom", { placeholder: "e.g. 1536x640" })}</F>}
              <F label="Orientation">{select("orientation", ["landscape", "portrait"])}</F>
              <F label="Pixel pitch (mm, LED only)">{input("pixel_pitch", { type: "number", min: "0", step: "any" })}</F>
            </Section>

            <Section title="Ad slots and pricing">
              <F label="Loop length (seconds)">{input("loop_seconds", { type: "number", min: "0" })}</F>
              <F label="One ad length (seconds)">{input("slot_seconds", { type: "number", min: "0" })}</F>
              <F label="Advertisers per loop">{input("spots", { type: "number", min: "0" })}</F>
              <F label="Runs from">{input("hours_from", { type: "time" })}</F>
              <F label="Runs until">{input("hours_to", { type: "time" })}</F>
              <F label="Rate is">{select("rate_basis", RATE_BASIS)}</F>
            </Section>

            <Section title="Content rules">
              <F label="Accepted formats">{input("formats", { placeholder: "e.g. MP4, JPG" })}</F>
              <F label="Max file size (MB)">{input("max_file_mb", { type: "number", min: "0" })}</F>
            </Section>

            <Section title="Device">
              <F label="Player / CMS">{select("player", PLAYERS, "Choose...")}</F>
              <F label="Device ID">{input("device_id")}</F>
              <F label="Network">{select("network", NETWORKS, "Choose...")}</F>
              <F label="Install date">{input("install_date", { type: "date" })}</F>
            </Section>
          </>
        ) : (
          <>
            <Section title="Billboard details">
              <F label="Faces">{input("faces", { type: "number", min: "1" })}</F>
              <F label="Lighting">{select("lighting", LIGHTING, "Choose...")}</F>
              <F label="Facing (direction / road)">{input("facing", { placeholder: "e.g. towards Mall Road" })}</F>
              <F label="Rate is">{select("rate_basis", RATE_BASIS.filter((r) => r.value !== "per_spot_day"))}</F>
              <F label="Permit / license no.">{input("permit_no")}</F>
              <F label="Permit expires">{input("permit_expiry", { type: "date" })}</F>
            </Section>
          </>
        )}

        <Section title="Owner and contract">
          <F label="Owner / landlord">{input("owner_name")}</F>
          <F label="Owner phone">{input("owner_phone")}</F>
          <F label="Monthly rent you pay">{input("monthly_rent", { type: "number", min: "0", step: "any" })}</F>
          <F label="Contract ends">{input("contract_end", { type: "date" })}</F>
          <F label="Notes" wide>{input("notes", { maxLength: 300 })}</F>
        </Section>

        <Section title="Rate and status">
          <F label="Base Rate *"><input required type="number" min="0" step="any" className={`${FIN.input} font-semibold`} value={f.rate} onChange={setCore("rate")} placeholder="0" /></F>
          <F label="Currency">
            <select className={FIN.input} value={f.currency} onChange={setCore("currency")}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </F>
          <F label="Status">
            <select className={FIN.input} value={f.status} onChange={setCore("status")}>
              <option value="online">Online</option>
              <option value="offline">Offline</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </F>
        </Section>

        <div className="flex items-center justify-between gap-2 border-t border-[#2a2f37] pt-3.5">
          <div>
            {editing && (
              <button type="button" onClick={handleDelete} className={`${FIN.btnText} !text-rose-300`}>Delete</button>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className={FIN.btnText}>Cancel</button>
            <button type="submit" disabled={saving} className={FIN.btnGold}>{saving ? "Saving..." : "Save Screen"}</button>
          </div>
        </div>
      </form>
    </div>
  );
}
