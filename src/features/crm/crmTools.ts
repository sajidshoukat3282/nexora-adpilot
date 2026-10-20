import { getDefaultCurrency } from "@/lib/companyDefaults";

/**
 * Pure helpers for the CRM extras (no UI, no network):
 * lead scoring, pipeline forecast, client health, renewal radar,
 * "Today's Focus", WhatsApp templates, duplicate detection and CSV export.
 */

/* ------------------------------------------------------------------ */
/* shared                                                              */
/* ------------------------------------------------------------------ */

export const todayIso = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const dayNumber = (iso: unknown): number | null => {
  const s = String(iso ?? "").slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  return Math.floor(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / 86400000);
};

/** whole days from `fromIso` to `toIso` (positive when `toIso` is later). null if unparsable. */
export const daysBetween = (fromIso: unknown, toIso: string): number | null => {
  const a = dayNumber(fromIso);
  const b = dayNumber(toIso);
  return a === null || b === null ? null : b - a;
};

export const money = (n: number, currency: string = getDefaultCurrency()): string =>
  `${currency} ${Math.round(Number(n) || 0).toLocaleString("en-US")}`;

export const moneyShort = (n: number): string => {
  const a = Math.abs(Number(n) || 0);
  const s = a >= 1e7 ? `${(a / 1e7).toFixed(1)}Cr` : a >= 1e5 ? `${(a / 1e5).toFixed(1)}L` : a >= 1e3 ? `${(a / 1e3).toFixed(0)}k` : `${Math.round(a)}`;
  return n < 0 ? `-${s}` : s;
};

export const leadValue = (l: any): number => Number(l?.estimated_value ?? l?.estimatedValue ?? 0) || 0;
export const leadName = (l: any): string => String(l?.company_name ?? l?.companyName ?? "Lead");
export const leadContact = (l: any): string => String(l?.contact_name ?? l?.contactName ?? "");

export const OPEN_STAGES = ["lead", "qualified", "proposal", "negotiation"];
export const isOpenLead = (l: any): boolean => OPEN_STAGES.includes(String(l?.stage));

export const STAGE_WEIGHT: Record<string, number> = {
  lead: 0.1,
  qualified: 0.25,
  proposal: 0.5,
  negotiation: 0.75,
  won: 1,
  lost: 0,
};

/* ------------------------------------------------------------------ */
/* follow-ups (from crm_activities)                                    */
/* ------------------------------------------------------------------ */

export interface CrmActivity {
  id: string;
  entity_type: "lead" | "client";
  entity_id: string;
  kind: string;
  note: string | null;
  follow_up_date: string | null;
  done: number;
  created_at: string;
}

/** earliest open follow-up date per entity id */
export function nextFollowUps(activities: CrmActivity[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const a of activities) {
    if (!a.follow_up_date || a.done) continue;
    const d = String(a.follow_up_date).slice(0, 10);
    if (!out[a.entity_id] || d < out[a.entity_id]) out[a.entity_id] = d;
  }
  return out;
}

export type FollowUpState = "overdue" | "today" | "upcoming" | "none";

export function followUpState(date: string | undefined, today: string): FollowUpState {
  if (!date) return "none";
  const diff = daysBetween(today, date);
  if (diff === null) return "none";
  return diff < 0 ? "overdue" : diff === 0 ? "today" : "upcoming";
}

/* ------------------------------------------------------------------ */
/* lead scoring                                                        */
/* ------------------------------------------------------------------ */

export type LeadTier = "hot" | "warm" | "cold" | "closed";

export interface LeadScore {
  score: number;
  tier: LeadTier;
  reasons: string[];
}

const STAGE_POINTS: Record<string, number> = { lead: 10, qualified: 25, proposal: 40, negotiation: 55 };
const SOURCE_POINTS: Record<string, number> = { referral: 10, event: 8, "event / trade show": 8, website: 6, "cold call": 3 };

export function daysSinceTouch(lead: any, today: string): number | null {
  return daysBetween(lead?.updated_at || lead?.created_at, today);
}

