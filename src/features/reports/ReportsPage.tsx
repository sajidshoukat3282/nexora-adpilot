import React, { useState, useMemo } from "react";
import { FiDownload, FiMail, FiFileText } from "react-icons/fi";
import { PageHeader } from "@/components/layout/AppShell";
import { DemoTag, PermissionDenied } from "@/components/ui/Feedback";
import { BarChart } from "@/components/charts/BarChart";
import { NexoraIntelligencePanel } from "./NexoraIntelligencePanel";
import { useAsync } from "@/hooks/useAsync";
import { repo } from "@/repositories/demo";
import { PermissionGate } from "@/components/ui/PermissionGate";
import { useSession } from "@/hooks/useSession";
import { REPORT_DEFINITIONS } from "@/domain/reports";
import type { PlaybackRecord } from "@/domain";

const RANGE_OPTIONS = [
  { key: "24h", label: "Last 24 Hours", hours: 24 },
  { key: "7d", label: "Last 7 Days", hours: 24 * 7 },
  { key: "all", label: "All Time", hours: Infinity },
];

export const ReportsPage: React.FC = () => {
  const { can } = useSession();
  const [range, setRange] = useState("24h");
  const [exported, setExported] = useState<string | null>(null);

  const campaigns = useAsync(() => repo.campaigns.listCampaigns(), []);
  const screens = useAsync(() => repo.operations.listScreens(), []);

  const allPlayback = useAsync(async () => {
    const lists = await Promise.all((campaigns.data ?? []).map((c) => repo.operations.listPlaybackForCampaign(c.id)));
    return lists.flat();
  }, [campaigns.data]);

  const rangeHours = RANGE_OPTIONS.find((r) => r.key === range)?.hours ?? Infinity;
  const filtered = useMemo(() => {
    if (!allPlayback.data) return [];
    if (rangeHours === Infinity) return allPlayback.data;
    const cutoff = Date.now() - rangeHours * 60 * 60 * 1000;
    return allPlayback.data.filter((p: PlaybackRecord) => new Date(p.playedAt).getTime() >= cutoff);
  }, [allPlayback.data, rangeHours]);

  const byCampaign = useMemo(() => {
    const map = new Map<string, number>();
    for (const rec of filtered) {
      if (rec.status !== "delivered") continue;
      map.set(rec.campaignId, (map.get(rec.campaignId) ?? 0) + rec.estimatedImpressions);
    }
    return [...map.entries()]
      .map(([campaignId, impressions]) => ({
        label: campaigns.data?.find((c) => c.id === campaignId)?.name.slice(0, 18) ?? campaignId,
        value: impressions,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [filtered, campaigns.data]);

  const byCity = useMemo(() => {
    const screenCity = new Map((screens.data ?? []).map((s) => [s.id, s.city]));
    const map = new Map<string, number>();
    for (const rec of filtered) {
      if (rec.status !== "delivered") continue;
      const city = screenCity.get(rec.screenId) ?? "Unknown";
      map.set(city, (map.get(city) ?? 0) + rec.estimatedImpressions);
    }
    return [...map.entries()].map(([label, value]) => ({ label, value }));
  }, [filtered, screens.data]);

  const totalDelivered = filtered.filter((p) => p.status === "delivered").length;
  const totalFailed = filtered.filter((p) => p.status === "failed").length;
  const deliveryPct = totalDelivered + totalFailed > 0 ? Math.round((totalDelivered / (totalDelivered + totalFailed)) * 100) : null;

  return (
    <PermissionGate permission="reports.view" action="view Report Center">
    <div>
      <PageHeader
        title="Analytics & Reports"
        description="Cross-campaign delivery and performance — aggregated from the same proof-of-play data shown in each campaign's workspace."
        actions={
          <div className="flex items-center gap-2">
            {can("reports.send") && (
              <button className="btn-secondary" onClick={() => setExported("send")}>
                <FiMail size={14} /> {exported === "send" ? "Send prepared (demo)" : "Send Report"}
              </button>
            )}
            {can("reports.generate") && (
              <button className="btn-secondary" onClick={() => setExported("download")}>
                <FiDownload size={14} /> {exported === "download" ? "Download prepared (demo)" : "Download Report"}
              </button>
            )}
          </div>
        }
      />

      <div className="panel p-5 mb-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="font-semibold text-ink-50 flex items-center gap-2"><FiFileText size={16} /> Report Center</h3>
            <p className="text-xs text-ink-500 mt-1">Available report families are filtered by the current user's permissions. Generation and delivery are demo actions until the server/report storage boundary is connected.</p>
          </div>
          <DemoTag />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {REPORT_DEFINITIONS.filter((definition) => can(definition.requiredPermission)).map((definition) => (
            <div key={definition.type} className="rounded-lg border border-ink-700/60 bg-ink-900/40 px-3 py-2.5 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-ink-100">{definition.label}</div>
                <div className="text-[11px] text-ink-500">{definition.formats.join(" / ").toUpperCase()}</div>
              </div>
              <span className="text-[10px] uppercase tracking-wide text-signal-green">Available</span>
            </div>
          ))}
        </div>
        {exported && <div className="mt-3 text-xs text-signal-amber bg-signal-amber/10 border border-signal-amber/20 rounded-lg px-3 py-2">Demo action prepared — no external email, file storage, or delivery claim is being made.</div>}
      </div>

      <div className="flex items-center gap-1.5 mb-5">
        {RANGE_OPTIONS.map((r) => (
          <button
            key={r.key}
            onClick={() => setRange(r.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              range === r.key ? "bg-signal-cyan text-ink-950" : "bg-ink-800 text-ink-300 hover:bg-ink-700"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <div className="stat-card">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-400">Delivery Rate</span>
          <div className="text-2xl font-bold text-ink-50 tabular-nums">{deliveryPct !== null ? `${deliveryPct}%` : "—"}</div>
        </div>
        <div className="stat-card">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-400">Delivered Plays</span>
          <div className="text-2xl font-bold text-ink-50 tabular-nums">{totalDelivered.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-400">Est. Impressions</span>
          <div className="text-2xl font-bold text-ink-50 tabular-nums">{filtered.reduce((s, p) => s + p.estimatedImpressions, 0).toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-400">Active Campaigns</span>
          <div className="text-2xl font-bold text-ink-50 tabular-nums">{campaigns.data?.filter((c) => c.status === "live").length ?? 0}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <div className="panel p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-ink-50">Impressions by Campaign</h3>
            <DemoTag />
          </div>
          {byCampaign.length > 0 ? (
            <BarChart data={byCampaign} horizontal defaultColor="#22d3ee" />
          ) : (
            <p className="text-sm text-ink-500 py-8 text-center">No delivered plays in this range.</p>
          )}
        </div>
        <div className="panel p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-ink-50">Impressions by City</h3>
            <DemoTag />
          </div>
          {byCity.length > 0 ? (
            <BarChart data={byCity} defaultColor="#8b5cf6" />
          ) : (
            <p className="text-sm text-ink-500 py-8 text-center">No delivered plays in this range.</p>
          )}
        </div>
      </div>

      <div className="panel p-5">
        <NexoraIntelligencePanel />
      </div>
    </div>
    </PermissionGate>
  );
};
