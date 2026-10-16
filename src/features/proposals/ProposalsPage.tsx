import React, { useState } from "react";
import { FiPlus } from "react-icons/fi";
import { PageHeader } from "@/components/layout/AppShell";
import { DataTable, ColumnDef } from "@/components/ui/DataTable";
import { StatusBadge, proposalStatusTone } from "@/components/ui/StatusBadge";
import { PermissionGate } from "@/components/ui/PermissionGate";
import { StatCard } from "@/components/ui/StatCard";
import { ProposalBuilderModal } from "./ProposalBuilderModal";
import { ProposalDetailDrawer } from "./ProposalDetailDrawer";
import { useAsync } from "@/hooks/useAsync";
import { repo } from "@/repositories/demo";
import type { Proposal } from "@/domain";
import { PROPOSAL_STATUS_LABELS, formatMoney, money } from "@/domain";

export const ProposalsPage: React.FC = () => {
  const [builderOpen, setBuilderOpen] = useState(false);
  const [selected, setSelected] = useState<Proposal | null>(null);

  const proposals = useAsync(() => repo.proposals.listProposals(), []);
  const clients = useAsync(() => repo.crm.listClients(), []);

  function clientName(id: string): string {
    return clients.data?.find((c) => c.id === id)?.name ?? "—";
  }

  const rows = proposals.data ?? [];
  const openRows = rows.filter((p) => !["accepted", "rejected"].includes(p.status));
  const pipelineCents = openRows.reduce((sum, p) => sum + p.total.amountCents, 0);
  const acceptedCents = rows
    .filter((p) => p.status === "accepted")
    .reduce((sum, p) => sum + p.total.amountCents, 0);

  const columns: ColumnDef<Proposal>[] = [
    {
      key: "proposal",
      header: "Proposal",
      sortValue: (p) => p.code,
      render: (p) => (
        <div>
          <div className="font-medium text-ink-100">{p.campaignName}</div>
          <div className="text-xs text-ink-500">{p.code}</div>
        </div>
      ),
    },
    {
      key: "client",
      header: "Client",
      sortValue: (p) => clientName(p.clientId),
      render: (p) => <span className="text-ink-300">{clientName(p.clientId)}</span>,
    },
    {
      key: "status",
      header: "Status",
      sortValue: (p) => p.status,
      render: (p) => (
        <StatusBadge label={PROPOSAL_STATUS_LABELS[p.status]} tone={proposalStatusTone(p.status)} />
      ),
    },
    {
      key: "dates",
      header: "Campaign dates",
      sortValue: (p) => p.startDate,
      render: (p) => (
        <span className="text-xs text-ink-400">
          {p.startDate} → {p.endDate}
        </span>
      ),
    },
    {
      key: "total",
      header: "Total",
      sortValue: (p) => p.total.amountCents,
      render: (p) => <span className="font-medium text-ink-100">{formatMoney(p.total)}</span>,
    },
  ];

  return (
    <PermissionGate permission="proposals.manage" action="view Proposals">
      <div>
        <PageHeader
          title="Proposals"
          description="Build, send and track commercial proposals for your clients."
          actions={
            <button className="btn-primary" onClick={() => setBuilderOpen(true)}>
              <FiPlus size={14} /> New proposal
            </button>
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          <StatCard label="Proposals" value={rows.length} />
          <StatCard
            label="Open pipeline"
            value={pipelineCents / 100}
            format={(n) => formatMoney(money(Math.round(n * 100)))}
            tone="cyan"
          />
          <StatCard
            label="Accepted value"
            value={acceptedCents / 100}
            format={(n) => formatMoney(money(Math.round(n * 100)))}
            tone="green"
          />
        </div>

        <div className="panel">
          <DataTable<Proposal>
            columns={columns}
            rows={rows}
            keyOf={(p) => p.id}
            onRowClick={(p) => setSelected(p)}
            emptyTitle="No proposals yet"
            emptyDescription="Add a client and some inventory first, then create your first proposal."
          />
        </div>

        <ProposalBuilderModal
          open={builderOpen}
          onClose={() => setBuilderOpen(false)}
          onCreated={proposals.reload}
        />

        <ProposalDetailDrawer
          proposal={selected}
          onClose={() => setSelected(null)}
          onChanged={() => {
            proposals.reload();
            setSelected(null);
          }}
        />
      </div>
    </PermissionGate>
  );
};
      
