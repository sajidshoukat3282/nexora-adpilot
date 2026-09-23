import type { ID, Timestamps, TenantScoped, Money } from "./shared";

export type CampaignStatus =
  | "draft"
  | "proposal"
  | "pending_approval"
  | "approved"
  | "booked"
  | "scheduled"
  | "live"
  | "completed"
  | "reported"
  | "invoiced"
  | "paid"
  | "archived"
  | "cancelled";

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: "Draft",
  proposal: "Proposal",
  pending_approval: "Pending Approval",
  approved: "Approved",
  booked: "Booked",
  scheduled: "Scheduled",
  live: "Live",
  completed: "Completed",
  reported: "Reported",
  invoiced: "Invoiced",
  paid: "Paid",
  archived: "Archived",
  cancelled: "Cancelled",
};

/**
 * Centralized state machine. Cancelled is reachable from any non-terminal
 * state; every other transition must follow this map exactly. UI code must
 * call `canTransitionCampaign` rather than mutating status strings directly.
 */
export const CAMPAIGN_TRANSITIONS: Record<CampaignStatus, CampaignStatus[]> = {
  draft: ["proposal", "cancelled"],
  proposal: ["pending_approval", "draft", "cancelled"],
  pending_approval: ["approved", "booked", "proposal", "cancelled"],
  approved: ["booked", "cancelled"],
  booked: ["scheduled", "cancelled"],
  scheduled: ["live", "cancelled"],
  live: ["completed", "cancelled"],
  completed: ["reported", "archived"],
  reported: ["invoiced", "archived"],
  invoiced: ["paid", "archived"],
  paid: ["archived"],
  archived: [],
  cancelled: [],
};

export function canTransitionCampaign(from: CampaignStatus, to: CampaignStatus): boolean {
  return CAMPAIGN_TRANSITIONS[from]?.includes(to) ?? false;
}

export function transitionCampaignStatus(
  from: CampaignStatus,
  to: CampaignStatus,
): { from: CampaignStatus; to: CampaignStatus; event: CampaignWorkflowEvent } {
  if (!canTransitionCampaign(from, to)) {
    throw new Error(`Invalid campaign transition: ${from} -> ${to}`);
  }
  return { from, to, event: campaignStatusEvent(to) };
}

export type CampaignObjective =
  | "brand_awareness"
  | "product_launch"
  | "foot_traffic"
  | "event_promotion"
  | "always_on";

export const OBJECTIVE_LABELS: Record<CampaignObjective, string> = {
  brand_awareness: "Brand Awareness",
  product_launch: "Product Launch",
  foot_traffic: "Foot Traffic",
  event_promotion: "Event Promotion",
  always_on: "Always-On",
};

export interface CampaignSchedule {
  startDate: string;
  endDate: string;
  daysOfWeek: number[]; // 0=Sun..6=Sat
  operatingHours: { start: string; end: string }; // "08:00".."22:00"
  spotDurationSec: number;
  loopPosition: number | null;
  dayparts: string[]; // e.g. ["morning_commute","evening_commute"]
}

export interface CampaignTargeting {
  locations: string[]; // city/area names
  radiusKm: number | null;
  audience: string[];
  weatherTriggered: boolean;
  eventTriggered: boolean;
}

export interface CampaignBudget {
  inventoryCost: Money;
  creativeFees: Money;
  additionalFees: Money;
  discount: Money;
  total: Money;
  estimatedCpmCents: number;
}

export type CampaignWorkflowEvent =
  | "created"
  | "status_changed"
  | "proposal_linked"
  | "approval_recorded"
  | "booking_confirmed"
  | "report_generated"
  | "invoice_issued"
  | "payment_recorded"
  | "cancelled";

export interface CampaignStatusHistoryEntry extends Timestamps {
  id: ID;
  campaignId: ID;
  companyId: ID;
  from: CampaignStatus | null;
  to: CampaignStatus;
  event: CampaignWorkflowEvent;
  actorUserId: ID;
  actorName: string;
  reason: string | null;
  metadata: Record<string, string | number | boolean | null>;
}

export interface CampaignWorkflowContext {
  actorUserId: ID;
  actorName: string;
  reason?: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export function campaignStatusEvent(to: CampaignStatus): CampaignWorkflowEvent {
  switch (to) {
    case "booked": return "booking_confirmed";
    case "reported": return "report_generated";
    case "invoiced": return "invoice_issued";
    case "paid": return "payment_recorded";
    case "cancelled": return "cancelled";
    default: return "status_changed";
  }
}

export interface Campaign extends Timestamps, TenantScoped {
  id: ID;
  code: string; // e.g. "CMP-1042"
  name: string;
  clientId: ID;
  brand: string;
  objective: CampaignObjective;
  status: CampaignStatus;
  schedule: CampaignSchedule;
  targeting: CampaignTargeting;
  budget: CampaignBudget;
  assetIds: ID[];
  creativeIds: ID[];
  ownerUserId: ID;
  /** Optional cross-module references; populated as workflow modules become active. */
  proposalId?: ID;
  reportIds?: ID[];
  invoiceIds?: ID[];
  completedAt?: string;
  reportedAt?: string;
  invoicedAt?: string;
  paidAt?: string;
}

export interface ActivityLogEntry extends Timestamps {
  id: ID;
  companyId: ID;
  entityType: "campaign" | "creative" | "proposal" | "invoice" | "license" | "device" | "user" | "operations";
  entityId: ID;
  action: string; // e.g. "status_changed", "approved", "override_published"
  actorUserId: ID;
  actorName: string;
  detail: string;
}
