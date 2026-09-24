import React, { useMemo } from "react";
import { DemoTag } from "@/components/ui/Feedback";
import { LineChart } from "@/components/charts/LineChart";
import { DonutChart } from "@/components/charts/DonutChart";
import { useAsync } from "@/hooks/useAsync";
import { repo } from "@/repositories/demo";
import type { Campaign } from "@/domain";
import { formatMoney, money } from "@/domain";

export const AnalyticsTab: React.FC<{ campaign: Campaign }> = ({ campaign }) => {
  const playback = useAsync(() => repo.operations.listPlaybackForCampaign(campaign.id), [campaign.id]);

  const hourly = useMemo(() => {
    const records = playback.data ?? [];
    const buckets = new Map<string, { delivered: number; failed: number }>();
    for (const rec of records) {
      if (rec.status !== "delivered" && rec.status !== "failed") continue;
      const key = rec.playedAt.slice(0, 13);
      if (!buckets.has(key)) buckets.set(key, { delivered: 0, failed: 0 });
      const b = buckets.get(key)!;
      if (rec.status === "delivered") b.delivered++;
      else b.failed++;
    }
    const sortedKeys = [...buckets.keys()].sort();
    return {
      labels: sortedKeys.map((k) => new Date(k + ":00:00").toLocaleTimeString(undefined, { hour: "numeric" })),
      delivered: sortedKeys.map((k) => buckets.get(k)!.delivered),
      failed: sortedKeys.map((k) => buckets.get(k)!.failed),
    };
  }, [playback.data]);

  const delivered = playback.data?.filter((p) => p.status === "delivered") ?? [];
  const failed = playback.data?.filter((p) => p.status === "failed") ?? [];
  const totalImpressions = delivered.reduce((s, p) => s + p.estimatedImpressions, 0);
  
  const cpmCents = totalImpressions > 0 
    ? Math.round(campaign.budget.total.amountCents / (totalImpressions / 1000)) 
    : 0;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="panel p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-ink-50">Delivered vs. Failed — by Hour</h3>
            <DemoTag />
          </div>
          {hourly.labels.length > 0 ? (
            <LineChart
              labels={hourly.labels}
              series={[
                { name: "Delivered", color: "#34d399", values: hourly.delivered },
                { name: "Failed", color: "#f87171", values: hourly.failed },
              ]}
            />
          ) : (
            <p className="text-sm text-ink-500 py-8 text-center">No playback data yet for this campaign.</p>
          )}
        </div>

        <div className="panel p-5">
          <h3 className="font-semibold text-ink-50 mb-4">Delivery Split</h3>
          {delivered.length + failed.length > 0 ? (
            <DonutChart
              data={[
                { label: "Delivered", value: delivered.length, color: "#34d399" },
                { label: "Failed", value: failed.length, color: "#f87171" },
              ]}
              size={140}
              centerLabel="Total Plays"
              centerValue={String(delivered.length + failed.length)}
            />
          ) : (
            <p className="text-sm text-ink-500">No data yet.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-400">Est. Impressions</span>
          <div className="text-2xl font-bold text-ink-50 tabular-nums">{totalImpressions.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-400">Est. CPM</span>
          <div className="text-2xl font-bold text-ink-50 tabular-nums">
            {formatMoney(money(cpmCents, campaign.budget.total.currency))}
          </div>
        </div>
        <div className="stat-card">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-400">Total Spend</span>
          <div className="text-2xl font-bold text-ink-50 tabular-nums">{formatMoney(campaign.budget.total)}</div>
        </div>
        <div className="stat-card">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-400">Screens Reporting</span>
          <div className="text-2xl font-bold text-ink-50 tabular-nums">{new Set((playback.data ?? []).map((p) => p.screenId)).size}</div>
        </div>
      </div>
    </div>
  );
};
