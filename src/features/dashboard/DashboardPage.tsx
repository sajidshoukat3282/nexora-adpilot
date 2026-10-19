import React, { useEffect, useState } from "react";
import { useNavigate } from "@/lib/router";
import { useSession } from "@/hooks/useSession";

/* ------------------------------------------------------------------ */
/* types (shape returned by GET /api/dashboard/summary)                */
/* ------------------------------------------------------------------ */

interface CampaignRow {
  id: string;
  name: string;
  status: string;
  currency: string;
  budget: number;
  revenue: number;
  expenses: number;
  roas: number | null;
  ooh_screens: number;
  dooh_screens: number;
  type: string;
}

interface Segment {
  budget: number;
  revenue: number;
  expenses: number;
  screens: number;
}

interface FeedEvent {
  kind: "ok" | "warn" | "info";
  title: string;
  sub: string;
  at: string;
}

interface DailyPoint {
  date: string;
  revenue: number;
  expenses: number;
  leads: number;
}

interface Summary {
  health_score: number;
  campaigns: CampaignRow[];
  inventory: { ooh: number; dooh: number; online: number; total: number };
  split: { ooh: Segment; dooh: Segment };
  daily: DailyPoint[];
  events: FeedEvent[];
}

const EMPTY_SEGMENT: Segment = { budget: 0, revenue: 0, expenses: 0, screens: 0 };

const EMPTY_SUMMARY: Summary = {
  health_score: 0,
  campaigns: [],
  inventory: { ooh: 0, dooh: 0, online: 0, total: 0 },
  split: { ooh: EMPTY_SEGMENT, dooh: EMPTY_SEGMENT },
  daily: [],
  events: [],
};

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

type Pt = [number, number];

/** Catmull-Rom -> cubic bezier (y clamped to the plot area). */
const smooth = (pts: Pt[], lo: number, hi: number): string => {
  if (pts.length === 0) return "";
  const clamp = (y: number) => Math.min(hi, Math.max(lo, y));
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = clamp(p1[1] + (p2[1] - p0[1]) / 6);
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = clamp(p2[1] - (p3[1] - p1[1]) / 6);
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0]},${p2[1]}`;
  }
  return d;
};

const niceMax = (v: number): number => {
  if (!(v > 0)) return 4;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  const m = n <= 1 ? 1 : n <= 2 ? 2 : n <= 4 ? 4 : n <= 8 ? 8 : 10;
  return m * p;
};

const compact = (n: number): string =>
  new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);

const makeMoney = (currency: string, full = false) => (n: number): string => {
  try {
    return new Intl.NumberFormat(
      "en-US",
      full
        ? { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }
        : { style: "currency", currency, notation: "compact", maximumFractionDigits: 1 },
    ).format(n);
  } catch {
    return `${currency} ${full ? n.toFixed(2) : compact(n)}`;
  }
};

const fmtDay = (iso: string): string => {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
};

/** Shrink the font so long values never overflow their card. */
const fit = (text: string, maxPx: number, boxPx = 108): number =>
  Math.max(11, Math.min(maxPx, Math.floor(boxPx / (Math.max(1, text.length) * 0.58))));

const statusLabel = (s: string): string =>
  s.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

const isGoodStatus = (s: string): boolean =>
  ["live", "completed", "paid", "reported", "invoiced"].includes(s);

async function getJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(path, { credentials: "same-origin" });
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* shared styles                                                       */
/* ------------------------------------------------------------------ */

const PANEL =
  "rounded-xl border border-[#2a2f37] bg-gradient-to-b from-[#171a20] to-[#0f1216] shadow-[0_8px_24px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.03)]";

const GOLD_CARD: React.CSSProperties = {
  background:
    "linear-gradient(135deg,#f1d68a 0%,#c99b3b 28%,#ecd07c 50%,#a97b22 76%,#d8b257 100%)",
  boxShadow: "0 8px 20px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.45)",
};

const SILVER_CARD: React.CSSProperties = {
  background:
    "linear-gradient(135deg,#eceff2 0%,#a8aeb6 38%,#d9dde2 58%,#8b929b 100%)",
  boxShadow: "0 8px 20px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.5)",
};

const C_OOH = "#e0a94c";
const C_DOOH = "#a78bfa";
const C_REV = "#34d399";
const C_EXP = "#9ca3af";

/* ------------------------------------------------------------------ */
/* small components                                                    */
/* ------------------------------------------------------------------ */

const TypeBadge: React.FC<{ type: string }> = ({ type }) => {
  const isDooh = type.includes("DOOH");
  const isBoth = type.includes("+");
  const color = isBoth ? "#38bdf8" : isDooh ? C_DOOH : type === "OOH" ? C_OOH : "#71717a";
  return (
    <span
      className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold"
      style={{ color, backgroundColor: `${color}1f`, border: `1px solid ${color}55` }}
    >
      {type}
    </span>
  );
};

const Ring: React.FC<{ value: number; color: string; children: React.ReactNode }> = ({
  value,
  color,
  children,
}) => (
  <div className="relative h-[54px] w-[54px]">
    <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
      <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#2a2e35" strokeWidth="3.6" />
      {value > 0 && (
        <circle
          cx="18"
          cy="18"
          r="15.9155"
          fill="none"
          stroke={color}
          strokeWidth="3.6"
          strokeLinecap="round"
          strokeDasharray={`${Math.min(100, value)} ${100 - Math.min(100, value)}`}
        />
      )}
    </svg>
    <div className="absolute inset-0 flex items-center justify-center text-[12px] font-semibold text-white">
      {children}
    </div>
  </div>
);

const Gauge: React.FC<{ score: number }> = ({ score }) => (
  <div className="relative mx-auto mt-0.5 h-[44px] w-[88px]">
    <svg viewBox="0 0 100 54" className="h-full w-full overflow-visible">
      <defs>
        <linearGradient id="ap-gauge" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#b8862b" />
          <stop offset="55%" stopColor="#f3d77f" />
          <stop offset="100%" stopColor="#c99a3a" />
        </linearGradient>
      </defs>
      <path
        d="M 10 50 A 40 40 0 0 1 90 50"
        fill="none"
        stroke="#2b2f36"
        strokeWidth="9"
        strokeLinecap="round"
      />
      {score > 0 && (
        <path
          d="M 10 50 A 40 40 0 0 1 90 50"
          fill="none"
          stroke="url(#ap-gauge)"
          strokeWidth="9"
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${score} 100`}
        />
      )}
    </svg>
    <div className="absolute inset-x-0 bottom-0 text-center leading-none">
      <div className="text-[22px] font-bold text-white">{score}</div>
      <div className="text-[9px] text-zinc-400">/100</div>
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/* trend chart: Revenue / New Leads / Expenses (last 30 days)           */
/* ------------------------------------------------------------------ */

