import React from "react";
import { monthLabel, shortMoney } from "./reportTools";

/** Trend chart: received vs expenses as bars, profit as a line. Pure SVG, no libraries. */
export const TrendChart: React.FC<{ data: { month: string; received: number; expenses: number; profit: number }[] }> = ({ data }) => {
  const W = 720;
  const H = 230;
  const padL = 44;
  const padB = 26;
  const padT = 12;
  const max = Math.max(1, ...data.map((d) => Math.max(d.received, d.expenses, d.profit)));
  const min = Math.min(0, ...data.map((d) => d.profit));
  const span = max - min || 1;
  const slot = (W - padL - 8) / Math.max(1, data.length);
  const bw = Math.min(16, slot / 2.8);
  const y = (v: number) => padT + (1 - (v - min) / span) * (H - padB - padT);
  const zero = y(0);
  const pts = data.map((d, i) => `${(padL + slot * i + slot / 2).toFixed(1)},${y(d.profit).toFixed(1)}`).join(" ");
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => min + span * t);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={padL} x2={W - 8} y1={y(t)} y2={y(t)} stroke="#1d2128" />
          <text x={padL - 6} y={y(t) + 3} textAnchor="end" fontSize="9" fill="#71717a">{shortMoney(t)}</text>
        </g>
      ))}
      <line x1={padL} x2={W - 8} y1={zero} y2={zero} stroke="#3a3f48" />
      {data.map((d, i) => {
        const cx = padL + slot * i + slot / 2;
        return (
          <g key={d.month}>
            <rect x={cx - bw - 1} y={Math.min(y(d.received), zero)} width={bw} height={Math.abs(zero - y(d.received))} rx="2" fill="#c99b3b" />
            <rect x={cx + 1} y={Math.min(y(d.expenses), zero)} width={bw} height={Math.abs(zero - y(d.expenses))} rx="2" fill="#6b7280" />
            <text x={cx} y={H - 8} textAnchor="middle" fontSize="9" fill="#71717a">{monthLabel(d.month)}</text>
          </g>
        );
      })}
      <polyline points={pts} fill="none" stroke="#34d399" strokeWidth="2" strokeLinejoin="round" />
      {data.map((d, i) => (
        <circle key={d.month} cx={padL + slot * i + slot / 2} cy={y(d.profit)} r="2.5" fill="#34d399" />
      ))}
    </svg>
  );
};

export const Legend: React.FC<{ items: { color: string; label: string }[] }> = ({ items }) => (
  <div className="flex flex-wrap items-center gap-4 text-[10px] text-zinc-400">
    {items.map((i) => (
      <span key={i.label} className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-sm" style={{ background: i.color }} />
        {i.label}
      </span>
    ))}
  </div>
);

/** Horizontal gold bars with a label and a value on each row. */
export const HBars: React.FC<{ items: { label: string; value: number; text: string; sub?: string }[]; empty?: string }> = ({ items, empty }) => {
  const max = Math.max(1, ...items.map((i) => Math.abs(i.value)));
  if (items.length === 0) return <p className="py-6 text-center text-[12px] text-zinc-500">{empty ?? "No data for this period."}</p>;
  return (
    <div className="space-y-2.5">
      {items.map((i) => (
        <div key={i.label}>
          <div className="mb-1 flex items-baseline justify-between gap-2 text-[11px]">
            <span className="truncate text-zinc-300">{i.label}{i.sub && <span className="ml-1.5 text-[10px] text-zinc-500">{i.sub}</span>}</span>
            <span className="shrink-0 font-semibold text-zinc-100">{i.text}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[#1b1f25]">
            <div className="h-full rounded-full bg-gradient-to-r from-[#f1d68a] to-[#a97b22]" style={{ width: `${Math.max(1, (Math.abs(i.value) / max) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
};

const DONUT = ["#34d399", "#f1d68a", "#fb923c", "#f87171", "#be123c", "#8b929b", "#60a5fa"];

export const Donut: React.FC<{ items: { label: string; value: number }[]; center: string; sub?: string }> = ({ items, center, sub }) => {
  const total = items.reduce((a, i) => a + i.value, 0);
  const R = 52;
  const C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 140 140" className="h-[130px] w-[130px] shrink-0">
        <circle cx="70" cy="70" r={R} fill="none" stroke="#1b1f25" strokeWidth="16" />
        {total > 0 &&
          items.map((i, k) => {
            const len = (i.value / total) * C;
            const el = (
              <circle key={i.label} cx="70" cy="70" r={R} fill="none" stroke={DONUT[k % DONUT.length]} strokeWidth="16" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-acc} transform="rotate(-90 70 70)" />
            );
            acc += len;
            return el;
          })}
        <text x="70" y="68" textAnchor="middle" fontSize="13" fontWeight="700" fill="#f4f4f5">{center}</text>
        {sub && <text x="70" y="82" textAnchor="middle" fontSize="8" fill="#71717a">{sub}</text>}
      </svg>
      <ul className="min-w-0 flex-1 space-y-1.5 text-[11px]">
        {items.map((i, k) => (
          <li key={i.label} className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1.5 text-zinc-300"><span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: DONUT[k % DONUT.length] }} /><span className="truncate">{i.label}</span></span>
            <span className="shrink-0 font-semibold text-zinc-100">{total > 0 ? Math.round((i.value / total) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
