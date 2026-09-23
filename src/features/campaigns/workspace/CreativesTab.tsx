import React, { useState } from "react";
import { FiPlus } from "react-icons/fi";
import { StatusBadge, creativeStatusTone } from "@/components/ui/StatusBadge";
import { PermissionGate } from "@/components/ui/PermissionGate";
import { EmptyState } from "@/components/ui/Feedback";
import { CreativeThumb } from "./CreativeThumb";
import { useAsync } from "@/hooks/useAsync";
import { repo } from "@/repositories/demo";
import type { Campaign, CreativeStatus } from "@/domain";
import { CREATIVE_STATUS_LABELS, CREATIVE_TRANSITIONS } from "@/domain";

export const CreativesTab: React.FC<{ campaign: Campaign }> = ({ campaign }) => {
  const creatives = useAsync(() => repo.creatives.listCreativesForCampaign(campaign.id), [campaign.id]);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function transition(creativeId: string, next: CreativeStatus) {
    setBusyId(creativeId);
    try {
      await repo.creatives.transitionStatus(creativeId, next);
      creatives.reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  }

  async function simulateUpload(creativeId: string) {
    setBusyId(creativeId);
    try {
      await repo.creatives.uploadVersion(creativeId, {
        name: "new-cut.mp4", sizeKb: 18000 + Math.round(Math.random() * 4000), format: "mp4",
      });
      creatives.reload();
    } finally {
      setBusyId(null);
    }
  }

  if (!creatives.loading && creatives.data?.length === 0) {
    return <EmptyState title="No creatives yet" description="Creatives are added when a campaign moves into production." />;
  }

  return (
    <div className="space-y-4">
      {creatives.data?.map((creative) => {
        const currentVersion = creative.versions.find((v) => v.id === creative.currentVersionId);
        const nextOptions = CREATIVE_TRANSITIONS[creative.status];
        return (
          <div key={creative.id} className="panel p-5">
            <div className="flex items-start gap-4">
              {currentVersion && <CreativeThumb version={currentVersion} />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-semibold text-ink-100">{creative.name}</h4>
                  <StatusBadge label={CREATIVE_STATUS_LABELS[creative.status]} tone={creativeStatusTone(creative.status)} />
                </div>
                <div className="text-xs text-ink-500 mb-3">
                  v{currentVersion?.versionNumber ?? "—"} · {currentVersion?.format.toUpperCase()} ·{" "}
                  {currentVersion && (currentVersion.fileSizeKb / 1024).toFixed(1)}MB
                  {currentVersion?.durationSec && <> · {currentVersion.durationSec}s</>}
                </div>

                {currentVersion && !currentVersion.validation.resolutionOk && (
                  <div className="text-xs text-signal-amber bg-signal-amber/10 border border-signal-amber/25 rounded-lg px-2.5 py-1.5 mb-3 inline-block">
                    ⚠ Resolution doesn't match target screen spec
                  </div>
                )}
                {currentVersion && !currentVersion.validation.aspectRatioOk && (
                  <div className="text-xs text-signal-amber bg-signal-amber/10 border border-signal-amber/25 rounded-lg px-2.5 py-1.5 mb-3 inline-block ml-2">
                    ⚠ Aspect ratio mismatch
                  </div>
                )}

                <PermissionGate permission="creatives.manage" fallback={null}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      className="btn-ghost !py-1 !px-2 text-xs"
                      disabled={busyId === creative.id}
                      onClick={() => simulateUpload(creative.id)}
                      title="No real file is uploaded — this simulates a new version for the demo workflow"
                    >
                      <FiPlus size={12} /> Simulate New Version
                    </button>
                    {nextOptions.map((opt) => (
                      <button
                        key={opt}
                        className="btn-secondary !py-1 !px-2 text-xs"
                        disabled={busyId === creative.id}
                        onClick={() => transition(creative.id, opt)}
                      >
                        → {CREATIVE_STATUS_LABELS[opt]}
                      </button>
                    ))}
                  </div>
                </PermissionGate>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