const TrendChart: React.FC<{ daily: DailyPoint[]; currency: string }> = ({ daily, currency }) => {
  const X0 = 52;
  const X1 = 558;
  const Y_TOP = 20;
  const Y_BOT = 168;

  const moneyMax = niceMax(Math.max(0, ...daily.map((d) => Math.max(d.revenue, d.expenses))));
  const leadMax = niceMax(Math.max(0, ...daily.map((d) => d.leads)));

  const n = daily.length;
  const xAt = (i: number) => Math.round(X0 + (n > 1 ? (i * (X1 - X0)) / (n - 1) : 0));
  const toPts = (vals: number[], max: number): Pt[] =>
    vals.map((v, i) => [xAt(i), Math.round(Y_BOT - (v / max) * (Y_BOT - Y_TOP))]);

  const rev = toPts(daily.map((d) => d.revenue), moneyMax);
  const exp = toPts(daily.map((d) => d.expenses), moneyMax);
  const led = toPts(daily.map((d) => d.leads), leadMax);

  const line = (pts: Pt[]) => smooth(pts, Y_TOP, Y_BOT);
  const area = (pts: Pt[]) =>
    pts.length ? `${line(pts)} L${X1},${Y_BOT} L${X0},${Y_BOT} Z` : "";

  const ticks = [4, 3, 2, 1, 0];
  const labelIdx = n > 1 ? [0, 5, 10, 15, 20, 25, n - 1].filter((v, i, a) => v < n && a.indexOf(v) === i) : [0];

  return (
    <svg viewBox="0 0 610 200" className="h-auto w-full">
      <defs>
        <linearGradient id="ap-a-rev" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.02" />
        </linearGradient>
        <linearGradient id="ap-a-lead" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#34d399" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#34d399" stopOpacity="0.03" />
        </linearGradient>
        <linearGradient id="ap-a-exp" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e5b93e" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#7c5cd6" stopOpacity="0.25" />
        </linearGradient>
        <clipPath id="ap-plot">
          <rect x={X0} y={Y_TOP - 2} width={X1 - X0} height={Y_BOT - Y_TOP + 4} />
        </clipPath>
      </defs>

      <text x={X0 - 8} y="10" textAnchor="end" fontSize="9" fill="#6b7280">
        {currency}
      </text>
      <text x={X1 + 8} y="10" textAnchor="start" fontSize="9" fill="#6b7280">
        Leads
      </text>

      {ticks.map((t) => {
        const y = Y_BOT - (t / 4) * (Y_BOT - Y_TOP);
        return (
          <g key={t}>
            <line x1={X0} x2={X1} y1={y} y2={y} stroke="#272c33" strokeWidth="1" />
            <text x={X0 - 8} y={y + 3} textAnchor="end" fontSize="10" fill="#8b929b">
              {compact((moneyMax * t) / 4)}
            </text>
            <text x={X1 + 8} y={y + 3} textAnchor="start" fontSize="10" fill="#8b929b">
              {compact((leadMax * t) / 4)}
            </text>
          </g>
        );
      })}

      <g clipPath="url(#ap-plot)">
        <path d={area(rev)} fill="url(#ap-a-rev)" />
        <path d={area(led)} fill="url(#ap-a-lead)" />
        <path d={area(exp)} fill="url(#ap-a-exp)" />

        <path d={line(rev)} fill="none" stroke="#38bdf8" strokeWidth="2" />
        <path d={line(led)} fill="none" stroke="#34d399" strokeWidth="2" />
        <path d={line(exp)} fill="none" stroke="#e5b93e" strokeWidth="2" />
      </g>

      {labelIdx.map((i) => (
        <text key={i} x={xAt(i)} y="190" textAnchor="middle" fontSize="10" fill="#8b929b">
          {daily[i] ? fmtDay(daily[i].date) : ""}
        </text>
      ))}
    </svg>
  );
};

