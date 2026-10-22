import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams, Link } from "@/lib/router";
import { PermissionGate } from "@/components/ui/PermissionGate";
import { ApiError } from "@/lib/api/client";
import { campaignsApi, type CampaignBundle } from "@/lib/api/campaigns";
import { useCompanyProfile } from "@/hooks/useCompanyProfile";
import { downloadCsv, money, toCsv } from "../crm/crmTools";
import { FIN, GOLD_CARD, SILVER_CARD, FDrawer, ModalTitle, SectionTitle, fit, statusPill } from "../finance/financeUi";
import AddInvoiceForm from "../finance/AddInvoiceForm";
import { RenewModal } from "./RenewModal";
import { AnalyticsPanel, ApprovalsPanel, CreativesPanel, DeliveryPanel, ProofPanel } from "./WorkspaceTabs";
import {
  STATUS_ACTION,
  campaignAlerts,
  campaignDays,
  campaignMoney,
  phoneDigits,
  screenSubtotal,
  statusLabel,
  statusTone,
  summaryText,
  timing,
} from "./campaignTools";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "screens", label: "Screens" },
  { key: "schedule", label: "Schedule" },
  { key: "billing", label: "Billing" },
  { key: "expenses", label: "Expenses" },
  { key: "activity", label: "Activity" },
  { key: "creatives", label: "Creatives" },
  { key: "approvals", label: "Approvals" },
  { key: "delivery", label: "Delivery" },
  { key: "pop", label: "Proof of Play" },
  { key: "analytics", label: "Analytics" },
];

const esc = (s: unknown): string =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

const Stat: React.FC<{ label: string; value: string; tone?: string }> = ({ label, value, tone }) => (
  <div className={`${FIN.panel} p-3`}>
    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">{label}</p>
    <p className={`mt-1 font-bold ${tone ?? "text-zinc-100"}`} style={{ fontSize: fit(value, 18, 140) }}>{value}</p>
  </div>
);

