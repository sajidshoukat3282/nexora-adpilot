import React, { useEffect, useMemo, useState } from "react";
import { FIN, GOLD_CARD, SILVER_CARD, fit } from "@/features/finance/financeUi";
import { platformApi, type PlatformOverview } from "@/lib/api/platform";
import { usePlatformAdmin } from "@/hooks/usePlatformAdmin";

const day = (d: string | null) => (d ? String(d).slice(0, 10) : "-");
const size = (n: number) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : n > 0 ? `${Math.max(1, Math.round(n / 1024))} KB` : "0");
const ago = (iso: string | null): string => {
  if (!iso) return "never";
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return d <= 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`;
};

export const PlatformPage: React.FC = () => {
  const admin = usePlatformAdmin();
  const [data, setData] = useState<PlatformOverview | null>(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"created" | "login" | "storage" | "name">("created");

  useEffect(() => {
    if (!admin) return;
    platformApi.overview().then(setData).catch((e: any) => setError(e?.message || "Could not load the panel."));
  }, [admin]);

  const list = useMemo(() => {
    const l = (data?.companies ?? []).filter((c) => !q || `${c.name} ${c.owner_email ?? ""}`.toLowerCase().includes(q.toLowerCase()));
    const by: Record<string, (a: any, b: any) => number> = {
      created: (a, b) => String(b.created_at).localeCompare(String(a.created_at)),
      login: (a, b) => String(b.last_login ?? "").localeCompare(String(a.last_login ?? "")),
      storage: (a, b) => b.storage_bytes - a.storage_bytes,
      name: (a, b) => String(a.name).localeCompare(String(b.name)),
    };
    return [...l].sort(by[sort]);
  }, [data, q, sort]);

  const exportCsv = () => {
    const head = ["Company", "Owner email", "Plan", "Signed up", "Last login", "Team", "Screens", "Campaigns", "Clients", "Invoices", "Storage (bytes)"];
    const body = list.map((c) => [c.name, c.owner_email ?? "", c.plan, day(c.created_at), day(c.last_login), c.team, c.screens, c.campaigns, c.clients, c.invoices, c.storage_bytes]);
    const csv = [head, ...body].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = "adpilot-companies.csv"; a.click(); URL.revokeObjectURL(url);
  };

  if (!admin) return <div className={FIN.page}><p className="p-6 text-[13px] text-zinc-400">You do not have access to the platform panel.</p></div>;

  const t = data?.totals;
  const kpis = [
    { label: "Companies", value: String(t?.companies ?? 0), note: `${t?.trial ?? 0} on trial`, card: GOLD_CARD, dark: true },
    { label: "Active in 7 days", value: String(t?.active_7d ?? 0), note: "Signed in this week", card: SILVER_CARD, dark: true },
    { label: "New this month", value: String(t?.new_this_month ?? 0), note: "Sign-ups", card: {}, dark: false },
    { label: "Storage used", value: size(t?.storage_bytes ?? 0), note: "All companies together", card: {}, dark: false },
  ];
  const maxW = Math.max(1, ...(data?.weeks ?? []).map((w) => w.n));

  return (
    <div className={FIN.page}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#c99b3b]/30 pb-3">
        <div>
          <h1 className="text-[18px] font-semibold uppercase tracking-[0.24em] text-zinc-50">Platform</h1>
          <p className="mt-1 text-[11px] font-medium text-[#d9b45a]">All companies on AdPilot. Overview only, no business data.</p>
        </div>
        <button className={FIN.btnGhost} onClick={exportCsv}>Export CSV</button>
      </div>
      {error && <p className="mb-3 rounded-lg bg-rose-500/10 px-3 py-2 text-[12px] text-rose-300">{error}</p>}

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className={`${k.dark ? "" : FIN.panel} rounded-xl p-3`} style={k.card}>
            <p className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${k.dark ? "text-[#2b2108]" : "text-zinc-400"}`}>{k.label}</p>
            <p className={`mt-1 font-semibold ${k.dark ? "text-[#1a1204]" : "text-zinc-50"}`} style={{ fontSize: fit(k.value, 22, 150) }}>{k.value}</p>
            <p className={`text-[10px] ${k.dark ? "text-[#4a3a12]" : "text-zinc-500"}`}>{k.note}</p>
          </div>
        ))}
      </div>

      <div className={`${FIN.panel} mb-4 p-3`}>
        <p className={FIN.label}>Sign-ups per week (last 8 weeks)</p>
        <div className="flex h-16 items-end gap-2">
          {(data?.weeks ?? []).map((w) => (
            <div key={w.week} className="flex flex-1 flex-col items-center justify-end gap-1" title={`${w.week}: ${w.n}`}>
              <span className="text-[10px] text-zinc-400">{w.n}</span>
              <div className="w-full rounded-t bg-gradient-to-b from-[#f1d68a] to-[#a97b22]" style={{ height: `${Math.max(4, (w.n / maxW) * 36)}px` }} />
            </div>
          ))}
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input className={`${FIN.input} max-w-[240px]`} placeholder="Search company or owner email" value={q} onChange={(e: any) => setQ(e.target.value)} />
        <select className={`${FIN.input} max-w-[180px]`} value={sort} onChange={(e: any) => setSort(e.target.value)}>
          <option value="created">Newest first</option><option value="login">Last login</option><option value="storage">Most storage</option><option value="name">Name</option>
        </select>
      </div>

      <div className={`${FIN.panel} overflow-x-auto`}>
        <table className="w-full min-w-[820px] text-left text-[12px]">
          <thead><tr className="border-b border-[#2a2f37] text-[10px] uppercase tracking-[0.12em] text-zinc-500">
            <th className="p-3">Company</th><th className="p-3">Plan</th><th className="p-3">Signed up</th><th className="p-3">Last login</th>
            <th className="p-3 text-right">Team</th><th className="p-3 text-right">Screens</th><th className="p-3 text-right">Campaigns</th><th className="p-3 text-right">Clients</th><th className="p-3 text-right">Invoices</th><th className="p-3 text-right">Storage</th>
          </tr></thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.id} className="border-b border-[#1d2128]">
                <td className="p-3"><p className="font-semibold text-zinc-100">{c.name}</p><p className="text-[10px] text-zinc-500">{c.owner_email ?? "No owner"}</p></td>
                <td className="p-3 capitalize text-zinc-300">{c.plan}</td>
                <td className="p-3 text-zinc-400">{day(c.created_at)}</td>
                <td className="p-3 text-zinc-400">{ago(c.last_login)}</td>
                <td className="p-3 text-right text-zinc-300">{c.team}</td><td className="p-3 text-right text-zinc-300">{c.screens}</td>
                <td className="p-3 text-right text-zinc-300">{c.campaigns}</td><td className="p-3 text-right text-zinc-300">{c.clients}</td>
                <td className="p-3 text-right text-zinc-300">{c.invoices}</td><td className="p-3 text-right text-zinc-300">{size(c.storage_bytes)}</td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={10} className="p-6 text-center text-zinc-500">No companies found.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};
