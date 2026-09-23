import type { CreativeRepository } from "@/repositories/interfaces/CreativeRepository";
import type { Creative, CreativeStatus, ApprovalStep } from "@/domain";
import { canTransitionCreative, creativeSchedulingEligibility } from "@/domain";
import { store, persist, withLatency, genId, nowIso } from "./store";

export class DemoCreativeRepository implements CreativeRepository {
  async listCreativesForCampaign(campaignId: string): Promise<Creative[]> {
    return withLatency(store.creatives.filter((c) => c.campaignId === campaignId));
  }

  async listApprovedCreatives(): Promise<Creative[]> {
    return withLatency(store.creatives.filter((c) => c.status === "approved"));
  }

  async getCreative(id: string): Promise<Creative | null> {
    return withLatency(store.creatives.find((c) => c.id === id) ?? null);
  }

  async uploadVersion(creativeId: string, file: { name: string; sizeKb: number; format: "jpg" | "png" | "mp4" }) {
    const creative = store.creatives.find((c) => c.id === creativeId);
    if (!creative) throw new Error(`Creative ${creativeId} not found`);
    const versionNumber = creative.versions.length + 1;
    const version = {
      id: genId("cv"),
      creativeId,
      versionNumber,
      format: file.format,
      fileSizeKb: file.sizeKb,
      dimensions: { widthPx: 1920, heightPx: 1080 },
      durationSec: file.format === "mp4" ? 10 : null,
      validation: {
        resolutionOk: file.sizeKb < 40000,
        aspectRatioOk: true,
        fileSizeOk: file.sizeKb < 40000,
        durationOk: file.format === "mp4" ? true : null,
      },
      thumbnailRef: "generic_upload",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    creative.versions.push(version);
    creative.currentVersionId = version.id;
    creative.status = "draft";
    creative.updatedAt = nowIso();
    persist();
    return withLatency(version, 400);
  }

  async getCurrentVersion(creativeId: string) {
    const creative = store.creatives.find((c) => c.id === creativeId);
    if (!creative) return null;
    return withLatency(creative.versions.find((v) => v.id === creative.currentVersionId) ?? null);
  }

  async getSchedulingEligibility(creativeId: string, compatibility: { compatible: boolean; reasons?: string[] } | null) {
    const creative = store.creatives.find((c) => c.id === creativeId);
    if (!creative) throw new Error(`Creative ${creativeId} not found`);
    return withLatency(creativeSchedulingEligibility(creative, compatibility));
  }

  async transitionStatus(creativeId: string, next: CreativeStatus): Promise<Creative> {
    const creative = store.creatives.find((c) => c.id === creativeId);
    if (!creative) throw new Error(`Creative ${creativeId} not found`);
    if (!canTransitionCreative(creative.status, next)) {
      throw new Error(`Cannot move creative from "${creative.status}" to "${next}" — invalid transition.`);
    }
    creative.status = next;
    creative.updatedAt = nowIso();
    persist();
    return withLatency(creative, 260);
  }

  async recordApprovalDecision(
    creativeId: string,
    stage: ApprovalStep["stage"],
    decision: ApprovalStep["decision"],
    reviewerName: string,
    comment: string
  ): Promise<Creative> {
    const creative = store.creatives.find((c) => c.id === creativeId);
    if (!creative) throw new Error(`Creative ${creativeId} not found`);
    creative.approvals.push({
      id: genId("ap"), creativeVersionId: creative.currentVersionId, stage, decision, reviewerName, comment,
      createdAt: nowIso(), updatedAt: nowIso(),
    });

    if (decision === "approved") {
      const next: CreativeStatus = stage === "internal_review" ? "client_review" : "approved";
      if (canTransitionCreative(creative.status, next)) creative.status = next;
    } else if (decision === "rejected") {
      creative.status = "rejected";
    } else if (decision === "changes_requested") {
      creative.status = "draft";
    }
    creative.updatedAt = nowIso();
    persist();
    return withLatency(creative, 300);
  }
}
