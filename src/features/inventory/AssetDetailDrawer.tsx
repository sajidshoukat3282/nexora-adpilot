import React, { useState, useEffect } from "react";
import { FiMapPin, FiMonitor, FiDollarSign, FiUsers, FiPlus, FiCloud } from "react-icons/fi";
import { Drawer } from "@/components/ui/Drawer";
import { StatusBadge, assetOperationalTone } from "@/components/ui/StatusBadge";
import { PermissionGate } from "@/components/ui/PermissionGate";
import { useAsync } from "@/hooks/useAsync";
import { repo } from "@/repositories/demo";
import type { MediaAsset, AvailabilityResult } from "@/domain";
import { MEDIA_TYPE_LABELS, mediaCategory, formatMoney, money } from "@/domain";

export const AssetDetailDrawer: React.FC<{ asset: MediaAsset | null; onClose: () => void }> = ({ asset, onClose }) => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<AvailabilityResult | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [adding, setAdding] = useState(false);
  const [addedMsg, setAddedMsg] = useState<string | null>(null);
  
  // Weather States
  const [weather, setWeather] = useState<any>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  const campaigns = useAsync(() => repo.campaigns.listCampaigns(), [asset?.id]);

  const safeDimensions = (asset as any)?.dimensions || { widthFt: "--", heightFt: "--" };
  const safeAudience = (asset as any)?.audience || { estimatedDailyImpressions: 0, trafficNote: "" };
  const safePricing = (asset as any)?.pricing || { baseDailyRateCents: 0, premiumTimeMultiplier: 1, currency: 'PKR' };
  const lat = (asset as any)?.location?.lat;
  const lng = (asset as any)?.location?.lng;

  // Fetch Weather when asset changes
  useEffect(() => {
    if (asset && lat && lng && lat !== 0 && lng !== 0) {
      setWeatherLoading(true);
      fetch(`/api/weather?lat=${lat}&lng=${lng}&geographyId=${asset.id}&label=${encodeURIComponent(asset.name)}`)
        .then(res => res.json())
        .then(data => {
          if (data.ok) setWeather(data.weather);
        })
        .catch(err => console.error("Weather error:", err))
        .finally(() => setWeatherLoading(false));
    } else {
      setWeather(null);
    }
  }, [asset, lat, lng]);

  async function checkAvailability() {
    if (!asset || !startDate || !endDate) return;
    setChecking(true);
    setResult(null);
    try {
      const r = await repo.inventory.checkAvailability(asset.id, startDate, endDate);
      setResult(r);
    } catch (e) {
      alert("Availability check requires demo data.");
    } finally {
      setChecking(false);
    }
  }

  return (
    <Drawer open={!!asset} onClose={onClose} title={asset?.name ?? ""} subtitle={(asset as any)?.code}>
      {asset && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge label={asset.operationalStatus || 'online'} tone={assetOperationalTone(asset.operationalStatus)} />
            <StatusBadge label={mediaCategory(asset.mediaType) === "digital" ? "Digital" : "Static"} tone="cyan" dot={false} />
            
            {/* WEATHER WIDGET */}
            {weatherLoading ? (
              <span className="text-xs text-gray-400">Loading weather...</span>
            ) : weather ? (
              <span className="text-xs bg-blue-900/50 text-blue-200 px-2 py-1 rounded flex items-center gap-1 border border-blue-700/50">
                <FiCloud /> {weather.current?.temp_c || weather.temperature || '--'}°C · {weather.current?.condition?.text || weather.condition || 'Clear'}
              </span>
            ) : null}
          </div>

          <section className="space-y-3">
            <div className="flex items-start gap-2.5 text-sm">
              <FiMapPin className="text-ink-500 mt-0.5 shrink-0" size={15} />
              <div>
                <div className="text-ink-100">{asset.location?.address || "Location not specified"}</div>
                <div className="text-ink-500 text-xs">{asset.location?.city || "Unknown City"} · Outdoor</div>
              </div>
            </div>
            <div className="flex items-start gap-2.5 text-sm">
              <FiMonitor className="text-ink-500 mt-0.5 shrink-0" size={15} />
              <div className="text-ink-300">{safeDimensions.widthFt}ft × {safeDimensions.heightFt}ft</div>
            </div>
            <div className="flex items-start gap-2.5 text-sm">
              <FiDollarSign className="text-ink-500 mt-0.5 shrink-0" size={15} />
              <div className="text-ink-300">{formatMoney(money(safePricing.baseDailyRateCents, safePricing.currency))}/day</div>
            </div>
            <div className="flex items-start gap-2.5 text-sm">
              <FiUsers className="text-ink-500 mt-0.5 shrink-0" size={15} />
              <div className="text-ink-300">{safeAudience.estimatedDailyImpressions.toLocaleString()} est. daily impressions</div>
            </div>
          </section>

          <section className="panel p-4">
            <h4 className="text-xs font-bold uppercase tracking-wide text-ink-400 mb-3">Check Availability</h4>
            <div className="flex items-end gap-2 mb-3">
              <div className="flex-1">
                <label className="label text-xs text-gray-500">From</label>
                <input type="date" className="w-full bg-[#1e293b] border border-gray-600 rounded p-2 text-sm text-white" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="flex-1">
                <label className="label text-xs text-gray-500">To</label>
                <input type="date" className="w-full bg-[#1e293b] border border-gray-600 rounded p-2 text-sm text-white" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
              <button className="bg-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-600 disabled:opacity-50" disabled={!startDate || !endDate || checking} onClick={checkAvailability}>
                {checking ? "..." : "Check"}
              </button>
            </div>
          </section>

          <PermissionGate permission="inventory.manage" action="add inventory to a campaign">
            <section className="panel p-4">
              <h4 className="text-xs font-bold uppercase tracking-wide text-ink-400 mb-3">Add to Campaign</h4>
              <div className="flex items-center gap-2">
                <select className="w-full bg-[#1e293b] border border-gray-600 rounded p-2 text-sm text-white" value={selectedCampaignId} onChange={(e) => setSelectedCampaignId(e.target.value)}>
                  <option value="">Select campaign...</option>
                  {campaigns.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button className="bg-blue-600 px-4 py-2 rounded text-sm hover:bg-blue-500 disabled:opacity-50" disabled={!selectedCampaignId || adding}>
                  <FiPlus size={14} /> Add
                </button>
              </div>
            </div>
            </section>
          </PermissionGate>
        </div>
      )}
    </Drawer>
  );
};
