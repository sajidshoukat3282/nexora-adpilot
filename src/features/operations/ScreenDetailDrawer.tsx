import React from "react";
import { Drawer } from "@/components/ui/Drawer";
import { StatusBadge, screenStatusTone } from "@/components/ui/StatusBadge";
import { useAsync } from "@/hooks/useAsync";
import { repo } from "@/repositories/demo";
import type { LiveScreen } from "@/domain";

export const ScreenDetailDrawer: React.FC<{ screen: LiveScreen | null; onClose: () => void }> = ({ screen, onClose }) => {
  const playback = useAsync(() => (screen ? repo.operations.listPlaybackForScreen(screen.id) : Promise.resolve([])), [screen?.id]);
  const campaign = useAsync(
    () => (screen?.currentCampaignId ? repo.campaigns.getCampaign(screen.currentCampaignId) : Promise.resolve(null)),
    [screen?.currentCampaignId]
  );

  const recent = (playback.data ?? []).slice(0, 10);

  return (
    <Drawer open={!!screen} onClose={onClose} title={screen?.name ?? ""} subtitle={screen?.city}>
      {screen && (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <StatusBadge label={screen.liveStatus} tone={screenStatusTone(screen.liveStatus)} />
            <span className="text-xs text-ink-500">Player {screen.playerVersion}</span>
          </div>

          <section>
            <h4 className="text-xs font-bold uppercase tracking-wide text-ink-400 mb-3">Device Health</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="panel p-3">
                <div className="text-xs text-ink-500">Last Heartbeat</div>
                <div className="text-sm text-ink-100">{new Date(screen.lastHeartbeatAt).toLocaleString()}</div>
              </div>
              <div className="panel p-3">
                <div className="text-xs text-ink-500">Network</div>
                <div className="text-sm text-ink-100 capitalize">{screen.network}</div>
              </div>
              <div className="panel p-3">
                <div className="text-xs text-ink-500">Storage Used</div>
                <div className="text-sm text-ink-100">{screen.storagePct}%</div>
              </div>
              <div className="panel p-3">
                <div className="text-xs text-ink-500">Temperature</div>
                <div className="text-sm text-ink-100">{screen.temperatureC}°C</div>
              </div>
            </div>
          </section>

          <section>
            <h4 className="text-xs font-bold uppercase tracking-wide text-ink-400 mb-2">Current Assignment</h4>
            {campaign.data ? (
              <div className="panel p-3">
                <div className="text-sm font-medium text-ink-100">{campaign.data.name}</div>
                <div className="text-xs text-ink-500">{campaign.data.code}</div>
              </div>
            ) : (
              <p className="text-xs text-ink-500">No campaign currently assigned to this screen.</p>
            )}
          </section>

          <section>
            <h4 className="text-xs font-bold uppercase tracking-wide text-ink-400 mb-2">Recent Playback</h4>
            <div className="space-y-1.5">
              {recent.map((r) => (
                <div key={r.id} className="flex items-center justify-between text-xs">
                  <span className="text-ink-400">{new Date(r.playedAt).toLocaleTimeString()}</span>
                  <span className={r.status === "delivered" ? "text-signal-green" : r.status === "failed" ? "text-signal-red" : "text-signal-cyan"}>
                    {r.status}
                  </span>
                </div>
              ))}
              {recent.length === 0 && <p className="text-xs text-ink-500">No recent playback records.</p>}
            </div>
          </section>
        </div>
      )}
    </Drawer>
  );
};
