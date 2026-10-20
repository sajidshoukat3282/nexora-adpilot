import React, { useMemo } from "react";
import { FIN, SectionTitle } from "../finance/financeUi";
import { normalizePhone, whatsappUrl } from "../finance/financeTools";
import {
  STAGE_WEIGHT,
  buildTemplate,
  clientFinance,
  money,
  moneyShort,
  pipelineStats,
  renewalRadar,
  sourceStats,
} from "./crmTools";
import { HEALTH_STYLE } from "./crmStyles";

const STAGE_LABEL: Record<string, string> = {
  lead: "Lead",
  qualified: "Qualified",
  proposal: "Proposal",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
};
const STAGE_COLOR: Record<string, string> = {
  lead: "#94a3b8",
  qualified: "#38bdf8",
  proposal: "#a78bfa",
  negotiation: "#e0b24a",
  won: "#34d399",
  lost: "#fb7185",
};

const th = "px-2.5 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400";
const td = "px-2.5 py-2 text-[12px]";

export const CrmInsights: React.FC<{
  leads: any[];
  clients: any[];
  invoices: any[];
  campaigns: any[];
  today: string;
  onOpenClient: (id: string) => void;
}> = ({ leads, clients, invoices, campaigns, today, onOpenClient }) => {
  const stats = useMemo(() => pipelineStats(leads, today), [leads, today]);
  const sources = useMemo(() => sourceStats(leads), [leads]);
  const renewals = useMemo(() => renewalRadar(campaigns, today, 30, 14), [campaigns, today]);
  const topClients = useMemo(
    () =>
      clients
        .map((c) => ({ client: c, fin: clientFinance(c, invoices, campaigns, today) }))
        .filter((x) => x.fin.paid > 0 || x.fin.outstanding > 0)
        .sort((a, b) => b.fin.paid - a.fin.paid)
        .slice(0, 8),
    [clients, invoices, campaigns, today],
  );

  const stages = ["lead", "qualified", "proposal", "negotiation", "won", "lost"];
  const maxValue = Math.max(1, ...stages.map((s) => stats.byStage[s]?.value ?? 0));

  return (
    <div className="space-y-4">
      {/* ===== Forecast ===== */}
      <div className={`${FIN.panel} p-4`}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <SectionTitle>Pipeline Forecast</SectionTitle>
          <span className="text-[11px] text-zinc-400">
            Weighted forecast: <b className="text-[#f1d68a]">{money(stats.weighted)}</b>
          </span>
        </div>
        <div className="space-y-2">
          {stages.map((s) => {
            const b = stats.byStage[s] ?? { count: 0, value: 0, weighted: 0 };
            return (
              <div key={s} className="grid grid-cols-[88px_1fr_auto] items-center gap-3">
                <span className="text-[11px] text-zinc-300">{STAGE_LABEL[s]}</span>
                <div className="h-3 overflow-hidden rounded-full bg-[#0f1216]">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(b.value / maxValue) * 100}%`, background: STAGE_COLOR[s], opacity: 0.9 }}
                  />
                </div>
                <span className="whitespace-nowrap text-right text-[11px] tabular-nums text-zinc-400">
                  {b.count} · {moneyShort(b.value)}
                  {s !== "won" && s !== "lost" && (
                    <span className="text-[#d9b45a]/80"> · {Math.round((STAGE_WEIGHT[s] ?? 0) * 100)}%</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-[10px] text-zinc-500">Weighted forecast = deal value x stage probability (Lead 10%, Qualified 25%, Proposal 50%, Negotiation 75%).</p>
      </div>

      {/* ===== Renewal radar ===== */}
      <div className={`${FIN.panel} p-4`}>
        <div className="mb-3 flex items-center justify-between">
          <SectionTitle>Renewal Radar</SectionTitle>
          <span className="text-[11px] text-zinc-500">Campaigns ending within 30 days</span>
        </div>
        {renewals.length === 0 ? (
          <p className="py-4 text-center text-[12px] text-zinc-500">No campaigns are ending soon.</p>
        ) : (
          <ul className="space-y-1.5">
            {renewals.map((r) => {
              const client = clients.find((c) => String(c.id) === r.clientId);
              return (
                <li key={r.campaignId} className="flex items-center gap-3 rounded-lg border border-[#22262d] bg-[#0f1216] p-2.5">
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                      r.daysLeft < 0
                        ? "border-zinc-500/40 text-zinc-400"
                        : r.daysLeft <= 7
                          ? "border-rose-400/40 bg-rose-500/10 text-rose-300"
                          : "border-amber-400/40 bg-amber-500/10 text-amber-300"
                    }`}
                  >
                    {r.daysLeft < 0 ? `Ended ${-r.daysLeft}d ago` : r.daysLeft === 0 ? "Ends today" : `${r.daysLeft}d left`}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-medium text-zinc-100">{r.clientName}</p>
                    <p className="truncate text-[11px] text-zinc-500">
                      {r.campaignName} · ends {r.endDate} · {money(r.budget, r.currency)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      window.open(
                        whatsappUrl(
                          normalizePhone(client?.phone),
                          buildTemplate("renewal", { name: r.clientName, campaign: r.campaignName, date: r.endDate }),
                        ),
                        "_blank",
                        "noopener",
                      )
                    }
                    className={`${FIN.btnGhost} !px-2.5 !py-1`}
                  >
                    💬 Renewal offer
                  </button>
                  <button type="button" onClick={() => onOpenClient(r.clientId)} className={`${FIN.btnGhost} !px-2.5 !py-1`}>
                    Open
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* ===== Source performance ===== */}
        <div className={`${FIN.panel} min-w-0 p-4`}>
          <div className="mb-3"><SectionTitle>Lead Source Performance</SectionTitle></div>
          {sources.length === 0 ? (
            <p className="py-4 text-center text-[12px] text-zinc-500">No leads yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-left">
                <thead>
                  <tr className="border-b border-[#2a2f37]">
                    <th className={th}>Source</th>
                    <th className={`${th} text-right`}>Leads</th>
                    <th className={`${th} text-right`}>Won</th>
                    <th className={`${th} text-right`}>Lost</th>
                    <th className={`${th} text-right`}>Win rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1d2128]">
                  {sources.map((s) => (
                    <tr key={s.source}>
                      <td className={`${td} font-medium text-zinc-100`}>{s.source}</td>
                      <td className={`${td} text-right text-zinc-300`}>{s.total}</td>
                      <td className={`${td} text-right text-emerald-300`}>{s.won}</td>
                      <td className={`${td} text-right text-rose-300`}>{s.lost}</td>
                      <td className={`${td} text-right font-semibold text-[#f1d68a]`}>
                        {s.conversion === null ? "-" : `${s.conversion.toFixed(0)}%`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ===== Top clients ===== */}
        <div className={`${FIN.panel} min-w-0 p-4`}>
          <div className="mb-3"><SectionTitle>Top Clients by Revenue</SectionTitle></div>
          {topClients.length === 0 ? (
            <p className="py-4 text-center text-[12px] text-zinc-500">No invoiced clients yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-left">
                <thead>
                  <tr className="border-b border-[#2a2f37]">
                    <th className={th}>Client</th>
                    <th className={`${th} text-right`}>Collected</th>
                    <th className={`${th} text-right`}>Outstanding</th>
                    <th className={`${th} text-right`}>Health</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1d2128]">
                  {topClients.map(({ client, fin }) => {
                    const h = HEALTH_STYLE[fin.health];
                    return (
                      <tr key={client.id} className="cursor-pointer hover:bg-white/[0.02]" onClick={() => onOpenClient(String(client.id))}>
                        <td className={`${td} font-medium text-zinc-100`}>{client.name}</td>
                        <td className={`${td} text-right text-emerald-300`}>{money(fin.paid)}</td>
                        <td className={`${td} text-right text-zinc-300`}>{money(fin.outstanding)}</td>
                        <td className={`${td} text-right`}>
                          <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${h.cls}`}>{h.label}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
