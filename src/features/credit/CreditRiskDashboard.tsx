import React, { useEffect, useMemo, useState } from "react";
import { PermissionGate } from "@/components/ui/PermissionGate";
import { FIN, GOLD_CARD, SILVER_CARD, FDrawer, fit } from "../finance/financeUi";
import { downloadCsv, toCsv } from "../crm/crmTools";
import { creditApi, type ClientRisk, type CreditDetail, type RiskLevel } from "@/lib/api/credit";
import { useCompanyProfile } from "@/hooks/useCompanyProfile";
import { LEVEL_LABEL, fmtMoney, levelTone, phoneDigits, reasons, reminderText } from "./creditTools";

const FILTERS: ("all" | RiskLevel | "hold")[] = ["all", "critical", "high", "watch", "low", "hold"];
const FILTER_LABEL: Record<string, string> = { all: "All", hold: "On hold", ...LEVEL_LABEL };

const Pill: React.FC<{ level: RiskLevel }> = ({ level }) => {
  const t = levelTone(level);
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${t.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} />
      {LEVEL_LABEL[level]}
    </span>
  );
};

const Stat: React.FC<{ label: string; value: string; sub?: string }> = ({ label, value, sub }) => (
  <div className="rounded-lg border border-[#2a2f37] bg-[#0f1216] p-3">
    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">{label}</p>
    <p className="mt-1 text-[14px] font-semibold text-zinc-50">{value}</p>
    {sub && <p className="text-[10px] text-zinc-500">{sub}</p>}
  </div>
);

