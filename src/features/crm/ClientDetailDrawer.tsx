import React from "react";
import { Drawer } from "@/components/ui/Drawer";
import { StatusBadge, campaignStatusTone, proposalStatusTone, invoiceStatusTone } from "@/components/ui/StatusBadge";
import { Skeleton } from "@/components/ui/Feedback";
import { useAsync } from "@/hooks/useAsync";
import { repo } from "@/repositories/demo";
import { Link } from "@/lib/router";
import type { Client } from "@/domain";
import { CAMPAIGN_STATUS_LABELS, PROPOSAL_STATUS_LABELS, INVOICE_STATUS_LABELS, formatMoney } from "@/domain";

export const ClientDetailDrawer: React.FC<{ client: Client | null; onClose: () => void }> = ({ client, onClose }) => {
  const contacts = useAsync(() => (client ? repo.crm.listContactsForClient(client.id) : Promise.resolve([])), [client?.id]);
  const campaigns = useAsync(() => (client ? repo.campaigns.listCampaigns({ clientId: client.id }) : Promise.resolve([])), [client?.id]);
  const proposals = useAsync(() => repo.proposals.listProposals(), [client?.id]);
  const invoices = useAsync(() => repo.finance.listInvoices(), [client?.id]);

  const clientProposals = proposals.data?.filter((p) => p.clientId === client?.id) ?? [];
  const clientInvoices = invoices.data?.filter((i) => i.clientId === client?.id) ?? [];

  return (
    <Drawer open={!!client} onClose={onClose} title={client?.name ?? ""} subtitle={client?.industry}>
      {client && (
        <div className="space-y-6">
          <section>
            <h4 className="text-xs font-bold uppercase tracking-wide text-ink-400 mb-2">Contacts</h4>
            {contacts.loading && <Skeleton className="h-14 w-full" />}
            <div className="space-y-2">
              {contacts.data?.map((c) => (
                <div key={c.id} className="panel p-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-ink-100">
                      {c.name} {c.primary && <span className="text-[10px] text-signal-cyan ml-1">PRIMARY</span>}
                    </div>
                    <div className="text-xs text-ink-500">{c.title}</div>
                  </div>
                  <div className="text-right text-xs text-ink-400">
                    <div>{c.email}</div>
                    <div>{c.phone}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h4 className="text-xs font-bold uppercase tracking-wide text-ink-400 mb-2">Campaign History</h4>
            {campaigns.loading && <Skeleton className="h-10 w-full" />}
            <div className="space-y-1.5">
              {campaigns.data?.map((c) => (
                <Link key={c.id} to={`/campaigns/${c.id}`} className="flex items-center justify-between px-3 py-2 -mx-1 rounded-lg hover:bg-ink-800/50">
                  <div className="text-sm text-ink-100">{c.name}</div>
                  <StatusBadge label={CAMPAIGN_STATUS_LABELS[c.status]} tone={campaignStatusTone(c.status)} />
                </Link>
              ))}
              {campaigns.data?.length === 0 && !campaigns.loading && (
                <p className="text-xs text-ink-500">No campaigns yet.</p>
              )}
            </div>
          </section>

          <section>
            <h4 className="text-xs font-bold uppercase tracking-wide text-ink-400 mb-2">Proposals</h4>
            <div className="space-y-1.5">
              {clientProposals.map((p) => (
                <div key={p.id} className="flex items-center justify-between px-3 py-2 -mx-1 rounded-lg hover:bg-ink-800/50">
                  <div>
                    <div className="text-sm text-ink-100">{p.campaignName}</div>
                    <div className="text-xs text-ink-500">{p.code}</div>
                  </div>
                  <StatusBadge label={PROPOSAL_STATUS_LABELS[p.status]} tone={proposalStatusTone(p.status)} />
                </div>
              ))}
              {clientProposals.length === 0 && <p className="text-xs text-ink-500">No proposals yet.</p>}
            </div>
          </section>

          <section>
            <h4 className="text-xs font-bold uppercase tracking-wide text-ink-400 mb-2">Invoices</h4>
            <div className="space-y-1.5">
              {clientInvoices.map((i) => (
                <div key={i.id} className="flex items-center justify-between px-3 py-2 -mx-1 rounded-lg hover:bg-ink-800/50">
                  <div>
                    <div className="text-sm text-ink-100">{i.code}</div>
                    <div className="text-xs text-ink-500">{formatMoney(i.total)}</div>
                  </div>
                  <StatusBadge label={INVOICE_STATUS_LABELS[i.status]} tone={invoiceStatusTone(i.status)} />
                </div>
              ))}
              {clientInvoices.length === 0 && <p className="text-xs text-ink-500">No invoices yet.</p>}
            </div>
          </section>
        </div>
      )}
    </Drawer>
  );
};
