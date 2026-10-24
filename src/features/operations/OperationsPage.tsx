import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "@/lib/router";
import { FIN, GOLD_CARD, SILVER_CARD, fit } from "@/features/finance/financeUi";
import { opsApi, type OpsOverview, type OpsScreen, type ScreenState } from "@/lib/api/operations";
import { FieldTeamPanel, IncidentModal, IncidentsPanel, MaintenancePanel, ProofPanel, STATE_LABEL, ScreenDrawer, stateDot } from "./OpsPanels";

type TabKey = "board" | "alerts" | "incidents" | "proof" | "field" | "maintenance" | "upcoming";
const day = (d: string) => String(d).slice(0, 10);
const sevCls = (s: string) => (s === "critical" ? "border-rose-400/30 bg-rose-500/10 text-rose-200" : s === "warning" ? "border-amber-400/30 bg-amber-500/10 text-amber-200" : "border-sky-400/20 bg-sky-500/10 text-sky-200");

export const OperationsPage: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const tab = ((params.get("tab") as TabKey) || "board") as TabKey;
  const [ov, setOv] = useState<OpsOverview | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [state, setState] = useState<"" | ScreenState>("");
  const [city, setCity] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [incidentFor, setIncidentFor] = useState<{ open: boolean; screen?: string }>({ open: false });
  const [incKey, setIncKey] = useState(0);
  const [camps, setCamps] = useState<{ id: string; name: string }[]>([]);

  const load = useCallback(async () => {
    try { setOv(await opsApi.overview()); setError(""); }
    catch (e: any) { setError(e?.message || "Could not load Live Operations."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    load();
    opsApi.proofs().then((r) => setCamps(r.campaigns)).catch(() => undefined);
    const t = window.setInterval(load, 60000);
    return () => window.clearInterval(t);
  }, [load]);

  useEffect(() => {
    const sid = params.get("screen");
    if (sid && ov) { if (ov.screens.some((s) => s.id === sid)) setOpenId(sid); setParams({ screen: null }); }
  }, [params, ov]); // eslint-disable-line react-hooks/exhaustive-deps

  const cities = useMemo(() => Array.from(new Set((ov?.screens ?? []).map((s) => s.city).filter(Boolean) as string[])).sort(), [ov]);
  const shown = useMemo(() => (ov?.screens ?? []).filter((s) =>
    (!state || s.status === state) && (!city || s.city === city) &&
    (!search || `${s.name} ${s.city ?? ""} ${s.location ?? ""}`.toLowerCase().includes(search.toLowerCase())),
  ), [ov, state, city, search]);
  const selected: OpsScreen | null = ov?.screens.find((s) => s.id === openId) ?? null;
  const setTab = (k: TabKey) => setParams({ tab: k === "board" ? null : k });

  const c = ov?.counts;
  const kpis = [
    { label: "Screens online", value: `${c?.online ?? 0} / ${c?.total ?? 0}`, note: `${c?.maintenance ?? 0} maintenance \u00b7 ${c?.offline ?? 0} offline`, card: GOLD_CARD, dark: true },
    { label: "Playing now", value: String(ov?.kpis.playing_screens ?? 0), note: `${ov?.kpis.running_campaigns ?? 0} campaigns running today`, card: SILVER_CARD, dark: true },
    { label: "Open issues", value: String(ov?.kpis.open_incidents ?? 0), note: "Incidents not yet resolved", card: {}, dark: false },
    { label: "Alerts", value: String(ov?.kpis.alerts ?? 0), note: "Need your attention", card: {}, dark: false },
  ];
  const tabs: { key: TabKey; label: string; badge?: number }[] = [
    { key: "board", label: "Today Board" }, { key: "alerts", label: "Alerts", badge: ov?.kpis.alerts },
    { key: "incidents", label: "Incidents", badge: ov?.kpis.open_incidents }, { key: "proof", label: "Proof of Play" }, { key: "field", label: "Field Team" },
    { key: "maintenance", label: "Maintenance" }, { key: "upcoming", label: "Upcoming", badge: ov?.upcoming.length },
  ];

  return (
    <div className={FIN.page}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#c99b3b]/30 pb-3">
        <div>
          <h1 className="text-[18px] font-semibold uppercase tracking-[0.24em] text-zinc-50">Live Operations</h1>
          <p className="mt-1 text-[11px] font-medium text-[#d9b45a]">Today{ov ? ` \u00b7 ${ov.today}` : ""} {"\u00b7"} refreshes every minute</p>
        </div>
        <div className="flex gap-2">
          <button className={FIN.btnGhost} onClick={load}>Refresh</button>
          <button className={FIN.btnGold} onClick={() => setIncidentFor({ open: true })}>Report an issue</button>
        </div>
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

      <div className="mb-4 flex flex-wrap gap-1 border-b border-[#2a2f37]">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`-mb-px border-b-2 px-3 py-2 text-[12px] font-medium transition ${tab === t.key ? "border-[#d9b45a] text-[#f1d68a]" : "border-transparent text-zinc-400 hover:text-zinc-100"}`}>
            {t.label}{t.badge ? <span className="ml-1.5 rounded-full bg-[#c99b3b]/20 px-1.5 text-[10px] text-[#f1d68a]">{t.badge}</span> : null}
          </button>
        ))}
      </div>

      {loading && <p className="text-[12px] text-zinc-500">Loading...</p>}

      {tab === "board" && ov && (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <input className={`${FIN.input} max-w-[220px]`} placeholder="Search screens" value={search} onChange={(e: any) => setSearch(e.target.value)} />
            {(["", "online", "maintenance", "offline"] as const).map((k) => (
              <button key={k || "all"} onClick={() => setState(k)} className={`rounded-full border px-3 py-1 text-[11px] font-medium ${state === k ? "border-[#c99b3b] bg-[#c99b3b]/15 text-[#f1d68a]" : "border-[#2b3038] text-zinc-400"}`}>
                {k ? STATE_LABEL[k] : "All"} <span className="text-zinc-500">{k ? ov.counts[k] : ov.counts.total}</span>
              </button>
            ))}
            {cities.length > 1 && <select className={`${FIN.input} max-w-[160px]`} value={city} onChange={(e: any) => setCity(e.target.value)}><option value="">All cities</option>{cities.map((x) => <option key={x} value={x}>{x}</option>)}</select>}
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {shown.map((s) => (
              <button key={s.id} onClick={() => setOpenId(s.id)} className={`${FIN.panel} p-3 text-left transition hover:border-[#c99b3b]/40`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-zinc-100">{s.name}</p>
                    <p className="truncate text-[10px] text-zinc-500">{[s.city, s.screen_type].filter(Boolean).join(" \u00b7 ")}</p>
                  </div>
                  <span className="flex shrink-0 items-center gap-1.5 text-[11px] text-zinc-300"><span className={`h-2 w-2 rounded-full ${stateDot(s.status)}`} />{STATE_LABEL[s.status]}</span>
                </div>
                <div className="mt-2 min-h-[34px] text-[11px]">
                  {s.running.length ? s.running.slice(0, 2).map((r) => (
                    <p key={r.campaign_id} className="truncate text-zinc-300">{r.campaign_name}<span className="text-zinc-500">{r.client_name ? ` \u00b7 ${r.client_name}` : ""} {"\u00b7"} until {day(r.end_date)}</span></p>
                  )) : <p className="text-zinc-500">No campaign today</p>}
                  {s.running.length > 2 && <p className="text-zinc-500">+{s.running.length - 2} more</p>}
                </div>
                <div className="mt-1 flex gap-2 text-[10px] text-zinc-500">
                  {s.has_player && <span>Player linked</span>}
                  {s.status !== "online" && s.reason && <span className="truncate text-amber-300/80">{s.reason}</span>}
                  {s.open_incidents > 0 && <span className="text-rose-300">{s.open_incidents} open issue{s.open_incidents === 1 ? "" : "s"}</span>}
                </div>
              </button>
            ))}
          </div>
          {shown.length === 0 && <p className="py-10 text-center text-[12px] text-zinc-500">{ov.screens.length === 0 ? "No screens yet. Add your screens in Inventory first." : "No screens match this filter."}</p>}
        </>
      )}

      {tab === "alerts" && ov && (
        <div className="space-y-2">
          {ov.alerts.map((a) => (
            <div key={a.key} className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 text-[12px] ${sevCls(a.severity)}`}>
              <div><p className="font-semibold">{a.title}</p><p className="opacity-80">{a.detail}</p></div>
              {a.screen_id && <button className={FIN.btnGhost} onClick={() => setOpenId(a.screen_id!)}>Open screen</button>}
              {a.campaign_id && <Link to={`/campaigns/${a.campaign_id}`} className={FIN.btnGhost}>Open campaign</Link>}
              {a.incident_id && <button className={FIN.btnGhost} onClick={() => setTab("incidents")}>Open incidents</button>}
            </div>
          ))}
          {ov.alerts.length === 0 && <p className="py-10 text-center text-[12px] text-emerald-300">All clear. Nothing needs attention right now.</p>}
        </div>
      )}

      {tab === "incidents" && <IncidentsPanel reloadKey={incKey} onAdd={() => setIncidentFor({ open: true })} onChanged={load} />}
      {tab === "field" && <FieldTeamPanel onChanged={load} />}
      {tab === "proof" && ov && <ProofPanel screens={ov.screens} onChanged={load} />}
      {tab === "maintenance" && ov && <MaintenancePanel screens={ov.screens} onChanged={load} />}

      {tab === "upcoming" && ov && (
        <div className="space-y-2">
          {ov.upcoming.map((u) => (
            <Link key={u.id + u.kind} to={`/campaigns/${u.id}`} className={`${FIN.panel} flex flex-wrap items-center justify-between gap-2 p-3 hover:border-[#c99b3b]/40`}>
              <div>
                <p className="text-[13px] font-semibold text-zinc-100">{u.name}</p>
                <p className="text-[11px] text-zinc-500">{u.client_name ?? "No client"} {"\u00b7"} {u.screens} screen{u.screens === 1 ? "" : "s"}</p>
              </div>
              <div className="text-right text-[11px]">
                <p className="text-zinc-200">{u.kind === "starts" ? "Starts" : "Ends"} {day(u.date)}</p>
                <p className={u.creative_ready ? "text-emerald-300" : "text-amber-300"}>{u.creative_ready ? "Creative approved" : "Creative not approved"}</p>
              </div>
            </Link>
          ))}
          {ov.upcoming.length === 0 && <p className="py-10 text-center text-[12px] text-zinc-500">No campaign starts or ends in the next 7 days.</p>}
        </div>
      )}

      <ScreenDrawer screen={selected} onClose={() => setOpenId(null)} onChanged={() => { load(); setIncKey((k) => k + 1); }} onIncident={(s) => setIncidentFor({ open: true, screen: s.id })} />
      <IncidentModal open={incidentFor.open} onClose={() => setIncidentFor({ open: false })} onSaved={() => { load(); setIncKey((k) => k + 1); }} screens={ov?.screens ?? []} presetScreen={incidentFor.screen} campaigns={camps} />
    </div>
  );
};
