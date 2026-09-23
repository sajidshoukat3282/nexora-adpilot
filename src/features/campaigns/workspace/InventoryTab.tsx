import React, { useState } from "react";
import { FiPlus, FiTrash2 } from "react-icons/fi";
import { StatusBadge, assetOperationalTone } from "@/components/ui/StatusBadge";
import { PermissionGate } from "@/components/ui/PermissionGate";
import { EmptyState } from "@/components/ui/Feedback";
import { useAsync } from "@/hooks/useAsync";
import { repo } from "@/repositories/demo";
import type { Campaign } from "@/domain";
import { formatMoney, money } from "@/domain";

export const InventoryTab: React.FC<{ campaign: Campaign; onChanged: () => void }> = ({ campaign, onChanged }) => {
  const allAssets = useAsync(() => repo.inventory.listAssets(), []);
  const [addingId, setAddingId] = useState("");
  const [busy, setBusy] = useState(false);

  const booked = (allAssets.data ?? []).filter((a) => campaign.assetIds.includes(a.id));
  const available = (allAssets.data ?? []).filter((a) => !campaign.assetIds.includes(a.id));

  async function add() {
    if (!addingId) return;
    setBusy(true);
    try {
      await repo.campaigns.addAssetToCampaign(campaign.id, addingId);
      setAddingId("");
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function remove(assetId: string) {
    setBusy(true);
    try {
      await repo.campaigns.removeAssetFromCampaign(campaign.id, assetId);
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <PermissionGate permission="inventory.manage" action="add inventory to this campaign">
        <div className="panel p-4 flex items-center gap-2">
          <select className="input flex-1" value={addingId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAddingId(e.target.value)}>
            <option value="">Select an asset to add...</option>
            {available.map((a) => (
              <option key={a.id} value={a.id}>{a.name} — {a.location.city} — {formatMoney(money(a.pricing.baseDailyRateCents))}/day</option>
            ))}
          </select>
          <button className="btn-primary shrink-0" disabled={!addingId || busy} onClick={add}>
            <FiPlus size={14} /> Add Asset
          </button>
        </div>
      </PermissionGate>

      {booked.length === 0 ? (
        <EmptyState title="No inventory booked yet" description="Add assets from the picker above, or from the Inventory & Media Map." />
      ) : (
        <div className="panel divide-y divide-ink-800">
          {booked.map((a) => (
            <div key={a.id} className="flex items-center justify-between p-4">
              <div>
                <div className="text-sm font-medium text-ink-100">{a.name}</div>
                <div className="text-xs text-ink-500">{a.code} · {a.location.city} · {formatMoney(money(a.pricing.baseDailyRateCents))}/day</div>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge label={a.operationalStatus} tone={assetOperationalTone(a.operationalStatus)} />
                <PermissionGate permission="inventory.manage" fallback={null}>
                  <button className="text-ink-500 hover:text-signal-red p-1.5" disabled={busy} onClick={() => remove(a.id)}>
                    <FiTrash2 size={15} />
                  </button>
                </PermissionGate>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