export const isStaleLead = (lead: any, today: string, days = 14): boolean => {
  if (!isOpenLead(lead)) return false;
  const d = daysSinceTouch(lead, today);
  return d !== null && d >= days;
};

export function scoreLead(lead: any, followUp: string | undefined, today: string): LeadScore {
  const stage = String(lead?.stage);
  if (!isOpenLead(lead)) return { score: stage === "won" ? 100 : 0, tier: "closed", reasons: [] };

  const reasons: string[] = [];
  let score = STAGE_POINTS[stage] ?? 10;
  if (stage === "negotiation" || stage === "proposal") reasons.push(`Advanced stage (${stage})`);

  const value = leadValue(lead);
  if (value > 0) {
    const pts = Math.min(20, Math.round(Math.log10(value + 1) * 3));
    score += pts;
    if (value >= 500000) reasons.push("High deal value");
  }

  const src = SOURCE_POINTS[String(lead?.source ?? "").toLowerCase()] ?? 4;
  score += src;
  if (src >= 8) reasons.push(`Strong source (${lead.source})`);

  const idle = daysSinceTouch(lead, today);
  if (idle !== null) {
    if (idle <= 7) { score += 10; reasons.push("Recent activity"); }
    else if (idle <= 14) score += 4;
    else { score -= 10; reasons.push(`No movement for ${idle} days`); }
  }

  const fs = followUpState(followUp, today);
  if (fs === "upcoming" || fs === "today") { score += 5; reasons.push("Follow-up scheduled"); }
  if (fs === "overdue") { score -= 5; reasons.push("Follow-up overdue"); }

  score = Math.max(0, Math.min(100, score));
  return { score, tier: score >= 65 ? "hot" : score >= 40 ? "warm" : "cold", reasons };
}

/* ------------------------------------------------------------------ */
/* pipeline stats                                                      */
/* ------------------------------------------------------------------ */

export interface PipelineStats {
  openCount: number;
  openValue: number;
  weighted: number;
  won: number;
  lost: number;
  winRate: number | null;
  newThisMonth: number;
  byStage: Record<string, { count: number; value: number; weighted: number }>;
}

export function pipelineStats(leads: any[], today: string): PipelineStats {
  const byStage: PipelineStats["byStage"] = {};
  for (const s of Object.keys(STAGE_WEIGHT)) byStage[s] = { count: 0, value: 0, weighted: 0 };
  let openCount = 0, openValue = 0, weighted = 0, won = 0, lost = 0, newThisMonth = 0;
  const month = today.slice(0, 7);
  for (const l of leads) {
    const stage = String(l.stage);
    const v = leadValue(l);
    const bucket = byStage[stage] ?? (byStage[stage] = { count: 0, value: 0, weighted: 0 });
    bucket.count += 1;
    bucket.value += v;
    bucket.weighted += v * (STAGE_WEIGHT[stage] ?? 0);
    if (isOpenLead(l)) { openCount++; openValue += v; weighted += v * (STAGE_WEIGHT[stage] ?? 0); }
    if (stage === "won") won++;
    if (stage === "lost") lost++;
    if (String(l.created_at ?? "").slice(0, 7) === month) newThisMonth++;
  }
  return { openCount, openValue, weighted, won, lost, winRate: won + lost > 0 ? (won / (won + lost)) * 100 : null, newThisMonth, byStage };
}

export interface SourceStat { source: string; total: number; won: number; lost: number; open: number; value: number; conversion: number | null }

export function sourceStats(leads: any[]): SourceStat[] {
  const map = new Map<string, SourceStat>();
  for (const l of leads) {
    const source = String(l.source || "Unknown");
    const row = map.get(source) ?? { source, total: 0, won: 0, lost: 0, open: 0, value: 0, conversion: null };
    row.total++;
    if (l.stage === "won") row.won++;
    else if (l.stage === "lost") row.lost++;
    else row.open++;
    row.value += leadValue(l);
    map.set(source, row);
  }
  const rows = [...map.values()];
  for (const r of rows) r.conversion = r.won + r.lost > 0 ? (r.won / (r.won + r.lost)) * 100 : null;
  return rows.sort((a, b) => b.total - a.total);
}

