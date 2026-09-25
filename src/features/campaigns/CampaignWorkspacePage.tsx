import React from "react";
import { useParams, useSearchParams, Link } from "@/lib/router";
import { PageHeader } from "@/components/layout/AppShell";
import { Tabs } from "@/components/ui/Tabs";
import { ErrorState } from "@/components/ui/Feedback";
import { useAsync } from "@/hooks/useAsync";
import { repo } from "@/repositories/demo";
import type { CurrencyCode } from "@/domain";
import { formatMoney, money } from "@/domain";
import { CampaignStatusControl } from "./workspace/StatusControl";
import { OverviewTab } from "./workspace/OverviewTab";
import { InventoryTab } from "./workspace/InventoryTab";
import { ScheduleTab } from "./workspace/ScheduleTab";
import { CreativesTab } from "./workspace/CreativesTab";
import { ApprovalsTab } from "./workspace/ApprovalsTab";
import { DeliveryTab } from "./workspace/DeliveryTab";
import { ProofOfPlayTab } from "./workspace/ProofOfPlayTab";
import { AnalyticsTab } from "./workspace/AnalyticsTab";
import { BillingTab } from "./workspace/BillingTab";
import { ActivityTab } from "./workspace/ActivityTab";

const TAB_DEFS = [
  { key: "overview", label: "Overview" },
  { key: "inventory", label: "Inventory" },
  { key: "schedule", label: "Schedule" },
  { key: "creatives", label: "Creatives" },
  { key: "approvals", label: "Approvals" },
  { key: "delivery", label: "Delivery/Screens" },
  { key: "pop", label: "Proof of Play" },
  { key: "analytics", label: "Analytics" },
  { key: "billing", label: "Billing & Financials" },
  { key: "activity", label: "Activity" },
];

export const CampaignWorkspacePage: React.FC = () => {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const activeTab = params.get("tab") ?? "overview";

  const campaignState = useAsync(() => repo.campaigns.getCampaign(id), [id]);
  const campaign = campaignState.data;

  if (campaignState.loading) {
    return <div className="text-ink-500 text-sm p-4">Loading campaign workspace...</div>;
  }
  if (!campaign) {
    return <ErrorState message={`Campaign "${id}" was not found.`} />;
  }

  // Financial & P&L Calculations for Active Campaign
  const curr = (campaign.budget.total.currency || "PKR") as CurrencyCode;
  const totalCents = campaign.budget.total.amountCents;
  const netProfitCents = Math.round(totalCents * 0.35);
  const mediaBuyCents = Math.round(totalCents * 0.65);

  return (
    <div>
      <PageHeader
        breadcrumb={
          <Link to="/campaigns" className="text-xs text-ink-500 hover:text-ink-300">
            ← All Campaigns
          </Link>
        }
        title={campaign.name}
        description={`${campaign.code} · ${campaign.brand}`}
        actions={<CampaignStatusControl campaign={campaign} onChanged={campaignState.reload} />}
      />

      {/* Enterprise Executive P&L & ROAS Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3.5 mb-5 bg-surface-bg/60 border border-surface-border rounded-xl">
        <div>
          <span className="text-[11px] uppercase tracking-wider text-ink-500 font-semibold block">Gross Contract Value</span>
          <span className="text-base font-bold text-ink-50">{formatMoney(campaign.budget.total)}</span>
        </div>
        <div>
          <span className="text-[11px] uppercase tracking-wider text-ink-500 font-semibold block">Est. Agency Profit (35%)</span>
          <span className="text-base font-bold text-signal-green">
            +{formatMoney(money(netProfitCents, curr))}
          </span>
        </div>
        <div>
          <span className="text-[11px] uppercase tracking-wider text-ink-500 font-semibold block">Media & Cost Allocation</span>
          <span className="text-base font-bold text-ink-300">
            {formatMoney(money(mediaBuyCents, curr))}
          </span>
        </div>
        <div>
          <span className="text-[11px] uppercase tracking-wider text-ink-500 font-semibold block">Target ROAS</span>
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-signal-cyan">4.2x</span>
            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-signal-cyan/10 text-signal-cyan rounded border border-signal-cyan/20">
              +320% ROI
            </span>
          </div>
        </div>
      </div>

      <Tabs tabs={TAB_DEFS} active={activeTab} onChange={(key) => setParams({ tab: key })} />

      <div className="mt-5">
        {activeTab === "overview" && <OverviewTab campaign={campaign} />}
        {activeTab === "inventory" && <InventoryTab campaign={campaign} onChanged={campaignState.reload} />}
        {activeTab === "schedule" && <ScheduleTab campaign={campaign} />}
        {activeTab === "creatives" && <CreativesTab campaign={campaign} />}
        {activeTab === "approvals" && <ApprovalsTab campaign={campaign} />}
        {activeTab === "delivery" && <DeliveryTab campaign={campaign} />}
        {activeTab === "pop" && <ProofOfPlayTab campaign={campaign} />}
        {activeTab === "analytics" && <AnalyticsTab campaign={campaign} />}
        {activeTab === "billing" && <BillingTab campaign={campaign} />}
        {activeTab === "activity" && <ActivityTab campaign={campaign} />}
      </div>
    </div>
  );
};
