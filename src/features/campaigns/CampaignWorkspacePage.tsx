import React from "react";
import { useParams, useSearchParams, Link } from "@/lib/router";
import { PageHeader } from "@/components/layout/AppShell";
import { Tabs } from "@/components/ui/Tabs";
import { ErrorState } from "@/components/ui/Feedback";
import { useAsync } from "@/hooks/useAsync";
import { repo } from "@/repositories/demo";
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
  { key: "billing", label: "Billing" },
  { key: "activity", label: "Activity" },
];

export const CampaignWorkspacePage: React.FC = () => {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const activeTab = params.get("tab") ?? "overview";

  const campaignState = useAsync(() => repo.campaigns.getCampaign(id), [id]);
  const campaign = campaignState.data;

  if (campaignState.loading) {
    return <div className="text-ink-500 text-sm">Loading campaign...</div>;
  }
  if (!campaign) {
    return <ErrorState message={`Campaign "${id}" was not found.`} />;
  }

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