/* ------------------------------------------------------------------ */
/* client finance + health                                             */
/* ------------------------------------------------------------------ */

export type ClientHealth = "good" | "watch" | "at_risk";

export interface ClientFinance {
  invoiced: number;
  paid: number;
  outstanding: number;
  overdue: number;
  maxOverdueDays: number;
  invoiceCount: number;
  creditLimit: number;
  creditUsedPct: number | null;
  activeCampaigns: number;
  campaignCount: number;
  health: ClientHealth;
  healthReasons: string[];
}

export function clientFinance(client: any, invoices: any[], campaigns: any[], today: string): ClientFinance {
  const mine = invoices.filter((i) => i.client_id === client.id && i.status !== "cancelled" && i.status !== "draft");
  let invoiced = 0, paid = 0, outstanding = 0, overdue = 0, maxOverdueDays = 0;
  for (const i of mine) {
    const total = Number(i.total_amount) || 0;
    const p = Number(i.amount_paid) || 0;
    const bal = Math.max(0, total - p);
    invoiced += total;
    paid += p;
    outstanding += bal;
    if (bal > 0 && i.due_date) {
      const late = daysBetween(i.due_date, today);
      if (late !== null && late > 0) { overdue += bal; maxOverdueDays = Math.max(maxOverdueDays, late); }
    }
  }
  const creditLimit = Number(client.credit_limit) || 0;
  const creditUsedPct = creditLimit > 0 ? (outstanding / creditLimit) * 100 : null;
  const camps = campaigns.filter((c) => c.client_id === client.id);
  const activeCampaigns = camps.filter((c) => ["live", "booked", "scheduled", "active"].includes(String(c.status))).length;

  const reasons: string[] = [];
  let health: ClientHealth = "good";
  if (overdue > 0) {
    health = maxOverdueDays > 30 ? "at_risk" : "watch";
    reasons.push(`${money(overdue)} overdue (${maxOverdueDays} days)`);
  }
  if (creditUsedPct !== null) {
    if (creditUsedPct >= 100) { health = "at_risk"; reasons.push("Credit limit exceeded"); }
    else if (creditUsedPct >= 80) { if (health === "good") health = "watch"; reasons.push(`${Math.round(creditUsedPct)}% of credit used`); }
  }
  return { invoiced, paid, outstanding, overdue, maxOverdueDays, invoiceCount: mine.length, creditLimit, creditUsedPct, activeCampaigns, campaignCount: camps.length, health, healthReasons: reasons };
}

/* ------------------------------------------------------------------ */
/* renewal radar                                                       */
/* ------------------------------------------------------------------ */

export interface RenewalItem {
  clientId: string;
  clientName: string;
  campaignId: string;
  campaignName: string;
  endDate: string;
  daysLeft: number;
  budget: number;
  currency: string;
}

/** campaigns that ended up to `lookBack` days ago or end within `window` days */
export function renewalRadar(campaigns: any[], today: string, window = 30, lookBack = 14): RenewalItem[] {
  const out: RenewalItem[] = [];
  for (const c of campaigns) {
    if (["draft", "cancelled", "canceled"].includes(String(c.status))) continue;
    const left = daysBetween(today, String(c.end_date ?? ""));
    if (left === null || left > window || left < -lookBack) continue;
    out.push({
      clientId: String(c.client_id), clientName: String(c.client_name ?? ""), campaignId: String(c.id),
      campaignName: String(c.name ?? "Campaign"), endDate: String(c.end_date).slice(0, 10), daysLeft: left,
      budget: Number(c.total_budget) || 0, currency: String(c.currency || getDefaultCurrency()),
    });
  }
  return out.sort((a, b) => a.daysLeft - b.daysLeft);
}

/* ------------------------------------------------------------------ */
/* WhatsApp templates                                                  */
/* ------------------------------------------------------------------ */

export type TemplateKey = "followUp" | "proposalSent" | "thanks" | "paymentReminder" | "renewal";

export const TEMPLATE_LABELS: Record<TemplateKey, string> = {
  followUp: "Follow-up",
  proposalSent: "Proposal sent",
  thanks: "Thank you",
  paymentReminder: "Payment reminder",
  renewal: "Renewal offer",
};

