import React, { useState } from "react";
import { StatusBadge, campaignStatusTone } from "@/components/ui/StatusBadge";
import { PermissionGate } from "@/components/ui/PermissionGate";
import { repo } from "@/repositories/demo";
import { useSession } from "@/hooks/useSession";
import type { Campaign, CampaignStatus } from "@/domain";
import { CAMPAIGN_STATUS_LABELS, CAMPAIGN_TRANSITIONS } from "@/domain";

export const CampaignStatusControl: React.FC<{
  campaign: Campaign;
  onChanged: () => void;
}> = ({ campaign, onChanged }) => {
  const { user } = useSession();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nextOptions = CAMPAIGN_TRANSITIONS[campaign.status];

  async function move(next: CampaignStatus) {
    setBusy(true);
    setError(null);
    setOpen(false);
    try {
      await repo.campaigns.updateCampaignStatus(campaign.id, next, user?.name ?? "You");
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <StatusBadge label={CAMPAIGN_STATUS_LABELS[campaign.status]} tone={campaignStatusTone(campaign.status)} />
        {nextOptions.length > 0 && (
          <PermissionGate permission="campaigns.manage" fallback={null}>
            <button className="btn-secondary !py-1.5 !px-2.5 text-xs" disabled={busy} onClick={() => setOpen((v) => !v)}>
              {busy ? "Updating..." : "Change Status"}
            </button>
          </PermissionGate>
        )}
      </div>
      {open && (
        <div className="absolute left-0 mt-2 panel-solid p-1.5 z-20 min-w-[220px]">
          <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-500">
            Move to
          </div>
          {nextOptions.map((opt) => (
            <button
              key={opt}
              onClick={() => move(opt)}
              className="w-full text-left px-2.5 py-2 rounded-md hover:bg-ink-800 text-sm text-ink-200"
            >
              {CAMPAIGN_STATUS_LABELS[opt]}
            </button>
          ))}
        </div>
      )}
      {error && <p className="text-xs text-signal-red mt-1.5">{error}</p>}
    </div>
  );
};