/* ------------------------------------------------------------------ */
/* sankey: Budget -> OOH / DOOH -> Revenue / Expenses                   */
/* ------------------------------------------------------------------ */

const stack = (vals: number[], top: number, H: number, gap: number): [number, number][] => {
  const usable = H - gap * (vals.length - 1);
  const sum = vals.reduce((a, b) => a + b, 0);
  let t = vals.map((v) => (sum > 0 ? Math.max(8, (v / sum) * usable) : usable / vals.length));
  const s = t.reduce((a, b) => a + b, 0);
  t = t.map((x) => (x * usable) / s);
  const out: [number, number][] = [];
  let y = top;
  for (const x of t) {
    out.push([y, y + x]);
    y += x + gap;
  }
  return out;
};

const splitRange = (y0: number, y1: number, weights: number[]): [number, number][] => {
  const sum = weights.reduce((a, b) => a + b, 0);
  const w = sum > 0 ? weights : weights.map(() => 1);
  const total = w.reduce((a, b) => a + b, 0);
  const out: [number, number][] = [];
  let y = y0;
  for (const x of w) {
    const h = ((y1 - y0) * x) / total;
    out.push([y, y + h]);
    y += h;
  }
  return out;
};

const Sankey: React.FC<{ split: { ooh: Segment; dooh: Segment } }> = ({ split }) => {
  const { ooh, dooh } = split;
  const LX = 96;
  const MX = 250;
  const RX = 410;
  const W = 14;
  const TOP = 36;
  const H = 108;
  const GAP = 14;

  const hasData =
    ooh.budget + dooh.budget + ooh.revenue + dooh.revenue + ooh.expenses + dooh.expenses > 0;

  const left = stack([ooh.budget, dooh.budget], TOP, H, GAP);
  const mid = left;
  const revTotal = ooh.revenue + dooh.revenue;
  const expTotal = ooh.expenses + dooh.expenses;
  const right = stack([revTotal, expTotal], TOP, H, GAP);

  const ribbon = (
    x0: number,
    a: [number, number],
    x1: number,
    b: [number, number],
    id: string,
    c0: string,
    c1: string,
  ) => {
    const sx = x0 + W;
    const mx = (sx + x1) / 2;
    const d = `M${sx},${a[0]} C${mx},${a[0]} ${mx},${b[0]} ${x1},${b[0]} L${x1},${b[1]} C${mx},${b[1]} ${mx},${a[1]} ${sx},${a[1]} Z`;
    return (
      <g key={id}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={c0} stopOpacity="0.6" />
            <stop offset="100%" stopColor={c1} stopOpacity="0.6" />
          </linearGradient>
        </defs>
        <path d={d} fill={`url(#${id})`} />
      </g>
    );
  };

  const types = [
    { seg: ooh, color: C_OOH, label: "OOH", i: 0 },
    { seg: dooh, color: C_DOOH, label: "DOOH", i: 1 },
  ];

  const revSplit = splitRange(right[0][0], right[0][1], [ooh.revenue, dooh.revenue]);
  const expSplit = splitRange(right[1][0], right[1][1], [ooh.expenses, dooh.expenses]);

  return (
    <div className="relative">
      <svg viewBox="0 0 520 170" className="h-auto w-full">
        {/* ribbons */}
        {types.map((t) => ribbon(LX, left[t.i], MX, mid[t.i], `ap-sk-b${t.i}`, t.color, t.color))}
        {types.map((t) => {
          const total = t.seg.revenue + t.seg.expenses;
          if (total <= 0) return null;
          const [rv, ex] = splitRange(mid[t.i][0], mid[t.i][1], [t.seg.revenue, t.seg.expenses]);
          return (
            <g key={`o${t.i}`}>
              {t.seg.revenue > 0 &&
                ribbon(MX, rv, RX, revSplit[t.i], `ap-sk-r${t.i}`, t.color, C_REV)}
              {t.seg.expenses > 0 &&
                ribbon(MX, ex, RX, expSplit[t.i], `ap-sk-e${t.i}`, t.color, C_EXP)}
            </g>
          );
        })}

        {/* nodes */}
        {types.map((t) => (
          <g key={`n${t.i}`}>
            <rect x={LX} y={left[t.i][0]} width={W} height={left[t.i][1] - left[t.i][0]} rx="2" fill={t.color} />
            <rect x={MX} y={mid[t.i][0]} width={W} height={mid[t.i][1] - mid[t.i][0]} rx="2" fill={t.color} />
          </g>
        ))}
        <rect x={RX} y={right[0][0]} width={W} height={right[0][1] - right[0][0]} rx="2" fill={C_REV} />
        <rect x={RX} y={right[1][0]} width={W} height={right[1][1] - right[1][0]} rx="2" fill={C_EXP} />

        {/* labels */}
        <g fontSize="11" fill="#d4d8de">
          <text x={LX - 8} y={(left[0][0] + left[0][1]) / 2 + 4} textAnchor="end">OOH Budget</text>
          <text x={LX - 8} y={(left[1][0] + left[1][1]) / 2 + 4} textAnchor="end">DOOH Budget</text>
          <text x={MX + W / 2} y="18" textAnchor="middle">Platforms</text>
          <text x={MX + W / 2} y={mid[0][0] - 4} textAnchor="middle" fontSize="10" fill="#a1a1aa">OOH</text>
          <text x={MX + W / 2} y={mid[1][0] - 4} textAnchor="middle" fontSize="10" fill="#a1a1aa">DOOH</text>
          <text x={RX + W + 8} y={(right[0][0] + right[0][1]) / 2 + 4}>Revenue</text>
          <text x={RX + W + 8} y={(right[1][0] + right[1][1]) / 2 + 4}>Expenses</text>
        </g>
      </svg>
      {!hasData && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[11px] text-zinc-500">
          No campaign data yet
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* page                                                                */
/* ------------------------------------------------------------------ */

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useSession();

  const [summary, setSummary] = useState<Summary>(EMPTY_SUMMARY);
  const [metrics, setMetrics] = useState<any>({});
  const [leadCount, setLeadCount] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [s, m, l] = await Promise.all([
        getJson<{ ok: boolean; data: Summary }>("/api/dashboard/summary"),
        getJson<{ ok: boolean; metrics: any }>("/api/finance/metrics"),
        getJson<{ ok: boolean; data: any[] }>("/api/crm/leads"),
      ]);
      if (!alive) return;
      if (s?.ok && s.data) setSummary({ ...EMPTY_SUMMARY, ...s.data });
      if (m?.ok) setMetrics(m.metrics || {});
      if (l?.ok) setLeadCount((l.data || []).length);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const currency = summary.campaigns[0]?.currency || "PKR";
  const money = makeMoney(currency);
  const moneyFull = makeMoney(currency, true);

  const liveCampaigns = summary.campaigns.filter((c) => c.status === "live").length;
  const revenue = Number(metrics.total_revenue) || 0;
  const expenses = Number(metrics.total_expenses) || 0;
  const roas = expenses > 0 ? (revenue / expenses).toFixed(1) : "0.0";

  const expensesText = money(expenses);
  const revenueText = moneyFull(revenue);

  const topCampaigns = [...summary.campaigns]
    .sort((a, b) => b.revenue - a.revenue || b.budget - a.budget)
    .slice(0, 4);

  const inv = summary.inventory;
  const pct = (n: number) => (inv.total > 0 ? Math.round((n / inv.total) * 100) : 0);

  const userName = String((user as any)?.name ?? "");
  const initials =
    userName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "AS";

  return (
    <div className="w-full min-w-0 rounded-2xl bg-[#0b0d10] p-3 font-sans text-slate-200 md:p-4">
      <div className="min-w-0 space-y-3">
        {/* HEADER */}
        <div className="flex items-center justify-between pb-1">
          <h1 className="text-[18px] font-normal tracking-tight text-zinc-100">
            Ad Pilot <span className="text-zinc-400">::</span> Commander&apos;s Dashboard
          </h1>
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-500/70 bg-[#14171b] text-[11px] text-zinc-200">
            {initials}
          </div>
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-[1.25fr_1fr_1fr_1fr_1fr_1.35fr]">
          <div className={`${PANEL} flex min-h-[80px] flex-col p-2.5`}>
            <p className="text-[11px] font-medium text-zinc-200">Business Health Score</p>
            <Gauge score={summary.health_score} />
          </div>

          <div className={`${PANEL} flex min-h-[80px] flex-col items-center justify-between p-2.5`}>
            <p className="text-[11px] font-medium text-zinc-200">Live Campaigns</p>
            <p className="pb-0.5 text-[26px] font-semibold leading-none text-white">{liveCampaigns}</p>
          </div>

          <div
            style={GOLD_CARD}
            className="flex min-h-[80px] flex-col items-center justify-between rounded-xl border border-[#f6e2a1]/50 p-2.5"
          >
            <p className="text-[11px] font-medium text-[#6b4a0c]">Total Expenses</p>
            <p
              className="max-w-full whitespace-nowrap pb-0.5 font-semibold leading-none text-[#1a1204]"
              style={{ fontSize: fit(expensesText, 26) }}
            >
              {expensesText}
            </p>
          </div>

          <div
            style={GOLD_CARD}
            className="flex min-h-[80px] flex-col items-center justify-between rounded-xl border border-[#f6e2a1]/50 p-2.5"
          >
            <p className="text-[11px] font-medium text-[#6b4a0c]">Overall ROAS</p>
            <p className="pb-0.5 text-[26px] font-semibold leading-none text-[#1a1204]">{roas}x</p>
          </div>

          <div
            style={SILVER_CARD}
            className="flex min-h-[80px] flex-col items-center justify-between rounded-xl border border-white/40 p-2.5 text-center"
          >
            <p className="text-[11px] font-medium leading-tight text-[#3a3f46]">
              Total Leads
              <br />
              Captured
            </p>
            <p className="pb-0.5 text-[28px] font-semibold leading-none text-[#22262b]">{leadCount}</p>
          </div>

          <div className={`${PANEL} flex min-h-[80px] flex-col justify-between p-2.5`}>
            <p className="text-[11px] font-medium text-zinc-200">Total Revenue</p>
            <p
              className="max-w-full whitespace-nowrap pb-0.5 text-center font-semibold leading-none text-white"
              style={{ fontSize: fit(revenueText, 22, 118) }}
            >
              {revenueText}
            </p>
          </div>
        </div>

        {/* MIDDLE ROW */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,1fr)]">
          <div className={`${PANEL} min-w-0 p-3`}>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-[12px] font-medium text-zinc-200">
                Revenue, Expenses &amp; Leads Trend (Daily)
              </h3>
              <div className="flex gap-3 text-[10px] text-zinc-300">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#38bdf8]" /> Revenue
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#34d399]" /> New Leads
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#e5b93e]" /> Expenses
                </span>
              </div>
            </div>
            <TrendChart daily={summary.daily} currency={currency} />
          </div>

          <div className={`${PANEL} min-w-0 p-3`}>
            <h3 className="mb-1 text-[12px] font-medium text-zinc-200">Budget-to-Revenue Flow</h3>
            <Sankey split={summary.split} />
          </div>
        </div>

        {/* BOTTOM ROW */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)]">
          {/* Top campaigns */}
          <div className={`${PANEL} min-w-0 p-3`}>
            <h3 className="mb-2 text-[12px] font-medium text-zinc-200">Top Performing Campaigns</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[10.5px]">
                <thead className="border-b border-zinc-700/60 text-zinc-300">
                  <tr>
                    <th className="py-2 pr-2 font-medium">Campaign Name</th>
                    <th className="py-2 pr-2 font-medium">Type</th>
                    <th className="py-2 pr-2 font-medium">Budget</th>
                    <th className="py-2 pr-2 font-medium">ROAS</th>
                    <th className="py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/70">
                  {topCampaigns.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-zinc-500">
                        No campaigns yet
                      </td>
                    </tr>
                  )}
                  {topCampaigns.map((c) => (
                    <tr
                      key={c.id}
                      className="cursor-pointer hover:bg-white/[0.02]"
                      onClick={() => navigate(`/campaigns/${c.id}`)}
                    >
                      <td className="max-w-[130px] truncate py-2 pr-2 text-zinc-100">{c.name}</td>
                      <td className="py-2 pr-2">
                        <TypeBadge type={c.type} />
                      </td>
                      <td className="py-2 pr-2 text-zinc-100">{makeMoney(c.currency || currency)(c.budget)}</td>
                      <td className="py-2 pr-2 text-zinc-100">
                        {c.roas === null ? "—" : c.roas.toFixed(2)}
                      </td>
                      <td className="py-2">
                        <span className="flex items-center gap-1.5 text-zinc-100">
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isGoodStatus(c.status) ? "bg-[#22c55e]" : "bg-[#f59e0b]"
                            }`}
                          />
                          {statusLabel(c.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Activity & alerts */}
          <div className={`${PANEL} flex min-w-0 flex-col p-3`}>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-[12px] font-medium text-zinc-200">Activity &amp; Alerts</h3>
              <span className="text-[13px] leading-none tracking-widest text-zinc-400">···</span>
            </div>
            <div className="max-h-[132px] flex-1 space-y-3 overflow-y-auto pr-2">
              {summary.events.length === 0 && (
                <p className="py-6 text-center text-[11px] text-zinc-500">No recent activity yet</p>
              )}
              {summary.events.map((f, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  {f.kind === "warn" ? (
                    <svg
                      viewBox="0 0 24 24"
                      className="mt-[1px] h-3 w-3 shrink-0 text-[#f59e0b]"
                      fill="currentColor"
                    >
                      <path d="M12 3 2 21h20L12 3Zm1 14h-2v-2h2v2Zm0-4h-2V9h2v4Z" />
                    </svg>
                  ) : (
                    <span
                      className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                        f.kind === "ok"
                          ? "bg-[#22c55e] shadow-[0_0_6px_rgba(34,197,94,0.7)]"
                          : "bg-zinc-500"
                      }`}
                    />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-medium leading-tight text-zinc-100">{f.title}</p>
                    <p className="mt-0.5 truncate text-[9.5px] text-zinc-500">{f.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Inventory mix */}
          <div className={`${PANEL} flex min-w-0 flex-col justify-between p-3`}>
            <h3 className="text-[12px] font-medium text-zinc-200">OOH vs DOOH Inventory</h3>
            <div className="flex items-start justify-around gap-1 py-1.5">
              <div className="flex flex-col items-center gap-1.5">
                <Ring value={pct(inv.ooh)} color="#d9a93f">
                  {pct(inv.ooh)}%
                </Ring>
                <span className="text-[10px] text-zinc-300">OOH</span>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <Ring value={pct(inv.dooh)} color={C_DOOH}>
                  {pct(inv.dooh)}%
                </Ring>
                <span className="text-[10px] text-zinc-300">DOOH</span>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <Ring value={pct(inv.online)} color="#22c5d8">
                  {pct(inv.online)}%
                </Ring>
                <span className="text-[10px] text-zinc-300">Online</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate("/campaigns")}
              className="w-full rounded-md border border-[#9a7d3a]/70 bg-[#13161a] py-2 text-[10.5px] font-medium uppercase tracking-wide text-zinc-100 transition hover:bg-[#1a1e24]"
            >
              Launch New Campaign
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
