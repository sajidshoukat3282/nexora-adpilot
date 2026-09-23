import React from "react";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge, alertSeverityTone } from "@/components/ui/StatusBadge";
import { DemoTag } from "@/components/ui/Feedback";
import { useAsync } from "@/hooks/useAsync";
import { repo } from "@/repositories/demo";
import { Link } from "@/lib/router";
import type { Campaign } from "@/domain";
import { OBJECTIVE_LABELS, formatMoney } from "@/domain";

export const OverviewTab: React.FC<{ campaign: Campaign }> = ({ campaign }) => {
  const client = useAsync(() => repo.crm.getClient(campaign.clientId), [campaign.clientId]);
  const playback = useAsync(() => repo.operations.listPlaybackForCampaign(campaign.id), [campaign.id]);
  const alerts = useAsync(() => repo.operations.listAlerts(), [campaign.id]);
  const activity = useAsync(() => repo.campaigns.getActivity(campaign.id), [campaign.id]);

  const delivered = playback.data?.filter((p) => p.status === "delivered").length ?? 0;
  const failed = playback.data?.filter((p) => p.status === "failed").length ?? 0;
  const totalAttempted = delivered + failed;
  const deliveryPct = totalAttempted > 0 ? Math.round((delivered / totalAttempted) * 100) : null;
  const impressions = playback.data?.reduce((s, p) => s + p.estimatedImpressions, 0) ?? 0;

  const campaignAlerts = alerts.data?.filter((a) => a.campaignId === campaign.id) ?? [];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Delivery Rate" value={deliveryPct ?? 0} format={(n) => (deliveryPct === null ? "—" : `${n}%`)} tone={deliveryPct !== null && deliveryPct < 90 ? "amber" : "green"} demo />
        <StatCard label="Est. Impressions" value={impressions} demo />
        <StatCard label="Assets Booked" value={campaign.assetIds.length} />
        <StatCard label="Budget" value={campaign.budget.total.amountCents / 100} format={(n) => formatMoney({ amountCents: n * 100, currency: "USD" })} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="panel p-5 lg:col-span-2">
          <h3 className="font-semibold text-ink-50 mb-3">Campaign Details</h3>
          <dl className="grid grid-cols-2 gap-y-3 text-sm">
            <dt className="text-ink-500">Client</dt>
            <dd className="text-ink-100">{client.data?.name ?? "—"}</dd>
            <dt className="text-ink-500">Brand</dt>
            <dd className="text-ink-100">{campaign.brand}</dd>
            <dt className="text-ink-500">Objective</dt>
            <dd className="text-ink-100">{OBJECTIVE_LABELS[campaign.objective]}</dd>
            <dt className="text-ink-500">Dates</dt>
            <dd className="text-ink-100">{campaign.schedule.startDate} → {campaign.schedule.endDate}</dd>
            <dt className="text-ink-500">Owner</dt>
            <dd className="text-ink-100">{campaign.ownerUserId}</dd>
          </dl>

          <h3 className="font-semibold text-ink-50 mt-6 mb-3">Recent Activity</h3>
          <div className="space-y-2.5">
            {activity.data?.slice(0, 4).map((a) => (
              <div key={a.id} className="text-sm">
                <span className="text-ink-100">{a.actorName}</span>{" "}
                <span className="text-ink-500">{a.detail}</span>
              </div>
            ))}
            {activity.data?.length === 0 && <p className="text-xs text-ink-500">No activity recorded yet.</p>}
          </div>
        </div>

        <div className="panel p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-ink-50">Alerts</h3>
            <DemoTag />
          </div>
          <div className="space-y-3">
            {campaignAlerts.map((a) => (
              <div key={a.id} className="flex items-start gap-2">
                <StatusBadge label="" tone={alertSeverityTone(a.severity)} />
                <div className="text-sm text-ink-200">{a.title}</div>
              </div>
            ))}
            {campaignAlerts.length === 0 && <p className="text-xs text-ink-500">No alerts for this campaign.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};
