import type { ClientRisk, RiskLevel } from "@/lib/api/credit";

export const LEVEL_LABEL: Record<RiskLevel, string> = { none: "No history", low: "Low", watch: "Watch", high: "High", critical: "Critical" };

export const levelTone = (l: RiskLevel): { cls: string; dot: string; bar: string; hex: string } => {
  if (l === "critical") return { cls: "text-rose-300 bg-rose-400/10 border-rose-400/30", dot: "bg-rose-400", bar: "bg-rose-500", hex: "#f43f5e" };
  if (l === "high") return { cls: "text-orange-300 bg-orange-400/10 border-orange-400/30", dot: "bg-orange-400", bar: "bg-orange-500", hex: "#fb923c" };
  if (l === "watch") return { cls: "text-amber-300 bg-amber-400/10 border-amber-400/30", dot: "bg-amber-400", bar: "bg-amber-500", hex: "#fbbf24" };
  if (l === "low") return { cls: "text-emerald-300 bg-emerald-400/10 border-emerald-400/30", dot: "bg-emerald-400", bar: "bg-emerald-500", hex: "#34d399" };
  return { cls: "text-zinc-300 bg-zinc-400/10 border-zinc-400/30", dot: "bg-zinc-400", bar: "bg-zinc-500", hex: "#a1a1aa" };
};

export const fmtMoney = (n: number, cur: string): string => `${cur} ${Math.round(Number(n) || 0).toLocaleString("en-US")}`;

export const phoneDigits = (p?: string | null): string => String(p ?? "").replace(/[^0-9]/g, "");

export function reminderText(c: ClientRisk, company: string): string {
  return [
    `Dear ${c.name},`,
    `This is a friendly reminder from ${company}.`,
    c.overdue > 0
      ? `Your account has ${fmtMoney(c.overdue, c.currency)} overdue (oldest ${c.oldest_overdue_days} days). Please arrange payment at your earliest convenience.`
      : `Your outstanding balance is ${fmtMoney(c.outstanding, c.currency)}.`,
    "Please ignore this message if you have already paid. Thank you.",
  ].join("\n");
}

/** One plain sentence on why a client has this level. */
export function reasons(c: ClientRisk): string[] {
  const out: string[] = [];
  if (c.on_hold) out.push(`Booking hold is on${c.hold_reason ? `: ${c.hold_reason}` : ""}`);
  if (c.credit_limit > 0 && c.utilization >= 100) out.push(`Over the credit limit (${c.utilization}% used)`);
  else if (c.credit_limit > 0 && c.utilization >= 80) out.push(`${c.utilization}% of the credit limit is used`);
  if (c.credit_limit === 0 && c.exposure > 0) out.push("Exposure exists but no credit limit is set");
  if (c.oldest_overdue_days > 0) out.push(`Oldest overdue invoice is ${c.oldest_overdue_days} days late`);
  if (c.on_time_pct != null && c.on_time_pct < 60) out.push(`Only ${c.on_time_pct}% of invoices were paid on time`);
  if (c.avg_delay_days != null && c.avg_delay_days > 15) out.push(`Pays ${Math.round(c.avg_delay_days)} days late on average`);
  if (!out.length) out.push("No warning signs");
  return out;
}
