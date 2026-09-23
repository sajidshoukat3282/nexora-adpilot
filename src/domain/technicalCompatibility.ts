import type { ID } from "./shared";
import type { CreativeFormat, CreativeVersion } from "./creatives";
import type { MediaAsset } from "./inventory";
import type { TechnicalCapabilities } from "./inventoryFoundation";

export type CompatibilitySeverity = "compatible" | "warning" | "incompatible";

export interface CreativeCompatibilityRequirements {
  formats?: CreativeFormat[];
  codecs?: string[];
  minDurationSec?: number;
  maxDurationSec?: number;
  requiredAudio?: boolean;
  resolution?: { widthPx: number; heightPx: number };
  aspectRatio?: number;
  orientation?: "landscape" | "portrait" | "square";
  maxFileSizeKb?: number;
}

export interface TechnicalCompatibilityResult {
  status: CompatibilitySeverity;
  reasons: string[];
  warnings: string[];
  checkedAt: string;
  assetId: ID;
  creativeVersionId?: ID;
}

export interface TechnicalCompatibilityInput {
  asset: Pick<MediaAsset, "id" | "mediaType" | "orientation" | "technicalCapabilities" | "digitalResolution" | "supportedResolutions">;
  creative: Pick<CreativeVersion, "id" | "format" | "dimensions" | "durationSec" | "fileSizeKb">;
  requirements?: CreativeCompatibilityRequirements;
}

const EPSILON = 0.01;

function ratio(width: number, height: number): number | null {
  return width > 0 && height > 0 ? width / height : null;
}

function orientation(width: number, height: number): "landscape" | "portrait" | "square" | "unknown" {
  if (width <= 0 || height <= 0) return "unknown";
  if (Math.abs(width - height) < EPSILON) return "square";
  return width > height ? "landscape" : "portrait";
}

function resolutionSupported(
  resolution: { widthPx: number; heightPx: number },
  capabilities?: TechnicalCapabilities,
  digitalResolution?: MediaAsset["digitalResolution"],
): boolean {
  const supported = [
    ...(capabilities?.supportedResolutions ?? []),
    ...(digitalResolution ? [digitalResolution] : []),
  ];
  const native = [capabilities?.nativeResolution, digitalResolution?.native].filter(Boolean) as Array<{
    widthPx: number;
    heightPx: number;
  }>;
  return [...supported, ...native].some(
    (item) => item.widthPx === resolution.widthPx && item.heightPx === resolution.heightPx,
  );
}

/**
 * Pure compatibility check. It does not schedule or mutate inventory.
 * Scheduling should refuse an `incompatible` result rather than silently proceeding.
 */
export function checkCreativeTechnicalCompatibility(
  input: TechnicalCompatibilityInput,
): TechnicalCompatibilityResult {
  const { asset, creative, requirements } = input;
  const capabilities = asset.technicalCapabilities;
  const reasons: string[] = [];
  const warnings: string[] = [];

  if (requirements?.formats && !requirements.formats.includes(creative.format)) {
    reasons.push(`Creative format ${creative.format} is not supported by the requirements.`);
  }

  if (capabilities?.supportedFileTypes?.length && !capabilities.supportedFileTypes.some(
    (type) => type.toLowerCase() === creative.format.toLowerCase(),
  )) {
    reasons.push(`Creative format ${creative.format} is not supported by this asset.`);
  }

  const creativeRatio = ratio(creative.dimensions.widthPx, creative.dimensions.heightPx);
  if (requirements?.resolution && (creative.dimensions.widthPx !== requirements.resolution.widthPx || creative.dimensions.heightPx !== requirements.resolution.heightPx)) {
    reasons.push("Creative pixel resolution does not match the required resolution.");
  }
  if (requirements?.aspectRatio !== undefined && creativeRatio !== null && Math.abs(creativeRatio - requirements.aspectRatio) > EPSILON) {
    reasons.push("Creative aspect ratio does not match the required aspect ratio.");
  }

  const creativeOrientation = orientation(creative.dimensions.widthPx, creative.dimensions.heightPx);
  if (requirements?.orientation && creativeOrientation !== requirements.orientation) {
    reasons.push(`Creative orientation ${creativeOrientation} does not match the required orientation.`);
  }

  if (asset.orientation && creativeOrientation !== "unknown" && asset.orientation !== creativeOrientation) {
    reasons.push(`Creative orientation ${creativeOrientation} does not match the screen orientation ${asset.orientation}.`);
  }

  const native = capabilities?.nativeResolution ?? asset.digitalResolution?.native;
  const supported = resolutionSupported(creative.dimensions, capabilities, asset.digitalResolution) ||
    (asset.supportedResolutions?.supported ?? []).some((item) => item.widthPx === creative.dimensions.widthPx && item.heightPx === creative.dimensions.heightPx);
  if (native && !supported) {
    warnings.push("Creative resolution is not listed as a native or supported screen resolution.");
  }

  if (requirements?.minDurationSec !== undefined && (creative.durationSec ?? 0) < requirements.minDurationSec) {
    reasons.push("Creative duration is below the required minimum.");
  }
  if (requirements?.maxDurationSec !== undefined && (creative.durationSec ?? 0) > requirements.maxDurationSec) {
    reasons.push("Creative duration exceeds the allowed maximum.");
  }

  if (capabilities?.audioSupported === false && requirements?.requiredAudio === true) {
    reasons.push("Audio is required but this asset does not support audio.");
  }

  if (requirements?.maxFileSizeKb !== undefined && creative.fileSizeKb > requirements.maxFileSizeKb) {
    reasons.push("Creative file size exceeds the allowed maximum.");
  }

  if (requirements?.codecs?.length && capabilities?.supportedCodecs?.length) {
    const overlap = requirements.codecs.some((codec) => capabilities.supportedCodecs!.some((supportedCodec) => supportedCodec.toLowerCase() === codec.toLowerCase()));
    if (!overlap) reasons.push("No compatible codec was found between the creative requirements and screen capabilities.");
  }

  const status: CompatibilitySeverity = reasons.length ? "incompatible" : warnings.length ? "warning" : "compatible";
  return {
    status,
    reasons,
    warnings,
    checkedAt: new Date().toISOString(),
    assetId: asset.id,
    creativeVersionId: creative.id,
  };
}

export function canScheduleCreativeOnAsset(result: TechnicalCompatibilityResult): boolean {
  return result.status !== "incompatible";
}
