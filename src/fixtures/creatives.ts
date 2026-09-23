import type { Creative } from "@/domain";
import { COMPANY } from "./company";
import { isoDaysAgo } from "./helpers";

export const CREATIVES: Creative[] = [
  {
    id: "creative-1", companyId: COMPANY.id, campaignId: "campaign-1", name: "Zenith Summer Refresh — Hero Spot",
    status: "approved", currentVersionId: "cv-1b",
    versions: [
      { id: "cv-1a", creativeId: "creative-1", versionNumber: 1, format: "mp4", fileSizeKb: 18400, dimensions: { widthPx: 1920, heightPx: 960 }, durationSec: 10, validation: { resolutionOk: true, aspectRatioOk: true, fileSizeOk: true, durationOk: true }, thumbnailRef: "zenith_v1", createdAt: isoDaysAgo(16), updatedAt: isoDaysAgo(16) },
      { id: "cv-1b", creativeId: "creative-1", versionNumber: 2, format: "mp4", fileSizeKb: 19100, dimensions: { widthPx: 1920, heightPx: 960 }, durationSec: 10, validation: { resolutionOk: true, aspectRatioOk: true, fileSizeOk: true, durationOk: true }, thumbnailRef: "zenith_v2", createdAt: isoDaysAgo(12), updatedAt: isoDaysAgo(12) },
    ],
    approvals: [
      { id: "ap-1a", creativeVersionId: "cv-1a", stage: "internal_review", decision: "changes_requested", reviewerName: "Hamza Riaz", comment: "Logo lockup too small on mobile preview — resize for legibility.", createdAt: isoDaysAgo(15), updatedAt: isoDaysAgo(15) },
      { id: "ap-1b", creativeVersionId: "cv-1b", stage: "internal_review", decision: "approved", reviewerName: "Hamza Riaz", comment: "Logo sizing fixed. Looks good.", createdAt: isoDaysAgo(13), updatedAt: isoDaysAgo(13) },
      { id: "ap-1c", creativeVersionId: "cv-1b", stage: "client_review", decision: "approved", reviewerName: "Daniyal Chaudhry (Zenith Foods)", comment: "Approved — please proceed to scheduling.", createdAt: isoDaysAgo(11), updatedAt: isoDaysAgo(11) },
    ],
    createdAt: isoDaysAgo(16), updatedAt: isoDaysAgo(11),
  },
  {
    id: "creative-2", companyId: COMPANY.id, campaignId: "campaign-2", name: "Orbit 5G Launch — Speed Test",
    status: "client_review", currentVersionId: "cv-2a",
    versions: [
      { id: "cv-2a", creativeId: "creative-2", versionNumber: 1, format: "mp4", fileSizeKb: 21200, dimensions: { widthPx: 1280, heightPx: 768 }, durationSec: 15, validation: { resolutionOk: true, aspectRatioOk: true, fileSizeOk: true, durationOk: true }, thumbnailRef: "orbit_v1", createdAt: isoDaysAgo(9), updatedAt: isoDaysAgo(9) },
    ],
    approvals: [
      { id: "ap-2a", creativeVersionId: "cv-2a", stage: "internal_review", decision: "approved", reviewerName: "Hamza Riaz", comment: "Clean edit, on-brand. Sending to client.", createdAt: isoDaysAgo(7), updatedAt: isoDaysAgo(7) },
      { id: "ap-2b", creativeVersionId: "cv-2a", stage: "client_review", decision: "pending", reviewerName: "Kamran Sheikh (Orbit Telecom)", comment: "", createdAt: isoDaysAgo(6), updatedAt: isoDaysAgo(6) },
    ],
    createdAt: isoDaysAgo(9), updatedAt: isoDaysAgo(6),
  },
  {
    id: "creative-3", companyId: COMPANY.id, campaignId: "campaign-3", name: "Lumen Digital Savings — Static Set",
    status: "internal_review", currentVersionId: "cv-3a",
    versions: [
      { id: "cv-3a", creativeId: "creative-3", versionNumber: 1, format: "jpg", fileSizeKb: 4200, dimensions: { widthPx: 1920, heightPx: 1080 }, durationSec: null, validation: { resolutionOk: true, aspectRatioOk: false, fileSizeOk: true, durationOk: null }, thumbnailRef: "lumen_v1", createdAt: isoDaysAgo(4), updatedAt: isoDaysAgo(4) },
    ],
    approvals: [
      { id: "ap-3a", creativeVersionId: "cv-3a", stage: "internal_review", decision: "pending", reviewerName: "Hamza Riaz", comment: "Aspect ratio flagged — needs recrop for this screen's 16:9 vs the source 4:5.", createdAt: isoDaysAgo(4), updatedAt: isoDaysAgo(4) },
    ],
    createdAt: isoDaysAgo(4), updatedAt: isoDaysAgo(4),
  },
  {
    id: "creative-4", companyId: COMPANY.id, campaignId: "campaign-4", name: "Pinnacle Velocity Reveal Film",
    status: "approved", currentVersionId: "cv-4a",
    versions: [
      { id: "cv-4a", creativeId: "creative-4", versionNumber: 1, format: "mp4", fileSizeKb: 26800, dimensions: { widthPx: 1920, heightPx: 1080 }, durationSec: 15, validation: { resolutionOk: true, aspectRatioOk: true, fileSizeOk: true, durationOk: true }, thumbnailRef: "pinnacle_v1", createdAt: isoDaysAgo(36), updatedAt: isoDaysAgo(36) },
    ],
    approvals: [
      { id: "ap-4a", creativeVersionId: "cv-4a", stage: "internal_review", decision: "approved", reviewerName: "Hamza Riaz", comment: "Approved as-is.", createdAt: isoDaysAgo(34), updatedAt: isoDaysAgo(34) },
      { id: "ap-4b", creativeVersionId: "cv-4a", stage: "client_review", decision: "approved", reviewerName: "Faraz Alam (Pinnacle Motors)", comment: "Great work, approved.", createdAt: isoDaysAgo(32), updatedAt: isoDaysAgo(32) },
    ],
    createdAt: isoDaysAgo(36), updatedAt: isoDaysAgo(32),
  },
  {
    id: "creative-5", companyId: COMPANY.id, campaignId: "campaign-5", name: "Aura Radiance — Launch Visual",
    status: "draft", currentVersionId: "cv-5a",
    versions: [
      { id: "cv-5a", creativeId: "creative-5", versionNumber: 1, format: "png", fileSizeKb: 3100, dimensions: { widthPx: 1080, heightPx: 1080 }, durationSec: null, validation: { resolutionOk: false, aspectRatioOk: false, fileSizeOk: true, durationOk: null }, thumbnailRef: "aura_v1", createdAt: isoDaysAgo(2), updatedAt: isoDaysAgo(2) },
    ],
    approvals: [],
    createdAt: isoDaysAgo(2), updatedAt: isoDaysAgo(2),
  },
];

export function creativeById(id: string): Creative | undefined {
  return CREATIVES.find((c) => c.id === id);
}
export function creativesForCampaign(campaignId: string): Creative[] {
  return CREATIVES.filter((c) => c.campaignId === campaignId);
}
