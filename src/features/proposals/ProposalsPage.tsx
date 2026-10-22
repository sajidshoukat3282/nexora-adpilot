import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "@/lib/router";
import { PermissionGate } from "@/components/ui/PermissionGate";
import { FIN, GOLD_CARD, SILVER_CARD, fit } from "../finance/financeUi";
import { downloadCsv, toCsv } from "../crm/crmTools";
import { proposalsApi, type ProposalRow } from "@/lib/api/proposals";
import { flagsFor, STATUS_LABEL, statusLabel, statusTone, todayIso, diffDays } from "./proposalTools";
import { ProposalBuilderModal } from "./ProposalBuilderModal";
import { ProposalDetailDrawer } from "./ProposalDetailDrawer";

const FILTERS = ["all", "draft", "sent", "accepted", "rejected", "expired"];

export const ProposalsPage: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const [rows, setRows] = useState<ProposalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [builder, setBuilder] = useState<{ open: boolean; editId: string | null; client: string | null }>({ open: false, editId: null, client: null });
  const [selected, setSelected] = useState<string | null>(null);

  const load = async () => {
    try { setRows((await proposalsApi.list()).proposals); setError(""); }
    catch (e: any) { setError(e?.message || "Could not load proposals."); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  // "Create proposal" from a CRM client: /proposals?client=<id>
  useEffect(() => {
    const c = params.get("client");
    if (c) { setBuilder({ open: true, editId: null, client: c }); setParams({ client: null }); }
  }, [params]);

  const today = todayIso();
  const cur = rows[0]?.currency || "";
  const open = rows.filter((r) => r.status === "draft" || r.status === "sent");
  const accepted = rows.filter((r) => r.status === "accepted");
  const decided = rows.filter((r) => r.status === "accepted" || r.status === "rejected");
  const win = decided.length ? Math.round((accepted.length / decided.length) * 100) : 0;
  const expiring = rows.filter((r) => r.status === "sent" && r.valid_until && diffDays(today, r.valid_until) >= 0 && diffDays(today, r.valid_until) <= 3).length;
  const sum = (a: ProposalRow[]) => a.reduce((s, r) => s + r.total, 0);
  const fmt = (n: number) => `${cur} ${Math.round(n).toLocaleString("en-US")}`.trim();

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length };
    rows.forEach((r) => (c[r.status] = (c[r.status] || 0) + 1));
    return c;
  }, [rows]);

  const shown = rows.filter((r) => (filter === "all" || r.status === filter) && `${r.code} ${r.campaign_name} ${r.client_name ?? ""}`.toLowerCase().includes(q.toLowerCase()));

  const exportCsv = () =>
    downloadCsv("proposals.csv", toCsv(shown.map((r) => ({ ...r, status: statusLabel(r.status) })) as any, [
      { key: "code", label: "Code" }, { key: "client_name", label: "Client" }, { key: "campaign_name", label: "Campaign" },
      { key: "status", label: "Status" }, { key: "start_date", label: "Start" }, { key: "end_date", label: "End" },
      { key: "screens", label: "Screens" }, { key: "total", label: "Total" }, { key: "currency", label: "Currency" }, { key: "valid_until", label: "Valid until" },
    ]));

  const kpis: { label: string; value: string; note: string; card: React.CSSProperties; dark: boolean }[] = [
    { label: "Open pipeline", value: fmt(sum(open)), note: `${open.length} proposals`, card: GOLD_CARD, dark: true },
    { label: "Accepted value", value: fmt(sum(accepted)), note: `${accepted.length} accepted`, card: SILVER_CARD, dark: true },
    { label: "Win rate", value: `${win}%`, note: `${decided.length} decided`, card: {}, dark: false },
    { label: "Expiring soon", value: String(expiring), note: "within 3 days", card: {}, dark: false },
  ];

  return (
    <PermissionGate permission="proposals.manage" fallback={<div className={FIN.page}><p className="p-6 text-[13px] text-zinc-400">You do not have access to proposals.</p></div>}>
      <div className={FIN.page}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#c99b3b]/30 pb-3">
          <div>
            <h1 className="text-[18px] font-semibold uppercase tracking-[0.24em] text-zinc-50">Proposals</h1>
            <p className="mt-1 text-[11px] font-medium text-[#d9b45a]">Quote, send, win and book</p>
          </div>
          <div className="flex gap-2">
            <button className={FIN.btnGhost} onClick={exportCsv}>Export CSV</button>
            <button className={FIN.btnGold} onClick={() => setBuilder({ open: true, editId: null, client: null })}>+ New Proposal</button>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {kpis.map((k) => (
            <div key={k.label} className={`${k.dark ? "" : FIN.panel} rounded-xl p-3`} style={k.card}>
              <p className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${k.dark ? "text-[#2b2108]" : "text-zinc-400"}`}>{k.label}</p>
              <p className={`mt-1 font-semibold ${k.dark ? "text-[#1a1204]" : "text-zinc-50"}`} style={{ fontSize: fit(k.value, 22, 150) }}>{k.value}</p>
              <p className={`text-[10px] ${k.dark ? "text-[#4a3a12]" : "text-zinc-500"}`}>{k.note}</p>
            </div>
          ))}
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          {FILTERS.map((s) => (
            <button key={s} onClick={() => setFilter(s)} className={`rounded-full border px-3 py-1 text-[11px] font-medium transition ${filter === s ? "border-[#c99b3b] bg-[#c99b3b]/15 text-[#f1d68a]" : "border-[#2b3038] text-zinc-400 hover:text-zinc-100"}`}>
              {s === "all" ? "All" : STATUS_LABEL[s]} <span className="text-zinc-500">{counts[s] || 0}</span>
            </button>
          ))}
          <input className={`${FIN.input} ml-auto !w-56`} placeholder="Search proposals" value={q} onChange={(e: any) => setQ(e.target.value)} />
        </div>

        {error && <div className="mb-3 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-300">{error}</div>}

        <div className={`${FIN.panel} overflow-x-auto`}>
          <table className="w-full text-[12px]">
            <thead><tr className="border-b border-[#2a2f37] text-left text-[10px] uppercase tracking-wider text-zinc-500">
              <th className="p-3">Code</th><th className="p-3">Client</th><th className="p-3">Campaign</th><th className="p-3">Dates</th><th className="p-3 text-right">Screens</th><th className="p-3 text-right">Total</th><th className="p-3">Status</th>
            </tr></thead>
            <tbody>
              {loading && <tr><td colSpan={7} className="p-6 text-center text-zinc-500">Loading...</td></tr>}
              {!loading && shown.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-zinc-500">{rows.length === 0 ? "No proposals yet. Create your first one." : "No proposals match your filters."}</td></tr>}
              {shown.map((r) => {
                const t = statusTone(r.status);
                const fl = flagsFor(r, today);
                return (
                  <tr key={r.id} onClick={() => setSelected(r.id)} className="cursor-pointer border-b border-[#1d2128] transition hover:bg-white/5">
                    <td className="p-3 font-mono text-[#d9b45a]">{r.code}</td>
                    <td className="p-3 text-zinc-100">{r.client_name ?? "-"}</td>
                    <td className="p-3 text-zinc-300">{r.campaign_name}</td>
                    <td className="p-3 text-zinc-400">{r.start_date} to {r.end_date}</td>
                    <td className="p-3 text-right text-zinc-300">{r.screens}</td>
                    <td className="p-3 text-right font-semibold text-zinc-50">{r.currency} {Math.round(r.total).toLocaleString("en-US")}</td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${t.cls}`}><span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} />{statusLabel(r.status)}</span>
                      {fl.map((f) => <div key={f.text} className="mt-1 text-[10px] text-amber-300">{f.text}</div>)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <ProposalBuilderModal
          open={builder.open}
          editId={builder.editId}
          presetClientId={builder.client}
          onClose={() => setBuilder({ open: false, editId: null, client: null })}
          onSaved={(id) => { load(); setSelected(id); }}
        />
        <ProposalDetailDrawer
          id={selected}
          onClose={() => setSelected(null)}
          onChanged={load}
          onEdit={(id) => { setSelected(null); setBuilder({ open: true, editId: id, client: null }); }}
        />
      </div>
    </PermissionGate>
  );
};

export default ProposalsPage;
