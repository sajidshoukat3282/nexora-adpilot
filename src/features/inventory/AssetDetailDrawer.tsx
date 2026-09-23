import React, { useState } from "react";
import { FiMapPin, FiMonitor, FiDollarSign, FiUsers, FiPlus } from "react-icons/fi";
import { Drawer } from "@/components/ui/Drawer";
import { StatusBadge, assetOperationalTone } from "@/components/ui/StatusBadge";
import { PermissionGate } from "@/components/ui/PermissionGate";
import { useAsync } from "@/hooks/useAsync";
import { repo } from "@/repositories/demo";
import type { MediaAsset, AvailabilityResult } from "@/domain";
import { MEDIA_TYPE_LABELS, mediaCategory, formatMoney, money } from "@/domain";

function availabilityDisplay(result: AvailabilityResult): { label: string; tone: "green" | "amber" | "red" | "violet" | "slate" } {
  switch (result.state) {
    case "available": return { label: "Available for these dates", tone: "green" };
    case "partially_available": return { label: "Partially available", tone: "amber" };
    case "booked": return { label: "Fully booked for this range", tone: "red" };
    case "maintenance": return { label: "Under maintenance during this range", tone: "violet" };
    case "offline": return { label: "Asset is offline", tone: "slate" };
  }
}

export const AssetDetailDrawer: React.FC<{ asset: MediaAsset | null; onClose: () => void }> = ({ asset, onClose }) => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<AvailabilityResult | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [adding, setAdding] = useState(false);
  const [addedMsg, setAddedMsg] = useState<string | null>(null);

  const campaigns = useAsync(() => repo.campaigns.listCampaigns(), [asset?.id]);

  async function checkAvailability() {
    if (!asset || !startDate || !endDate) return;
    setChecking(true);
    setResult(null);
    try {
      const r = await repo.inventory.checkAvailability(asset.id, startDate, endDate);
      setResult(r);
    } finally {
      setChecking(false);
    }
  }

  async function addToCampaign() {
    if (!asset || !selectedCampaignId) return;
    setAdding(true);
    setAddedMsg(null);
    try {
      const campaign = await repo.campaigns.addAssetToCampaign(selectedCampaignId, asset.id);
      setAddedMsg(`Added to "${campaign.name}".`);
    } catch (err) {
      setAddedMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setAdding(false);
    }
  }

  return (
    <Drawer open={!!asset} onClose={onClose} title={asset?.name ?? ""} subtitle={asset?.code}>
      {asset && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge label={asset.operationalStatus} tone={assetOperationalTone(asset.operationalStatus)} />
            <StatusBadge label={mediaCategory(asset.mediaType) === "digital" ? "Digital" : "Static"} tone="cyan" dot={false} />
            <StatusBadge label={MEDIA_TYPE_LABELS[asset.mediaType]} tone="slate" dot={false} />
          </div>

          <section className="space-y-3">
            <div className="flex items-start gap-2.5 text-sm">
              <FiMapPin className="text-ink-500 mt-0.5 shrink-0" size={15} />
              <div>
                <div className="text-ink-100">{asset.location.address}</div>
                <div className="text-ink-500 text-xs">{asset.location.city} · {asset.indoor ? "Indoor" : "Outdoor"}</div>
              </div>
            </div>
            <div className="flex items-start gap-2.5 text-sm">
              <FiMonitor className="text-ink-500 mt-0.5 shrink-0" size={15} />
              <div className="text-ink-300">
                {asset.dimensions.widthFt}ft × {asset.dimensions.heightFt}ft, {asset.orientation}
                {asset.resolution && <> · {asset.resolution.widthPx}×{asset.resolution.heightPx}px</>}
              </div>
            </div>
            <div className="flex items-start gap-2.5 text-sm">
              <FiDollarSign className="text-ink-500 mt-0.5 shrink-0" size={15} />
              <div className="text-ink-300">
                {formatMoney(money(asset.pricing.baseDailyRateCents))}/day
                <span className="text-ink-500"> · {asset.pricing.premiumTimeMultiplier}× peak multiplier</span>
              </div>
            </div>
            <div className="flex items-start gap-2.5 text-sm">
              <FiUsers className="text-ink-500 mt-0.5 shrink-0" size={15} />
              <div className="text-ink-300">
                {asset.audience.estimatedDailyImpressions.toLocaleString()} est. daily impressions
                <div className="text-ink-500 text-xs">{asset.audience.trafficNote}</div>
              </div>
            </div>
          </section>

          <section className="panel p-4">
            <h4 className="text-xs font-bold uppercase tracking-wide text-ink-400 mb-3">Check Availability</h4>
            <div className="flex items-end gap-2 mb-3">
              <div className="flex-1">
                <label className="label">From</label>
                <input type="date" className="input" value={startDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value)} />
              </div>
              <div className="flex-1">
                <label className="label">To</label>
                <input type="date" className="input" value={endDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value)} />
              </div>
              <button className="btn-secondary shrink-0" disabled={!startDate || !endDate || checking} onClick={checkAvailability}>
                {checking ? "Checking..." : "Check"}
              </button>
            </div>
            {result && (
              <div className="text-sm">
                <StatusBadge {...availabilityDisplay(result)} />
                {result.state === "partially_available" && (
                  <p className="text-xs text-ink-500 mt-2">
                    Some of this range overlaps an existing booking — free sub-ranges would be shown here in a full booking calendar.
                  </p>
                )}
              </div>
            )}
          </section>

          <PermissionGate permission="inventory.manage" action="add inventory to a campaign">
            <section className="panel p-4">
              <h4 className="text-xs font-bold uppercase tracking-wide text-ink-400 mb-3">Add to Campaign</h4>
              <div className="flex items-center gap-2">
                <select
                  className="input flex-1"
                  value={selectedCampaignId}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedCampaignId(e.target.value)}
                >
                  <option value="">Select campaign...</option>
                  {campaigns.data?.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                  ))}
                </select>
                <button className="btn-primary shrink-0" disabled={!selectedCampaignId || adding} onClick={addToCampaign}>
                  <FiPlus size={14} /> Add
                </button>
              </div>
              {addedMsg && <p className="text-xs text-signal-green mt-2">{addedMsg}</p>}
            </section>
          </PermissionGate>
        </div>
      )}
    </Drawer>
  );
};
