import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useCompanyProfile } from "@/hooks/useCompanyProfile";
import { useSession } from "@/hooks/useSession";
import {
  reportsApi,
  type EmailLog,
  type ReportSummary,
  type SavedReport,
  type Statement,
} from "@/lib/api/reports";
import { FDrawer, FIN, GOLD_CARD, SILVER_CARD, SectionTitle, fit } from "../finance/financeUi";
import { Donut, HBars, Legend, TrendChart } from "./reportCharts";
import {
  PRESETS,
  buildReportHtml,
  delta,
  downloadXlsx,
  fmtMoney,
  fmtNum,
  isoToday,
  presetRange,
  printReport,
  type DocCol,
  type PresetKey,
  type ReportDoc,
} from "./reportTools";

type TabKey = "overview" | "pnl" | "receivables" | "statement" | "campaigns" | "inventory" | "sales" | "email";

const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "pnl", label: "Profit & Loss" },
  { key: "receivables", label: "Receivables" },
  { key: "statement", label: "Client Statement" },
  { key: "campaigns", label: "Campaigns" },
  { key: "inventory", label: "Inventory" },
  { key: "sales", label: "Sales & CRM" },
  { key: "email", label: "Email & Schedule" },
];

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const Chip: React.FC<{ d: { pct: number; up: boolean } | null; goodWhenUp?: boolean }> = ({ d, goodWhenUp = true }) => {
  if (!d) return <span className="text-[10px] text-black/45">no earlier data</span>;
  const good = d.up === goodWhenUp;
  return (
    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${good ? "bg-emerald-900/15 text-emerald-900" : "bg-rose-900/15 text-rose-900"}`}>
      {d.up ? "+" : ""}
      {d.pct}% vs previous
    </span>
  );
};

const Kpi: React.FC<{ label: string; value: string; gold?: boolean; foot: React.ReactNode }> = ({ label, value, gold, foot }) => (
  <div className="rounded-xl p-3" style={gold ? GOLD_CARD : SILVER_CARD}>
    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-black/60">{label}</p>
    <p className="mt-1 font-bold text-[#1a1204]" style={{ fontSize: fit(value, 21, 150) }}>{value}</p>
    <div className="mt-0.5">{foot}</div>
  </div>
);

const Table: React.FC<{ cols: DocCol[]; rows: Record<string, string | number>[]; totals?: Record<string, string | number>; empty?: string }> = ({ cols, rows, totals, empty }) => (
  <div className="overflow-x-auto">
    <table className="w-full min-w-[560px] text-left text-[12px]">
      <thead className="border-b border-[#2a2f37] text-[10px] uppercase tracking-[0.12em] text-zinc-400">
        <tr>{cols.map((c) => <th key={c.key} className="p-2 font-semibold" style={{ textAlign: c.align ?? "left" }}>{c.label}</th>)}</tr>
      </thead>
      <tbody>
        {rows.length === 0 && <tr><td colSpan={cols.length} className="p-6 text-center text-zinc-500">{empty ?? "No records for this period."}</td></tr>}
        {rows.map((r, i) => (
          <tr key={i} className="border-t border-[#20242b]">
            {cols.map((c) => <td key={c.key} className="p-2 text-zinc-200" style={{ textAlign: c.align ?? "left" }}>{r[c.key] ?? ""}</td>)}
          </tr>
        ))}
      </tbody>
      {totals && (
        <tfoot>
          <tr className="border-t border-[#c99b3b]/50">
            {cols.map((c) => <td key={c.key} className="p-2 font-bold text-[#f1d68a]" style={{ textAlign: c.align ?? "left" }}>{totals[c.key] ?? ""}</td>)}
          </tr>
        </tfoot>
      )}
    </table>
  </div>
);

const Panel: React.FC<{ title: string; right?: React.ReactNode; children: React.ReactNode; className?: string }> = ({ title, right, children, className }) => (
  <div className={`${FIN.panel} p-4 ${className ?? ""}`}>
    <div className="mb-3 flex items-center justify-between gap-2">
      <SectionTitle>{title}</SectionTitle>
      {right}
    </div>
    {children}
  </div>
);

export const ReportsPage: React.FC = () => {
  const { company } = useSession();
  const { profile } = useCompanyProfile();
  const [preset, setPreset] = useState<PresetKey>("month");
  const [range, setRange] = useState(presetRange("month"));
  const [tab, setTab] = useState<TabKey>("overview");
  const [data, setData] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<ReportDoc | null>(null);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  // statement
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [clientId, setClientId] = useState("");
  const [statement, setStatement] = useState<Statement | null>(null);
  const [stLoading, setStLoading] = useState(false);

  // saved views
  const [saved, setSaved] = useState<SavedReport[]>([]);

  // email
  const [emailDay, setEmailDay] = useState("Monday");
  const [extraEmails, setExtraEmails] = useState("");
  const [emailHtml, setEmailHtml] = useState("");
  const [history, setHistory] = useState<EmailLog[]>([]);
  const [emailBusy, setEmailBusy] = useState(false);

  const flash = (ok: boolean, text: string) => {
    setNote({ ok, text });
    window.setTimeout(() => setNote(null), 6000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await reportsApi.summary(range.from, range.to));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the reports.");
    } finally {
      setLoading(false);
    }
  }, [range.from, range.to]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    reportsApi.saved().then((r) => setSaved(r.saved)).catch(() => undefined);
    reportsApi.clients().then((r) => setClients(r.clients)).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (company) {
      setEmailDay((company as any).report_email_day || "Monday");
      setExtraEmails((company as any).report_extra_emails || "");
    }
  }, [company]);

  useEffect(() => {
    if (tab !== "email") return;
    reportsApi.emailPreview().then((r) => setEmailHtml(r.html)).catch(() => setEmailHtml(""));
    reportsApi.emailHistory().then((r) => setHistory(r.history)).catch(() => undefined);
  }, [tab]);

  useEffect(() => {
    if (tab !== "statement" || !clientId) return;
    setStLoading(true);
    reportsApi
      .statement(clientId, range.from, range.to)
      .then(setStatement)
      .catch((e) => flash(false, e instanceof Error ? e.message : "Could not load the statement."))
      .finally(() => setStLoading(false));
  }, [tab, clientId, range.from, range.to]);

  const cur = data?.currency ?? "PKR";
  const money = useCallback((n: number) => fmtMoney(n, cur), [cur]);
  const periodText = `${range.from} to ${range.to}`;
  const company_ = {
    name: profile?.legalName || company?.name || "Nexora Technologies",
    address: [profile?.address, profile?.city, profile?.country].filter(Boolean).join(", "),
    phone: profile?.phone || undefined,
    ntn: profile?.ntn || undefined,
    email: profile?.email || undefined,
  };

  const pickPreset = (k: PresetKey) => {
    setPreset(k);
    setRange(presetRange(k));
  };

  /* ---------------- documents ---------------- */

  const insights = useMemo(() => {
    if (!data) return [] as string[];
    const k = data.kpis.current;
    const p = data.kpis.previous;
    const out: string[] = [];
    const dr = delta(k.received, p.received);
    if (dr) out.push(`Collections are ${dr.up ? "up" : "down"} ${Math.abs(dr.pct)}% compared with the previous period.`);
    else out.push(`${money(k.received)} was collected in this period.`);
    if (k.profit < 0) out.push(`Expenses exceeded collections by ${money(Math.abs(k.profit))} in this period.`);
    else if (k.received > 0) out.push(`Net profit is ${money(k.profit)}, a ${k.margin}% margin.`);
    if (data.overdue > 0) out.push(`${money(data.overdue)} of receivables is overdue. Follow up with the clients listed in Receivables.`);
    if (data.inventory.rows.length > 0) {
      out.push(
        data.inventory.occupancy < 50
          ? `Inventory occupancy is ${data.inventory.occupancy}%. There is room to sell more slots.`
          : `Inventory occupancy is a healthy ${data.inventory.occupancy}%.`,
      );
    }
    const top = data.topClients[0];
    if (top && k.invoiced > 0) out.push(`${top.name} is the largest client this period (${Math.round((top.invoiced / k.invoiced) * 100)}% of invoiced value).`);
    return out;
  }, [data, money]);

  const buildDoc = useCallback((): ReportDoc | null => {
    if (!data) return null;
    const k = data.kpis.current;
    const p = data.kpis.previous;
    const d = (a: number, b: number) => {
      const x = delta(a, b);
      return x ? `${x.up ? "+" : ""}${x.pct}% vs previous period` : undefined;
    };
    const base = { company: company_, period: periodText };
    const mCol = (key: string, label: string): DocCol => ({ key, label, align: "right", num: true });

    if (tab === "overview") {
      return {
        ...base,
        title: "Business Overview",
        subtitle: "Performance summary",
        kpis: [
          { label: "Collected", value: money(k.received), sub: d(k.received, p.received) },
          { label: "Invoiced", value: money(k.invoiced), sub: d(k.invoiced, p.invoiced) },
          { label: "Expenses", value: money(k.expenses), sub: d(k.expenses, p.expenses) },
          { label: "Net profit", value: money(k.profit), sub: `${k.margin}% margin` },
          { label: "Outstanding", value: money(data.outstanding), sub: `${money(data.overdue)} overdue` },
          { label: "Occupancy", value: `${data.inventory.occupancy}%`, sub: "slot-days sold" },
        ],
        sections: [
          { type: "bars", title: "Last 12 months: collected vs expenses", labels: data.trend.map((t) => t.month.slice(2)), a: { label: "Collected", values: data.trend.map((t) => t.received) }, b: { label: "Expenses", values: data.trend.map((t) => t.expenses) } },
          { type: "hbars", title: "Top clients by invoiced value", items: data.topClients.map((c) => ({ label: c.name, value: c.invoiced, text: money(c.invoiced) })) },
          { type: "hbars", title: "Top screens by revenue", items: data.topScreens.map((s) => ({ label: `${s.name} (${s.city})`, value: s.revenue, text: money(s.revenue) })) },
          { type: "table", title: "Key points", cols: [{ key: "t", label: "Insight" }], rows: insights.map((t) => ({ t })) },
        ],
      };
    }
    if (tab === "pnl") {
      const pct = (n: number) => (k.received > 0 ? `${Math.round((n / k.received) * 100)}%` : "-");
      const rows: Record<string, string | number>[] = [{ item: "Revenue collected", amount: k.received, pct: "100%" }];
      for (const e of data.pnl.expensesByCategory) rows.push({ item: `  ${e.category}`, amount: -e.amount, pct: pct(e.amount) });
      return {
        ...base,
        title: "Profit and Loss",
        subtitle: "Cash basis: money received less expenses paid",
        kpis: [
          { label: "Revenue", value: money(k.received), sub: d(k.received, p.received) },
          { label: "Expenses", value: money(k.expenses), sub: d(k.expenses, p.expenses) },
          { label: "Net profit", value: money(k.profit), sub: `${k.margin}% margin` },
          { label: "Invoiced", value: money(k.invoiced), sub: "billed, not yet all collected" },
        ],
        sections: [
          { type: "table", title: "Statement", cols: [{ key: "item", label: "Item" }, mCol("amount", `Amount (${cur})`), { key: "pct", label: "% of revenue", align: "right" }], rows, totals: { item: "Net profit", amount: k.profit, pct: pct(k.profit) } },
          { type: "hbars", title: "Expenses by category", items: data.pnl.expensesByCategory.map((e) => ({ label: e.category, value: e.amount, text: money(e.amount) })) },
          { type: "bars", title: "Last 12 months", labels: data.trend.map((t) => t.month.slice(2)), a: { label: "Collected", values: data.trend.map((t) => t.received) }, b: { label: "Expenses", values: data.trend.map((t) => t.expenses) } },
        ],
        footnote: "Figures are based on payments received and expenses recorded in the period. Please confirm tax treatment with your accountant.",
      };
    }
    if (tab === "receivables") {
      return {
        ...base,
        title: "Receivables Aging",
        subtitle: `As of ${isoToday()}`,
        kpis: [
          { label: "Total outstanding", value: money(data.outstanding) },
          { label: "Overdue", value: money(data.overdue) },
          { label: "Open invoices", value: String(data.aging.rows.length) },
        ],
        sections: [
          { type: "hbars", title: "Outstanding by age", items: data.aging.buckets.map((b) => ({ label: `${b.label} (${b.count})`, value: b.amount, text: money(b.amount) })) },
          { type: "table", title: "Open invoices", cols: [{ key: "inv", label: "Invoice" }, { key: "client", label: "Client" }, { key: "due", label: "Due" }, mCol("late", "Days late"), mCol("bal", `Balance (${cur})`)], rows: data.aging.rows.map((r) => ({ inv: r.invoice_number, client: r.client_name, due: r.due_date, late: r.days_late, bal: r.balance })), totals: { inv: "Total", bal: data.outstanding } },
        ],
      };
    }
    if (tab === "statement") {
      if (!statement) return null;
      return {
        company: company_,
        period: `${statement.period.from} to ${statement.period.to}`,
        title: "Client Statement",
        subtitle: [statement.client.name, statement.client.email, statement.client.phone].filter(Boolean).join("  |  "),
        kpis: [
          { label: "Opening balance", value: fmtMoney(statement.opening, statement.currency) },
          { label: "Billed", value: fmtMoney(statement.totals.debit, statement.currency) },
          { label: "Received", value: fmtMoney(statement.totals.credit, statement.currency) },
          { label: "Closing balance", value: fmtMoney(statement.closing, statement.currency), sub: statement.closing > 0 ? "amount due" : "settled" },
        ],
        sections: [
          { type: "table", title: "Transactions", cols: [{ key: "date", label: "Date" }, { key: "ref", label: "Reference" }, { key: "desc", label: "Description" }, mCol("debit", "Billed"), mCol("credit", "Received"), mCol("bal", "Balance")], rows: [{ date: statement.period.from, ref: "", desc: "Opening balance", debit: "", credit: "", bal: statement.opening }, ...statement.lines.map((l) => ({ date: l.date, ref: l.ref, desc: l.description, debit: l.debit || "", credit: l.credit || "", bal: l.balance }))], totals: { date: "", ref: "", desc: "Closing balance", debit: statement.totals.debit, credit: statement.totals.credit, bal: statement.closing } },
        ],
        footnote: "Please settle any balance due by the due date. Contact us if you find any difference.",
      };
    }
    if (tab === "campaigns") {
      const tot = data.campaigns.reduce((a, c) => ({ contract: a.contract + c.contract, invoiced: a.invoiced + c.invoiced, received: a.received + c.received, expenses: a.expenses + c.expenses, profit: a.profit + c.profit }), { contract: 0, invoiced: 0, received: 0, expenses: 0, profit: 0 });
      return {
        ...base,
        title: "Campaign Performance",
        subtitle: "Campaigns running in this period",
        kpis: [
          { label: "Campaigns", value: String(data.campaigns.length) },
          { label: "Contract value", value: money(tot.contract) },
          { label: "Received", value: money(tot.received) },
          { label: "Profit so far", value: money(tot.profit), sub: "received less campaign expenses" },
        ],
        sections: [
          { type: "table", title: "Campaigns", cols: [{ key: "name", label: "Campaign" }, { key: "client", label: "Client" }, { key: "status", label: "Status" }, mCol("contract", "Contract"), mCol("received", "Received"), mCol("expenses", "Expenses"), mCol("profit", "Profit")], rows: data.campaigns.map((c) => ({ name: c.name, client: c.client_name, status: c.status, contract: c.contract, received: c.received, expenses: c.expenses, profit: c.profit })), totals: { name: "Total", contract: tot.contract, received: tot.received, expenses: tot.expenses, profit: tot.profit } },
        ],
      };
    }
    if (tab === "inventory") {
      return {
        ...base,
        title: "Inventory Utilisation",
        subtitle: "Share of available slot-days sold",
        kpis: [
          { label: "Overall occupancy", value: `${data.inventory.occupancy}%` },
          { label: "Screens", value: String(data.inventory.rows.length) },
          { label: "Digital", value: String(data.inventory.rows.filter((r) => r.type === "Digital").length) },
          { label: "Static", value: String(data.inventory.rows.filter((r) => r.type === "Static").length) },
        ],
        sections: [
          { type: "table", title: "Screens", cols: [{ key: "name", label: "Screen" }, { key: "type", label: "Type" }, { key: "city", label: "City" }, mCol("cap", "Slots"), mCol("occ", "Occupancy %"), mCol("rev", `Revenue (${cur})`)], rows: [...data.inventory.rows].sort((a, b) => b.occupancy - a.occupancy).map((r) => ({ name: r.name, type: r.type, city: r.city, cap: r.capacity, occ: r.occupancy, rev: r.revenue })) },
        ],
      };
    }
    if (tab === "sales") {
      return {
        ...base,
        title: "Sales and CRM",
        subtitle: "Pipeline and campaign mix",
        kpis: [
          { label: "Leads (all time)", value: String(data.funnel.totalLeads) },
          { label: "Won", value: String(data.funnel.won), sub: `${data.funnel.conversion}% conversion` },
          { label: "Avg campaign value", value: money(data.funnel.avgCampaignValue) },
          { label: "New in period", value: `${k.newLeads} leads`, sub: `${k.newClients} clients` },
        ],
        sections: [
          { type: "hbars", title: "Leads by stage", items: data.funnel.leads.map((l) => ({ label: `${l.stage} (${l.count})`, value: l.count, text: money(l.value) })) },
          { type: "hbars", title: "Campaigns by status", items: data.funnel.campaignsByStatus.map((c) => ({ label: `${c.status} (${c.count})`, value: c.count, text: money(c.value) })) },
        ],
      };
    }
    return null;
  }, [data, tab, statement, insights, money, cur, periodText, company_.name]);

  const doc = buildDoc();

  const onPrint = () => {
    if (!doc) return flash(false, tab === "statement" ? "Choose a client first." : "Nothing to print yet.");
    if (!printReport(doc)) flash(false, "Pop-up blocked. Allow pop-ups to print.");
  };
  const onExcel = () => {
    if (!doc) return flash(false, tab === "statement" ? "Choose a client first." : "Nothing to export yet.");
    downloadXlsx(`${doc.title.replace(/\s+/g, "-").toLowerCase()}-${range.from}-to-${range.to}.xlsx`, doc);
  };

  const saveView = async () => {
    const name = window.prompt("Name for this saved view:");
    if (!name || !name.trim()) return;
    try {
      await reportsApi.save(name.trim(), tab, { from: range.from, to: range.to, preset });
      setSaved((await reportsApi.saved()).saved);
      flash(true, "View saved.");
    } catch (e) {
      flash(false, e instanceof Error ? e.message : "Could not save the view.");
    }
  };
  const openSaved = (s: SavedReport) => {
    try {
      const p = JSON.parse(s.params || "{}");
      if (p.preset && p.preset !== "custom") pickPreset(p.preset as PresetKey);
      else if (p.from && p.to) { setPreset("custom"); setRange({ from: p.from, to: p.to }); }
    } catch { /* ignore */ }
    if (TABS.some((t) => t.key === s.report)) setTab(s.report as TabKey);
  };
  const removeSaved = async (id: string) => {
    await reportsApi.removeSaved(id).catch(() => undefined);
    setSaved((x) => x.filter((s) => s.id !== id));
  };

  const saveEmailSettings = async () => {
    try {
      await reportsApi.saveEmailSettings(emailDay, extraEmails);
      flash(true, "Schedule saved.");
    } catch (e) {
      flash(false, e instanceof Error ? e.message : "Could not save the schedule.");
    }
  };
  const sendNow = async (to: "me" | "all") => {
    if (to === "all" && !window.confirm("Send the weekly digest now to the owner and all additional emails?")) return;
    setEmailBusy(true);
    try {
      const r = await reportsApi.emailSend(to);
      flash(r.ok, r.message);
    } catch (e) {
      flash(false, e instanceof Error ? e.message : "Could not send the email.");
    } finally {
      setEmailBusy(false);
      reportsApi.emailHistory().then((r) => setHistory(r.history)).catch(() => undefined);
    }
  };

  /* ---------------- render ---------------- */

  const k = data?.kpis.current;
  const p = data?.kpis.previous;

  return (
    <div className={FIN.page}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-zinc-50">Analytics &amp; Reports</h1>
          <p className="text-[11px] text-zinc-500">Performance, finance and operations. Print any report as a branded PDF or export it to Excel.</p>
        </div>
        {tab !== "email" && (
          <div className="flex flex-wrap gap-2">
            <button className={FIN.btnGhost} onClick={saveView}>Save view</button>
            <button className={FIN.btnGhost} onClick={() => (doc ? setPreview(doc) : flash(false, "Nothing to preview yet."))}>Preview</button>
            <button className={FIN.btnGhost} onClick={onExcel}>Export Excel</button>
            <button className={FIN.btnGold} onClick={onPrint}>Print / PDF</button>
          </div>
        )}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {PRESETS.map((x) => (
          <button
            key={x.key}
            onClick={() => pickPreset(x.key)}
            className={`rounded-full border px-3 py-1 text-[11px] font-medium transition ${preset === x.key ? "border-[#c99b3b]/70 bg-[#c99b3b]/15 text-[#f1d68a]" : "border-[#2b3038] text-zinc-400 hover:text-zinc-100"}`}
          >
            {x.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <input type="date" className={`${FIN.input} w-auto`} value={range.from} onChange={(e: any) => { setPreset("custom"); setRange({ ...range, from: e.target.value }); }} />
          <span className="text-[11px] text-zinc-500">to</span>
          <input type="date" className={`${FIN.input} w-auto`} value={range.to} onChange={(e: any) => { setPreset("custom"); setRange({ ...range, to: e.target.value }); }} />
        </div>
      </div>

      {saved.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-[0.12em] text-zinc-500">Saved views</span>
          {saved.map((s) => (
            <span key={s.id} className="inline-flex items-center overflow-hidden rounded-full border border-[#2b3038] text-[11px]">
              <button className="px-2.5 py-1 text-zinc-300 hover:text-[#f1d68a]" onClick={() => openSaved(s)}>{s.name}</button>
              <button className="border-l border-[#2b3038] px-2 py-1 text-zinc-500 hover:text-rose-300" title="Remove" onClick={() => removeSaved(s.id)}>x</button>
            </span>
          ))}
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-1.5 border-b border-[#22262d] pb-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-lg px-3 py-1.5 text-[11px] font-medium transition ${tab === t.key ? "bg-[#c99b3b]/15 text-[#f1d68a] ring-1 ring-[#c99b3b]/40" : "text-zinc-400 hover:text-zinc-100"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {note && <p className={`mb-3 text-[12px] ${note.ok ? "text-emerald-300" : "text-rose-300"}`}>{note.text}</p>}
      {error && <p className="mb-3 text-[12px] text-rose-300">{error}</p>}
      {loading && !data && <p className="py-10 text-center text-[12px] text-zinc-500">Loading reports...</p>}

      {data && k && p && tab === "overview" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
            <Kpi gold label="Collected" value={money(k.received)} foot={<Chip d={delta(k.received, p.received)} />} />
            <Kpi label="Invoiced" value={money(k.invoiced)} foot={<Chip d={delta(k.invoiced, p.invoiced)} />} />
            <Kpi label="Expenses" value={money(k.expenses)} foot={<Chip d={delta(k.expenses, p.expenses)} goodWhenUp={false} />} />
            <Kpi gold label="Net profit" value={money(k.profit)} foot={<span className="text-[10px] text-black/55">{k.margin}% margin</span>} />
            <Kpi label="Outstanding" value={money(data.outstanding)} foot={<span className="text-[10px] text-black/55">{money(data.overdue)} overdue</span>} />
            <Kpi label="Occupancy" value={`${data.inventory.occupancy}%`} foot={<span className="text-[10px] text-black/55">slot-days sold</span>} />
          </div>

          <Panel title="Last 12 months" right={<Legend items={[{ color: "#c99b3b", label: "Collected" }, { color: "#6b7280", label: "Expenses" }, { color: "#34d399", label: "Profit" }]} />}>
            <TrendChart data={data.trend} />
          </Panel>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Panel title="Top clients">
              <HBars items={data.topClients.map((c) => ({ label: c.name, value: c.invoiced, text: money(c.invoiced), sub: `${c.invoices} inv.` }))} />
            </Panel>
            <Panel title="Top screens by revenue">
              <HBars items={data.topScreens.map((s) => ({ label: s.name, value: s.revenue, text: money(s.revenue), sub: `${s.occupancy}% full` }))} empty="No screen bookings in this period." />
            </Panel>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Panel title="Receivables by age">
              <Donut items={data.aging.buckets.map((b) => ({ label: b.label, value: b.amount }))} center={money(data.outstanding).replace(`${cur} `, "")} sub={`${cur} outstanding`} />
            </Panel>
            <Panel title="Key points">
              <ul className="space-y-2">
                {insights.map((t) => (
                  <li key={t} className="flex gap-2 text-[12px] text-zinc-300">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#d9b45a]" />
                    {t}
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        </div>
      )}

      {data && k && p && tab === "pnl" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi gold label="Revenue" value={money(k.received)} foot={<Chip d={delta(k.received, p.received)} />} />
            <Kpi label="Expenses" value={money(k.expenses)} foot={<Chip d={delta(k.expenses, p.expenses)} goodWhenUp={false} />} />
            <Kpi gold label="Net profit" value={money(k.profit)} foot={<span className="text-[10px] text-black/55">{k.margin}% margin</span>} />
            <Kpi label="Invoiced" value={money(k.invoiced)} foot={<span className="text-[10px] text-black/55">billed in period</span>} />
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Panel title="Statement">
              <Table
                cols={[{ key: "item", label: "Item" }, { key: "amount", label: "Amount", align: "right" }]}
                rows={[{ item: "Revenue collected", amount: money(k.received) }, ...data.pnl.expensesByCategory.map((e) => ({ item: `Less: ${e.category}`, amount: `-${money(e.amount)}` }))]}
                totals={{ item: "Net profit", amount: money(k.profit) }}
              />
            </Panel>
            <Panel title="Expenses by category">
              <HBars items={data.pnl.expensesByCategory.map((e) => ({ label: e.category, value: e.amount, text: money(e.amount) }))} empty="No expenses in this period." />
            </Panel>
          </div>
          <Panel title="Last 12 months" right={<Legend items={[{ color: "#c99b3b", label: "Collected" }, { color: "#6b7280", label: "Expenses" }, { color: "#34d399", label: "Profit" }]} />}>
            <TrendChart data={data.trend} />
          </Panel>
          <p className="text-[10px] text-zinc-500">Cash basis: payments received less expenses recorded. Confirm tax treatment with your accountant.</p>
        </div>
      )}

      {data && tab === "receivables" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <Kpi gold label="Total outstanding" value={money(data.outstanding)} foot={<span className="text-[10px] text-black/55">{data.aging.rows.length} open invoices</span>} />
            <Kpi label="Overdue" value={money(data.overdue)} foot={<span className="text-[10px] text-black/55">past due date</span>} />
            <Kpi label="Not yet due" value={money(data.aging.buckets[0]?.amount ?? 0)} foot={<span className="text-[10px] text-black/55">{data.aging.buckets[0]?.count ?? 0} invoices</span>} />
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Panel title="Outstanding by age">
              <Donut items={data.aging.buckets.map((b) => ({ label: `${b.label} (${b.count})`, value: b.amount }))} center={money(data.outstanding).replace(`${cur} `, "")} sub={cur} />
            </Panel>
            <Panel title="Amounts">
              <HBars items={data.aging.buckets.map((b) => ({ label: b.label, value: b.amount, text: money(b.amount), sub: `${b.count}` }))} />
            </Panel>
          </div>
          <Panel title="Open invoices">
            <Table
              cols={[{ key: "inv", label: "Invoice" }, { key: "client", label: "Client" }, { key: "due", label: "Due" }, { key: "late", label: "Days late", align: "right" }, { key: "bal", label: "Balance", align: "right" }]}
              rows={data.aging.rows.map((r) => ({ inv: r.invoice_number, client: r.client_name, due: r.due_date, late: r.days_late || "-", bal: money(r.balance) }))}
              totals={{ inv: "Total", bal: money(data.outstanding) }}
              empty="No open invoices. Everything is paid."
            />
          </Panel>
        </div>
      )}

      {tab === "statement" && (
        <div className="space-y-4">
          <Panel title="Client statement">
            <div className="max-w-sm">
              <label className={FIN.label}>Client</label>
              <select className={FIN.input} value={clientId} onChange={(e: any) => { setClientId(e.target.value); setStatement(null); }}>
                <option value="">Choose a client</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <p className="mt-1 text-[10px] text-zinc-500">Uses the date range above. Shows invoices, payments and the running balance.</p>
            </div>
          </Panel>
          {stLoading && <p className="text-[12px] text-zinc-500">Loading...</p>}
          {statement && (
            <>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Kpi label="Opening balance" value={fmtMoney(statement.opening, statement.currency)} foot={<span className="text-[10px] text-black/55">before {statement.period.from}</span>} />
                <Kpi label="Billed" value={fmtMoney(statement.totals.debit, statement.currency)} foot={<span className="text-[10px] text-black/55">in period</span>} />
                <Kpi label="Received" value={fmtMoney(statement.totals.credit, statement.currency)} foot={<span className="text-[10px] text-black/55">in period</span>} />
                <Kpi gold label="Closing balance" value={fmtMoney(statement.closing, statement.currency)} foot={<span className="text-[10px] text-black/55">{statement.closing > 0 ? "amount due" : "settled"}</span>} />
              </div>
              <Panel title={`Transactions: ${statement.client.name}`}>
                <Table
                  cols={[{ key: "date", label: "Date" }, { key: "ref", label: "Reference" }, { key: "desc", label: "Description" }, { key: "debit", label: "Billed", align: "right" }, { key: "credit", label: "Received", align: "right" }, { key: "bal", label: "Balance", align: "right" }]}
                  rows={statement.lines.map((l) => ({ date: l.date, ref: l.ref, desc: l.description, debit: l.debit ? fmtNum(l.debit) : "", credit: l.credit ? fmtNum(l.credit) : "", bal: fmtNum(l.balance) }))}
                  totals={{ desc: "Closing balance", debit: fmtNum(statement.totals.debit), credit: fmtNum(statement.totals.credit), bal: fmtNum(statement.closing) }}
                />
              </Panel>
            </>
          )}
        </div>
      )}

      {data && tab === "campaigns" && (
        <Panel title="Campaign performance">
          <Table
            cols={[{ key: "name", label: "Campaign" }, { key: "client", label: "Client" }, { key: "status", label: "Status" }, { key: "contract", label: "Contract", align: "right" }, { key: "received", label: "Received", align: "right" }, { key: "expenses", label: "Expenses", align: "right" }, { key: "profit", label: "Profit", align: "right" }]}
            rows={data.campaigns.map((c) => ({ name: c.name, client: c.client_name, status: c.status, contract: fmtNum(c.contract), received: fmtNum(c.received), expenses: fmtNum(c.expenses), profit: fmtNum(c.profit) }))}
            totals={{
              name: "Total",
              contract: fmtNum(data.campaigns.reduce((a, c) => a + c.contract, 0)),
              received: fmtNum(data.campaigns.reduce((a, c) => a + c.received, 0)),
              expenses: fmtNum(data.campaigns.reduce((a, c) => a + c.expenses, 0)),
              profit: fmtNum(data.campaigns.reduce((a, c) => a + c.profit, 0)),
            }}
            empty="No campaigns running in this period."
          />
          <p className="mt-3 text-[10px] text-zinc-500">Profit so far = payments received on the campaign's invoices minus expenses linked to the campaign. Amounts in {cur}.</p>
        </Panel>
      )}

      {data && tab === "inventory" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi gold label="Occupancy" value={`${data.inventory.occupancy}%`} foot={<span className="text-[10px] text-black/55">of slot-days in period</span>} />
            <Kpi label="Screens" value={String(data.inventory.rows.length)} foot={<span className="text-[10px] text-black/55">in inventory</span>} />
            <Kpi label="Digital" value={String(data.inventory.rows.filter((r) => r.type === "Digital").length)} foot={<span className="text-[10px] text-black/55">slot-based</span>} />
            <Kpi label="Static" value={String(data.inventory.rows.filter((r) => r.type === "Static").length)} foot={<span className="text-[10px] text-black/55">billboards</span>} />
          </div>
          <Panel title="Occupancy by screen">
            <HBars items={[...data.inventory.rows].sort((a, b) => b.occupancy - a.occupancy).map((r) => ({ label: r.name, value: r.occupancy, text: `${r.occupancy}%`, sub: `${r.type}, ${r.city}` }))} empty="No screens yet." />
          </Panel>
        </div>
      )}

      {data && k && tab === "sales" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi gold label="Leads (all time)" value={String(data.funnel.totalLeads)} foot={<span className="text-[10px] text-black/55">{k.newLeads} new in period</span>} />
            <Kpi label="Won" value={String(data.funnel.won)} foot={<span className="text-[10px] text-black/55">{data.funnel.conversion}% conversion</span>} />
            <Kpi label="New clients" value={String(k.newClients)} foot={<span className="text-[10px] text-black/55">in period</span>} />
            <Kpi gold label="Avg campaign value" value={money(data.funnel.avgCampaignValue)} foot={<span className="text-[10px] text-black/55">{data.funnel.campaignCount} campaigns</span>} />
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Panel title="Leads by stage"><HBars items={data.funnel.leads.map((l) => ({ label: l.stage, value: l.count, text: String(l.count), sub: money(l.value) }))} empty="No leads yet." /></Panel>
            <Panel title="Campaigns by status"><HBars items={data.funnel.campaignsByStatus.map((c) => ({ label: c.status, value: c.count, text: String(c.count), sub: money(c.value) }))} empty="No campaigns yet." /></Panel>
          </div>
        </div>
      )}

      {tab === "email" && (
        <div className="space-y-4">
          <Panel title="Weekly digest schedule">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div>
                <label className={FIN.label}>Send every</label>
                <select className={FIN.input} value={emailDay} onChange={(e: any) => setEmailDay(e.target.value)}>
                  {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className={FIN.label}>Additional emails (optional)</label>
                <input className={FIN.input} value={extraEmails} onChange={(e: any) => setExtraEmails(e.target.value)} placeholder="director@company.com, gm@company.com" />
                <p className="mt-1 text-[10px] text-zinc-500">The owner always receives it. Separate extra emails with a comma.</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className={FIN.btnGold} onClick={saveEmailSettings}>Save schedule</button>
              <button className={FIN.btnGhost} disabled={emailBusy} onClick={() => sendNow("me")}>Send a test to me</button>
              <button className={FIN.btnGhost} disabled={emailBusy} onClick={() => sendNow("all")}>Send now to everyone</button>
            </div>
          </Panel>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Panel title="Email preview">
              {emailHtml ? <iframe title="Email preview" srcDoc={emailHtml} className="h-[520px] w-full rounded-lg border border-[#2a2f37] bg-white" /> : <p className="text-[12px] text-zinc-500">Preview not available.</p>}
            </Panel>
            <Panel title="Send history">
              <Table
                cols={[{ key: "when", label: "When" }, { key: "kind", label: "Type" }, { key: "to", label: "To" }, { key: "status", label: "Status" }]}
                rows={history.map((h) => ({ when: h.created_at.replace("T", " ").slice(0, 16), kind: h.kind, to: h.recipients ?? "", status: h.status === "sent" ? "Sent" : "Failed" }))}
                empty="Nothing sent yet."
              />
            </Panel>
          </div>
        </div>
      )}

      <FDrawer open={!!preview} onClose={() => setPreview(null)} title={preview?.title ?? "Preview"} subtitle={periodText} width="max-w-[900px]">
        {preview && (
          <>
            <div className="mb-3 flex gap-2">
              <button className={FIN.btnGold} onClick={onPrint}>Print / PDF</button>
              <button className={FIN.btnGhost} onClick={onExcel}>Export Excel</button>
            </div>
            <iframe title="Report preview" srcDoc={buildReportHtml(preview)} className="h-[78vh] w-full rounded-lg border border-[#2a2f37] bg-[#fbf9f4]" />
          </>
        )}
      </FDrawer>
    </div>
  );
};

export default ReportsPage;
