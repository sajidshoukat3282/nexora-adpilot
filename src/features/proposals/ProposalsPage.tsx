import React, { useState, useEffect } from "react";
import { FiPlus } from "react-icons/fi";
import { PageHeader } from "@/components/layout/AppShell";
import { DataTable, ColumnDef } from "@/components/ui/DataTable";
import { StatusBadge, proposalStatusTone } from "@/components/ui/StatusBadge";
import { PermissionGate } from "@/components/ui/PermissionGate";
import { ProposalBuilderModal } from "./ProposalBuilderModal";
import { ProposalDetailDrawer } from "./ProposalDetailDrawer";
import { useAsync } from "@/hooks/useAsync";
import { repo } from "@/repositories/demo";
import { useSearchParams } from "@/lib/router";
import type { Proposal, ProposalStatus } from "@/domain";
import { PROPOSAL_STATUS_LABELS, formatMoney } from "@/domain";

const STATUS_FILTERS: Array<ProposalStatus | "all"> = [
  "all", "draft", "preview", "sent", "client_review", "accepted", "rejected", "changes_requested",
];

export const ProposalsPage: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<ProposalStatus | "all">("all");
  const [builderOpen, setBuilderOpen] = useState(false);
  const [selected, setSelected] = useState<Proposal | null>(null);

  const proposals = useAsync(
    () => repo.proposals.listProposals(statusFilter === "all" ? undefined : [statusFilter]),
    [statusFilter]
  );
  const clients = useAsync(() => repo.crm.listClients(), []);

  // Completes the Notifications -> Proposals deep link.
  const [linkParams, setLinkParams] = useSearchParams();
  useEffect(() => {
    const proposalId = linkParams.get("proposal");
    if (proposalId && proposals.data) {
      const match = proposals.data.find((p) => p.id === proposalId);
      if (match) setSelected(match);
      setLinkParams({ proposal: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkParams, proposals.data]);

  function clientName(clientId: string): string {
    return clients.data?.find((c) => c.id === clientId)?.name ?? "—";
  }

  return (
    <div>
      <PageHeader
        title="Proposals"
        description="Build, send and track media proposals from first draft to accepted."
        actions={
          <PermissionGate permission="proposals.manage" fallback={null}>
            <button className="btn-primary" onClick={() => setBuilderOpen(true)}>
              <FiPlus size={15} /> New Proposal
            </button>
          </PermissionGate>
        }
      />

      <div className="flex items-center gap-1.5 mb-4 flex-wrap">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              statusFilter === s ? "bg-signal-cyan text-ink-950" : "bg-ink-800 text-ink-300 hover:bg-ink-700"
            }`}
          >
            {s === "all" ? "All" : PROPOSAL_STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="panel">
        <DataTable<Proposal>
          columns={proposalColumns(clientName)}
          rows={proposals.data ?? []}
          keyOf={(p) => p.id}
          onRowClick={(p) => setSelected(p)}
          emptyTitle="No proposals in this status"
          emptyDescription="Create a new proposal to get started."
        />
      </div>

      <ProposalBuilderModal open={builderOpen} onClose={() => setBuilderOpen(false)} onCreated={proposals.reload} />
      <ProposalDetailDrawer
        proposal={selected}
        onClose={() => setSelected(null)}
        onChanged={() => {
          proposals.reload();
          // keep drawer's data fresh after a transition without closing it
          repo.proposals.getProposal(selected!.id).then(setSelected);
        }}
      />
    </div>
  );
};

function proposalColumns(clientName: (id: string) => string): ColumnDef<Proposal>[] {
  return [
    { key: "code", header: "Code", sortValue: (p) => p.code, render: (p) => <span className="font-mono text-xs text-ink-400">{p.code}</span> },
    { key: "campaign", header: "Campaign", sortValue: (p) => p.campaignName, render: (p) => <span className="font-medium text-ink-100">{p.campaignName}</span> },
    { key: "client", header: "Client", render: (p) => <span className="text-ink-300">{clientName(p.clientId)}</span> },
    { key: "dates", header: "Dates", render: (p) => <span className="text-ink-400 text-xs">{p.startDate} → {p.endDate}</span> },
    { key: "total", header: "Total", sortValue: (p) => p.total.amountCents, render: (p) => <span className="text-ink-100 font-semibold">{formatMoney(p.total)}</span> },
    {
      key: "status",
      header: "Status",
      sortValue: (p) => p.status,
      render: (p) => <StatusBadge label={PROPOSAL_STATUS_LABELS[p.status]} tone={proposalStatusTone(p.status)} />,
    },
  ];
}
