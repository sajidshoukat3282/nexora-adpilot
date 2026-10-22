import React, { useEffect, useState } from "react";
import { FDrawer, FIN, SectionTitle } from "../finance/financeUi";
import { PermissionGate } from "@/components/ui/PermissionGate";
import { daysUntil, rateSuffix, specLines } from "./inventoryTools";
import { screenCapacity } from "../campaigns/campaignTools";

const STATUS_CLS: Record<string, string> = {
  online: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  offline: "border-rose-400/30 bg-rose-400/10 text-rose-300",
  maintenance: "border-violet-400/30 bg-violet-400/10 text-violet-300",
};
const PILL = "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize";

export const AssetDetailDrawer: React.FC<{
  asset: any | null;
  onClose: () => void;
  onEdit?: (asset: any) => void;
}> = ({ asset, onClose, onEdit }) => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [checking, setChecking] = useState(false);
  const [avail, setAvail] = useState<{ free: boolean; conflicts: any[]; capacity: number; freeSlots: number; bookings: any[] } | null>(null);
  const [slots, setSlots] = useState(1);
  const capacity = asset ? screenCapacity(asset.screenType, asset.specs ? JSON.stringify(asset.specs) : null) : 1;
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [adding, setAdding] = useState(false);
  const [addMsg, setAddMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [conflicts, setConflicts] = useState<any[] | null>(null);

  const [weather, setWeather] = useState<any>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  const lat = asset?.location?.lat;
  const lng = asset?.location?.lng;

  useEffect(() => {
    setAvail(null);
    setAddMsg(null);
    setConflicts(null);
    setSelectedCampaignId("");
    if (!asset) return;
    fetch("/api/campaigns")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setCampaigns((d.data || []).filter((c: any) => c.status !== "cancelled" && c.status !== "completed"));
      })
      .catch(() => setCampaigns([]));
  }, [asset?.id]);

  useEffect(() => {
    if (asset && lat && lng && lat !== 0 && lng !== 0) {
      setWeatherLoading(true);
      fetch(`/api/weather?lat=${lat}&lng=${lng}&geographyId=${asset.id}&label=${encodeURIComponent(asset.name)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.ok) setWeather(data.weather);
        })
        .catch(() => undefined)
        .finally(() => setWeatherLoading(false));
    } else {
      setWeather(null);
    }
  }, [asset, lat, lng]);

  async function checkAvailability() {
    if (!asset || !startDate || !endDate) return;
    setChecking(true);
    setAvail(null);
    try {
      const res = await fetch("/api/campaigns/check-availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inventory_ids: [asset.id], start_date: startDate, end_date: endDate, slots: { [asset.id]: slots } }),
      });
      const d = await res.json();
      if (d.ok) {
        const sc = (d.screens || [])[0];
        setAvail({
          free: sc ? sc.fits : (d.conflicts || []).length === 0,
          conflicts: d.conflicts || [],
          capacity: sc?.capacity ?? 1,
          freeSlots: sc?.free ?? 0,
          bookings: sc?.bookings ?? [],
        });
      }
      else alert(d.message || "Could not check availability.");
    } catch {
      alert("Network error.");
    } finally {
      setChecking(false);
    }
  }

  async function addToCampaign(force = false) {
    if (!asset || !selectedCampaignId) return;
    setAdding(true);
    setAddMsg(null);
    try {
      const res = await fetch(`/api/campaigns/${selectedCampaignId}/screens`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inventory_id: asset.id, slots, force }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.ok) {
        setConflicts(null);
        setAddMsg({ ok: true, text: d.message || "Added." });
      } else if (d.error === "CONFLICT") {
        setConflicts(d.conflicts || []);
        setAddMsg({ ok: false, text: d.message });
      } else {
        setConflicts(null);
        setAddMsg({ ok: false, text: d.message || "Could not add the screen." });
      }
    } catch {
      setAddMsg({ ok: false, text: "Network error." });
    } finally {
      setAdding(false);
    }
  }

  const lines = asset ? specLines(asset) : [];
  const permitDays = daysUntil(asset?.specs?.permit_expiry);
  const contractDays = daysUntil(asset?.specs?.contract_end);
  const warn = (label: string, d: number | null) =>
    d === null || d > 30 ? null : (
      <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-[11px] text-amber-300">
        {label} {d < 0 ? `expired ${-d} days ago` : d === 0 ? "expires today" : `expires in ${d} days`}.
      </div>
    );

  return (
    <FDrawer open={!!asset} onClose={onClose} title={asset?.name ?? ""} subtitle={asset?.code}>
      {asset && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`${PILL} ${STATUS_CLS[asset.operationalStatus] ?? "border-zinc-500/30 text-zinc-400"}`}>{asset.operationalStatus || "online"}</span>
            <span className={`${PILL} border-sky-400/30 bg-sky-400/10 text-sky-300`}>{asset.screenType === "digital" ? "Digital" : "Static"}</span>
            {weatherLoading ? (
              <span className="text-[11px] text-zinc-500">Loading weather...</span>
            ) : weather ? (
              <span className={`${PILL} !normal-case border-[#2b3038] text-zinc-300`}>
                {weather?.current?.temp_c || weather?.temperature || "--"}{"\u{B0}"}C - {weather?.current?.condition?.text || weather?.condition || "Clear"}
              </span>
            ) : null}
            {onEdit && (
              <PermissionGate permission="inventory.manage" fallback={null}>
                <button className={`${FIN.btnGhost} ml-auto !px-2.5 !py-1`} onClick={() => onEdit(asset)}>Edit</button>
              </PermissionGate>
            )}
          </div>

          {warn("Permit", permitDays)}
          {warn("Contract with the owner", contractDays)}

          <div className={`${FIN.panel} divide-y divide-[#1d2128] p-1`}>
            <div className="flex justify-between gap-3 px-3 py-2 text-[12px]">
              <span className="text-zinc-500">Address</span>
              <span className="text-right text-zinc-200">{asset.location.address}, {asset.location.city}</span>
            </div>
            <div className="flex justify-between gap-3 px-3 py-2 text-[12px]">
              <span className="text-zinc-500">Size</span>
              <span className="text-zinc-200">
                {asset.dimensions.widthFt !== "--" ? `${asset.dimensions.widthFt} x ${asset.dimensions.heightFt} ${asset.dimensions.unit}` : asset.rawSize || "Not set"}
              </span>
            </div>
            <div className="flex justify-between gap-3 px-3 py-2 text-[12px]">
              <span className="text-zinc-500">Rate</span>
              <span className="font-semibold text-[#f1d68a]">
                {asset.pricing.currency} {Number(asset.pricing.baseDailyRateCents).toLocaleString("en-US")}{rateSuffix(asset.pricing.basis)}
              </span>
            </div>
            <div className="flex justify-between gap-3 px-3 py-2 text-[12px]">
              <span className="text-zinc-500">Daily traffic</span>
              <span className="text-zinc-200">
                {asset.audience.estimatedDailyImpressions > 0 ? `${asset.audience.estimatedDailyImpressions.toLocaleString("en-US")} est. impressions` : "Not set"}
              </span>
            </div>
          </div>

          {lines.length > 0 && (
            <div>
              <div className="mb-2"><SectionTitle>Details</SectionTitle></div>
              <div className={`${FIN.panel} divide-y divide-[#1d2128] p-1`}>
                {lines.map((l) => (
                  <div key={l.label} className="flex justify-between gap-3 px-3 py-1.5 text-[12px]">
                    <span className="text-zinc-500">{l.label}</span>
                    <span className="text-right text-zinc-200">{l.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <section className={`${FIN.panel} p-3`}>
            <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400">Check Availability</h4>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className={FIN.label}>From</label>
                <input type="date" className={FIN.input} value={startDate} onChange={(e: any) => setStartDate(e.target.value)} />
              </div>
              <div className="flex-1">
                <label className={FIN.label}>To</label>
                <input type="date" className={FIN.input} value={endDate} onChange={(e: any) => setEndDate(e.target.value)} />
              </div>
              <button className={FIN.btnGhost} disabled={!startDate || !endDate || checking} onClick={checkAvailability}>
                {checking ? "..." : "Check"}
              </button>
            </div>
            {capacity > 1 && (
              <div className="mt-2 flex items-center gap-2">
                <label className="text-[11px] text-zinc-400">Slots needed</label>
                <select className="rounded border border-[#2b3038] bg-[#0f1216] px-1.5 py-1 text-[12px] text-zinc-100" value={slots} onChange={(e: any) => { setSlots(Number(e.target.value)); setAvail(null); }}>
                  {Array.from({ length: capacity }, (_, k) => k + 1).map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
                <span className="text-[10px] text-zinc-500">of {capacity} advertiser slots</span>
              </div>
            )}
            {avail && avail.free && (
              <p className="mt-2 text-[12px] text-emerald-300">
                Available for these dates.{avail.capacity > 1 ? ` ${avail.freeSlots} of ${avail.capacity} slots free.` : ""}
              </p>
            )}
            {avail && !avail.free && (
              <div className="mt-2 space-y-1">
                <p className="text-[12px] text-rose-300">
                  {avail.capacity > 1 ? `Only ${avail.freeSlots} of ${avail.capacity} slots free (you need ${slots}).` : "Already booked:"}
                </p>
                {avail.bookings.map((c: any, i: number) => (
                  <p key={i} className="text-[11px] text-zinc-400">
                    {c.campaign_name} ({c.start_date} to {c.end_date}){avail.capacity > 1 ? `, ${c.slots} slot${c.slots === 1 ? "" : "s"}` : ""}
                  </p>
                ))}
              </div>
            )}
          </section>

          <PermissionGate permission="inventory.manage" action="add inventory to a campaign">
            <section className={`${FIN.panel} p-3`}>
              <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400">Add to Campaign</h4>
              <div className="flex items-center gap-2">
                <select className={FIN.input} value={selectedCampaignId} onChange={(e: any) => setSelectedCampaignId(e.target.value)}>
                  <option value="">Select campaign...</option>
                  {campaigns.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <button className={FIN.btnGold} disabled={!selectedCampaignId || adding} onClick={() => addToCampaign(false)}>
                  Add
                </button>
              </div>
              {addMsg && <p className={`mt-2 text-[12px] ${addMsg.ok ? "text-emerald-300" : "text-rose-300"}`}>{addMsg.text}</p>}
              {conflicts && conflicts.length > 0 && (
                <div className="mt-2 space-y-1">
                  {conflicts.map((c: any, i: number) => (
                    <p key={i} className="text-[11px] text-zinc-400">{c.campaign_name} ({c.start_date} to {c.end_date})</p>
                  ))}
                  <button className={`${FIN.btnGhost} mt-1`} onClick={() => addToCampaign(true)}>Add anyway</button>
                </div>
              )}
            </section>
          </PermissionGate>
        </div>
      )}
    </FDrawer>
  );
};
