import React, { useState } from "react";
import { PageHeader } from "@/components/layout/AppShell";
import { StatusBadge, campaignStatusTone, proposalStatusTone, invoiceStatusTone } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/Feedback";
import { useAsync } from "@/hooks/useAsync";
import { repo } from "@/repositories/demo";
import type { ApprovalStep, ProposalStatus } from "@/domain";
import { CAMPAIGN_STATUS_LABELS, PROPOSAL_STATUS_LABELS, INVOICE_STATUS_LABELS, formatMoney } from "@/domain";

export const ClientPortalPage: React.FC = () => {
  const [busyId, setBusyId] = useState<string | null>(null);

  // Resolve the demo client the "Client" role represents by matching the
  // fixture client user's email to a CRM contact — a real (if simple) join,
  // not a hardcoded id.
  const clientContext = useAsync(async () => {
    const users = await repo.company.listUsers();
    const clientUser = users.find((u) => u.role === "client");
    if (!clientUser) return null;
    const clients = await repo.crm.listClients();
    for (const client of clients) {
      const contacts = await repo.crm.listContactsForClient(client.id);
      if (contacts.some((c) => c.email === clientUser.email)) return { client, clientUser };
    }
    return null;
  }, []);

  const clientId = clientContext.data?.client.id;

  const campaigns = useAsync(() => (clientId ? repo.campaigns.listCampaigns({ clientId }) : Promise.resolve([])), [clientId]);
  const proposals = useAsync(() => repo.proposals.listProposals(), [clientId]);
  const invoices = useAsync(() => repo.finance.listInvoices(), [clientId]);

  const clientProposals = (proposals.data ?? []).filter((p) => p.clientId === clientId);
  const clientInvoices = (invoices.data ?? []).filter((i) => i.clientId === clientId);

  const pendingCreativesQuery = useAsync(async () => {
    if (!campaigns.data) return [];
    const all = await Promise.all(campaigns.data.map((c) => repo.creatives.listCreativesForCampaign(c.id)));
    return all.flat().filter((c) => c.status === "client_review");
  }, [campaigns.data]);

  async function decideCreative(creativeId: string, decision: ApprovalStep["decision"]) {
    setBusyId(creativeId);
    try {
      await repo.creatives.recordApprovalDecision(creativeId, "client_review", decision, clientContext.data?.clientUser.name ?? "Client", "");
      pendingCreativesQuery.reload();
    } finally {
      setBusyId(null);
    }
  }

  async function decideProposal(proposalId: string, next: ProposalStatus) {
    setBusyId(proposalId);
    try {
      await repo.proposals.transitionProposalStatus(proposalId, next);
      proposals.reload();
    } finally {
      setBusyId(null);
    }
  }

  if (!clientContext.loading && !clientContext.data) {
    return <EmptyState title="No client context found" description="This demo's client user isn't linked to a client record." />;
  }

  return (
    <div>
      <PageHeader
        title={`Welcome back${clientContext.data ? `, ${clientContext.data.client.name}` : ""}`}
        description="Your campaigns, approvals, reports and billing — visible only to your organization."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <div className="panel p-5">
          <h3 className="font-semibold text-ink-50 mb-3">Your Campaigns</h3>
          <div className="space-y-2">
            {campaigns.data?.map((c) => (
              <div key={c.id} className="flex items-center justify-between px-1 py-2">
                <div>
                  <div className="text-sm text-ink-100">{c.name}</div>
                  <div className="text-xs text-ink-500">{c.schedule.startDate} → {c.schedule.endDate}</div>
                </div>
                <StatusBadge label={CAMPAIGN_STATUS_LABELS[c.status]} tone={campaignStatusTone(c.status)} />
              </div>
            ))}
            {campaigns.data?.length === 0 && <p className="text-xs text-ink-500">No campaigns yet.</p>}
          </div>
        </div>

        <div className="panel p-5">
          <h3 className="font-semibold text-ink-50 mb-3">Invoices</h3>
          <div className="space-y-2">
            {clientInvoices.map((i) => (
              <div key={i.id} className="flex items-center justify-between px-1 py-2">
                <div>
                  <div className="text-sm text-ink-100">{i.code}</div>
                  <div className="text-xs text-ink-500">{formatMoney(i.total)}</div>
                </div>
                <StatusBadge label={INVOICE_STATUS_LABELS[i.status]} tone={invoiceStatusTone(i.status)} />
              </div>
            ))}
            {clientInvoices.length === 0 && <p className="text-xs text-ink-500">No invoices yet.</p>}
          </div>
        </div>
      </div>

      <div className="panel p-5 mb-5">
        <h3 className="font-semibold text-ink-50 mb-3">Creatives Awaiting Your Approval</h3>
        <div className="space-y-3">
          {pendingCreativesQuery.data?.map((creative) => (
            <div key={creative.id} className="flex items-center justify-between panel-solid p-3">
              <span className="text-sm text-ink-100">{creative.name}</span>
              <div className="flex gap-2">
                <button className="btn-primary !py-1 !px-2.5 text-xs" disabled={busyId === creative.id} onClick={() => decideCreative(creative.id, "approved")}>
                  Approve
                </button>
                <button className="btn-secondary !py-1 !px-2.5 text-xs" disabled={busyId === creative.id} onClick={() => decideCreative(creative.id, "changes_requested")}>
                  Request Changes
                </button>
              </div>
            </div>
          ))}
          {pendingCreativesQuery.data?.length === 0 && <p className="text-xs text-ink-500">Nothing awaiting your review.</p>}
        </div>
      </div>

      <div className="panel p-5">
        <h3 className="font-semibold text-ink-50 mb-3">Proposals</h3>
        <div className="space-y-3">
          {clientProposals.map((p) => (
            <div key={p.id} className="flex items-center justify-between panel-solid p-3">
              <div>
                <div className="text-sm text-ink-100">{p.campaignName}</div>
                <div className="text-xs text-ink-500">{p.code} · {formatMoney(p.total)}</div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge label={PROPOSAL_STATUS_LABELS[p.status]} tone={proposalStatusTone(p.status)} />
                {p.status === "client_review" && (
                  <>
                    <button className="btn-primary !py-1 !px-2.5 text-xs" disabled={busyId === p.id} onClick={() => decideProposal(p.id, "accepted")}>
                      Accept
                    </button>
                    <button className="btn-secondary !py-1 !px-2.5 text-xs" disabled={busyId === p.id} onClick={() => decideProposal(p.id, "changes_requested")}>
                      Request Changes
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
          {clientProposals.length === 0 && <p className="text-xs text-ink-500">No proposals yet.</p>}
        </div>
      </div>
    </div>
  );
};