export const CreditRiskDashboard: React.FC = () => {
  const { profile } = useCompanyProfile();
  const [rows, setRows] = useState<ClientRisk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"score" | "exposure" | "overdue" | "name">("score");
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CreditDetail | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [limitForm, setLimitForm] = useState<{ value: string; reason: string } | null>(null);
  const [holdReason, setHoldReason] = useState("");

  const load = async () => {
    try { setRows((await creditApi.list()).data); setError(""); }
    catch (e: any) { setError(e?.message || "Could not load credit data."); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const loadDetail = async (id: string) => {
    try { setDetail(await creditApi.get(id)); } catch (e: any) { setMsg({ ok: false, text: e?.message || "Could not load this client." }); }
  };
  useEffect(() => {
    setDetail(null); setMsg(null); setLimitForm(null); setHoldReason("");
    if (openId) loadDetail(openId);
  }, [openId]);

  const mainCur = rows[0]?.currency || "PKR";
  const sum = (f: (c: ClientRisk) => number) => rows.reduce((a, c) => a + f(c), 0);
  const atRisk = rows.filter((c) => c.level === "high" || c.level === "critical" || c.on_hold || (c.credit_limit > 0 && c.utilization >= 100));
  const nearLimit = rows.filter((c) => c.credit_limit > 0 && c.utilization >= 80 && c.utilization < 100);
  const noLimit = rows.filter((c) => c.credit_limit === 0 && c.exposure > 0);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length, hold: rows.filter((r) => r.on_hold).length };
    rows.forEach((r) => (c[r.level] = (c[r.level] || 0) + 1));
    return c;
  }, [rows]);

  const shown = rows
    .filter((r) => (filter === "all" ? true : filter === "hold" ? r.on_hold : r.level === filter) && r.name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (sort === "name" ? a.name.localeCompare(b.name) : sort === "exposure" ? b.exposure - a.exposure : sort === "overdue" ? b.overdue - a.overdue : b.score - a.score));

  const exportCsv = () =>
    downloadCsv("credit-risk.csv", toCsv(shown.map((r) => ({ ...r, level: LEVEL_LABEL[r.level] })) as any, [
      { key: "name", label: "Client" }, { key: "credit_limit", label: "Credit limit" }, { key: "outstanding", label: "Outstanding" },
      { key: "overdue", label: "Overdue" }, { key: "exposure", label: "Exposure" }, { key: "utilization", label: "Utilization %" },
      { key: "score", label: "Risk score" }, { key: "level", label: "Level" }, { key: "currency", label: "Currency" },
    ]));

  const act = async (fn: () => Promise<any>, ok: string) => {
    setBusy(true); setMsg(null);
    try { await fn(); setMsg({ ok: true, text: ok }); await load(); if (openId) await loadDetail(openId); }
    catch (e: any) { setMsg({ ok: false, text: e?.message || "Something went wrong." }); }
    finally { setBusy(false); }
  };

  const r = detail?.risk;
  const company = profile?.legalName || "our team";
  const kpis: { label: string; value: string; note: string; card: React.CSSProperties; dark: boolean }[] = [
    { label: "Total credit limit", value: fmtMoney(sum((c) => c.credit_limit), mainCur), note: `${rows.filter((c) => c.credit_limit > 0).length} clients with a limit`, card: GOLD_CARD, dark: true },
    { label: "Total exposure", value: fmtMoney(sum((c) => c.exposure), mainCur), note: "Unpaid + accepted + unbilled", card: SILVER_CARD, dark: true },
    { label: "Overdue", value: fmtMoney(sum((c) => c.overdue), mainCur), note: `${sum((c) => c.overdue_count)} invoices`, card: {}, dark: false },
    { label: "Clients at risk", value: String(atRisk.length), note: `${nearLimit.length} near limit`, card: {}, dark: false },
  ];

  return (
    <PermissionGate permission="finance.view" fallback={<div className={FIN.page}><p className="p-6 text-[13px] text-zinc-400">You do not have access to credit risk.</p></div>}>
      <div className={FIN.page}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#c99b3b]/30 pb-3">
          <div>
            <h1 className="text-[18px] font-semibold uppercase tracking-[0.24em] text-zinc-50">Credit Risk</h1>
            <p className="mt-1 text-[11px] font-medium text-[#d9b45a]">Limits, exposure and payment behaviour</p>
          </div>
          <button className={FIN.btnGhost} onClick={exportCsv}>Export CSV</button>
        </div>

        {(atRisk.length > 0 || nearLimit.length > 0 || noLimit.length > 0) && (
          <div className="mb-4 rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-[12px] text-rose-200">
            <p className="font-semibold">Credit alerts</p>
            <ul className="mt-1 list-disc pl-5 text-rose-200/90">
              {atRisk.length > 0 && <li>{atRisk.length} client{atRisk.length === 1 ? " is" : "s are"} at high risk, over limit or on hold.</li>}
              {nearLimit.length > 0 && <li>{nearLimit.length} client{nearLimit.length === 1 ? " is" : "s are"} above 80% of their credit limit.</li>}
              {noLimit.length > 0 && <li>{noLimit.length} client{noLimit.length === 1 ? " has" : "s have"} exposure but no credit limit set.</li>}
            </ul>
          </div>
        )}

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
              {FILTER_LABEL[s]} <span className="text-zinc-500">{counts[s] || 0}</span>
            </button>
          ))}
          <select className={`${FIN.input} ml-auto !w-40`} value={sort} onChange={(e: any) => setSort(e.target.value)}>
            <option value="score">Sort: Risk score</option>
            <option value="exposure">Sort: Exposure</option>
            <option value="overdue">Sort: Overdue</option>
            <option value="name">Sort: Name</option>
          </select>
          <input className={`${FIN.input} !w-52`} placeholder="Search clients" value={q} onChange={(e: any) => setQ(e.target.value)} />
        </div>

        {error && <div className="mb-3 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-300">{error}</div>}

        <div className={`${FIN.panel} overflow-x-auto`}>
          <table className="w-full text-[12px]">
            <thead><tr className="border-b border-[#2a2f37] text-left text-[10px] uppercase tracking-wider text-zinc-500">
              <th className="p-3">Client</th><th className="p-3 text-right">Limit</th><th className="p-3 text-right">Exposure</th><th className="p-3">Utilization</th><th className="p-3 text-right">Overdue</th><th className="p-3 text-right">Score</th><th className="p-3">Risk</th>
            </tr></thead>
            <tbody>
              {loading && <tr><td colSpan={7} className="p-6 text-center text-zinc-500">Loading...</td></tr>}
              {!loading && shown.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-zinc-500">{rows.length === 0 ? "No clients yet." : "No clients match your filters."}</td></tr>}
              {shown.map((c) => {
                const t = levelTone(c.level);
                return (
                  <tr key={c.id} onClick={() => setOpenId(c.id)} className="cursor-pointer border-b border-[#1d2128] transition hover:bg-white/5">
                    <td className="p-3 font-medium text-zinc-100">{c.name}{c.on_hold && <span className="ml-2 rounded border border-rose-400/40 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-rose-300">Hold</span>}</td>
                    <td className="p-3 text-right text-zinc-300">{c.credit_limit > 0 ? fmtMoney(c.credit_limit, c.currency) : <span className="text-zinc-500">Not set</span>}</td>
                    <td className="p-3 text-right text-zinc-100">{fmtMoney(c.exposure, c.currency)}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[#232830]"><div className={`h-full ${t.bar}`} style={{ width: `${Math.min(100, c.utilization)}%` }} /></div>
                        <span className="w-9 text-[11px] text-zinc-400">{c.credit_limit > 0 ? `${c.utilization}%` : "-"}</span>
                      </div>
                    </td>
                    <td className={`p-3 text-right ${c.overdue > 0 ? "text-rose-300" : "text-zinc-500"}`}>{c.overdue > 0 ? fmtMoney(c.overdue, c.currency) : "-"}</td>
                    <td className="p-3 text-right font-semibold" style={{ color: t.hex }}>{c.level === "none" ? "-" : c.score}</td>
                    <td className="p-3"><Pill level={c.level} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <FDrawer open={!!openId} onClose={() => setOpenId(null)} title={r?.name ?? "Client"} subtitle={r ? `Risk score ${r.score} \u00b7 ${LEVEL_LABEL[r.level]}` : undefined} width="max-w-[620px]">
          {!detail && !msg && <p className="text-[12px] text-zinc-500">Loading...</p>}
          {msg && <div className={`mb-3 rounded-lg border px-3 py-2 text-[12px] ${msg.ok ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300" : "border-rose-400/30 bg-rose-500/10 text-rose-300"}`}>{msg.text}</div>}
          {detail && r && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 text-[20px] font-semibold" style={{ borderColor: levelTone(r.level).hex, color: levelTone(r.level).hex }}>{r.level === "none" ? "-" : r.score}</div>
                <div className="min-w-0">
                  <Pill level={r.level} />
                  <ul className="mt-1.5 space-y-0.5 text-[11px] text-zinc-400">{reasons(r).map((x) => <li key={x}>{x}</li>)}</ul>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                <Stat label="Credit limit" value={r.credit_limit > 0 ? fmtMoney(r.credit_limit, r.currency) : "Not set"} sub={r.headroom != null ? `Headroom ${fmtMoney(r.headroom, r.currency)}` : undefined} />
                <Stat label="Exposure" value={fmtMoney(r.exposure, r.currency)} sub={r.credit_limit > 0 ? `${r.utilization}% used` : undefined} />
                <Stat label="Overdue" value={fmtMoney(r.overdue, r.currency)} sub={r.overdue_count ? `${r.overdue_count} invoices` : "None"} />
              </div>

              <div>
                <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#d9b45a]">Exposure breakdown</h4>
                <div className="space-y-1 text-[12px] text-zinc-300">
                  <p className="flex justify-between"><span>Unpaid invoices</span><span>{fmtMoney(r.outstanding, r.currency)}</span></p>
                  <p className="flex justify-between"><span>Accepted proposals not yet booked</span><span>{fmtMoney(r.accepted_proposals, r.currency)}</span></p>
                  <p className="flex justify-between"><span>Booked / live campaigns not yet invoiced</span><span>{fmtMoney(r.unbilled_campaigns, r.currency)}</span></p>
                </div>
              </div>

              <div>
                <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#d9b45a]">Ageing</h4>
                <div className="grid grid-cols-5 gap-1.5 text-center">
                  {([["Current", r.ageing.current], ["1-30", r.ageing.d1_30], ["31-60", r.ageing.d31_60], ["61-90", r.ageing.d61_90], ["90+", r.ageing.d90]] as [string, number][]).map(([l, v]) => (
                    <div key={l} className="rounded-lg border border-[#2a2f37] bg-[#0f1216] p-2">
                      <p className="text-[9px] uppercase tracking-wider text-zinc-500">{l}</p>
                      <p className={`mt-0.5 text-[11px] font-semibold ${v > 0 && l !== "Current" ? "text-rose-300" : "text-zinc-200"}`}>{Math.round(v).toLocaleString("en-US")}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                <Stat label="Pays on time" value={r.on_time_pct != null ? `${r.on_time_pct}%` : "No data"} sub={`${r.paid_invoices} paid invoices`} />
                <Stat label="Average delay" value={r.avg_delay_days != null ? `${r.avg_delay_days} days` : "No data"} sub={r.avg_delay_days != null && r.avg_delay_days < 0 ? "Pays early" : undefined} />
                <Stat label="Last payment" value={r.last_payment_date ?? "None"} />
              </div>

              <div className="space-y-2 border-t border-[#2a2f37] pt-3">
                <h4 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#d9b45a]">Actions</h4>
                {limitForm ? (
                  <div className="space-y-2 rounded-lg border border-[#2b3038] p-3">
                    <label className={FIN.label}>New credit limit ({r.currency})</label>
                    <input type="number" min={0} className={FIN.input} value={limitForm.value} onChange={(e: any) => setLimitForm({ ...limitForm, value: e.target.value })} />
                    <label className={FIN.label}>Reason (optional)</label>
                    <input className={FIN.input} maxLength={200} value={limitForm.reason} onChange={(e: any) => setLimitForm({ ...limitForm, reason: e.target.value })} />
                    <div className="flex gap-2">
                      <button disabled={busy} className={FIN.btnGold} onClick={() => act(async () => { await creditApi.setLimit(r.id, Number(limitForm.value) || 0, limitForm.reason); setLimitForm(null); }, "Credit limit updated.")}>Save limit</button>
                      <button className={FIN.btnText} onClick={() => setLimitForm(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <button className={FIN.btnGold} onClick={() => setLimitForm({ value: String(r.credit_limit), reason: "" })}>Edit limit</button>
                    {r.suggested_limit != null && r.suggested_limit !== r.credit_limit && (
                      <button className={FIN.btnGhost} onClick={() => setLimitForm({ value: String(r.suggested_limit), reason: "Applied suggested limit" })}>Use suggested {fmtMoney(r.suggested_limit, r.currency)}</button>
                    )}
                    <a className={FIN.btnGhost} href={`https://wa.me/${phoneDigits(r.phone)}?text=${encodeURIComponent(reminderText(r, company))}`} target="_blank" rel="noreferrer">WhatsApp reminder</a>
                    {r.email && <a className={FIN.btnGhost} href={`mailto:${r.email}?subject=${encodeURIComponent("Payment reminder")}&body=${encodeURIComponent(reminderText(r, company))}`}>Email reminder</a>}
                  </div>
                )}
                {r.on_hold ? (
                  <button disabled={busy} className={FIN.btnGhost} onClick={() => act(() => creditApi.setHold(r.id, false, ""), "Booking hold released.")}>Release booking hold</button>
                ) : (
                  <div className="flex gap-2">
                    <input className={`${FIN.input} grow`} placeholder="Hold reason (optional)" maxLength={200} value={holdReason} onChange={(e: any) => setHoldReason(e.target.value)} />
                    <button disabled={busy} className={FIN.btnGhost} onClick={() => act(() => creditApi.setHold(r.id, true, holdReason), "New bookings are now on hold for this client.")}>Hold new bookings</button>
                  </div>
                )}
                <p className="text-[10px] text-zinc-500">A hold or an exceeded limit blocks new campaigns and proposal conversions. Admins with finance access can approve an exception.</p>
              </div>

              <div>
                <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#d9b45a]">Overdue and open invoices</h4>
                {detail.open_invoices.length === 0 && <p className="text-[12px] text-zinc-500">No open invoices.</p>}
                <ul className="space-y-1">
                  {detail.open_invoices.map((i) => (
                    <li key={i.id} className="flex justify-between text-[12px] text-zinc-300"><span>{i.invoice_number} <span className="text-zinc-500">due {String(i.due_date).slice(0, 10)}</span>{i.days_late > 0 && <span className="ml-2 text-rose-300">{i.days_late} days late</span>}</span><span>{fmtMoney(i.balance, r.currency)}</span></li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#d9b45a]">Limit history</h4>
                {detail.history.length === 0 && <p className="text-[12px] text-zinc-500">No changes recorded yet.</p>}
                <ul className="space-y-1.5">
                  {detail.history.map((h) => (
                    <li key={h.id} className="text-[12px] text-zinc-300">
                      <span className="text-zinc-100">{h.kind === "limit" ? `Limit ${fmtMoney(h.old_limit ?? 0, r.currency)} to ${fmtMoney(h.new_limit ?? 0, r.currency)}` : h.kind === "hold" ? "Booking hold on" : h.kind === "release" ? "Booking hold released" : "Exception approved"}</span>
                      {h.reason ? ` \u00b7 ${h.reason}` : ""}
                      <span className="ml-2 text-[10px] text-zinc-500">{h.actor_email || ""} {String(h.created_at).slice(0, 16).replace("T", " ")}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </FDrawer>
      </div>
    </PermissionGate>
  );
};

export default CreditRiskDashboard;
