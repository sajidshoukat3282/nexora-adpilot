import type { ID, Timestamps, TenantScoped } from "./shared";

export type LeadStage = "lead" | "qualified" | "proposal" | "negotiation" | "won" | "lost";

export const LEAD_STAGE_LABELS: Record<LeadStage, string> = {
  lead: "Lead",
  qualified: "Qualified",
  proposal: "Proposal",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
};

export const LEAD_TRANSITIONS: Record<LeadStage, LeadStage[]> = {
  lead: ["qualified", "lost"],
  qualified: ["proposal", "lost"],
  proposal: ["negotiation", "lost"],
  negotiation: ["won", "lost"],
  won: [],
  lost: ["lead"],
};

export interface Contact extends Timestamps {
  id: ID;
  clientId: ID;
  name: string;
  title: string;
  email: string;
  phone: string;
  primary: boolean;
}

export interface Client extends Timestamps, TenantScoped {
  id: ID;
  name: string;
  industry: string;
  logoInitial: string;
  contactIds: ID[];
  isPortalEnabled: boolean;
}

export interface Lead extends Timestamps, TenantScoped {
  id: ID;
  companyName: string;
  contactName: string;
  contactEmail: string;
  stage: LeadStage;
  estimatedValue: number; // cents
  source: string;
  ownerUserId: ID;
  clientIdIfWon: ID | null;
}

/** Sales qualification outcome used before an opportunity enters proposal work. */
export type LeadQualificationStatus = "unqualified" | "qualified" | "disqualified";

/** Commercial opportunity linked to a lead/client and owned by a tenant member. */
export interface Opportunity extends Timestamps, TenantScoped {
  id: ID;
  leadId: ID | null;
  clientId: ID | null;
  name: string;
  stage: OpportunityStage;
  qualification: LeadQualificationStatus;
  ownerUserId: ID;
  estimatedValue: number;
  currencyCode: string;
  expectedCloseDate: string | null;
  probabilityPct: number;
  lostReason: string | null;
}

export type OpportunityStage =
  | "qualification"
  | "discovery"
  | "proposal"
  | "negotiation"
  | "won"
  | "lost";

export const OPPORTUNITY_TRANSITIONS: Record<OpportunityStage, OpportunityStage[]> = {
  qualification: ["discovery", "lost"],
  discovery: ["proposal", "lost"],
  proposal: ["negotiation", "won", "lost"],
  negotiation: ["won", "lost"],
  won: [],
  lost: ["qualification"],
};

export interface LeadQualification {
  status: LeadQualificationStatus;
  qualifiedAt: string | null;
  qualifiedByUserId: ID | null;
  notes: string;
  nextActionAt: string | null;
}

/** Canonical CRM pipeline order. Proposal creation remains a separate domain operation. */
export const CRM_PIPELINE = [
  "lead",
  "qualified",
  "client",
  "opportunity",
  "proposal",
  "won",
  "lost",
] as const;

export function isValidLeadTransition(current: LeadStage, next: LeadStage): boolean {
  return LEAD_TRANSITIONS[current].includes(next);
}

export function isValidOpportunityTransition(
  current: OpportunityStage,
  next: OpportunityStage,
): boolean {
  return OPPORTUNITY_TRANSITIONS[current].includes(next);
}

export function normalizeProbabilityPct(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}
