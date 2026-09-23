import type { ID } from "./shared";

/** Physical measurement units supported by inventory assets. */
export type PhysicalDimensionUnit = "m" | "cm" | "ft" | "in";

/** Orientation is derived from width/height unless explicitly supplied by source data. */
export type PhysicalOrientation = "landscape" | "portrait" | "square" | "unknown";

/**
 * Canonical physical dimensions for a real-world OOH/DOOH face or screen.
 * Physical dimensions are deliberately separate from pixel resolution.
 */
export interface PhysicalDimensions {
  width: number;
  height: number;
  unit: PhysicalDimensionUnit;
  diagonal?: number;
  diagonalUnit?: PhysicalDimensionUnit;
  orientation?: PhysicalOrientation;
  aspectRatio?: number;
}

export interface NormalizedPhysicalDimensions {
  widthMeters: number;
  heightMeters: number;
  diagonalMeters?: number;
  orientation: PhysicalOrientation;
  aspectRatio: number;
}

export interface PhysicalDimensionRecord extends PhysicalDimensions {
  id?: ID;
  measuredAt?: string;
  source?: "manufacturer" | "site_survey" | "operator" | "import" | "estimated";
  notes?: string;
}

const UNIT_TO_METERS: Record<PhysicalDimensionUnit, number> = {
  m: 1,
  cm: 0.01,
  ft: 0.3048,
  in: 0.0254,
};

export function physicalDimensionUnitLabel(unit: PhysicalDimensionUnit): string {
  return ({ m: "meters", cm: "centimeters", ft: "feet", in: "inches" })[unit];
}

export function convertPhysicalLength(value: number, from: PhysicalDimensionUnit, to: PhysicalDimensionUnit): number {
  if (!Number.isFinite(value) || value < 0) throw new Error("Physical dimension must be a non-negative finite number");
  return (value * UNIT_TO_METERS[from]) / UNIT_TO_METERS[to];
}

export function derivePhysicalOrientation(width: number, height: number): PhysicalOrientation {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return "unknown";
  if (Math.abs(width - height) < Number.EPSILON) return "square";
  return width > height ? "landscape" : "portrait";
}

export function derivePhysicalAspectRatio(width: number, height: number): number {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return 0;
  return width / height;
}

export function normalizePhysicalDimensions(dimensions: PhysicalDimensions): NormalizedPhysicalDimensions {
  const widthMeters = convertPhysicalLength(dimensions.width, dimensions.unit, "m");
  const heightMeters = convertPhysicalLength(dimensions.height, dimensions.unit, "m");
  const diagonalMeters = dimensions.diagonal === undefined
    ? undefined
    : convertPhysicalLength(dimensions.diagonal, dimensions.diagonalUnit ?? dimensions.unit, "m");

  return {
    widthMeters,
    heightMeters,
    diagonalMeters,
    orientation: dimensions.orientation ?? derivePhysicalOrientation(dimensions.width, dimensions.height),
    aspectRatio: dimensions.aspectRatio ?? derivePhysicalAspectRatio(dimensions.width, dimensions.height),
  };
}

export function validatePhysicalDimensions(dimensions: PhysicalDimensions): string[] {
  const errors: string[] = [];
  if (!Number.isFinite(dimensions.width) || dimensions.width <= 0) errors.push("Width must be greater than zero");
  if (!Number.isFinite(dimensions.height) || dimensions.height <= 0) errors.push("Height must be greater than zero");
  if (dimensions.diagonal !== undefined && (!Number.isFinite(dimensions.diagonal) || dimensions.diagonal <= 0)) {
    errors.push("Diagonal must be greater than zero when provided");
  }
  if (dimensions.aspectRatio !== undefined && (!Number.isFinite(dimensions.aspectRatio) || dimensions.aspectRatio <= 0)) {
    errors.push("Aspect ratio must be greater than zero when provided");
  }
  return errors;
}
