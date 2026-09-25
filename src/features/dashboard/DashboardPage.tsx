import React from "react";
import { FiFilm, FiRadio, FiAlertTriangle, FiTrendingUp, FiDollarSign } from "react-icons/fi";
import { PageHeader } from "@/components/layout/AppShell";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge, campaignStatusTone, alertSeverityTone } from "@/components/ui/StatusBadge";
import { DemoTag } from "@/components/ui/Feedback";
import { LineChart } from "@/components/charts/LineChart";
import { DonutChart } from "@/components/charts/DonutChart";
import { useAsync } from "@/hooks/useAsync";
import { repo } from "@/repositories/demo";
import { Link } from "@/lib/router";
import { CAMPAIGN_STATUS_LABELS, formatMoney, money } from "@/domain";

export const DashboardPage: React.FC = () => {
  const campaigns = useAsync(() => repo.campaigns.listCampaigns(), []);
  const screens = useAsync(() => repo.operations.listScreens(), []);
  const alerts = useAsync(() => repo.operations.listAlerts(), []);
  const leads = useAsync(() => repo.crm.listLeads(), []);
  const invoices = useAsync(() => repo.finance.listInvoices(), []);

  const liveCampaigns = campaigns.data?.filter((c) => c.status === "live") ?? [];
  const activeCampaigns = campaigns.data?.filter((c) => !["archived", "cancelled", "draft"].includes(c.status)) ?? [];
  const onlineScreens = screens.data?.filter((s) => s.liveStatus === "online").length ?? 0;
  const totalScreens = screens.data?.length ?? 0;
  const uptimePct = totalScreens ? Math.round((onlineScreens / totalScreens) * 100) : 0;
  const pendingApprovals = campaigns.data?.filter((c) => c.status === "pending_approval").length ?? 0;
  const pipelineValue = leads.data?.filter((l) => !["won", "lost"].includes(l.stage)).reduce((s, l) => s + l.estimatedValue, 0) ?? 0;
  const outstanding = invoices.data?.reduce((s, i) => s + (i.total.amountCents - i.amountPaid.amountCents), 0) ?? 0;

  const deliveryTrend = [92, 94, 89, 96, 91, 95, 97];
  const deliveryLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Today"];

  const statusBreakdown = campaigns.data
    ? Object.entries(
        campaigns.data.reduce<Record<string, number>>((acc, c) => {
          acc[c.status] = (acc[c.status] ?? 0) + 1;
          return acc;
        }, {})
      ).map(([status, count]) => ({
        label: CAMPAIGN_STATUS_LABELS[status as keyof typeof CAMPAIGN_STATUS_LABELS],
        value: count,
        color: statusColor(status),
      }))
    : [];

  return (
    <div>
      <PageHeader
        title="Command Center"
        description="Live overview of campaigns, delivery and operations across Vantage Outdoor Media."
        actions={<DemoTag label="Illustrative metrics" />}
      />

      {/* Metrics Cards Grid - Overflow Safe Container */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Live Campaigns" value={liveCampaigns.length} icon={<FiFilm size={16} />} tone="green" />
        <StatCard
          label="Screens Online"
          value={onlineScreens}
          format={(n) => `${n} / ${totalScreens}`}
          icon={<FiRadio size={16} />}
          tone="cyan"
          trend={{ direction: "up", label: `${uptimePct}% uptime` }}
        />
        <StatCard label="Pending Approvals" value={pendingApprovals} icon={<FiAlertTriangle size={16} />} tone="amber" />
        
        {/* Pipeline Value Container with Text Truncation & Overflow Safety */}
        <div className="min-w-0 overflow-hidden">
          <StatCard
            label="Pipeline Value"
            value={pipelineValue / 100}
            format={(n) => formatMoney(money(n * 100))}
            icon={<FiTrendingUp size={16} />}
            tone="cyan"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        <div className="panel p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-ink-50">Delivery Rate — Last 7 Days</h3>
              <p className="text-xs text-ink-400 mt-0.5">Scheduled vs. delivered plays across all live campaigns</p>
            </div>
            <DemoTag />
          </div>
          <LineChart
            labels={deliveryLabels}
            series={[{ name: "Delivery %", color: "#22d3ee", values: deliveryTrend }]}
            formatValue={(n) => `${n}%`}
          />
        </div>

        <div className="panel p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-ink-50">Campaign Mix</h3>
          </div>
          {statusBreakdown.length > 0 && (
            <DonutChart data={statusBreakdown} centerLabel="Total" centerValue={String(campaigns.data?.length ?? 0)} size={150} />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="panel p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-ink-50">Active Campaigns</h3>
            <Link to="/campaigns" className="text-xs text-signal-cyan font-semibold hover:underline">
              View all →
            </Link>
          </div>
          <div className="space-y-1">
            {activeCampaigns.slice(0, 6).map((c) => (
              <Link
                key={c.id}
                to={`/campaigns/${c.id}`}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-ink-800/50 -mx-3 transition-colors"
              >
                <div className="min-w-0 pr-2">
                  <div className="text-sm font-medium text-ink-100 truncate">{c.name}</div>
                  <div className="text-xs text-ink-500">{c.code} · {c.brand}</div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-semibold text-ink-200">
                    {formatMoney(c.budget.total)}
                  </span>
                  <StatusBadge label={CAMPAIGN_STATUS_LABELS[c.status]} tone={campaignStatusTone(c.status)} />
                </div>
              </Link>
            ))}
            {activeCampaigns.length === 0 && !campaigns.loading && (
              <p className="text-sm text-ink-500 py-4">No active campaigns right now.</p>
            )}
          </div>
        </div>

        <div className="panel p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-ink-50">Alerts</h3>
            <Link to="/operations" className="text-xs text-signal-cyan font-semibold hover:underline">
              View all →
            </Link>
          </div>
          <div className="space-y-3">
            {alerts.data?.slice(0, 5).map((a) => (
              <div key={a.id} className="flex items-start gap-2.5">
                <div className="mt-1">
                  <StatusBadge label="" dot tone={alertSeverityTone(a.severity)} />
                </div>
                <div className="min-w-0">
                  <div className="text-sm text-ink-100 leading-snug">{a.title}</div>
                  <div className="text-xs text-ink-500 mt-0.5">{a.detail}</div>
                </div>
              </div>
            ))}
            {alerts.data?.length === 0 && <p className="text-sm text-ink-500 py-4">No active alerts.</p>}
          </div>
        </div>
      </div>

      <div className="mt-6 panel p-5 border border-signal-amber/20 bg-surface-bg/80">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2">
            <FiDollarSign size={18} className="text-signal-amber" />
            <h3 className="font-semibold text-ink-50">Outstanding Receivables (AR)</h3>
          </div>
          <DemoTag />
        </div>
        <p className="text-sm text-ink-400 mb-3">Across all sent, partially paid, and overdue invoices.</p>
        <div className="text-2xl sm:text-3xl font-bold text-signal-amber tabular-nums tracking-tight">
          {formatMoney(money(outstanding))}
        </div>
        <Link to="/finance" className="text-xs text-signal-cyan font-semibold hover:underline mt-2 inline-block">
          Go to Finance →
        </Link>
      </div>
    </div>
  );
};

function statusColor(status: string): string {
  const map: Record<string, string> = {
    live: "#34d399", scheduled: "#22d3ee", booked: "#3b82f6", pending_approval: "#fbbf24",
    proposal: "#8b5cf6", draft: "#5c6b82", completed: "#3b82f6", archived: "#374357", cancelled: "#f87171",
  };
  return map[status] ?? "#5c6b82";
}
