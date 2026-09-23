import React, { useMemo, useState } from "react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/Feedback";
import { useAsync } from "@/hooks/useAsync";
import { repo } from "@/repositories/demo";
import type { Campaign, PlaybackRecord } from "@/domain";

function statusTone(status: PlaybackRecord["status"]) {
  switch (status) {
    case "delivered": return "green" as const;
    case "failed": return "red" as const;
    case "scheduled": return "cyan" as const;
    case "estimated": return "amber" as const;
  }
}

export const ProofOfPlayTab: React.FC<{ campaign: Campaign }> = ({ campaign }) => {
  const playback = useAsync(() => repo.operations.listPlaybackForCampaign(campaign.id), [campaign.id]);
  const screens = useAsync(() => repo.operations.listScreens(), []);
  const [expandedScreen, setExpandedScreen] = useState<string | null>(null);

  const byScreen = useMemo(() => {
    const map = new Map<string, PlaybackRecord[]>();
    for (const rec of playback.data ?? []) {
      if (!map.has(rec.screenId)) map.set(rec.screenId, []);
      map.get(rec.screenId)!.push(rec);
    }
    return map;
  }, [playback.data]);

  function screenName(id: string): string {
    return screens.data?.find((s) => s.id === id)?.name ?? id;
  }

  function hourBuckets(records: PlaybackRecord[]) {
    const buckets = new Map<string, PlaybackRecord[]>();
    for (const rec of records) {
      const hourKey = rec.playedAt.slice(0, 13); // YYYY-MM-DDTHH
      if (!buckets.has(hourKey)) buckets.set(hourKey, []);
      buckets.get(hourKey)!.push(rec);
    }
    return [...buckets.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }

  if (!playback.loading && (playback.data?.length ?? 0) === 0) {
    return <EmptyState title="No playback records yet" description="Proof of play appears once the campaign is live and screens report delivery." />;
  }

  return (
    <div className="space-y-3">
      <div className="text-xs text-ink-500 bg-ink-800/50 border border-ink-700 rounded-lg px-3 py-2">
        Drill-down: Campaign → Screen → Hour → individual plays. Click a screen to expand.
      </div>

      {[...byScreen.entries()].map(([screenId, records]) => {
        const delivered = records.filter((r) => r.status === "delivered").length;
        const failed = records.filter((r) => r.status === "failed").length;
        const scheduled = records.filter((r) => r.status === "scheduled").length;
        const expanded = expandedScreen === screenId;

        return (
          <div key={screenId} className="panel overflow-hidden">
            <button
              className="w-full flex items-center justify-between p-4 hover:bg-ink-800/40"
              onClick={() => setExpandedScreen(expanded ? null : screenId)}
            >
              <span className="text-sm font-medium text-ink-100">{screenName(screenId)}</span>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-signal-green">{delivered} delivered</span>
                {failed > 0 && <span className="text-signal-red">{failed} failed</span>}
                {scheduled > 0 && <span className="text-signal-cyan">{scheduled} scheduled</span>}
              </div>
            </button>
            {expanded && (
              <div className="border-t border-ink-800 divide-y divide-ink-800/60">
                {hourBuckets(records).map(([hourKey, hourRecords]) => (
                  <div key={hourKey} className="px-4 py-2.5 flex items-center justify-between text-xs">
                    <span className="text-ink-400">
                      {new Date(hourKey + ":00:00").toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric" })}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {hourRecords.map((r) => (
                        <span key={r.id} title={`${r.status} · ${r.estimatedImpressions} impressions`}>
                          <StatusBadge label="" tone={statusTone(r.status)} />
                        </span>
                      ))}
                      <span className="text-ink-500 ml-1">{hourRecords.length} plays</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