export interface TemplateVars { name?: string; company?: string; campaign?: string; amount?: string; date?: string; sender?: string }

export function buildTemplate(key: TemplateKey, v: TemplateVars): string {
  const name = v.name || "there";
  const sender = v.sender || "our team";
  switch (key) {
    case "followUp":
      return `Hello ${name},\n\nI hope you are doing well. I wanted to follow up on our recent conversation about your advertising campaign. Do you have time for a quick call this week?\n\nBest regards,\n${sender}`;
    case "proposalSent":
      return `Hello ${name},\n\nWe have shared our proposal${v.company ? ` for ${v.company}` : ""}. Please review it and let us know if you have any questions or would like any changes.\n\nBest regards,\n${sender}`;
    case "thanks":
      return `Hello ${name},\n\nThank you for choosing us${v.campaign ? ` for "${v.campaign}"` : ""}. It was a pleasure working with you, and we look forward to supporting your next campaign.\n\nBest regards,\n${sender}`;
    case "paymentReminder":
      return `Hello ${name},\n\nThis is a friendly reminder that ${v.amount ? `a payment of ${v.amount}` : "a payment"} is still outstanding${v.date ? ` (due ${v.date})` : ""}. Please arrange it at your earliest convenience. If you have already paid, kindly ignore this message.\n\nThank you,\n${sender}`;
    case "renewal":
      return `Hello ${name},\n\nYour ${v.campaign ? `"${v.campaign}" ` : ""}campaign ends ${v.date ? `on ${v.date}` : "soon"}. Would you like to renew on the same locations or discuss a new plan? We can arrange great rates for you.\n\nBest regards,\n${sender}`;
  }
}

/* ------------------------------------------------------------------ */
/* duplicate detection                                                 */
/* ------------------------------------------------------------------ */

const normName = (s: unknown): string => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\b(pvt|private|ltd|limited|llc|inc|co|company|the)\b/g, " ").replace(/\s+/g, " ").trim();
const digits = (s: unknown): string => String(s ?? "").replace(/[^\d]/g, "");

export interface DuplicateMatch { id: string; name: string; reason: string }

