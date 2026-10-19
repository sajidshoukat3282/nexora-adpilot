import React, { useState, useEffect } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { StatusBadge, campaignStatusTone, proposalStatusTone, invoiceStatusTone } from "@/components/ui/StatusBadge";
import { Skeleton } from "@/components/ui/Feedback";
import { useAsync } from "@/hooks/useAsync";
import { repo } from "@/repositories/demo";
import { Link } from "@/lib/router";
import type { Client } from "@/domain";
import { CAMPAIGN_STATUS_LABELS, PROPOSAL_STATUS_LABELS, INVOICE_STATUS_LABELS, formatMoney } from "@/domain";
import AddContactForm from "./AddContactForm";
import EditClientForm from "./EditClientForm";

export const ClientDetailDrawer: React.FC<{ client: Client | null; onClose: () => void }> = ({ client, onClose }) => {
  // Asli Contacts ka state
  const [contactsData, setContactsData] = useState<any[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  
  // Edit Client Form State
  const [showEditForm, setShowEditForm] = useState(false);

  // Contacts fetch karne ka function
  const fetchContacts = async () => {
    if (!client) return;
    setLoadingContacts(true);
    try {
      const res = await fetch(`/api/crm/contacts?client_id=${client.id}`);
      const data = await res.json();
      if (data.ok) {
        setContactsData(data.data);
      }
    } catch (error) {
      console.error("Error fetching contacts", error);
    } finally {
      setLoadingContacts(false);
    }
  };

  useEffect(() => {
    if (client) {
      fetchContacts();
    }
  }, [client?.id]);

  // Purane demo hooks (Baqi sections ke liye)
  const campaigns = useAsync(() => (client ? repo.campaigns.listCampaigns({ clientId: client.id }) : Promise.resolve([])), [client?.id]);
  const proposals = useAsync(() => repo.proposals.listProposals(), [client?.id]);
  const invoices = useAsync(() => repo.finance.listInvoices(), [client?.id]);

  const clientProposals = proposals.data?.filter((p) => p.clientId === client?.id) ?? [];
  const clientInvoices = invoices.data?.filter((i) => i.clientId === client?.id) ?? [];

  return (
    <Drawer open={!!client} onClose={onClose} title={client?.name ?? ""} subtitle={client?.industry}>
      {client && (
        <div className="space-y-6">
          
          {/* CLIENT PROFILE HEADER & EDIT BUTTON */}
          <div className="flex justify-between items-center pb-4 border-b border-gray-700/50">
            <div className="text-sm text-gray-400">
              {/* Yahan (client as any).city kiya hai taake TypeScript error na de */}
              <span className="block">City: <span className="text-white">{(client as any).city || 'N/A'}</span></span>
              <span className="block mt-1">Limit: <span className="text-emerald-400">{(client as any).credit_limit || 0} {(client as any).currency || 'PKR'}</span></span>
            </div>
            <button 
              onClick={() => setShowEditForm(true)} 
              className="text-xs bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white px-3 py-1.5 rounded transition-colors"
            >
              ✏️ Edit Client
            </button>
          </div>

          {/* CONTACTS SECTION */}
          <section>
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wide text-ink-400">Contacts</h4>
              <button onClick={() => setShowContactForm(true)} className="text-xs text-blue-400 hover:text-blue-300 font-semibold">
                + Add Contact
              </button>
            </div>
            
            {loadingContacts && <Skeleton className="h-14 w-full" />}
            <div className="space-y-2">
              {contactsData.map((c) => (
                <div key={c.id} className="panel p-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-ink-100">
                      {c.name} {c.is_primary === 1 && <span className="text-[10px] text-signal-cyan ml-1">PRIMARY</span>}
                    </div>
                    <div className="text-xs text-ink-500">{c.title}</div>
                  </div>
                  <div className="text-right text-xs text-ink-400">
                    <div>{c.email}</div>
                    <div>{c.phone}</div>
                  </div>
                </div>
              ))}
              {contactsData.length === 0 && !loadingContacts && (
                <p className="text-xs text-ink-500">No contacts yet.</p>
              )}
            </div>
          </section>

          {/* CAMPAIGN HISTORY */}
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

          {/* PROPOSALS */}
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

          {/* INVOICES */}
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

      {/* Contact Form Modal */}
      {showContactForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]">
          <AddContactForm 
            clientId={client!.id} 
            onClose={() => { 
              setShowContactForm(false); 
              fetchContacts(); 
            }} 
          />
        </div>
      )}

      {/* Edit Client Form Modal */}
      {showEditForm && client && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]">
          <EditClientForm 
            client={client} 
            onClose={() => setShowEditForm(false)} 
            onSuccess={() => {
              onClose(); 
              window.location.reload(); 
            }} 
          />
        </div>
      )}
    </Drawer>
  );
};
