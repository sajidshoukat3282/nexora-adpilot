import type { Creative, CreativeStatus, CreativeVersion, ApprovalStep, ID, CreativeSchedulingEligibility } from "@/domain";

export interface CreativeRepository {
  listCreativesForCampaign(campaignId: ID): Promise<Creative[]>;
  listApprovedCreatives(): Promise<Creative[]>;
  getCreative(id: ID): Promise<Creative | null>;
  uploadVersion(creativeId: ID, file: { name: string; sizeKb: number; format: "jpg" | "png" | "mp4" }): Promise<CreativeVersion>;
  transitionStatus(creativeId: ID, next: CreativeStatus): Promise<Creative>;
  getCurrentVersion(creativeId: ID): Promise<CreativeVersion | null>;
  getSchedulingEligibility(creativeId: ID, compatibility: { compatible: boolean; reasons?: string[] } | null): Promise<CreativeSchedulingEligibility>;
  recordApprovalDecision(
    creativeId: ID,
    stage: ApprovalStep["stage"],
    decision: ApprovalStep["decision"],
    reviewerName: string,
    comment: string
  ): Promise<Creative>;
}