export function findDuplicates(
  candidate: { name?: string; phone?: string; email?: string },
  existing: { id: string; name: string; phone?: string | null; email?: string | null }[],
): DuplicateMatch[] {
  const n = normName(candidate.name);
  const p = digits(candidate.phone);
  const e = String(candidate.email ?? "").trim().toLowerCase();
  const out: DuplicateMatch[] = [];
  for (const x of existing) {
    const xn = normName(x.name);
    let reason = "";
    if (n.length >= 3 && xn && (xn === n || (n.length >= 5 && (xn.includes(n) || n.includes(xn))))) reason = "Same name";
    else if (p.length >= 9 && digits(x.phone).length >= 9 && digits(x.phone).slice(-9) === p.slice(-9)) reason = "Same phone";
    else if (e && String(x.email ?? "").trim().toLowerCase() === e) reason = "Same email";
    if (reason) out.push({ id: x.id, name: x.name, reason });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* CSV                                                                 */
/* ------------------------------------------------------------------ */

const csvCell = (v: unknown): string => {
  let s = String(v ?? "");
  if (/^[=+\-@]/.test(s)) s = `'${s}`; // avoid spreadsheet formula injection
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCsv(rows: Record<string, unknown>[], columns: { key: string; label: string }[]): string {
  const head = columns.map((c) => csvCell(c.label)).join(",");
  const body = rows.map((r) => columns.map((c) => csvCell(r[c.key])).join(","));
  return [head, ...body].join("\r\n");
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ------------------------------------------------------------------ */
/* Today's Focus                                                       */
/* ------------------------------------------------------------------ */

export type FocusKind = "followup" | "hot_stale" | "payment" | "credit" | "renewal";

export interface FocusItem {
  key: string;
  kind: FocusKind;
  severity: 1 | 2 | 3; // 3 = most urgent
  title: string;
  detail: string;
  target: { type: "lead" | "client"; id: string };
  phone?: string;
  template?: TemplateKey;
  templateVars?: TemplateVars;
}

export function buildFocus(
  leads: any[],
  clients: any[],
  activities: CrmActivity[],
  invoices: any[],
  campaigns: any[],
  today: string,
): FocusItem[] {
  const items: FocusItem[] = [];
  const follow = nextFollowUps(activities);
  const leadById = new Map(leads.map((l) => [String(l.id), l]));
  const clientById = new Map(clients.map((c) => [String(c.id), c]));

  // 1. follow-ups due today or overdue
  for (const a of activities) {
    if (a.done || !a.follow_up_date) continue;
    const state = followUpState(String(a.follow_up_date).slice(0, 10), today);
    if (state !== "overdue" && state !== "today") continue;
    const ent: any = a.entity_type === "lead" ? leadById.get(a.entity_id) : clientById.get(a.entity_id);
    if (!ent) continue;
    const name = a.entity_type === "lead" ? leadName(ent) : String(ent.name);
    items.push({
      key: `fu-${a.id}`, kind: "followup", severity: state === "overdue" ? 3 : 2,
      title: `Follow up: ${name}`,
      detail: `${state === "overdue" ? "Overdue since" : "Due"} ${String(a.follow_up_date).slice(0, 10)}${a.note ? ` · ${a.note}` : ""}`,
      target: { type: a.entity_type, id: a.entity_id }, phone: ent.phone, template: "followUp",
      templateVars: { name: a.entity_type === "lead" ? leadContact(ent) || name : name, company: name },
    });
  }

  // 2. hot leads gone quiet
  for (const l of leads) {
    if (!isOpenLead(l) || !isStaleLead(l, today, 10)) continue;
    const sc = scoreLead(l, follow[String(l.id)], today);
    const staleIdeal = leadValue(l) >= 300000 || ["proposal", "negotiation"].includes(String(l.stage));
    if (!staleIdeal) continue;
    items.push({
      key: `stale-${l.id}`, kind: "hot_stale", severity: 2,
      title: `Reconnect: ${leadName(l)}`,
      detail: `${l.stage} stage · quiet for ${daysSinceTouch(l, today)} days · ${money(leadValue(l))}`,
      target: { type: "lead", id: String(l.id) }, phone: l.phone, template: "followUp",
      templateVars: { name: leadContact(l) || leadName(l), company: leadName(l) },
    });
    void sc;
  }

  // 3 + 4. payments and credit
  for (const c of clients) {
    const f = clientFinance(c, invoices, campaigns, today);
    if (f.overdue > 0) {
      items.push({
        key: `pay-${c.id}`, kind: "payment", severity: f.maxOverdueDays > 30 ? 3 : 2,
        title: `Chase payment: ${c.name}`,
        detail: `${money(f.overdue)} overdue · ${f.maxOverdueDays} days`,
        target: { type: "client", id: String(c.id) }, phone: c.phone, template: "paymentReminder",
        templateVars: { name: c.name, amount: money(f.overdue) },
      });
    }
    if (f.creditUsedPct !== null && f.creditUsedPct >= 80) {
      items.push({
        key: `credit-${c.id}`, kind: "credit", severity: f.creditUsedPct >= 100 ? 3 : 1,
        title: `Credit alert: ${c.name}`,
        detail: `${Math.round(f.creditUsedPct)}% of ${money(f.creditLimit)} limit used`,
        target: { type: "client", id: String(c.id) },
      });
    }
  }

  // 5. renewals within 14 days
  for (const r of renewalRadar(campaigns, today, 14, 0)) {
    const c: any = clientById.get(r.clientId);
    items.push({
      key: `renew-${r.campaignId}`, kind: "renewal", severity: r.daysLeft <= 7 ? 2 : 1,
      title: `Renewal: ${r.clientName}`,
      detail: `"${r.campaignName}" ends in ${r.daysLeft} day${r.daysLeft === 1 ? "" : "s"}`,
      target: { type: "client", id: r.clientId }, phone: c?.phone, template: "renewal",
      templateVars: { name: r.clientName, campaign: r.campaignName, date: r.endDate },
    });
  }

  return items.sort((a, b) => b.severity - a.severity);
}
