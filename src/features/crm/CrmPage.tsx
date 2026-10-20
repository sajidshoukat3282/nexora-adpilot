import React, { useState, useEffect, useMemo } from "react";
import { FiSearch, FiPlus, FiDownload, FiTarget, FiTrendingUp, FiUsers, FiCheck } from "react-icons/fi";
import { LeadsBoard } from "./LeadsBoard";
import { ClientDetailDrawer } from "./ClientDetailDrawer";
import { LeadActivityPanel } from "./LeadActivityPanel";
import { CrmFocus } from "./CrmFocus";
import { CrmInsights } from "./CrmInsights";
import { HEALTH_STYLE } from "./crmStyles";
import { useSession } from "@/hooks/useSession";
import type { Client } from "@/domain";
import AddClientForm from "./AddClientForm";
import AddLeadForm from "./AddLeadForm";
import { FIN, GOLD_CARD, SILVER_CARD, fit } from "../finance/financeUi";
import {
  buildFocus,
  clientFinance,
  downloadCsv,
  isStaleLead,
  leadName,
  leadValue,
  money,
  nextFollowUps,
  followUpState,
  pipelineStats,
  scoreLead,
  todayIso,
  toCsv,
  type CrmActivity,
} from "./crmTools";

type SortKey = "name" | "industry" | "credit_limit" | "outstanding";

