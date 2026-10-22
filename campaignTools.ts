import type {
  CampaignBundle,
  CampaignExpense,
  CampaignInvoice,
  CampaignRow,
  CampaignScreen,
} from "@/lib/api/campaigns";

export const todayIso = (): string => new Date().toISOString().slice(0, 10);

const dayNum = (iso: string): number => Math.floor(new Date(String(iso).slice(0, 10) + "T00:00:00Z").getTime() / 86400000);

/** Whole days from a to b (b later = positive). */
export const diffDays = (a: string, b: string): number => dayNum(b) - dayNum(a);

/** Inclusive number of days in a campaign (start and end day both count). */
export const campaignDays = (start: string, end: string): number => Math.max(1, diffDays(start, end) + 1);

export function addDaysIso(iso: string, days: number): string {
  const d = new Date(String(iso).slice(0, 10) + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  booked: "Booked",
  live: "Live",
  completed: "Completed",
  cancelled: "Cancelled",
};
export const statusLabel = (s: string): string => STATUS_LABEL[s] ?? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");

export const STATUS_ACTION: Record<string, string> = {
  booked: "Confirm booking",
  live: "Go live",
  completed: "Mark completed",
  cancelled: "Cancel campaign",
  draft: "Move back to draft",
};

export const statusTone = (s: string): { cls: string; dot: string } => {
  if (s === "live") return { cls: "text-emerald-300 bg-emerald-400/10 border-emerald-400/30", dot: "bg-emerald-400" };
  if (s === "booked") return { cls: "text-sky-300 bg-sky-400/10 border-sky-400/30", dot: "bg-sky-400" };
  if (s === "completed") return { cls: "text-zinc-300 bg-zinc-400/10 border-zinc-400/30", dot: "bg-zinc-400" };
  if (s === "cancelled") return { cls: "text-rose-300 bg-rose-400/10 border-rose-400/30", dot: "bg-rose-400" };
  return { cls: "text-amber-300 bg-amber-400/10 border-amber-400/30", dot: "bg-amber-400" };
};

export interface CampaignTiming {
  totalDays: number;
  elapsedDays: number;
  daysLeft: number; // negative once ended
  progress: number; // 0..100
  phase: "upcoming" | "running" | "ended";
  startsIn: number;
}

export function timing(start: string, end: string, today = todayIso()): CampaignTiming {
  const totalDays = campaignDays(start, end);
  const sinceStart = diffDays(start, today);
  const phase = today < start ? "upcoming" : today > end ? "ended" : "running";
  const elapsedDays = phase === "upcoming" ? 0 : phase === "ended" ? totalDays : sinceStart + 1;
  return {
    totalDays,
    elapsedDays,
    daysLeft: diffDays(today, end),
    progress: Math.round((elapsedDays / totalDays) * 100),
    phase,
    startsIn: diffDays(today, start),
  };
}

export const screenSubtotal = (rate: number, start: string, end: string): number => (Number(rate) || 0) * campaignDays(start, end);

export interface CampaignMoney {
  contract: number;
  invoiced: number;
  received: number;
  outstanding: number;
  expenses: number;
  /** received - campaign expenses */
  profitSoFar: number;
  /** contract value - campaign expenses */
  expectedProfit: number;
  screensTotal: number;
}

export function campaignMoney(
  contract: number,
  invoices: CampaignInvoice[],
  expenses: CampaignExpense[],
  screens: CampaignScreen[],
  start: string,
  end: string,
): CampaignMoney {
  const live = invoices.filter((i) => i.status !== "cancelled" && i.status !== "void");
  const invoiced = live.reduce((a, i) => a + (Number(i.total_amount) || 0), 0);
  const received = live.reduce((a, i) => a + (Number(i.amount_paid) || 0), 0);
  const exp = expenses.reduce((a, e) => a + (Number(e.amount) || 0), 0);
  const screensTotal = screens.reduce((a, s) => a + screenSubtotal(s.rate_applied, start, end), 0);
  return {
    contract: Number(contract) || 0,
    invoiced,
    received,
    outstanding: Math.max(0, invoiced - received),
    expenses: exp,
    profitSoFar: received - exp,
    expectedProfit: (Number(contract) || 0) - exp,
    screensTotal,
  };
}

export interface CampaignAlert {
  level: "warn" | "bad" | "info";
  text: string;
}

export function campaignAlerts(
  c: { status: string; start_date: string; end_date: string },
  m: CampaignMoney,
  invoiceCount: number,
  screenCount: number,
  today = todayIso(),
): CampaignAlert[] {
  const out: CampaignAlert[] = [];
  if (c.status === "cancelled") return out;
  const t = timing(c.start_date, c.end_date, today);
  if (screenCount === 0) out.push({ level: "warn", text: "No screens added yet." });
  if (c.status === "live" && t.phase === "running" && t.daysLeft <= 7) {
    out.push({ level: "warn", text: `Ends in ${t.daysLeft} day${t.daysLeft === 1 ? "" : "s"}. Offer the client a renewal.` });
  }
  if (c.status === "live" && t.phase === "ended") out.push({ level: "warn", text: "The end date has passed. Mark it as completed." });
  if (c.status === "booked" && t.phase !== "upcoming") out.push({ level: "warn", text: "Start date reached. Move this campaign to Live." });
  if (c.status !== "draft" && invoiceCount === 0) out.push({ level: "bad", text: "No invoice created for this campaign yet." });
  if (m.outstanding > 0) out.push({ level: "bad", text: "Payment pending on its invoices." });
  return out;
}

/** The list-page badge for "ending soon": live and 7 days or fewer left. */
export const endingSoon = (c: CampaignRow, today = todayIso()): boolean => {
  if (c.status !== "live") return false;
  const left = diffDays(today, c.end_date);
  return left >= 0 && left <= 7;
};

export function summaryText(
  b: CampaignBundle,
  companyName: string,
  fmt: (n: number) => string,
): string {
  const c = b.campaign;
  const t = timing(c.start_date, c.end_date);
  const lines = [
    `*${companyName}*`,
    `Campaign summary: ${c.name}`,
    `Client: ${c.client_name ?? "-"}`,
    `Period: ${c.start_date} to ${c.end_date} (${t.totalDays} days)`,
    `Status: ${statusLabel(c.status)}`,
    `Screens (${b.screens.length}):`,
    ...b.screens.map((s) => `- ${s.name ?? "Screen"}${s.city ? `, ${s.city}` : ""}`),
    `Total value: ${fmt(Number(c.total_budget) || 0)}`,
  ];
  return lines.join("\n");
}

export const phoneDigits = (p?: string | null): string => String(p ?? "").replace(/[^0-9]/g, "");
