import React, { useEffect, useMemo, useState } from "react";     
import { getDefaultCurrency } from "@/lib/companyDefaults";
import { FIN, SectionTitle } from "./financeUi";
import { AGE_BUCKETS, ageingReport, campaignProfit, monthlyCashFlow } from "./financeTools";

const money = (n: number) =>    
  new Intl.NumberFormat("en-PK", { style: "currency", currency: getDefaultCurrency(), minimumFractionDigits: 0 }).format(n || 0);

const short = (n: number) => {
  const a = Math.abs(n);
  const s = a >= 1e7 ? `${(a / 1e7).toFixed(1)}Cr` : a >= 1e5 ? `${(a / 1e5).toFixed(1)}L` : a >= 1e3 ? `${(a / 1e3).toFixed(0)}k` : `${Math.round(a)}`;
  return n < 0 ? `-${s}` : s;
};

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const th = "px-2.5 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400";
const td = "px-2.5 py-2 text-[12px]";

const FinanceInsights: React.FC<{ invoices: any[]; payments: any[]; expenses: any[] }> = ({
  invoices,
  payments,
  expenses,
}) => {
  const [campaigns, setCampaigns] = useState<any[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/campaigns");
        const data = await res.json();
        if (alive && data.ok) setCampaigns(data.data || []);
      } catch (err) {
        console.error(err);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const today = todayIso();
  const flow = useMemo(() => monthlyCashFlow(payments, expenses, 6, today), [payments, expenses, today]);
  const ageing = useMemo(() => ageingReport(invoices, today), [invoices, today]);
  const profit = useMemo(() => campaignProfit(campaigns, invoices, expenses), [campaigns, invoices, expenses]);

  /* ---------- cash-flow chart geometry ---------- */
  const W = 600;
  const H = 230;
  const padL = 44;
  const padB = 28;
  const padT = 14;
  const maxV = Math.max(1, ...flow.map((f) => Math.max(f.income, f.expense)));
  const plotH = H - padB - padT;
  const slot = (W - padL - 10) / flow.length;
  const barW = Math.min(26, slot / 2.6);
  const y = (v: number) => padT + plotH - (v / maxV) * plotH;
  const netPoints = flow.map((f, i) => {
    const mid = Math.max(0, f.net);
    return `${padL + slot * i + slot / 2},${y(mid)}`;
  });
  const totals = flow.reduce((a, f) => ({ income: a.income + f.income, expense: a.expense + f.expense }), { income: 0, expense: 0 });

  return (
    <div className="space-y-4">
      {/* ================= CASH FLOW ================= */}
      <div className={`${FIN.panel} p-4`}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <SectionTitle>Cash Flow â€” last 6 months</SectionTitle>
          <div className="flex items-center gap-3 text-[10px] text-zinc-400">
            <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-sm bg-emerald-400" />Money in</span>
            <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-sm bg-rose-400" />Money out</span>
            <span className="flex items-center gap-1"><i className="h-[2px] w-3 bg-[#f1d68a]" />Net</span>
          </div>
        </div>

        <div className="mb-3 grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-[#2a2f37] bg-[#0f1216] px-3 py-2">
            <p className="text-[9px] uppercase tracking-[0.14em] text-zinc-500">Received</p>
            <p className="text-[13px] font-semibold text-emerald-300">{money(totals.income)}</p>
          </div>
          <div className="rounded-lg border border-[#2a2f37] bg-[#0f1216] px-3 py-2">
            <p className="text-[9px] uppercase tracking-[0.14em] text-zinc-500">Spent</p>
            <p className="text-[13px] font-semibold text-rose-300">{money(totals.expense)}</p>
          </div>
          <div className="rounded-lg border border-[#2a2f37] bg-[#0f1216] px-3 py-2">
            <p className="text-[9px] uppercase tracking-[0.14em] text-zinc-500">Net</p>
            <p className={`text-[13px] font-semibold ${totals.income - totals.expense >= 0 ? "text-[#f1d68a]" : "text-rose-300"}`}>
              {money(totals.income - totals.expense)}
            </p>
          </div>
        </div>

        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Monthly cash flow chart">
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <g key={t}>
              <line x1={padL} x2={W - 6} y1={y(maxV * t)} y2={y(maxV * t)} stroke="#2a2f37" strokeWidth="1" strokeDasharray={t === 0 ? "0" : "3 4"} />
              <text x={padL - 6} y={y(maxV * t) + 3} textAnchor="end" fontSize="9" fill="currentColor" className="text-zinc-500">
                {short(maxV * t)}
              </text>
            </g>
          ))}
          {flow.map((f, i) => {
            const cx = padL + slot * i + slot / 2;
            return (
              <g key={f.key}>
                <rect x={cx - barW - 1} y={y(f.income)} width={barW} height={Math.max(0, padT + plotH - y(f.income))} rx="3" fill="#34d399" opacity="0.9">
                  <title>{`${f.label} in: ${money(f.income)}`}</title>
                </rect>
                <rect x={cx + 1} y={y(f.expense)} width={barW} height={Math.max(0, padT + plotH - y(f.expense))} rx="3" fill="#fb7185" opacity="0.9">
                  <title>{`${f.label} out: ${money(f.expense)}`}</title>
                </rect>
                <text x={cx} y={H - 10} textAnchor="middle" fontSize="10" fill="currentColor" className="text-zinc-400">
                  {f.label}
                </text>
              </g>
            );
          })}
          <polyline points={netPoints.join(" ")} fill="none" stroke="#f1d68a" strokeWidth="1.8" strokeLinejoin="round" />
          {flow.map((f, i) => (
            <circle key={f.key} cx={padL + slot * i + slot / 2} cy={y(Math.max(0, f.net))} r="3" fill="#f1d68a">
              <title>{`${f.label} net: ${money(f.net)}`}</title>
            </circle>
          ))}
        </svg>
      </div>

      {/* ================= AGEING ================= */}
      <div className={`${FIN.panel} p-4`}>
        <div className="mb-3 flex items-center justify-between">
          <SectionTitle>Receivables Ageing</SectionTitle>
          <span className="text-[11px] text-zinc-400">
            Outstanding: <b className="text-[#f1d68a]">{money(ageing.total)}</b> Â· {ageing.invoices} invoice{ageing.invoices === 1 ? "" : "s"}
          </span>
        </div>

        {ageing.total > 0 ? (
          <>
            <div className="mb-3 flex h-3 w-full overflow-hidden rounded-full bg-[#0f1216]">
              {AGE_BUCKETS.map((b) =>
                ageing.totals[b.key] > 0 ? (
                  <div key={b.key} style={{ width: `${(ageing.totals[b.key] / ageing.total) * 100}%`, background: b.color }} title={`${b.label}: ${money(ageing.totals[b.key])}`} />
                ) : null,
              )}
            </div>
            <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-5">
              {AGE_BUCKETS.map((b) => (
                <div key={b.key} className="rounded-lg border border-[#2a2f37] bg-[#0f1216] px-3 py-2">
                  <p className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.12em] text-zinc-500">
                    <i className="h-2 w-2 rounded-sm" style={{ background: b.color }} />
                    {b.label}
                  </p>
                  <p className="mt-0.5 text-[12px] font-semibold text-zinc-100">{money(ageing.totals[b.key])}</p>
                  <p className="text-[10px] text-zinc-500">{ageing.counts[b.key]} inv.</p>
                </div>
              ))}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left">
                <thead>
                  <tr className="border-b border-[#2a2f37]">
                    <th className={th}>Client</th>
                    {AGE_BUCKETS.map((b) => (
                      <th key={b.key} className={`${th} text-right`}>{b.label}</th>
                    ))}
                    <th className={`${th} text-right`}>Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1d2128]">
                  {ageing.rows.map((r) => (
                    <tr key={r.client} className="hover:bg-white/[0.02]">
                      <td className={`${td} font-medium text-zinc-100`}>{r.client}</td>
                      {AGE_BUCKETS.map((b) => (
                        <td key={b.key} className={`${td} text-right ${r.buckets[b.key] ? "text-zinc-200" : "text-zinc-600"}`}>
                          {r.buckets[b.key] ? money(r.buckets[b.key]) : "â€”"}
                        </td>
                      ))}
                      <td className={`${td} text-right font-semibold text-[#f1d68a]`}>{money(r.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="py-6 text-center text-[12px] text-zinc-500">No outstanding invoices â€” everything is collected.</p>
        )}
      </div>

      {/* ================= CAMPAIGN PROFITABILITY ================= */}
      <div className={`${FIN.panel} p-4`}>
        <div className="mb-3">
          <SectionTitle>Campaign Profitability</SectionTitle>
          <p className="mt-1 text-[10px] text-zinc-500">Profit = payments collected on the campaign's invoices âˆ’ expenses tagged to that campaign.</p>
        </div>
        {profit.rows.length || profit.unlinked ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr className="border-b border-[#2a2f37]">
                  <th className={th}>Campaign</th>
                  <th className={`${th} text-right`}>Invoiced</th>
                  <th className={`${th} text-right`}>Collected</th>
                  <th className={`${th} text-right`}>Expenses</th>
                  <th className={`${th} text-right`}>Profit</th>
                  <th className={`${th} text-right`}>Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1d2128]">
                {[...profit.rows, ...(profit.unlinked ? [profit.unlinked] : [])].map((r) => (
                  <tr key={r.id} className="hover:bg-white/[0.02]">
                    <td className={td}>
                      <p className={`font-medium ${r.id === "unlinked" ? "italic text-zinc-400" : "text-zinc-100"}`}>{r.name}</p>
                      {r.client && <p className="text-[10px] text-zinc-500">{r.client}</p>}
                    </td>
                    <td className={`${td} text-right text-zinc-300`}>{money(r.invoiced)}</td>
                    <td className={`${td} text-right text-emerald-300`}>{money(r.collected)}</td>
                    <td className={`${td} text-right text-rose-300`}>{money(r.expenses)}</td>
                    <td className={`${td} text-right font-semibold ${r.profit >= 0 ? "text-[#f1d68a]" : "text-rose-400"}`}>{money(r.profit)}</td>
                    <td className={`${td} text-right ${r.margin === null ? "text-zinc-600" : r.margin >= 0 ? "text-zinc-200" : "text-rose-400"}`}>
                      {r.margin === null ? "â€”" : `${r.margin.toFixed(0)}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-6 text-center text-[12px] text-zinc-500">No campaign-linked invoices or expenses yet.</p>
        )}
      </div>
    </div>
  );
};

export default FinanceInsights;
