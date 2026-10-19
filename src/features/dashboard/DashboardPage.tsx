import React, { useEffect, useState } from "react";
import { FcGoogle } from "react-icons/fc";
import { FaMeta, FaTiktok } from "react-icons/fa6";

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

type Pt = [number, number];

/** Catmull-Rom -> cubic bezier, gives the smooth curves of the reference. */
const smooth = (pts: Pt[]): string => {
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0]},${p2[1]}`;
  }
  return d;
};

const money = (n: number): string =>
  n >= 1000 ? `$${(n / 1000).toFixed(1)}K` : `$${n.toFixed(2)}`;

const num = (v: unknown): number | null => {
  const n = Number(v);
  return v === null || v === undefined || v === "" || Number.isNaN(n) ? null : n;
};

/* ------------------------------------------------------------------ */
/* static ad-pilot data used by the charts / table / feed              */
/* ------------------------------------------------------------------ */

type Platform = "google" | "meta" | "tiktok";

interface AdRow {
  name: string;
  platform: Platform;
  ctr: string;
  roas: string;
  status: string;
  warn?: boolean;
}

const DEMO_ROWS: AdRow[] = [
  { name: "Campaign Alpha 1", platform: "google", ctr: "10.26%", roas: "18.39", status: "Paid" },
  { name: "Campaign Beta 2", platform: "meta", ctr: "15.09%", roas: "23.50", status: "Paid" },
  { name: "Campaign Beta 3", platform: "meta", ctr: "10.56%", roas: "13.38", status: "Paid", warn: true },
  { name: "Campaign Beta 4", platform: "tiktok", ctr: "66.98%", roas: "25.65", status: "Paid" },
];

const FEED = [
  { kind: "ok", title: "Budget Adjusted: Campaign Alpha (+5%)", sub: "Real-time optimization · Campaign Alpha" },
  { kind: "warn", title: "ROAS Alert: Campaign Beta (4.1x)", sub: "New ad-time Campaign Beta (5.1x)" },
  { kind: "info", title: "AI Trigger: New Ad Set Released", sub: "Real-time optimization · Campaign Beta" },
  { kind: "ok", title: "AI Trigger: New Ad Set Released", sub: "New ad-time Campaign Released" },
  { kind: "ok", title: "Budget Adjusted: Campaign Beta (+3%)", sub: "Real-time optimization · Campaign Beta" },
  { kind: "info", title: "AI Trigger: Audience Refreshed", sub: "Campaign Alpha · Lookalike 2%" },
] as const;

const CLICKS = [250, 330, 440, 580, 650, 700, 520, 470, 560, 720, 880, 700, 600, 740, 900];
const CONVERSIONS = [170, 260, 330, 430, 500, 540, 420, 350, 420, 560, 640, 520, 480, 620, 740];
const CPA = [90, 140, 190, 250, 300, 330, 250, 200, 260, 350, 420, 330, 300, 380, 470];
const X_LABELS = ["Oct 01", "Oct 07", "Oct 09", "Oct 11", "Oct 15", "Oct 29", "Oct 31"];

const pickPlatform = (v: unknown): Platform => {
  const s = String(v ?? "").toLowerCase();
  if (s.includes("meta") || s.includes("facebook") || s.includes("insta")) return "meta";
  if (s.includes("tik")) return "tiktok";
  return "google";
};

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

/* ------------------------------------------------------------------ */
/* small components                                                    */
/* ------------------------------------------------------------------ */

const PlatformIcon: React.FC<{ p: Platform }> = ({ p }) => {
  if (p === "google") return <FcGoogle className="h-[18px] w-[18px]" />;
  if (p === "meta") return <FaMeta className="h-[18px] w-[18px] text-[#2d8cff]" />;
  return (
    <span className="flex h-[18px] w-[18px] items-center justify-center rounded-[5px] bg-black ring-1 ring-white/10">
      <FaTiktok className="h-3 w-3 text-white" />
    </span>
  );
};

const Ring: React.FC<{ value: number; color: string; children: React.ReactNode }> = ({
  value,
  color,
  children,
}) => (
  <div className="relative h-[62px] w-[62px]">
    <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
      <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#2a2e35" strokeWidth="3.6" />
      <circle
        cx="18"
        cy="18"
        r="15.9155"
        fill="none"
        stroke={color}
        strokeWidth="3.6"
        strokeLinecap="round"
        strokeDasharray={`${value} ${100 - value}`}
      />
    </svg>
    <div className="absolute inset-0 flex items-center justify-center text-[13px] font-semibold text-white">
      {children}
    </div>
  </div>
);

const Gauge: React.FC<{ score: number }> = ({ score }) => (
  <div className="relative mx-auto mt-1 h-[52px] w-[104px]">
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
      <path
        d="M 10 50 A 40 40 0 0 1 90 50"
        fill="none"
        stroke="url(#ap-gauge)"
        strokeWidth="9"
        strokeLinecap="round"
        pathLength={100}
        strokeDasharray={`${score} 100`}
      />
    </svg>
    <div className="absolute inset-x-0 bottom-0 text-center leading-none">
      <div className="text-[28px] font-bold text-white">{score}</div>
      <div className="text-[9px] text-zinc-400">/100</div>
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/* trend chart                                                         */
/* ------------------------------------------------------------------ */

const TrendChart: React.FC = () => {
  const X0 = 44;
  const X1 = 566;
  const Y_TOP = 18;
  const Y_BOT = 218;
  const toPts = (arr: number[]): Pt[] =>
    arr.map((v, i) => [
      Math.round(X0 + (i * (X1 - X0)) / (arr.length - 1)),
      Math.round(Y_BOT - (v / 1000) * (Y_BOT - Y_TOP)),
    ]);

  const area = (arr: number[]) => {
    const pts = toPts(arr);
    return `${smooth(pts)} L${X1},${Y_BOT} L${X0},${Y_BOT} Z`;
  };

  const ticks = [1000, 750, 500, 250, 0];

  return (
    <svg viewBox="0 0 610 250" className="h-auto w-full">
      <defs>
        <linearGradient id="ap-a-clicks" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.02" />
        </linearGradient>
        <linearGradient id="ap-a-conv" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#34d399" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#34d399" stopOpacity="0.03" />
        </linearGradient>
        <linearGradient id="ap-a-cpa" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e5b93e" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#7c5cd6" stopOpacity="0.25" />
        </linearGradient>
      </defs>

      {ticks.map((t) => {
        const y = Y_BOT - (t / 1000) * (Y_BOT - Y_TOP);
        return (
          <g key={t}>
            <line x1={X0} x2={X1} y1={y} y2={y} stroke="#272c33" strokeWidth="1" />
            <text x={X0 - 8} y={y + 3} textAnchor="end" fontSize="10" fill="#8b929b">
              {t}
            </text>
            <text x={X1 + 8} y={y + 3} textAnchor="start" fontSize="10" fill="#8b929b">
              {t}
            </text>
          </g>
        );
      })}

      <path d={area(CLICKS)} fill="url(#ap-a-clicks)" />
      <path d={area(CONVERSIONS)} fill="url(#ap-a-conv)" />
      <path d={area(CPA)} fill="url(#ap-a-cpa)" />

      <path d={smooth(toPts(CLICKS))} fill="none" stroke="#38bdf8" strokeWidth="2" />
      <path d={smooth(toPts(CONVERSIONS))} fill="none" stroke="#34d399" strokeWidth="2" />
      <path d={smooth(toPts(CPA))} fill="none" stroke="#e5b93e" strokeWidth="2" />

      {X_LABELS.map((l, i) => (
        <text
          key={l}
          x={X0 + (i * (X1 - X0)) / (X_LABELS.length - 1)}
          y="240"
          textAnchor="middle"
          fontSize="10"
          fill="#8b929b"
        >
          {l}
        </text>
      ))}
    </svg>
  );
};

/* ------------------------------------------------------------------ */
/* sankey chart                                                        */
/* ------------------------------------------------------------------ */

const Sankey: React.FC = () => {
  const GREEN = "#34d399";
  const PURPLE = "#a78bfa";
  const GOLD = "#e0a94c";
  const GRAY = "#9ca3af";

  const LX = 78; // left bar x
  const MX = 258; // middle bar x
  const RX = 438; // right bar x
  const W = 14;

  const ribbon = (
    x0: number,
    a0: number,
    a1: number,
    x1: number,
    b0: number,
    b1: number,
    id: string,
    c0: string,
    c1: string
  ) => {
    const sx = x0 + W;
    const mid = (sx + x1) / 2;
    const d = `M${sx},${a0} C${mid},${a0} ${mid},${b0} ${x1},${b0} L${x1},${b1} C${mid},${b1} ${mid},${a1} ${sx},${a1} Z`;
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

  return (
    <svg viewBox="0 0 520 230" className="h-auto w-full">
      {/* ribbons */}
      {ribbon(LX, 30, 95, MX, 30, 95, "ap-s1", GREEN, PURPLE)}
      {ribbon(LX, 108, 122, MX, 95, 109, "ap-s2", PURPLE, PURPLE)}
      {ribbon(LX, 122, 130, MX, 140, 146, "ap-s3", PURPLE, GREEN)}
      {ribbon(LX, 143, 160, MX, 150, 167, "ap-s4", GOLD, GOLD)}
      {ribbon(MX, 30, 100, RX, 30, 100, "ap-s5", PURPLE, GREEN)}
      {ribbon(MX, 100, 117, RX, 138, 155, "ap-s6", PURPLE, GRAY)}
      {ribbon(MX, 140, 146, RX, 155, 161, "ap-s7", GREEN, GRAY)}
      {ribbon(MX, 150, 167, RX, 161, 170, "ap-s8", GOLD, GRAY)}

      {/* nodes */}
      <rect x={LX} y="30" width={W} height="65" rx="2" fill={GREEN} />
      <rect x={LX} y="108" width={W} height="22" rx="2" fill={PURPLE} />
      <rect x={LX} y="143" width={W} height="17" rx="2" fill={GOLD} />

      <rect x={MX} y="30" width={W} height="87" rx="2" fill={PURPLE} />
      <rect x={MX} y="140" width={W} height="6" rx="2" fill={GREEN} />
      <rect x={MX} y="150" width={W} height="17" rx="2" fill={GOLD} />

      <rect x={RX} y="30" width={W} height="70" rx="2" fill={GREEN} />
      <rect x={RX} y="138" width={W} height="32" rx="2" fill={GRAY} />

      {/* labels */}
      <g fontSize="11" fill="#d4d8de">
        <text x={LX - 8} y="66" textAnchor="end">Budget</text>
        <text x={LX - 8} y="123" textAnchor="end">Budget</text>
        <text x={LX - 8} y="155" textAnchor="end">TikTok</text>
        <text x={MX + W / 2} y="20" textAnchor="middle">Platforms</text>
        <text x={MX + W / 2} y="182" textAnchor="middle">TikTok</text>
        <text x={RX + W / 2} y="20" textAnchor="middle">ROAS</text>
      </g>
    </svg>
  );
};

/* ------------------------------------------------------------------ */
/* page                                                                */
/* ------------------------------------------------------------------ */

export const DashboardPage: React.FC = () => {
  const [metrics, setMetrics] = useState<any>({});
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [mRes, cRes, lRes] = await Promise.all([
          fetch("/api/finance/metrics"),
          fetch("/api/campaigns"),
          fetch("/api/crm/leads"),
        ]);

        const mData = await mRes.json();
        const cData = await cRes.json();
        const lData = await lRes.json();

        if (mData.ok) setMetrics(mData.metrics || {});
        if (cData.ok) setCampaigns(cData.data || []);
        if (lData.ok) setLeads(lData.data || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchDashboardData();
  }, []);

  const liveCampaigns = campaigns.filter((c) => c.status === "live");
  const revenue = Number(metrics.total_revenue) || 465018.0;
  const spend = Number(metrics.total_expenses) || 0;
  const roas = spend > 0 ? (revenue / spend).toFixed(1) : "0.0";
  const aiScore = 98;

  const rows: AdRow[] = campaigns.length
    ? campaigns.slice(0, 4).map((c, i) => {
        const ctr = num(c.ctr);
        const r = num(c.roas);
        const status = String(c.status ?? "—");
        return {
          name: String(c.name ?? c.title ?? `Campaign ${i + 1}`),
          platform: pickPlatform(c.platform ?? c.channel),
          ctr: ctr === null ? "—" : `${ctr.toFixed(2)}%`,
          roas: r === null ? "—" : r.toFixed(2),
          status: status.charAt(0).toUpperCase() + status.slice(1),
          warn: status !== "live",
        };
      })
    : DEMO_ROWS;

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#0b0d10] p-4 font-sans text-slate-200 md:p-6">
      <div className="mx-auto max-w-[1600px] space-y-3.5">
        {/* HEADER */}
        <div className="flex items-center justify-between pb-1">
          <h1 className="text-[22px] font-normal tracking-tight text-zinc-100">
            Ad Pilot <span className="text-zinc-400">::</span> Commander&apos;s Dashboard
          </h1>
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-500/70 bg-[#14171b] text-[13px] text-zinc-200">
            AS
          </div>
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-[1.35fr_1fr_1fr_1fr_1fr_1.25fr]">
          {/* AI score */}
          <div className={`${PANEL} flex min-h-[96px] flex-col p-3`}>
            <p className="text-[12px] font-medium text-zinc-200">AI Commander Score</p>
            <Gauge score={aiScore} />
          </div>

          {/* Active campaigns */}
          <div className={`${PANEL} flex min-h-[96px] flex-col items-center justify-between p-3`}>
            <p className="text-[12px] font-medium text-zinc-200">Active Campaigns</p>
            <p className="pb-1 text-[34px] font-semibold leading-none text-white">
              {liveCampaigns.length}
            </p>
          </div>

          {/* Today's spend - gold */}
          <div
            style={GOLD_CARD}
            className="flex min-h-[96px] flex-col items-center justify-between rounded-xl border border-[#f6e2a1]/50 p-3"
          >
            <p className="text-[12px] font-medium text-[#6b4a0c]">Today&apos;s Spend</p>
            <p className="pb-1 text-[30px] font-semibold leading-none text-[#1a1204]">
              {money(spend)}
            </p>
          </div>

          {/* ROAS - gold */}
          <div
            style={GOLD_CARD}
            className="flex min-h-[96px] flex-col items-center justify-between rounded-xl border border-[#f6e2a1]/50 p-3"
          >
            <p className="text-[12px] font-medium text-[#6b4a0c]">Overall ROAS</p>
            <p className="pb-1 text-[30px] font-semibold leading-none text-[#1a1204]">{roas}x</p>
          </div>

          {/* Leads - silver */}
          <div
            style={SILVER_CARD}
            className="flex min-h-[96px] flex-col items-center justify-between rounded-xl border border-white/40 p-3 text-center"
          >
            <p className="text-[12px] font-medium leading-tight text-[#3a3f46]">
              Total Leads
              <br />
              Captured
            </p>
            <p className="pb-1 text-[32px] font-semibold leading-none text-[#22262b]">
              {leads.length}
            </p>
          </div>

          {/* Balance */}
          <div className={`${PANEL} flex min-h-[96px] flex-col justify-between p-3`}>
            <p className="text-[12px] font-medium text-zinc-200">Total Account Balance</p>
            <p className="pb-1 text-center text-[24px] font-semibold leading-none text-white">
              ${revenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* MIDDLE ROW */}
        <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[1.12fr_1fr]">
          <div className={`${PANEL} p-4`}>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-[13px] font-medium text-zinc-200">
                Multi-Campaign Performance Trend (Daily)
              </h3>
              <div className="flex gap-3 text-[10px] text-zinc-300">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#38bdf8]" /> Clicks
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#34d399]" /> Conversions
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#e5b93e]" /> CPA
                </span>
              </div>
            </div>
            <TrendChart />
          </div>

          <div className={`${PANEL} p-4`}>
            <h3 className="mb-1 text-[13px] font-medium text-zinc-200">Budget-to-ROAS Flow</h3>
            <Sankey />
          </div>
        </div>

        {/* BOTTOM ROW */}
        <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[1.6fr_1fr_1fr]">
          {/* Ad sets */}
          <div className={`${PANEL} p-4`}>
            <h3 className="mb-2 text-[13px] font-medium text-zinc-200">Top Performing Ad Sets</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px]">
                <thead className="border-b border-zinc-700/60 text-zinc-300">
                  <tr>
                    <th className="py-2 pr-2 font-medium">Campaign Name</th>
                    <th className="py-2 pr-2 font-medium">Platform</th>
                    <th className="py-2 pr-2 font-medium">CTR</th>
                    <th className="py-2 pr-2 font-medium">ROAS</th>
                    <th className="py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/70">
                  {rows.map((r, i) => (
                    <tr key={`${r.name}-${i}`}>
                      <td className="py-2.5 pr-2 text-zinc-100">{r.name}</td>
                      <td className="py-2.5 pr-2">
                        <PlatformIcon p={r.platform} />
                      </td>
                      <td className="py-2.5 pr-2 text-zinc-100">{r.ctr}</td>
                      <td className="py-2.5 pr-2 text-zinc-100">{r.roas}</td>
                      <td className="py-2.5">
                        <span className="flex items-center gap-1.5 text-zinc-100">
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              r.warn ? "bg-[#f59e0b]" : "bg-[#22c55e]"
                            }`}
                          />
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* AI feed */}
          <div className={`${PANEL} flex flex-col p-4`}>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-[13px] font-medium text-zinc-200">AI Optimization Feed</h3>
              <span className="text-[13px] leading-none tracking-widest text-zinc-400">···</span>
            </div>
            <div className="max-h-[150px] flex-1 space-y-3 overflow-y-auto pr-2">
              {FEED.map((f, i) => (
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
                  <div>
                    <p className="text-[11px] font-medium leading-tight text-zinc-100">{f.title}</p>
                    <p className="mt-0.5 text-[9.5px] text-zinc-500">{f.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Platform usage */}
          <div className={`${PANEL} flex flex-col justify-between p-4`}>
            <h3 className="text-[13px] font-medium text-zinc-200">Multi-platform budget usage</h3>
            <div className="flex items-start justify-around py-2">
              <div className="flex flex-col items-center gap-1.5">
                <Ring value={30} color="#d9a93f">
                  30%
                </Ring>
                <span className="text-[10px] text-zinc-300">Google</span>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <Ring value={65} color="#19c39a">
                  65%
                </Ring>
                <span className="text-[10px] text-zinc-300">Meta</span>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <Ring value={72} color="#22c5d8">
                  <FaTiktok className="h-4 w-4 text-white" />
                </Ring>
                <span className="text-[10px] text-zinc-300">TikTok</span>
              </div>
            </div>
            <button
              type="button"
              className="w-full rounded-md border border-[#9a7d3a]/70 bg-[#13161a] py-2.5 text-[11px] font-medium uppercase tracking-wide text-zinc-100 transition hover:bg-[#1a1e24]"
            >
              Launch New Initiative
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
