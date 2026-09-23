import type { ID } from "./shared";

/** Pixel resolution is deliberately separate from physical dimensions. */
export type DigitalResolutionOrientation = "landscape" | "portrait" | "square" | "unknown";

export interface DigitalResolution {
  widthPx: number;
  heightPx: number;
}

export interface DigitalResolutionRecord extends DigitalResolution {
  id?: ID;
  /** Whether this is the screen's native/panel resolution. */
  native?: boolean;
  /** Optional label such as Full HD, 4K UHD, or a provider-specific mode. */
  label?: string;
  orientation?: DigitalResolutionOrientation;
  aspectRatio?: number;
  source?: "manufacturer" | "site_survey" | "operator" | "import" | "estimated";
  measuredAt?: string;
  notes?: string;
}

export interface DigitalResolutionCapabilities {
  native?: DigitalResolutionRecord;
  supported: DigitalResolutionRecord[];
}

export function deriveDigitalResolutionOrientation(
  widthPx: number,
  heightPx: number,
): DigitalResolutionOrientation {
  if (!Number.isInteger(widthPx) || !Number.isInteger(heightPx) || widthPx <= 0 || heightPx <= 0) return "unknown";
  if (widthPx === heightPx) return "square";
  return widthPx > heightPx ? "landscape" : "portrait";
}

export function deriveDigitalAspectRatio(widthPx: number, heightPx: number): number {
  if (!Number.isFinite(widthPx) || !Number.isFinite(heightPx) || widthPx <= 0 || heightPx <= 0) return 0;
  return widthPx / heightPx;
}

export function normalizeDigitalResolution(resolution: DigitalResolutionRecord): DigitalResolutionRecord {
  return {
    ...resolution,
    orientation: resolution.orientation ?? deriveDigitalResolutionOrientation(resolution.widthPx, resolution.heightPx),
    aspectRatio: resolution.aspectRatio ?? deriveDigitalAspectRatio(resolution.widthPx, resolution.heightPx),
  };
}

export function validateDigitalResolution(resolution: DigitalResolution): string[] {
  const errors: string[] = [];
  if (!Number.isInteger(resolution.widthPx) || resolution.widthPx <= 0) errors.push("Pixel width must be a positive integer");
  if (!Number.isInteger(resolution.heightPx) || resolution.heightPx <= 0) errors.push("Pixel height must be a positive integer");
  return errors;
}

export function isResolutionSupported(
  required: DigitalResolution,
  supported: DigitalResolutionRecord[],
): boolean {
  return validateDigitalResolution(required).length === 0 && supported.some(
    (candidate) => candidate.widthPx === required.widthPx && candidate.heightPx === required.heightPx,
  );
}
