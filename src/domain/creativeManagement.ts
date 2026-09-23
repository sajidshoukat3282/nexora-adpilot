import type { ID, Timestamps, TenantScoped } from "./shared";
import type { CreativeFormat, CreativeStatus, CreativeVersion } from "./creatives";

/** Storage is intentionally provider-agnostic; R2 is a future adapter, not a domain dependency. */
export type CreativeStorageProvider = "r2" | "local" | "external";

export interface CreativeFileRef {
  provider: CreativeStorageProvider;
  objectKey: string;
  contentType: string;
  originalFileName: string;
  sizeBytes: number;
  checksumSha256?: string;
  uploadedAt: string;
}

export interface CreativeMetadata {
  format: CreativeFormat;
  mimeType: string;
  widthPx: number;
  heightPx: number;
  durationSec: number | null;
  codec?: string;
  bitrateKbps?: number;
  frameRateFps?: number;
  hasAudio?: boolean;
  colorProfile?: string;
}

export type CreativeAssetState = "uploading" | "ready" | "quarantined" | "failed";

export interface CreativeAsset extends Timestamps, TenantScoped {
  id: ID;
  creativeId: ID;
  versionId: ID;
  file: CreativeFileRef;
  metadata: CreativeMetadata;
  state: CreativeAssetState;
}

export interface CreativeVersionRecord extends CreativeVersion {
  fileAssetId?: ID;
  uploadedByUserId?: ID;
  changeNote?: string;
}

export type CreativeSchedulingState =
  | "not_ready"
  | "pending_approval"
  | "approved"
  | "incompatible"
  | "eligible";

export interface CreativeSchedulingEligibility {
  state: CreativeSchedulingState;
  eligible: boolean;
  reasons: string[];
  creativeVersionId: ID;
}

export interface CreativeUploadInput {
  companyId: ID;
  creativeId: ID;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  format: CreativeFormat;
  metadata: CreativeMetadata;
  storageKey?: string;
  checksumSha256?: string;
  uploadedByUserId?: ID;
  changeNote?: string;
}

export interface CreativeStorage {
  put(input: Omit<CreativeFileRef, "uploadedAt"> & { bytes?: Uint8Array }): Promise<CreativeFileRef>;
  get(objectKey: string): Promise<CreativeFileRef | null>;
  delete(objectKey: string): Promise<void>;
}

const MIME_BY_FORMAT: Record<CreativeFormat, string[]> = {
  jpg: ["image/jpeg"],
  png: ["image/png"],
  mp4: ["video/mp4"],
};

export function isCreativeMimeCompatible(format: CreativeFormat, mimeType: string): boolean {
  return MIME_BY_FORMAT[format].includes(mimeType.toLowerCase());
}

export function validateCreativeMetadata(input: Pick<CreativeUploadInput, "format" | "contentType" | "sizeBytes" | "metadata">): string[] {
  const errors: string[] = [];
  if (!isCreativeMimeCompatible(input.format, input.contentType)) errors.push("File format and MIME type do not match.");
  if (!Number.isFinite(input.sizeBytes) || input.sizeBytes <= 0) errors.push("File size must be greater than zero.");
  if (!Number.isInteger(input.metadata.widthPx) || input.metadata.widthPx <= 0) errors.push("Pixel width must be a positive integer.");
  if (!Number.isInteger(input.metadata.heightPx) || input.metadata.heightPx <= 0) errors.push("Pixel height must be a positive integer.");
  if (input.format === "mp4" && (!Number.isFinite(input.metadata.durationSec ?? NaN) || (input.metadata.durationSec ?? 0) <= 0)) {
    errors.push("Video creatives require a positive duration.");
  }
  if (input.format !== "mp4" && input.metadata.durationSec !== null) errors.push("Static creatives cannot have a video duration.");
  return errors;
}

export function creativeSchedulingEligibility(
  creative: { status: CreativeStatus; currentVersionId: ID },
  compatibility: { compatible: boolean; reasons?: string[] } | null,
): CreativeSchedulingEligibility {
  if (creative.status !== "approved") {
    return { state: "pending_approval", eligible: false, reasons: ["Creative is not approved."], creativeVersionId: creative.currentVersionId };
  }
  if (!compatibility) {
    return { state: "not_ready", eligible: false, reasons: ["Screen compatibility has not been evaluated."], creativeVersionId: creative.currentVersionId };
  }
  if (!compatibility.compatible) {
    return { state: "incompatible", eligible: false, reasons: compatibility.reasons ?? ["Creative is incompatible with the target screen."], creativeVersionId: creative.currentVersionId };
  }
  return { state: "eligible", eligible: true, reasons: [], creativeVersionId: creative.currentVersionId };
}
