import type { ID, Timestamps, TenantScoped } from "./shared";

export type CreativeFormat = "jpg" | "png" | "mp4";

export type CreativeStatus = "draft" | "internal_review" | "client_review" | "approved" | "rejected";

export const CREATIVE_STATUS_LABELS: Record<CreativeStatus, string> = {
  draft: "Draft",
  internal_review: "Internal Review",
  client_review: "Client Review",
  approved: "Approved",
  rejected: "Rejected",
};

export const CREATIVE_TRANSITIONS: Record<CreativeStatus, CreativeStatus[]> = {
  draft: ["internal_review"],
  internal_review: ["client_review", "rejected", "draft"],
  client_review: ["approved", "rejected", "internal_review"],
  approved: [],
  rejected: ["draft"],
};

export function canTransitionCreative(from: CreativeStatus, to: CreativeStatus): boolean {
  return CREATIVE_TRANSITIONS[from]?.includes(to) ?? false;
}

export interface CreativeValidation {
  resolutionOk: boolean;
  aspectRatioOk: boolean;
  fileSizeOk: boolean;
  durationOk: boolean | null; // null = not applicable (static image)
}

export interface CreativeVersion extends Timestamps {
  id: ID;
  creativeId: ID;
  versionNumber: number;
  format: CreativeFormat;
  fileSizeKb: number;
  dimensions: { widthPx: number; heightPx: number };
  durationSec: number | null;
  validation: CreativeValidation;
  thumbnailRef: string; // svg id reference
}

export interface ApprovalStep extends Timestamps {
  id: ID;
  creativeVersionId: ID;
  stage: "internal_review" | "client_review";
  decision: "approved" | "rejected" | "changes_requested" | "pending";
  reviewerName: string;
  comment: string;
}

export interface Creative extends Timestamps, TenantScoped {
  id: ID;
  campaignId: ID;
  name: string;
  status: CreativeStatus;
  currentVersionId: ID;
  versions: CreativeVersion[];
  approvals: ApprovalStep[];
}
