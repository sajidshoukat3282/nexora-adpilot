import React, { useMemo, useState } from "react";
import type { CampaignRow } from "@/lib/api/campaigns";
import { FIN } from "../finance/financeUi";
import { addDaysIso, diffDays, statusLabel, todayIso } from "./campaignTools";

const BAR: Record<string, string> = {
  live: "from-emerald-400/80 to-emerald-600/80 border-emerald-300/40",
  booked: "from-sky-400/80 to-sky-600/80 border-sky-300/40",
  completed: "from-zinc-400/60 to-zinc-600/60 border-zinc-300/30",
  cancelled: "from-rose-400/50 to-rose-600/50 border-rose-300/30",
  draft: "from-amber-300/80 to-amber-600/80 border-amber-200/40",
};

const SPAN = 90;

export const CampaignCalendar: React.FC<{ rows: CampaignRow[]; onOpen: (id: string) => void }> = ({ rows, onOpen }) => {
  const today = todayIso();
  const [from, setFrom] = useState(addDaysIso(today, -15));
  const to = addDaysIso(from, SPAN - 1);

  const visible = useMemo(
    () => rows.filter((r) => r.end_date >= from && r.start_date <= to).sort((a, b) => a.start_date.localeCompare(b.start_date)),
    [rows, from, to],
  );

  const pct = (iso: string) => Math.min(100, Math.max(0, (diffDays(from, iso) / SPAN) * 100));
  const months = useMemo(() => {
    const out: { label: string; left: number }[] = [];
    for (let i = 0; i < SPAN; i += 1) {
      const d = addDaysIso(from, i);
      if (i === 0 || d.endsWith("-01")) {
        out.push({
          label: new Date(d + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" }),
          left: (i / SPAN) * 100,
        });
      }
    }
    return out;
  }, [from]);

  const todayLeft = today >= from && today <= to ? pct(today) : null;

  return (
    <div className={`${FIN.panel} p-3`}>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[11px] text-zinc-400">
          {from} to {to}
        </p>
        <div className="flex gap-1.5">
          <button className={FIN.btnGhost} onClick={() => setFrom(addDaysIso(from, -30))}>Earlier</button>
          <button className={FIN.btnGhost} onClick={() => setFrom(addDaysIso(today, -15))}>Today</button>
          <button className={FIN.btnGhost} onClick={() => setFrom(addDaysIso(from, 30))}>Later</button>
        </div>
      </div>
      <div className="relative">
        <div className="relative h-5 border-b border-[#2a2f37]">
          {months.map((m) => (
            <span key={m.label + m.left} className="absolute top-0 text-[10px] font-semibold uppercase tracking-wider text-[#d9b45a]" style={{ left: `${m.left}%` }}>
              {m.label}
            </span>
          ))}
        </div>
        {visible.length === 0 && <p className="py-8 text-center text-[12px] text-zinc-500">No campaigns in this period.</p>}
        <div className="relative">
          {todayLeft !== null && (
            <div className="pointer-events-none absolute bottom-0 top-0 z-10 w-px bg-[#f1d68a]/70" style={{ left: `${todayLeft}%` }}>
              <span className="absolute -top-0.5 left-1 rounded bg-[#f1d68a] px-1 text-[9px] font-bold text-black">Today</span>
            </div>
          )}
          {visible.map((r) => {
            const left = pct(r.start_date);
            const right = pct(addDaysIso(r.end_date, 1));
            return (
              <div key={r.id} className="relative h-9 border-b border-[#1b1f25]">
                <button
                  onClick={() => onOpen(r.id)}
                  title={`${r.name} (${r.start_date} to ${r.end_date})`}
                  className={`absolute top-1.5 h-6 overflow-hidden rounded-md border bg-gradient-to-r px-2 text-left text-[10px] font-semibold text-white shadow ${BAR[r.status] ?? BAR.draft}`}
                  style={{ left: `${left}%`, width: `${Math.max(2, right - left)}%` }}
                >
                  <span className="block truncate leading-6">
                    {r.name} <span className="font-normal opacity-80">{statusLabel(r.status)}</span>
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
