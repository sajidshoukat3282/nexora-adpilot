import React, { useState, useEffect } from "react";    
import { StatusBadge, campaignStatusTone, proposalStatusTone, invoiceStatusTone } from "@/components/ui/StatusBadge";
import { Skeleton } from "@/components/ui/Feedback";
import { useAsync } from "@/hooks/useAsync";  
import { repo } from "@/repositories/demo";
import { Link } from "@/lib/router";
import type { Client } from "@/domain";
import { CAMPAIGN_STATUS_LABELS, PROPOSAL_STATUS_LABELS, INVOICE_STATUS_LABELS, formatMoney } from "@/domain";
import AddContactForm from "./AddContactForm";
import EditClientForm from "./EditClientForm";
import { FDrawer, FIN } from "../finance/financeUi";
import { ActivityComposer, ActivityList, TemplateSender } from "./LeadActivityPanel";
import { HEALTH_STYLE } from "./crmStyles";
import { clientFinance, money, todayIso, type CrmActivity } from "./crmTools";
import { getDefaultCurrency } from "@/lib/companyDefaults";

const H = "mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400";

export const ClientDetailDrawer: React.FC<{ client: Client | null; onClose: () => void }> = ({ client, onClose }) => {
  // Asli Contacts ka state
  const [contactsData, setContactsData] = useState<any[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);

  // Edit Client Form State
  const [showEditForm, setShowEditForm] = useState(false);

  // Client 360 (real invoices / campaigns / activity)
  const [allInvoices, setAllInvoices] = useState<any[]>([]);
  const [allCampaigns, setAllCampaigns] = useState<any[]>([]);
  const [activities, setActivities] = useState<CrmActivity[]>([]);

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

  const fetchActivities = async () => {
    if (!client) return;
    try {
      const res = await fetch(`/api/crm-activities?entity_type=client&entity_id=${client.id}`);
      const data = await res.json();
      if (data.ok) setActivities(data.data || []);
    } catch (error) {
      console.error("Error fetching activity", error);
    }
  };

  const fetchFinanceBits = async () => {
    try {
      const [iRes, cRes] = await Promise.all([fetch("/api/invoices"), fetch("/api/campaigns")]);
      const iData = await iRes.json();
      const cData = await cRes.json();
      if (iData.ok) setAllInvoices(iData.data || []);
      if (cData.ok) setAllCampaigns(cData.data || []);
    } catch (error) {
      console.error("Error fetching client finance", error);
    }
  };

  useEffect(() => {
    if (client) {
      fetchContacts();
      fetchActivities();
      fetchFinanceBits();
    } else {
      setActivities([]);
    }
  }, [client?.id]);

  // Purane demo hooks (Baqi sections ke liye)
  const campaigns = useAsync(() => (client ? repo.campaigns.listCampaigns({ clientId: client.id }) : Promise.resolve([])), [client?.id]);
  const proposals = useAsync(() => repo.proposals.listProposals(), [client?.id]);
  const invoices = useAsync(() => repo.finance.listInvoices(), [client?.id]);

  const clientProposals = proposals.data?.filter((p) => p.clientId === client?.id) ?? [];
  const clientInvoices = invoices.data?.filter((i) => i.clientId === client?.id) ?? [];

  const today = todayIso();
  const fin = client ? clientFinance(client, allInvoices, allCampaigns, today) : null;
  const health = fin ? HEALTH_STYLE[fin.health] : null;
  const c360: any = client ?? {};
  const currency = c360.currency || getDefaultCurrency();

  // relationship timeline: invoices + campaigns + logged activity, newest first
  const timeline = client
    ? [
        ...allInvoices
          .filter((i) => i.client_id === client.id && i.status !== "draft")
          .map((i) => ({ at: String(i.issue_date || i.created_at || "").slice(0, 10), icon: "ðŸ§¾", text: `Invoice ${i.invoice_number} - ${money(Number(i.total_amount) || 0, i.currency || getDefaultCurrency())} (${i.status})` })),
        ...allCampaigns
          .filter((c) => c.client_id === client.id)
          .map((c) => ({ at: String(c.start_date || c.created_at || "").slice(0, 10), icon: "ðŸ“£", text: `Campaign "${c.name}" ${c.status} (${String(c.start_date || "").slice(0, 10)} to ${String(c.end_date || "").slice(0, 10)})` })),
        ...activities.map((a) => ({ at: String(a.created_at).slice(0, 10), icon: "ðŸ“", text: `${a.kind}${a.note ? `: ${a.note}` : ""}` })),
      ]
        .filter((t) => t.at)
        .sort((a, b) => (a.at < b.at ? 1 : -1))
        .slice(0, 12)
    : [];

  return (
    <>
    <FDrawer open={!!client} onClose={onClose} title={client?.name ?? ""} subtitle={client?.industry}>
      {client && fin && health && (
        <div className="space-y-5">

          {/* CLIENT PROFILE HEADER & EDIT BUTTON */}
          <div className="flex items-center justify-between border-b border-[#2a2f37] pb-3">
            <div className="text-[12px] text-zinc-400">
              <span className="block">City: <span className="text-zinc-100">{(client as any).city || 'N/A'}</span></span>
              <span className="mt-1 block">Limit: <span className="text-[#f1d68a]">{(client as any).credit_limit || 0} {(client as any).currency || getDefaultCurrency()}</span></span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${health.cls}`}>{health.label}</span>
              <button onClick={() => setShowEditForm(true)} className={FIN.btnGhost}>
                âœï¸ Edit Client
              </button>
            </div>
          </div>

          {/* CLIENT 360 */}
          <section>
            <h4 className={H}>Client 360</h4>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Invoiced", value: money(fin.invoiced, currency), cls: "text-zinc-100" },
                { label: "Collected", value: money(fin.paid, currency), cls: "text-emerald-300" },
                { label: "Outstanding", value: money(fin.outstanding, currency), cls: "text-[#f1d68a]" },
                { label: "Overdue", value: money(fin.overdue, currency), cls: fin.overdue > 0 ? "text-rose-300" : "text-zinc-400" },
              ].map((s) => (
                <div key={s.label} className="rounded-lg border border-[#2a2f37] bg-[#0f1216] p-2.5">
                  <p className="text-[9px] uppercase tracking-[0.14em] text-zinc-500">{s.label}</p>
                  <p className={`mt-0.5 text-[13px] font-semibold ${s.cls}`}>{s.value}</p>
                </div>
              ))}
            </div>

            {fin.creditUsedPct !== null && (
              <div className="mt-2.5">
                <div className="mb-1 flex justify-between text-[10px] text-zinc-400">
                  <span>Credit used</span>
                  <span>{Math.round(fin.creditUsedPct)}% of {money(fin.creditLimit, currency)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#0f1216]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, fin.creditUsedPct)}%`,
                      background: fin.creditUsedPct >= 100 ? "#e11d48" : fin.creditUsedPct >= 80 ? "#fbbf24" : "linear-gradient(90deg,#c99b3b,#f1d68a)",
                    }}
                  />
                </div>
              </div>
            )}

            <p className="mt-2 text-[11px] text-zinc-500">
              {fin.campaignCount} campaign{fin.campaignCount === 1 ? "" : "s"} ({fin.activeCampaigns} active) Â· {fin.invoiceCount} invoice{fin.invoiceCount === 1 ? "" : "s"}
              {fin.healthReasons.length > 0 && <span className="text-zinc-400"> Â· {fin.healthReasons.join(" Â· ")}</span>}
            </p>
          </section>

          {/* MESSAGE */}
          <section>
            <h4 className={H}>Message</h4>
            <TemplateSender
              phone={(client as any).phone}
              email={(client as any).email}
              defaultKey={fin.overdue > 0 ? "paymentReminder" : "followUp"}
              vars={{ name: client.name, amount: fin.overdue > 0 ? money(fin.overdue, currency) : undefined }}
              subject={`Regarding ${client.name}`}
            />
          </section>

          {/* CONTACTS SECTION */}
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">Contacts</h4>
              <button onClick={() => setShowContactForm(true)} className="text-[11px] font-semibold text-[#e5c36a] hover:text-[#f1d68a]">
                + Add Contact
              </button>
            </div>

            {loadingContacts && <Skeleton className="h-14 w-full" />}
            <div className="space-y-2">
              {contactsData.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border border-[#22262d] bg-[#0f1216] p-2.5">
                  <div>
                    <div className="text-[12px] font-medium text-zinc-100">
                      {c.name} {c.is_primary === 1 && <span className="ml-1 text-[9px] font-semibold text-[#f1d68a]">PRIMARY</span>}
                    </div>
                    <div className="text-[11px] text-zinc-500">{c.title}</div>
                  </div>
                  <div className="text-right text-[11px] text-zinc-400">
                    <div>{c.email}</div>
                    <div>{c.phone}</div>
                  </div>
                </div>
              ))}
              {contactsData.length === 0 && !loadingContacts && (
                <p className="text-[12px] text-zinc-500">No contacts yet.</p>
              )}
            </div>
          </section>

          {/* LOG ACTIVITY */}
          <section>
            <h4 className={H}>Log activity / schedule follow-up</h4>
            <ActivityComposer entityType="client" entityId={client.id} onSaved={fetchActivities} />
            <div className="mt-2.5">
              <ActivityList activities={activities} today={today} onChanged={fetchActivities} />
            </div>
          </section>

          {/* RELATIONSHIP TIMELINE */}
          <section>
            <h4 className={H}>Relationship Timeline</h4>
            {timeline.length === 0 ? (
              <p className="text-[12px] text-zinc-500">Nothing yet.</p>
            ) : (
              <ol className="relative space-y-2 border-l border-[#c99b3b]/30 pl-4">
                {timeline.map((t, idx) => (
                  <li key={idx} className="relative">
                    <span className="absolute -left-[22px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#14171c] text-[10px]">{t.icon}</span>
                    <p className="text-[12px] text-zinc-200">{t.text}</p>
                    <p className="text-[10px] text-zinc-500">{t.at}</p>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {/* CAMPAIGN HISTORY */}
          <section>
            <h4 className={H}>Campaign History</h4>
            {campaigns.loading && <Skeleton className="h-10 w-full" />}
            <div className="space-y-1.5">
              {campaigns.data?.map((c) => (
                <Link key={c.id} to={`/campaigns/${c.id}`} className="-mx-1 flex items-center justify-between rounded-lg px-3 py-2 hover:bg-white/[0.04]">
                  <div className="text-[12px] text-zinc-100">{c.name}</div>
                  <StatusBadge label={CAMPAIGN_STATUS_LABELS[c.status]} tone={campaignStatusTone(c.status)} />
                </Link>
              ))}
              {campaigns.data?.length === 0 && !campaigns.loading && (
                <p className="text-[12px] text-zinc-500">No campaigns yet.</p>
              )}
            </div>
          </section>

          {/* PROPOSALS */}
          <section>
            <h4 className={H}>Proposals</h4>
            <div className="space-y-1.5">
              {clientProposals.map((p) => (
                <div key={p.id} className="-mx-1 flex items-center justify-between rounded-lg px-3 py-2 hover:bg-white/[0.04]">
                  <div>
                    <div className="text-[12px] text-zinc-100">{p.campaignName}</div>
                    <div className="text-[11px] text-zinc-500">{p.code}</div>
                  </div>
                  <StatusBadge label={PROPOSAL_STATUS_LABELS[p.status]} tone={proposalStatusTone(p.status)} />
                </div>
              ))}
              {clientProposals.length === 0 && <p className="text-[12px] text-zinc-500">No proposals yet.</p>}
            </div>
          </section>

          {/* INVOICES */}
          <section>
            <h4 className={H}>Invoices</h4>
            <div className="space-y-1.5">
              {clientInvoices.map((i) => (
                <div key={i.id} className="-mx-1 flex items-center justify-between rounded-lg px-3 py-2 hover:bg-white/[0.04]">
                  <div>
                    <div className="text-[12px] text-zinc-100">{i.code}</div>
                    <div className="text-[11px] text-zinc-500">{formatMoney(i.total)}</div>
                  </div>
                  <StatusBadge label={INVOICE_STATUS_LABELS[i.status]} tone={invoiceStatusTone(i.status)} />
                </div>
              ))}
              {clientInvoices.length === 0 && <p className="text-[12px] text-zinc-500">No invoices yet.</p>}
            </div>
          </section>
        </div>
      )}

    </FDrawer>

      {/* Contact Form Modal */}
      {showContactForm && (
        <div className={`${FIN.overlay} !z-[60]`}>
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
        <div className={`${FIN.overlay} !z-[60]`}>
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
    </>
  );
};
