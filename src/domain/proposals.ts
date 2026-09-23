import type { ID, Timestamps, TenantScoped, Money } from "./shared";

export type ProposalStatus = "draft" | "preview" | "sent" | "client_review" | "accepted" | "rejected" | "changes_requested";

export const PROPOSAL_STATUS_LABELS: Record<ProposalStatus, string> = {
  draft: "Draft",
  preview: "Preview",
  sent: "Sent",
  client_review: "Client Review",
  accepted: "Accepted",
  rejected: "Rejected",
  changes_requested: "Changes Requested",
};

export const PROPOSAL_TRANSITIONS: Record<ProposalStatus, ProposalStatus[]> = {
  draft: ["preview"],
  preview: ["sent", "draft"],
  sent: ["client_review"],
  client_review: ["accepted", "rejected", "changes_requested"],
  accepted: [],
  rejected: [],
  changes_requested: ["draft"],
};

export interface ProposalItem {
  id: ID;
  assetId: ID;
  description: string;
  days: number;
  unitPriceCents: number;
  totalCents: number;
}

export interface Proposal extends Timestamps, TenantScoped {
  id: ID;
  code: string;
  clientId: ID;
  campaignName: string;
  status: ProposalStatus;
  startDate: string;
  endDate: string;
  items: ProposalItem[];
  discountPct: number;
  estimatedImpressions: number;
  total: Money;
  ownerUserId: ID;
}