export const CampaignWorkspacePage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") ?? "overview";
  const { profile } = useCompanyProfile();

  const [data, setData] = useState<CampaignBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [renewing, setRenewing] = useState(false);
  const [invoicing, setInvoicing] = useState(false);
  const [summary, setSummary] = useState(false);
  const [picker, setPicker] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setData(await campaignsApi.get(id));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the campaign.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const flash = (ok: boolean, text: string) => {
    setNote({ ok, text });
    window.setTimeout(() => setNote(null), 5000);
  };

  const c = data?.campaign;
  const cur = c?.currency || "PKR";
  const fmt = useCallback((n: number) => money(n, cur), [cur]);

  const m = useMemo(
    () => (data && c ? campaignMoney(c.total_budget, data.invoices, data.expenses, data.screens, c.start_date, c.end_date) : null),
    [data, c],
  );
  const t = useMemo(() => (c ? timing(c.start_date, c.end_date) : null), [c]);
  const alerts = useMemo(() => (data && c && m ? campaignAlerts(c, m, data.invoices.length, data.screens.length) : []), [data, c, m]);

  if (loading) return <div className={`${FIN.page} text-[12px] text-zinc-500`}>Loading campaign...</div>;
  if (error || !data || !c || !m || !t) {
    return (
      <div className={FIN.page}>
        <Link to="/campaigns" className="text-[11px] text-zinc-400 hover:text-zinc-100">Back to campaigns</Link>
        <p className="mt-4 text-[12px] text-rose-300">{error || "Campaign not found."}</p>
      </div>
    );
  }

  const tone = statusTone(c.status);
  const changeStatus = async (next: string) => {
    if (next === "cancelled" && !window.confirm("Cancel this campaign?")) return;
    setBusy(true);
    try {
      const r = await campaignsApi.setStatus(c.id, next);
      flash(true, r.message ?? `Status changed to ${statusLabel(next)}.`);
      await load();
    } catch (e) {
      flash(false, e instanceof Error ? e.message : "Could not change the status.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm("Delete this draft campaign? This cannot be undone.")) return;
    try {
      await campaignsApi.remove(c.id);
      navigate("/campaigns");
    } catch (e) {
      flash(false, e instanceof Error ? e.message : "Could not delete the campaign.");
    }
  };

  const removeScreen = async (csId: string, name: string) => {
    if (!window.confirm(`Remove ${name} from this campaign?`)) return;
    try {
      await campaignsApi.removeScreen(c.id, csId);
      await load();
    } catch (e) {
      flash(false, e instanceof Error ? e.message : "Could not remove the screen.");
    }
  };


  const invoicePrefill = {
    client_id: c.client_id,
    campaign_id: c.id,
    currency: cur,
    items: data.screens.length
      ? data.screens.map((s) => ({
          description: `${s.name ?? "Screen"}${s.city ? `, ${s.city}` : ""} (${c.start_date} to ${c.end_date})`,
          quantity: campaignDays(c.start_date, c.end_date),
          rate: Number(s.rate_applied) || 0,
        }))
      : [{ description: `${c.name} advertising`, quantity: 1, rate: Number(c.total_budget) || 0 }],
  };

  const exportScreens = () =>
    downloadCsv(
      `${c.name}-screens.csv`,
      toCsv(
        data.screens.map((s) => ({
          name: s.name ?? "",
          city: s.city ?? "",
          rate: s.rate_applied,
          days: t.totalDays,
          subtotal: screenSubtotal(s.rate_applied, c.start_date, c.end_date),
        })),
        [
          { key: "name", label: "Screen" },
          { key: "city", label: "City" },
          { key: "rate", label: "Daily rate" },
          { key: "days", label: "Days" },
          { key: "subtotal", label: "Subtotal" },
        ],
      ),
    );

  const printSummary = () => {
    const w = window.open("", "_blank");
    if (!w) return flash(false, "Pop-up blocked. Allow pop-ups to print.");
    const rows = data.screens
      .map(
        (s) =>
          `<tr><td>${esc(s.name)}</td><td>${esc(s.city)}</td><td style="text-align:right">${esc(fmt(Number(s.rate_applied) || 0))}</td><td style="text-align:right">${esc(fmt(screenSubtotal(s.rate_applied, c.start_date, c.end_date)))}</td></tr>`,
      )
      .join("");
    w.document.write(
      `<!doctype html><html><head><meta charset="utf-8"><title>${esc(c.name)}</title><style>body{font-family:Arial,sans-serif;color:#1b1d21;padding:32px;max-width:760px;margin:auto}h1{font-size:22px;margin:0}h2{font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#a97b22;margin:24px 0 6px}table{width:100%;border-collapse:collapse;font-size:13px}th,td{padding:7px 6px;border-bottom:1px solid #e3ddcf;text-align:left}th{font-size:11px;text-transform:uppercase;color:#777}.k{display:flex;gap:24px;font-size:13px;margin-top:10px}.k div span{display:block;font-size:11px;color:#777;text-transform:uppercase}.t{margin-top:16px;text-align:right;font-size:16px;font-weight:bold}</style></head><body><p style="margin:0;color:#a97b22;font-weight:bold">${esc(profile?.legalName ?? "")}</p><h1>Campaign Summary</h1><p style="margin:2px 0 0;font-size:14px">${esc(c.name)}</p><div class="k"><div><span>Client</span>${esc(c.client_name ?? "-")}</div><div><span>Period</span>${esc(c.start_date)} to ${esc(c.end_date)}</div><div><span>Duration</span>${t.totalDays} days</div><div><span>Status</span>${esc(statusLabel(c.status))}</div></div><h2>Screens</h2><table><thead><tr><th>Screen</th><th>City</th><th style="text-align:right">Daily rate</th><th style="text-align:right">Subtotal</th></tr></thead><tbody>${rows || '<tr><td colspan="4">No screens</td></tr>'}</tbody></table><p class="t">Total: ${esc(fmt(Number(c.total_budget) || 0))}</p></body></html>`,
    );
    w.document.close();
    w.focus();
    w.print();
  };

  const whatsapp = () => {
    const text = encodeURIComponent(summaryText(data, profile?.legalName ?? "Campaign", fmt));
    const phone = phoneDigits(c.client_phone);
    window.open(`https://wa.me/${phone}?text=${text}`, "_blank");
  };

  return (
    <div className={FIN.page}>
      <Link to="/campaigns" className="text-[11px] text-zinc-400 hover:text-zinc-100">Back to campaigns</Link>

      <div className="mb-4 mt-2 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-lg font-semibold tracking-tight text-zinc-50">{c.name}</h1>
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${tone.cls}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
              {statusLabel(c.status)}
            </span>
          </div>
          <p className="text-[11px] text-zinc-500">
            CMP-{c.id.slice(0, 4).toUpperCase()} &middot; {c.client_name ?? "No client"} &middot; {c.start_date} to {c.end_date}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className={FIN.btnGhost} onClick={() => setSummary(true)}>Client summary</button>
          <PermissionGate permission="campaigns.manage" fallback={null}>
            {data.nextStatuses
              .filter((s) => s !== "draft" || c.status === "booked" || c.status === "cancelled")
              .map((s) => (
                <button key={s} className={s === "cancelled" ? FIN.btnGhost : FIN.btnGold} disabled={busy} onClick={() => changeStatus(s)}>
                  {STATUS_ACTION[s] ?? statusLabel(s)}
                </button>
              ))}
            <button className={FIN.btnGhost} onClick={() => setRenewing(true)}>Renew</button>
            <button className={FIN.btnGhost} onClick={() => setEditing(true)}>Edit</button>
            {c.status === "draft" && <button className={FIN.btnGhost} onClick={remove}>Delete</button>}
          </PermissionGate>
        </div>
      </div>

      {note && <p className={`mb-3 text-[12px] ${note.ok ? "text-emerald-300" : "text-rose-300"}`}>{note.text}</p>}

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { l: "Contract value", v: fmt(m.contract), g: true },
          { l: "Received", v: fmt(m.received), g: false },
          { l: "Expenses", v: fmt(m.expenses), g: false },
          { l: "Profit so far", v: fmt(m.profitSoFar), g: true },
        ].map((x) => (
          <div key={x.l} className="rounded-xl p-3" style={x.g ? GOLD_CARD : SILVER_CARD}>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-black/60">{x.l}</p>
            <p className="mt-1 font-bold text-[#1a1204]" style={{ fontSize: fit(x.v, 20, 150) }}>{x.v}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5 border-b border-[#22262d] pb-2">
        {TABS.map((x) => (
          <button
            key={x.key}
            onClick={() => setParams({ tab: x.key })}
            className={`rounded-lg px-3 py-1.5 text-[11px] font-medium transition ${
              tab === x.key ? "bg-[#c99b3b]/15 text-[#f1d68a] ring-1 ring-[#c99b3b]/40" : "text-zinc-400 hover:text-zinc-100"
            }`}
          >
            {x.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="space-y-4">
          {alerts.length > 0 && (
            <div className="space-y-1.5">
              {alerts.map((a) => (
                <div
                  key={a.text}
                  className={`rounded-lg border px-3 py-2 text-[12px] ${
                    a.level === "bad" ? "border-rose-400/30 bg-rose-400/10 text-rose-200" : "border-amber-400/30 bg-amber-400/10 text-amber-200"
                  }`}
                >
                  {a.text}
                </div>
              ))}
            </div>
          )}
          <div className={`${FIN.panel} p-4`}>
            <SectionTitle>Progress</SectionTitle>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[#1b1f25]">
              <div className="h-full rounded-full bg-gradient-to-r from-[#f1d68a] to-[#a97b22]" style={{ width: `${Math.min(100, t.progress)}%` }} />
            </div>
            <p className="mt-2 text-[11px] text-zinc-400">
              {t.phase === "upcoming" && `Starts in ${t.startsIn} day${t.startsIn === 1 ? "" : "s"}. `}
              {t.phase === "running" && `Day ${t.elapsedDays} of ${t.totalDays}. ${t.daysLeft} day${t.daysLeft === 1 ? "" : "s"} left. `}
              {t.phase === "ended" && `Ended ${Math.abs(t.daysLeft)} day${Math.abs(t.daysLeft) === 1 ? "" : "s"} ago. `}
              {t.progress}% of the campaign period.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Invoiced" value={fmt(m.invoiced)} />
            <Stat label="Received" value={fmt(m.received)} tone="text-emerald-300" />
            <Stat label="Outstanding" value={fmt(m.outstanding)} tone={m.outstanding > 0 ? "text-rose-300" : undefined} />
            <Stat label="Expected profit" value={fmt(m.expectedProfit)} tone="text-[#f1d68a]" />
          </div>
          <div className={`${FIN.panel} grid grid-cols-2 gap-3 p-4 text-[12px] lg:grid-cols-4`}>
            <div><p className={FIN.label}>Client</p><p className="text-zinc-100">{c.client_name ?? "-"}</p></div>
            <div><p className={FIN.label}>Phone</p><p className="text-zinc-100">{c.client_phone ?? "-"}</p></div>
            <div><p className={FIN.label}>Screens</p><p className="text-zinc-100">{data.screens.length}</p></div>
            <div><p className={FIN.label}>Duration</p><p className="text-zinc-100">{t.totalDays} days</p></div>
          </div>
        </div>
      )}

      {tab === "screens" && (
        <div className={`${FIN.panel} p-4`}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <SectionTitle>Screens in this campaign</SectionTitle>
            <div className="flex gap-2">
              <button className={FIN.btnGhost} onClick={exportScreens}>Export CSV</button>
              <PermissionGate permission="campaigns.manage" fallback={null}>
                <button className={FIN.btnGold} onClick={() => setPicker(true)}>+ Add screen</button>
              </PermissionGate>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-[12px]">
              <thead className="border-b border-[#2a2f37] text-[10px] uppercase tracking-[0.12em] text-zinc-400">
                <tr>
                  <th className="p-2 font-semibold">Screen</th>
                  <th className="p-2 font-semibold">City</th>
                  <th className="p-2 text-right font-semibold">Daily rate</th>
                  <th className="p-2 text-right font-semibold">Days</th>
                  <th className="p-2 text-right font-semibold">Subtotal</th>
                  <th className="p-2" />
                </tr>
              </thead>
              <tbody>
                {data.screens.length === 0 && (
                  <tr><td colSpan={6} className="p-6 text-center text-zinc-500">No screens yet. Add the first screen.</td></tr>
                )}
                {data.screens.map((s) => (
                  <tr key={s.id} className="border-t border-[#20242b]">
                    <td className="p-2 text-zinc-100">
                      {s.name ?? "Removed screen"}
                      <span className="ml-1.5 text-[10px] text-zinc-500">{s.screen_type}</span>
                    </td>
                    <td className="p-2 text-zinc-400">{s.city ?? "-"}</td>
                    <td className="p-2 text-right text-zinc-300">{fmt(Number(s.rate_applied) || 0)}</td>
                    <td className="p-2 text-right text-zinc-400">{t.totalDays}</td>
                    <td className="p-2 text-right font-semibold text-zinc-100">{fmt(screenSubtotal(s.rate_applied, c.start_date, c.end_date))}</td>
                    <td className="p-2 text-right">
                      <PermissionGate permission="campaigns.manage" fallback={null}>
                        <button className="text-[11px] text-rose-300 hover:underline" onClick={() => removeScreen(s.id, s.name ?? "this screen")}>Remove</button>
                      </PermissionGate>
                    </td>
                  </tr>
                ))}
              </tbody>
              {data.screens.length > 0 && (
                <tfoot>
                  <tr className="border-t border-[#2a2f37] text-[12px]">
                    <td colSpan={4} className="p-2 text-right text-zinc-400">Screens total</td>
                    <td className="p-2 text-right font-bold text-[#f1d68a]">{fmt(m.screensTotal)}</td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          {Math.round(m.screensTotal) !== Math.round(m.contract) && data.screens.length > 0 && (
            <p className="mt-3 text-[11px] text-amber-300">
              The screens total differs from the contract value ({fmt(m.contract)}). Use Edit to update the contract value if needed.
            </p>
          )}
        </div>
      )}

      {tab === "schedule" && (
        <div className={`${FIN.panel} p-4`}>
          <SectionTitle>Schedule</SectionTitle>
          <div className="mt-4 flex justify-between text-[11px] text-zinc-400">
            <span>{c.start_date}</span>
            <span>{c.end_date}</span>
          </div>
          <div className="relative mt-1 h-7 overflow-hidden rounded-lg bg-[#1b1f25]">
            <div className="h-full bg-gradient-to-r from-[#f1d68a]/80 to-[#a97b22]/80" style={{ width: `${Math.min(100, t.progress)}%` }} />
            <span className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold text-white">{t.progress}%</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Total days" value={String(t.totalDays)} />
            <Stat label="Days done" value={String(t.elapsedDays)} />
            <Stat label="Days left" value={String(Math.max(0, t.daysLeft))} />
            <Stat label="Phase" value={t.phase === "running" ? "Running" : t.phase === "upcoming" ? "Not started" : "Ended"} />
          </div>
        </div>
      )}

      {tab === "billing" && (
        <div className={`${FIN.panel} p-4`}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <SectionTitle>Invoices</SectionTitle>
            <PermissionGate permission="finance.manage" fallback={null}>
              <button className={FIN.btnGold} onClick={() => setInvoicing(true)}>+ Create invoice</button>
            </PermissionGate>
          </div>
          <div className="mb-3 grid grid-cols-3 gap-3">
            <Stat label="Invoiced" value={fmt(m.invoiced)} />
            <Stat label="Received" value={fmt(m.received)} tone="text-emerald-300" />
            <Stat label="Outstanding" value={fmt(m.outstanding)} tone={m.outstanding > 0 ? "text-rose-300" : undefined} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-[12px]">
              <thead className="border-b border-[#2a2f37] text-[10px] uppercase tracking-[0.12em] text-zinc-400">
                <tr>
                  <th className="p-2 font-semibold">Invoice</th>
                  <th className="p-2 font-semibold">Issued</th>
                  <th className="p-2 font-semibold">Due</th>
                  <th className="p-2 text-right font-semibold">Total</th>
                  <th className="p-2 text-right font-semibold">Paid</th>
                  <th className="p-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.invoices.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-zinc-500">No invoices for this campaign yet.</td></tr>}
                {data.invoices.map((i) => {
                  const p = statusPill(i.status);
                  return (
                    <tr key={i.id} className="border-t border-[#20242b]">
                      <td className="p-2 font-mono text-zinc-100">{i.invoice_number}</td>
                      <td className="p-2 text-zinc-400">{i.issue_date}</td>
                      <td className="p-2 text-zinc-400">{i.due_date}</td>
                      <td className="p-2 text-right text-zinc-100">{money(i.total_amount, i.currency)}</td>
                      <td className="p-2 text-right text-emerald-300">{money(i.amount_paid, i.currency)}</td>
                      <td className="p-2"><span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${p.cls}`}>{statusLabel(i.status)}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "expenses" && (
        <div className={`${FIN.panel} p-4`}>
          <SectionTitle>Campaign expenses</SectionTitle>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-[12px]">
              <thead className="border-b border-[#2a2f37] text-[10px] uppercase tracking-[0.12em] text-zinc-400">
                <tr>
                  <th className="p-2 font-semibold">Date</th>
                  <th className="p-2 font-semibold">Category</th>
                  <th className="p-2 font-semibold">Description</th>
                  <th className="p-2 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.expenses.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-zinc-500">No expenses linked to this campaign.</td></tr>}
                {data.expenses.map((e) => (
                  <tr key={e.id} className="border-t border-[#20242b]">
                    <td className="p-2 text-zinc-400">{e.expense_date}</td>
                    <td className="p-2 text-zinc-300">{e.category ?? "-"}</td>
                    <td className="p-2 text-zinc-300">{e.description ?? "-"}</td>
                    <td className="p-2 text-right text-zinc-100">{fmt(Number(e.amount) || 0)}</td>
                  </tr>
                ))}
              </tbody>
              {data.expenses.length > 0 && (
                <tfoot>
                  <tr className="border-t border-[#2a2f37]">
                    <td colSpan={3} className="p-2 text-right text-zinc-400">Total expenses</td>
                    <td className="p-2 text-right font-bold text-[#f1d68a]">{fmt(m.expenses)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          <p className="mt-3 text-[11px] text-zinc-500">Profit so far = money received minus these expenses.</p>
        </div>
      )}

      {tab === "activity" && (
        <div className={`${FIN.panel} p-4`}>
          <SectionTitle>Activity</SectionTitle>
          <ul className="mt-3 space-y-2">
            {data.activity.length === 0 && <li className="text-[12px] text-zinc-500">No activity recorded yet.</li>}
            {data.activity.map((a) => (
              <li key={a.id} className="flex items-start gap-3 border-b border-[#1b1f25] pb-2 text-[12px]">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#d9b45a]" />
                <div>
                  <p className="text-zinc-100">{a.action}{a.detail ? <span className="text-zinc-400"> &middot; {a.detail}</span> : null}</p>
                  <p className="text-[10px] text-zinc-500">{a.actor_email ?? "System"} &middot; {String(a.created_at).replace("T", " ").slice(0, 16)}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === "creatives" && <CreativesPanel campaignId={c.id} />}
      {tab === "approvals" && <ApprovalsPanel campaignId={c.id} />}
      {tab === "delivery" && <DeliveryPanel data={data} />}
      {tab === "pop" && <ProofPanel data={data} />}
      {tab === "analytics" && <AnalyticsPanel data={data} m={m} />}

      {editing && <EditModal data={data} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); load(); flash(true, "Campaign updated."); }} />}
      {renewing && (
        <RenewModal
          campaign={c}
          onClose={() => setRenewing(false)}
          onDone={(nid) => {
            setRenewing(false);
            navigate(`/campaigns/${nid}`);
          }}
        />
      )}
      {invoicing && (
        <div className={FIN.overlay}>
          <AddInvoiceForm
            prefill={invoicePrefill}
            onClose={() => {
              setInvoicing(false);
              load();
            }}
          />
        </div>
      )}
      {picker && (
        <ScreenPicker
          data={data}
          onClose={() => setPicker(false)}
          onAdded={() => {
            load();
          }}
          notify={flash}
        />
      )}
      <FDrawer open={summary} onClose={() => setSummary(false)} title="Client summary" subtitle={c.name}>
        <div className={`${FIN.paper} p-5 text-[12px]`}>
          <p className="text-[11px] font-bold text-[#a97b22]">{profile?.legalName ?? ""}</p>
          <p className="mt-1 text-[16px] font-bold">{c.name}</p>
          <p className="text-[#555]">{c.client_name ?? "-"}</p>
          <p className="mt-2 text-[#555]">{c.start_date} to {c.end_date} ({t.totalDays} days)</p>
          <ul className="mt-3 space-y-1">
            {data.screens.map((s) => (
              <li key={s.id} className="flex justify-between border-b border-[#e3ddcf] py-1">
                <span>{s.name}{s.city ? `, ${s.city}` : ""}</span>
                <span>{fmt(screenSubtotal(s.rate_applied, c.start_date, c.end_date))}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-right text-[14px] font-bold">Total {fmt(m.contract)}</p>
        </div>
        <div className="mt-4 flex gap-2">
          <button className={FIN.btnGold} onClick={printSummary}>Print / Save PDF</button>
          <button className={FIN.btnGhost} onClick={whatsapp}>Share on WhatsApp</button>
        </div>
      </FDrawer>
    </div>
  );
};

const EditModal: React.FC<{ data: CampaignBundle; onClose: () => void; onSaved: () => void }> = ({ data, onClose, onSaved }) => {
  const c = data.campaign;
  const [f, setF] = useState({ name: c.name, start_date: c.start_date, end_date: c.end_date, total_budget: String(c.total_budget), currency: c.currency });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: any) => {
    e.preventDefault();
    if (f.end_date < f.start_date) return setErr("End date must be on or after the start date.");
    setBusy(true);
    try {
      await campaignsApi.edit(c.id, { ...f, total_budget: Number(f.total_budget) || 0 });
      onSaved();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Could not save.");
      setBusy(false);
    }
  };
  return (
    <div className={FIN.overlay}>
      <form onSubmit={submit} className={`${FIN.modal} max-w-md`}>
        <ModalTitle>Edit campaign</ModalTitle>
        <div className="space-y-3">
          <div><label className={FIN.label}>Name</label><input required className={FIN.input} value={f.name} onChange={(e: any) => setF({ ...f, name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={FIN.label}>Start date</label><input required type="date" className={FIN.input} value={f.start_date} onChange={(e: any) => setF({ ...f, start_date: e.target.value })} /></div>
            <div><label className={FIN.label}>End date</label><input required type="date" className={FIN.input} value={f.end_date} onChange={(e: any) => setF({ ...f, end_date: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={FIN.label}>Contract value</label><input type="number" min={0} className={FIN.input} value={f.total_budget} onChange={(e: any) => setF({ ...f, total_budget: e.target.value })} /></div>
            <div><label className={FIN.label}>Currency</label><input className={FIN.input} maxLength={3} value={f.currency} onChange={(e: any) => setF({ ...f, currency: e.target.value.toUpperCase() })} /></div>
          </div>
        </div>
        {err && <p className="mt-3 text-[11px] text-rose-300">{err}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className={FIN.btnText} onClick={onClose}>Cancel</button>
          <button type="submit" className={FIN.btnGold} disabled={busy}>{busy ? "Saving..." : "Save changes"}</button>
        </div>
      </form>
    </div>
  );
};

const ScreenPicker: React.FC<{
  data: CampaignBundle;
  onClose: () => void;
  onAdded: () => void;
  notify: (ok: boolean, text: string) => void;
}> = ({ data, onClose, onAdded, notify }) => {
  const [items, setItems] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<string | null>(null);
  const used = useMemo(() => new Set(data.screens.map((s) => s.inventory_id)), [data.screens]);

  useEffect(() => {
    fetch("/api/inventory")
      .then((r) => r.json())
      .then((d) => d.ok && setItems(d.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  const add = async (it: any, force = false) => {
    setPending(it.id);
    try {
      const r = await campaignsApi.addScreen(data.campaign.id, { inventory_id: it.id, rate_applied: Number(it.rate) || 0, force });
      notify(true, r.message ?? "Screen added.");
      onAdded();
    } catch (e) {
      if (e instanceof ApiError && e.code === "CONFLICT") {
        if (window.confirm(`${e.message}\n\nAdd it anyway?`)) {
          await add(it, true);
          return;
        }
      } else {
        notify(false, e instanceof Error ? e.message : "Could not add the screen.");
      }
    } finally {
      setPending(null);
    }
  };

  const list = items.filter(
    (i) => !used.has(i.id) && (!q.trim() || `${i.name} ${i.city ?? ""}`.toLowerCase().includes(q.trim().toLowerCase())),
  );

  return (
    <div className={FIN.overlay}>
      <div className={`${FIN.modal} max-w-lg`}>
        <ModalTitle>Add screen to campaign</ModalTitle>
        <input className={`${FIN.input} mb-3`} placeholder="Search screens..." value={q} onChange={(e: any) => setQ(e.target.value)} />
        <div className="max-h-[50vh] space-y-1.5 overflow-y-auto">
          {loading && <p className="text-[12px] text-zinc-500">Loading...</p>}
          {!loading && list.length === 0 && <p className="py-4 text-center text-[12px] text-zinc-500">No screens available to add.</p>}
          {list.map((i) => (
            <div key={i.id} className="flex items-center justify-between gap-2 rounded-lg border border-[#2a2f37] bg-[#0f1216] p-2.5">
              <div className="min-w-0">
                <p className="truncate text-[12px] text-zinc-100">{i.name}</p>
                <p className="text-[10px] text-zinc-500">{i.city ?? "-"} &middot; {money(Number(i.rate) || 0, i.currency || data.campaign.currency)} / day</p>
              </div>
              <button className={FIN.btnGhost} disabled={pending === i.id} onClick={() => add(i)}>{pending === i.id ? "Adding..." : "Add"}</button>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end"><button className={FIN.btnText} onClick={onClose}>Done</button></div>
      </div>
    </div>
  );
};
