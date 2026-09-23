import React, { useState, useEffect } from "react";
import { FiPlus } from "react-icons/fi";
import { PageHeader } from "@/components/layout/AppShell";
import { DataTable, ColumnDef } from "@/components/ui/DataTable";
import { StatusBadge, campaignStatusTone } from "@/components/ui/StatusBadge";
import { PermissionGate } from "@/components/ui/PermissionGate";
import { NewCampaignModal } from "./NewCampaignModal";
import { useAsync } from "@/hooks/useAsync";
import { repo } from "@/repositories/demo";
import { useNavigate, useSearchParams } from "@/lib/router";
import type { Campaign, CampaignStatus, Proposal } from "@/domain";
import { CAMPAIGN_STATUS_LABELS, formatMoney } from "@/domain";

const STATUS_FILTERS: Array<CampaignStatus | "all"> = [
  "all", "draft", "proposal", "pending_approval", "booked", "scheduled", "live", "completed", "archived", "cancelled",
];

export const CampaignsListPage: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [fromProposal, setFromProposal] = useState<Proposal | null>(null);
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const campaigns = useAsync(
    () => repo.campaigns.listCampaigns({ search: search || undefined, status: statusFilter === "all" ? undefined : [statusFilter] }),
    [search, statusFilter]
  );
  const clients = useAsync(() => repo.crm.listClients(), []);

  // Completes the "Convert to Campaign" link from an accepted Proposal.
  useEffect(() => {
    const proposalId = params.get("fromProposal");
    if (proposalId) {
      repo.proposals.getProposal(proposalId).then((p) => {
        if (p) {
          setFromProposal(p);
          setModalOpen(true);
        }
      });
      setParams({ fromProposal: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  function clientName(clientId: string): string {
    return clients.data?.find((c) => c.id === clientId)?.name ?? "—";
  }

  return (
    <div>
      <PageHeader
        title="Campaigns"
        description="Every campaign across Vantage Outdoor Media, from first draft to completed delivery."
        actions={
          <PermissionGate permission="campaigns.manage" fallback={null}>
            <button className="btn-primary" onClick={() => { setFromProposal(null); setModalOpen(true); }}>
              <FiPlus size={15} /> New Campaign
            </button>
          </PermissionGate>
        }
      />

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input
          value={search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          placeholder="Search campaigns..."
          className="input max-w-xs"
        />
        <div className="flex-1" />
      </div>

      <div className="flex items-center gap-1.5 mb-4 flex-wrap">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              statusFilter === s ? "bg-signal-cyan text-ink-950" : "bg-ink-800 text-ink-300 hover:bg-ink-700"
            }`}
          >
            {s === "all" ? "All" : CAMPAIGN_STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="panel">
        <DataTable<Campaign>
          columns={campaignColumns(clientName)}
          rows={campaigns.data ?? []}
          keyOf={(c) => c.id}
          onRowClick={(c) => navigate(`/campaigns/${c.id}`)}
          emptyTitle="No campaigns in this status"
        />
      </div>

      <NewCampaignModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setFromProposal(null); }}
        onCreated={(campaign) => {
          setModalOpen(false);
          campaigns.reload();
          navigate(`/campaigns/${campaign.id}`);
        }}
        fromProposal={fromProposal}
      />
    </div>
  );
};

function campaignColumns(clientName: (id: string) => string): ColumnDef<Campaign>[] {
  return [
    { key: "code", header: "Code", sortValue: (c) => c.code, render: (c) => <span className="font-mono text-xs text-ink-400">{c.code}</span> },
    { key: "name", header: "Campaign", sortValue: (c) => c.name, render: (c) => <span className="font-medium text-ink-100">{c.name}</span> },
    { key: "client", header: "Client", render: (c) => <span className="text-ink-300">{clientName(c.clientId)}</span> },
    { key: "brand", header: "Brand", render: (c) => <span className="text-ink-400 text-sm">{c.brand}</span> },
    { key: "dates", header: "Dates", render: (c) => <span className="text-ink-400 text-xs">{c.schedule.startDate} → {c.schedule.endDate}</span> },
    { key: "budget", header: "Budget", sortValue: (c) => c.budget.total.amountCents, render: (c) => <span className="text-ink-100 font-semibold">{formatMoney(c.budget.total)}</span> },
    {
      key: "status", header: "Status", sortValue: (c) => c.status,
      render: (c) => <StatusBadge label={CAMPAIGN_STATUS_LABELS[c.status]} tone={campaignStatusTone(c.status)} />,
    },
  ];
}
