import React, { useCallback, useEffect, useMemo, useState } from "react";
import { PermissionGate } from "@/components/ui/PermissionGate";
import { useNavigate, useSearchParams } from "@/lib/router";
import { getDefaultCurrency } from "@/lib/companyDefaults";
import { campaignsApi, type CampaignRow } from "@/lib/api/campaigns";
import { downloadCsv, money, toCsv } from "../crm/crmTools";
import { FIN, GOLD_CARD, SILVER_CARD, fit } from "../finance/financeUi";
import AddCampaignForm from "./AddCampaignForm";
import { CampaignCalendar } from "./CampaignCalendar";
import { RenewModal } from "./RenewModal";
import { campaignDays, endingSoon, statusLabel, statusTone, todayIso } from "./campaignTools";

const FILTERS = ["all", "draft", "booked", "live", "completed", "cancelled"] as const;

export const CampaignsListPage: React.FC = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [rows, setRows] = useState<CampaignRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"list" | "calendar">("list");
  const [showNew, setShowNew] = useState(false);
  const [renewing, setRenewing] = useState<CampaignRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const r = await campaignsApi.list();
      setRows(r.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load campaigns.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (params.get("fromProposal")) {
      setShowNew(true);
      setParams({ fromProposal: null });
    }
  }, [params, setParams]);

  const today = todayIso();
  const kpi = useMemo(() => {
    const open = rows.filter((r) => r.status !== "cancelled");
    return {
      live: rows.filter((r) => r.status === "live").length,
      booked: rows.filter((r) => r.status === "booked").length,
      ending: rows.filter((r) => endingSoon(r, today)).length,
      value: open.reduce((a, r) => a + (Number(r.total_budget) || 0), 0),
    };
  }, [rows, today]);

  const counts = useMemo(() => {
    const m: Record<string, number> = { all: rows.length };
    for (const r of rows) m[r.status] = (m[r.status] ?? 0) + 1;
    return m;
  }, [rows]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (filter === "all" || r.status === filter) &&
        (!q || r.name.toLowerCase().includes(q) || String(r.client_name ?? "").toLowerCase().includes(q)),
    );
  }, [rows, filter, search]);

  const exportCsv = () => {
    const data = shown.map((r) => ({
      name: r.name,
      client: r.client_name ?? "",
      status: statusLabel(r.status),
      start: r.start_date,
      end: r.end_date,
      days: campaignDays(r.start_date, r.end_date),
      value: r.total_budget,
      currency: r.currency,
    }));
    downloadCsv(
      `campaigns-${today}.csv`,
      toCsv(data, [
        { key: "name", label: "Campaign" },
        { key: "client", label: "Client" },
        { key: "status", label: "Status" },
        { key: "start", label: "Start" },
        { key: "end", label: "End" },
        { key: "days", label: "Days" },
        { key: "value", label: "Value" },
        { key: "currency", label: "Currency" },
      ]),
    );
  };

  const cur = getDefaultCurrency();
  const cards: { label: string; value: string; gold?: boolean; sub: string }[] = [
    { label: "Live now", value: String(kpi.live), gold: true, sub: "campaigns running" },
    { label: "Booked", value: String(kpi.booked), sub: "waiting to start" },
    { label: "Ending soon", value: String(kpi.ending), sub: "within 7 days" },
    { label: "Total value", value: money(kpi.value, cur), sub: "excluding cancelled", gold: true },
  ];

  return (
    <div className={FIN.page}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-zinc-50">Campaigns</h1>
          <p className="text-[11px] text-zinc-500">Bookings, schedules, billing and renewals in one place.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className={FIN.btnGhost} onClick={exportCsv}>Export CSV</button>
          <PermissionGate permission="campaigns.manage" fallback={null}>
            <button className={FIN.btnGold} onClick={() => setShowNew(true)}>+ New Campaign</button>
          </PermissionGate>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl p-3" style={c.gold ? GOLD_CARD : SILVER_CARD}>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-black/60">{c.label}</p>
            <p className="mt-1 font-bold text-[#1a1204]" style={{ fontSize: fit(c.value, 22, 150) }}>{c.value}</p>
            <p className="text-[10px] text-black/55">{c.sub}</p>
          </div>
        ))}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          className={`${FIN.input} max-w-xs`}
          placeholder="Search campaign or client..."
          value={search}
          onChange={(e: any) => setSearch(e.target.value)}
        />
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full border px-3 py-1 text-[11px] font-medium transition ${
                filter === f ? "border-[#c99b3b]/70 bg-[#c99b3b]/15 text-[#f1d68a]" : "border-[#2b3038] text-zinc-400 hover:text-zinc-100"
              }`}
            >
              {f === "all" ? "All" : statusLabel(f)} <span className="opacity-60">{counts[f] ?? 0}</span>
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-1.5">
          <button className={view === "list" ? FIN.btnGold : FIN.btnGhost} onClick={() => setView("list")}>List</button>
          <button className={view === "calendar" ? FIN.btnGold : FIN.btnGhost} onClick={() => setView("calendar")}>Calendar</button>
        </div>
      </div>

      {error && <p className="mb-3 text-[12px] text-rose-300">{error}</p>}
      {loading ? (
        <p className="py-10 text-center text-[12px] text-zinc-500">Loading campaigns...</p>
      ) : view === "calendar" ? (
        <CampaignCalendar rows={shown} onOpen={(id) => navigate(`/campaigns/${id}`)} />
      ) : (
        <div className={`${FIN.panel} overflow-x-auto`}>
          <table className="w-full min-w-[720px] text-left">
            <thead className="border-b border-[#2a2f37] text-[10px] uppercase tracking-[0.12em] text-zinc-400">
              <tr>
                <th className="p-3 font-semibold">Campaign</th>
                <th className="p-3 font-semibold">Client</th>
                <th className="p-3 font-semibold">Period</th>
                <th className="p-3 text-right font-semibold">Value</th>
                <th className="p-3 font-semibold">Status</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {shown.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[12px] text-zinc-500">
                    {rows.length === 0 ? "No campaigns yet. Create your first campaign." : "No campaigns match this filter."}
                  </td>
                </tr>
              )}
              {shown.map((r) => {
                const tone = statusTone(r.status);
                return (
                  <tr
                    key={r.id}
                    onClick={() => navigate(`/campaigns/${r.id}`)}
                    className="cursor-pointer border-t border-[#20242b] text-[12px] transition hover:bg-white/[0.03]"
                  >
                    <td className="p-3">
                      <div className="font-medium text-zinc-100">{r.name}</div>
                      <div className="font-mono text-[10px] text-zinc-500">CMP-{r.id.slice(0, 4).toUpperCase()}</div>
                    </td>
                    <td className="p-3 text-zinc-300">{r.client_name || "-"}</td>
                    <td className="p-3 text-zinc-400">
                      {r.start_date} to {r.end_date}
                      <div className="text-[10px] text-zinc-600">{campaignDays(r.start_date, r.end_date)} days</div>
                    </td>
                    <td className="p-3 text-right font-semibold text-zinc-100">{money(r.total_budget, r.currency)}</td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${tone.cls}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
                        {statusLabel(r.status)}
                      </span>
                      {endingSoon(r, today) && <span className="ml-1.5 text-[10px] text-amber-300">Ending soon</span>}
                    </td>
                    <td className="p-3 text-right">
                      <PermissionGate permission="campaigns.manage" fallback={null}>
                        <button
                          className={FIN.btnGhost}
                          onClick={(e: any) => {
                            e.stopPropagation();
                            setRenewing(r);
                          }}
                        >
                          Renew
                        </button>
                      </PermissionGate>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <AddCampaignForm
            onClose={() => {
              setShowNew(false);
              load();
            }}
          />
        </div>
      )}
      {renewing && (
        <RenewModal
          campaign={renewing}
          onClose={() => setRenewing(null)}
          onDone={(id) => {
            setRenewing(null);
            navigate(`/campaigns/${id}`);
          }}
        />
      )}
    </div>
  );
};