export const CrmPage: React.FC = () => {
  const { company } = useSession();
  const [tab, setTab] = useState<"leads" | "clients" | "insights">("leads");
  const [search, setSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedLead, setSelectedLead] = useState<any | null>(null);

  const [leadsData, setLeadsData] = useState<any[]>([]);
  const [clientsData, setClientsData] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  // extra data for scoring / client health / focus
  const [activities, setActivities] = useState<CrmActivity[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);

  const [showClientForm, setShowClientForm] = useState(false);
  const [showLeadForm, setShowLeadForm] = useState(false);

  // pipeline filters + client sorting
  const [leadSearch, setLeadSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [attentionOnly, setAttentionOnly] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "name", dir: 1 });

  const today = todayIso();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [clientsRes, leadsRes] = await Promise.all([
        fetch('/api/crm/clients'),
        fetch('/api/crm/leads')
      ]);

      const cData = await clientsRes.json();
      const lData = await leadsRes.json();

      if (cData.ok) {
        const mappedClients: any = cData.data.map((c: any) => ({
          ...c,
          logoInitial: c.name ? c.name.charAt(0).toUpperCase() : 'C',
          isPortalEnabled: c.portal_status === 'active',
          isPortalInvited: c.portal_status === 'invited',
          industry: c.industry || 'N/A'
        }));
        setClientsData(mappedClients);
      }

      if (lData.ok) {
        const mappedLeads = lData.data.map((l: any) => ({
          ...l,
          companyName: l.company_name,
          contactName: l.contact_name,
          estimatedValue: l.estimated_value,
          convertedClientId: l.converted_client_id
        }));
        setLeadsData(mappedLeads);
      }
    } catch (error) {
      console.error("Error fetching CRM data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchActivities = async () => {
    try {
      const res = await fetch('/api/crm-activities');
      const data = await res.json();
      if (data.ok) setActivities(data.data || []);
    } catch (error) {
      console.error("Error fetching CRM activity:", error);
    }
  };

  const fetchExtras = async () => {
    try {
      const [iRes, cRes] = await Promise.all([fetch('/api/invoices'), fetch('/api/campaigns')]);
      const iData = await iRes.json();
      const cData = await cRes.json();
      if (iData.ok) setInvoices(iData.data || []);
      if (cData.ok) setCampaigns(cData.data || []);
    } catch (error) {
      console.error("Error fetching CRM finance data:", error);
    }
  };

  useEffect(() => {
    fetchData();
    fetchActivities();
    fetchExtras();
  }, []);

  const handleInvite = async (clientId: string) => {
    try {
      const res = await fetch(`/api/crm/clients/${clientId}/invite`, {
        method: 'POST'
      });
      const data = await res.json();

      if (data.ok) {
        alert("Client invited successfully! (Portal email will be sent soon)");
        fetchData(); // List refresh karein
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error(error);
      alert("Network error while inviting client.");
    }
  };

  const filteredClients = clientsData.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  /* ---------- derived data ---------- */
  const follow = useMemo(() => nextFollowUps(activities), [activities]);
  const stats = useMemo(() => pipelineStats(leadsData, today), [leadsData, today]);
  const focusItems = useMemo(
    () => buildFocus(leadsData, clientsData, activities, invoices, campaigns, today),
    [leadsData, clientsData, activities, invoices, campaigns, today],
  );
  const finByClient = useMemo(() => {
    const map = new Map<string, ReturnType<typeof clientFinance>>();
    for (const c of clientsData as any[]) map.set(String(c.id), clientFinance(c, invoices, campaigns, today));
    return map;
  }, [clientsData, invoices, campaigns, today]);

  const sources = useMemo(
    () => Array.from(new Set(leadsData.map((l) => String(l.source || "")).filter(Boolean))),
    [leadsData],
  );

  const visibleLeads = leadsData.filter((l) => {
    const q = leadSearch.trim().toLowerCase();
    if (q && !`${l.company_name ?? ""} ${l.contact_name ?? ""} ${l.phone ?? ""} ${l.email ?? ""}`.toLowerCase().includes(q)) return false;
    if (sourceFilter !== "all" && String(l.source) !== sourceFilter) return false;
    if (attentionOnly) {
      const fs = followUpState(follow[String(l.id)], today);
      if (!(isStaleLead(l, today) || fs === "overdue" || fs === "today")) return false;
    }
    return true;
  });

  const sortedClients = [...filteredClients].sort((a: any, b: any) => {
    const val = (c: any) =>
      sort.key === "name" ? String(c.name).toLowerCase()
        : sort.key === "industry" ? String(c.industry).toLowerCase()
          : sort.key === "credit_limit" ? Number(c.credit_limit) || 0
            : finByClient.get(String(c.id))?.outstanding ?? 0;
    const x = val(a), y = val(b);
    return x < y ? -sort.dir : x > y ? sort.dir : 0;
  });

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: 1 }));

  const openFromFocus = (target: { type: "lead" | "client"; id: string }) => {
    if (target.type === "lead") {
      const lead = leadsData.find((l) => String(l.id) === target.id);
      if (lead) { setSelectedLead(lead); }
    } else {
      const client = clientsData.find((c: any) => String(c.id) === target.id);
      if (client) { setSelectedClient(client); }
    }
  };

  const exportCsv = () => {
    if (tab === "clients") {
      const rows = sortedClients.map((c: any) => {
        const f = finByClient.get(String(c.id));
        return { ...c, outstanding: f?.outstanding ?? 0, overdue: f?.overdue ?? 0, health: f ? HEALTH_STYLE[f.health].label : "" };
      });
      downloadCsv(`clients-${today}.csv`, toCsv(rows, [
        { key: "name", label: "Client" }, { key: "industry", label: "Industry" }, { key: "city", label: "City" },
        { key: "phone", label: "Phone" }, { key: "email", label: "Email" }, { key: "credit_limit", label: "Credit Limit" },
        { key: "outstanding", label: "Outstanding" }, { key: "overdue", label: "Overdue" }, { key: "health", label: "Health" },
      ]));
    } else {
      const rows = visibleLeads.map((l) => {
        const sc = scoreLead(l, follow[String(l.id)], today);
        return { ...l, value: leadValue(l), score: sc.score, tier: sc.tier, next_follow_up: follow[String(l.id)] ?? "" };
      });
      downloadCsv(`leads-${today}.csv`, toCsv(rows, [
        { key: "company_name", label: "Company" }, { key: "contact_name", label: "Contact" }, { key: "phone", label: "Phone" },
        { key: "email", label: "Email" }, { key: "stage", label: "Stage" }, { key: "value", label: "Est. Value" },
        { key: "source", label: "Source" }, { key: "score", label: "Score" }, { key: "tier", label: "Tier" },
        { key: "next_follow_up", label: "Next Follow-up" }, { key: "created_at", label: "Created" },
      ]));
    }
  };

  const tabClass = (t: string) =>
    `whitespace-nowrap border-b-2 px-3.5 py-2.5 text-[11px] font-semibold tracking-wide transition-colors ${
      tab === t ? 'border-[#d9b45a] text-[#f1d68a]' : 'border-transparent text-zinc-500 hover:text-zinc-300'
    }`;

  const th = "px-2.5 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400";
  const sortTh = (label: string, key: SortKey, right = false) => (
    <th className={`${th} ${right ? "text-right" : ""}`}>
      <button type="button" onClick={() => toggleSort(key)} className="uppercase tracking-[0.12em] hover:text-[#f1d68a]">
        {label} {sort.key === key ? (sort.dir === 1 ? "▲" : "▼") : ""}
      </button>
    </th>
  );

  const openText = money(stats.openValue);
  const weightedText = money(stats.weighted);
  const winText = stats.winRate === null ? "-" : `${stats.winRate.toFixed(0)}%`;
  const dupLeads = leadsData.map((l) => ({ id: String(l.id), name: leadName(l), phone: l.phone, email: l.email }));
  const dupClients = (clientsData as any[]).map((c) => ({ id: String(c.id), name: String(c.name), phone: c.phone, email: c.email }));

  return (
    <div className={FIN.page}>
      {/* ===== header ===== */}
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[18px] font-normal tracking-tight text-zinc-100">CRM &amp; Leads</h1>
          <p className="mt-0.5 text-[11px] text-zinc-500">{`Sales pipeline and client roster for ${company?.name ?? "your company"}.`}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {tab !== "insights" && (
            <button onClick={exportCsv} className={FIN.btnGhost}>
              <FiDownload size={13} className="text-sky-400" /> Export CSV
            </button>
          )}
          <button onClick={() => setShowLeadForm(true)} className={FIN.btnGold}>
            <FiPlus size={13} /> Add Lead
          </button>
          <button onClick={() => setShowClientForm(true)} className={FIN.btnGhost}>
            <FiPlus size={13} className="text-emerald-400" /> Add Client
          </button>
        </div>
      </div>

      {/* ===== KPI strip ===== */}
      <div className="no-print mb-4 grid grid-cols-2 gap-2.5 xl:grid-cols-5">
        <div style={GOLD_CARD} className="flex min-h-[78px] min-w-0 flex-col justify-between rounded-xl border border-[#f6e2a1]/50 p-3">
          <div className="flex items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black/15 text-[#3d2a05]"><FiTarget size={12} /></span>
            <p className="text-[11px] font-medium text-[#6b4a0c]">Open Pipeline</p>
          </div>
          <h3 className="max-w-full whitespace-nowrap font-semibold leading-none text-[#1a1204]" style={{ fontSize: fit(openText, 22) }}>{openText}</h3>
        </div>

        <div className={`${FIN.panel} flex min-h-[78px] min-w-0 flex-col justify-between p-3`}>
          <div className="flex items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#c99b3b]/15 text-[#e5c36a]"><FiTrendingUp size={12} /></span>
            <p className="text-[11px] font-medium text-zinc-300">Weighted Forecast</p>
          </div>
          <h3 className="max-w-full whitespace-nowrap font-semibold leading-none text-[#f1d68a]" style={{ fontSize: fit(weightedText, 22) }}>{weightedText}</h3>
        </div>

        <div className={`${FIN.panel} flex min-h-[78px] min-w-0 flex-col justify-between p-3`}>
          <div className="flex items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400"><FiCheck size={12} /></span>
            <p className="text-[11px] font-medium text-zinc-300">Win Rate</p>
          </div>
          <h3 className="font-semibold leading-none text-white" style={{ fontSize: 22 }}>{winText}
            <span className="ml-1.5 text-[10px] font-normal text-zinc-500">{stats.won} won / {stats.lost} lost</span>
          </h3>
        </div>

        <div className={`${FIN.panel} flex min-h-[78px] min-w-0 flex-col justify-between p-3`}>
          <div className="flex items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-500/15 text-sky-400"><FiPlus size={12} /></span>
            <p className="text-[11px] font-medium text-zinc-300">New Leads (this month)</p>
          </div>
          <h3 className="font-semibold leading-none text-white" style={{ fontSize: 22 }}>{stats.newThisMonth}</h3>
        </div>

        <div style={SILVER_CARD} className="col-span-2 flex min-h-[78px] min-w-0 flex-col justify-between rounded-xl border border-white/40 p-3 xl:col-span-1">
          <div className="flex items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black/10 text-[#3a3f46]"><FiUsers size={12} /></span>
            <p className="text-[11px] font-medium text-[#3a3f46]">Clients</p>
          </div>
          <h3 className="font-semibold leading-none text-[#22262b]" style={{ fontSize: 22 }}>{clientsData.length}</h3>
        </div>
      </div>

      {/* ===== Today's Focus ===== */}
      <CrmFocus items={focusItems} loading={loading} onOpen={openFromFocus} />

      {/* ===== tabs ===== */}
      <div className="no-print mb-3 flex overflow-x-auto border-b border-[#2a2f37]">
        <button onClick={() => setTab("leads")} className={tabClass("leads")}>
          Pipeline ({leadsData.filter((l) => !["won", "lost"].includes(l.stage)).length})
        </button>
        <button onClick={() => setTab("clients")} className={tabClass("clients")}>Clients ({clientsData.length})</button>
        <button onClick={() => setTab("insights")} className={tabClass("insights")}>Insights</button>
      </div>

      <div className="mt-3">
        {tab === "leads" && (
          <div>
            <div className="no-print mb-3 flex flex-wrap items-center gap-2">
              <div className="relative w-full max-w-xs">
                <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={13} />
                <input
                  value={leadSearch}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLeadSearch(e.target.value)}
                  placeholder="Search leads..."
                  className={`${FIN.input} pl-8`}
                />
              </div>
              <select
                value={sourceFilter}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSourceFilter(e.target.value)}
                className={`${FIN.input} !w-auto`}
              >
                <option value="all">All sources</option>
                {sources.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-zinc-400">
                <input
                  type="checkbox"
                  checked={attentionOnly}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAttentionOnly(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-[#2b3038] bg-[#0f1216] accent-[#c99b3b]"
                />
                Needs attention (stale / follow-up due)
              </label>
            </div>
            <LeadsBoard
              leads={visibleLeads}
              loading={loading}
              onChanged={() => { fetchData(); fetchActivities(); }}
              activities={activities}
              onOpenLead={(lead) => setSelectedLead(lead)}
            />
          </div>
        )}

        {tab === "clients" && (
          <div>
            <div className="relative mb-3 max-w-xs">
              <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={13} />
              <input
                value={search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                placeholder="Search clients..."
                className={`${FIN.input} pl-8`}
              />
            </div>
            <div className={`${FIN.panel} overflow-hidden`}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-left">
                  <thead>
                    <tr className="border-b border-[#2a2f37] bg-[#12151a]">
                      {sortTh("Client", "name")}
                      {sortTh("Industry", "industry")}
                      {sortTh("Credit Limit", "credit_limit")}
                      {sortTh("Outstanding", "outstanding", true)}
                      <th className={th}>Health</th>
                      <th className={th}>Client Portal</th>
                      <th className={th}>Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1d2128]">
                    {sortedClients.map((c: any) => {
                      const f = finByClient.get(String(c.id));
                      const h = f ? HEALTH_STYLE[f.health] : null;
                      const isDisabled = c.isPortalEnabled || c.isPortalInvited;
                      return (
                        <tr key={c.id} onClick={() => setSelectedClient(c)} className="cursor-pointer transition hover:bg-white/[0.03]">
                          <td className="px-2.5 py-2.5">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#c99b3b]/40 bg-gradient-to-b from-[#232830] to-[#14171c] text-[11px] font-bold text-[#f1d68a]">
                                {c.logoInitial}
                              </div>
                              <span className="text-[12px] font-medium text-zinc-100">{c.name}</span>
                            </div>
                          </td>
                          <td className="px-2.5 py-2.5 text-[12px] text-zinc-300">{c.industry}</td>
                          <td className="px-2.5 py-2.5 text-[12px] font-medium text-[#f1d68a]">
                            {c.credit_limit ? c.credit_limit.toLocaleString() : '0'} <span className="text-[10px] text-zinc-500">{c.currency || 'PKR'}</span>
                          </td>
                          <td className={`px-2.5 py-2.5 text-right text-[12px] ${f && f.outstanding > 0 ? "text-zinc-100" : "text-zinc-600"}`}>
                            {f && f.outstanding > 0 ? money(f.outstanding, c.currency || "PKR") : "-"}
                          </td>
                          <td className="px-2.5 py-2.5">
                            {h && <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${h.cls}`}>{h.label}</span>}
                          </td>
                          <td className="px-2.5 py-2.5">
                            {c.isPortalEnabled ? (
                              <span className="text-[11px] font-semibold text-emerald-400">Enabled</span>
                            ) : c.isPortalInvited ? (
                              <span className="text-[11px] font-semibold text-amber-400">Invited</span>
                            ) : (
                              <span className="text-[11px] text-zinc-500">Not enabled</span>
                            )}
                          </td>
                          <td className="px-2.5 py-2.5">
                            <button
                              onClick={(e: any) => {
                                e.stopPropagation();
                                handleInvite(c.id);
                              }}
                              disabled={isDisabled}
                              className={`rounded-md px-3 py-1.5 text-[11px] font-medium transition-colors ${
                                isDisabled
                                  ? 'cursor-not-allowed bg-white/5 text-zinc-500'
                                  : 'border border-[#c99b3b]/40 bg-[#c99b3b]/15 text-[#f1d68a] hover:bg-[#c99b3b]/25'
                              }`}
                            >
                              {c.isPortalEnabled ? 'Active' : c.isPortalInvited ? 'Invited' : 'Invite to Portal'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {sortedClients.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-[12px] text-zinc-500">
                          {loading ? "Loading clients..." : "No clients found"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {tab === "insights" && (
          <CrmInsights
            leads={leadsData}
            clients={clientsData as any[]}
            invoices={invoices}
            campaigns={campaigns}
            today={today}
            onOpenClient={(id) => openFromFocus({ type: "client", id })}
          />
        )}
      </div>

      <ClientDetailDrawer client={selectedClient} onClose={() => setSelectedClient(null)} />

      <LeadActivityPanel
        lead={selectedLead}
        activities={activities}
        today={today}
        onClose={() => setSelectedLead(null)}
        onChanged={fetchActivities}
      />

      {showClientForm && (
        <div className={FIN.overlay}>
          <AddClientForm
            existing={dupClients}
            onClose={() => {
              setShowClientForm(false);
              fetchData();
            }}
          />
        </div>
      )}

      {showLeadForm && (
        <div className={FIN.overlay}>
          <AddLeadForm
            existing={dupLeads}
            onClose={() => {
              setShowLeadForm(false);
              fetchData();
            }}
          />
        </div>
      )}
    </div>
  );
};
