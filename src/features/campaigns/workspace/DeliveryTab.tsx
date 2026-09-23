import React from "react";
import { StatusBadge, screenStatusTone } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/Feedback";
import { useAsync } from "@/hooks/useAsync";
import { repo } from "@/repositories/demo";
import type { Campaign } from "@/domain";

export const DeliveryTab: React.FC<{ campaign: Campaign }> = ({ campaign }) => {
  const screens = useAsync(() => repo.operations.listScreens(), []);

  const campaignScreens = (screens.data ?? []).filter((s) => campaign.assetIds.includes(s.assetId));
  const staticAssetCount = campaign.assetIds.length - campaignScreens.length;

  if (!screens.loading && campaignScreens.length === 0 && staticAssetCount === 0) {
    return <EmptyState title="No screens to monitor" description="Book inventory in the Inventory tab first." />;
  }

  return (
    <div className="space-y-4">
      {staticAssetCount > 0 && (
        <div className="text-xs text-ink-500 bg-ink-800/50 border border-ink-700 rounded-lg px-3 py-2">
          {staticAssetCount} of this campaign's booked asset(s) are static (non-digital) and have no live screen feed to monitor.
        </div>
      )}
      {campaignScreens.map((screen) => {
        const isPlayingThis = screen.currentCampaignId === campaign.id;
        return (
          <div key={screen.id} className="panel p-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-ink-100">{screen.name}</div>
              <div className="text-xs text-ink-500">{screen.city} · Last heartbeat {new Date(screen.lastHeartbeatAt).toLocaleTimeString()}</div>
            </div>
            <div className="flex items-center gap-3">
              {isPlayingThis ? (
                <span className="text-xs font-semibold text-signal-green">Playing this campaign</span>
              ) : (
                <span className="text-xs text-ink-500">Not currently assigned</span>
              )}
              <StatusBadge label={screen.liveStatus} tone={screenStatusTone(screen.liveStatus)} />
            </div>
          </div>
        );
      })}
    </div>
  );
};
