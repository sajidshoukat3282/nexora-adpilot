import type { ID } from "./shared";
import type { CurrencyCode } from "./currency";
import type { Money } from "./shared";
import { moneyFromMinor, moneyMinorAmount } from "./shared";
import type { GeographyScope } from "./geography";
import type { MediaAsset, AvailabilityResult } from "./inventory";
import type { RateCardSelectionContext, ResolvedRate } from "./rateCards";

/** Deterministic planning foundation. AI/recommendation providers can plug in later without changing this contract. */
export type PlanningObjective =
  | "reach"
  | "frequency"
  | "cpm_efficiency"
  | "budget_efficiency"
  | "availability"
  | "balanced";

export interface PlanningBudget {
  amountMinor: number;
  currency: CurrencyCode;
}

export interface PlanningDateRange {
  startDate: string;
  endDate: string;
  timezone?: string;
}

export interface AudienceCriteria {
  targetImpressions?: number;
  minimumDailyImpressions?: number;
  audienceTags?: string[];
}

export interface PlanningConstraints {
  geography?: GeographyScope;
  mediaTypes?: MediaAsset["mediaType"][];
  digitalOnly?: boolean;
  staticOnly?: boolean;
  assetIds?: ID[];
  excludeAssetIds?: ID[];
  minimumAvailability?: "available" | "partially_available";
  requiredCreativeCompatibility?: boolean;
  creativeVersionId?: ID;
}

export interface SmartMediaPlanningRequest {
  companyId: ID;
  requestedByUserId: ID;
  dateRange: PlanningDateRange;
  budget?: PlanningBudget;
  audience?: AudienceCriteria;
  frequencyTarget?: number;
  objective: PlanningObjective;
  constraints?: PlanningConstraints;
  maxResults?: number;
}

export interface PlanningCandidate {
  assetId: ID;
  estimatedImpressions: number;
  estimatedSpend: Money;
  estimatedCpm?: Money;
  availability: AvailabilityResult["state"];
  compatibility: "not_checked" | "compatible" | "warning" | "incompatible";
  score: number;
  reasons: string[];
}

export interface SmartMediaPlan {
  id: ID;
  companyId: ID;
  requestedByUserId: ID;
  request: SmartMediaPlanningRequest;
  candidates: PlanningCandidate[];
  totals: {
    estimatedSpend?: Money;
    estimatedImpressions: number;
    estimatedCpm?: Money;
    assetCount: number;
  };
  methodologyVersion: string;
  generatedAt: string;
}

export interface PlanningDependencies {
  resolveAvailability(asset: MediaAsset, dateRange: PlanningDateRange): Promise<AvailabilityResult>;
  resolveRate(asset: MediaAsset, context: RateCardSelectionContext): Promise<ResolvedRate | null>;
  checkCreativeCompatibility?(asset: MediaAsset, creativeVersionId: ID): Promise<PlanningCandidate["compatibility"]>;
  matchesGeography?(asset: MediaAsset, scope: GeographyScope): boolean;
}

export function planningDays(range: PlanningDateRange): number {
  const start = Date.parse(range.startDate);
  const end = Date.parse(range.endDate);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0;
  return Math.floor((end - start) / 86_400_000) + 1;
}

export function estimateImpressions(asset: MediaAsset, days: number): number {
  if (!Number.isFinite(days) || days <= 0) return 0;
  return Math.max(0, asset.audience.estimatedDailyImpressions) * days;
}

function scoreCandidate(candidate: Omit<PlanningCandidate, "score">, objective: PlanningObjective, targetImpressions?: number): number {
  if (candidate.compatibility === "incompatible") return 0;
  const reach = targetImpressions && targetImpressions > 0
    ? Math.min(candidate.estimatedImpressions / targetImpressions, 1)
    : Math.min(candidate.estimatedImpressions / 1_000_000, 1);
  const availability = candidate.availability === "available" ? 1 : candidate.availability === "partially_available" ? 0.65 : 0;
  const cpmEfficiency = candidate.estimatedCpm && moneyMinorAmount(candidate.estimatedCpm) > 0
    ? Math.min(100_000 / moneyMinorAmount(candidate.estimatedCpm), 1)
    : 0;
  switch (objective) {
    case "reach": return reach * 0.7 + availability * 0.3;
    case "availability": return availability * 0.8 + reach * 0.2;
    case "cpm_efficiency": return cpmEfficiency * 0.75 + availability * 0.25;
    case "budget_efficiency": return cpmEfficiency * 0.6 + reach * 0.2 + availability * 0.2;
    case "frequency": return reach * 0.45 + availability * 0.55;
    default: return reach * 0.35 + cpmEfficiency * 0.3 + availability * 0.35;
  }
}

/**
 * Plans against supplied inventory/rate/availability providers. It never fabricates reach,
 * pricing or delivery data and does not mutate campaigns or bookings.
 */
export async function generateSmartMediaPlan(
  request: SmartMediaPlanningRequest,
  assets: MediaAsset[],
  dependencies: PlanningDependencies,
  planId: ID,
): Promise<SmartMediaPlan> {
  if (!request.companyId || !request.requestedByUserId) throw new Error("Planning company and requester are required.");
  const days = planningDays(request.dateRange);
  if (days <= 0) throw new Error("Planning date range is invalid.");
  if (request.budget && (!Number.isInteger(request.budget.amountMinor) || request.budget.amountMinor < 0)) {
    throw new Error("Planning budget must use a non-negative integer minor-unit amount.");
  }

  const excluded = new Set(request.constraints?.excludeAssetIds ?? []);
  const selectedIds = request.constraints?.assetIds ? new Set(request.constraints.assetIds) : undefined;
  const candidates: PlanningCandidate[] = [];

  for (const asset of assets) {
    if (asset.companyId !== request.companyId || excluded.has(asset.id)) continue;
    if (selectedIds && !selectedIds.has(asset.id)) continue;
    if (request.constraints?.mediaTypes && !request.constraints.mediaTypes.includes(asset.mediaType)) continue;
    if (request.constraints?.digitalOnly && asset.mediaType !== "led_billboard" && asset.mediaType !== "digital_street_screen") continue;
    if (request.constraints?.staticOnly && (asset.mediaType === "led_billboard" || asset.mediaType === "digital_street_screen")) continue;
    if (request.constraints?.geography && dependencies.matchesGeography && !dependencies.matchesGeography(asset, request.constraints.geography)) continue;

    const availability = await dependencies.resolveAvailability(asset, request.dateRange);
    if (request.constraints?.minimumAvailability === "available" && availability.state !== "available") continue;
    if (request.constraints?.minimumAvailability === "partially_available" && availability.state !== "available" && availability.state !== "partially_available") continue;

    const compatibility = request.constraints?.requiredCreativeCompatibility && request.constraints.creativeVersionId && dependencies.checkCreativeCompatibility
      ? await dependencies.checkCreativeCompatibility(asset, request.constraints.creativeVersionId)
      : "not_checked";
    if (compatibility === "incompatible") continue;

    const rate = await dependencies.resolveRate(asset, { assetId: asset.id, date: request.dateRange.startDate });
    const impressions = estimateImpressions(asset, days);
    let estimatedSpend: Money | undefined;
    let estimatedCpm: Money | undefined;
    const reasons: string[] = [];

    if (rate) {
      if (rate.unit === "cpm") {
        estimatedSpend = moneyFromMinor(Math.round((impressions / 1000) * rate.amount.amountMinor), rate.amount.currency);
        estimatedCpm = moneyFromMinor(rate.amount.amountMinor, rate.amount.currency);
      } else {
        const multiplier = rate.unit === "weekly" ? Math.ceil(days / 7) : rate.unit === "monthly" ? Math.ceil(days / 30) : days;
        estimatedSpend = moneyFromMinor(rate.amount.amountMinor * multiplier, rate.amount.currency);
        if (impressions > 0) estimatedCpm = moneyFromMinor(Math.round((moneyMinorAmount(estimatedSpend) / impressions) * 1000), rate.amount.currency);
      }
      reasons.push(`Rate resolved from ${rate.source}.`);
    } else {
      reasons.push("No applicable rate was resolved; spend and CPM are not estimated.");
    }
    if (availability.state === "partially_available") reasons.push("Asset is only partially available for the requested period.");
    if (compatibility === "warning") reasons.push("Creative compatibility returned a warning.");

    const withoutScore = { assetId: asset.id, estimatedImpressions: impressions, estimatedSpend: estimatedSpend ?? moneyFromMinor(0, request.budget?.currency ?? "USD"), estimatedCpm, availability: availability.state, compatibility, reasons };
    candidates.push({ ...withoutScore, score: scoreCandidate(withoutScore, request.objective, request.audience?.targetImpressions) });
  }

  candidates.sort((a, b) => b.score - a.score);
  const limited = request.maxResults && request.maxResults > 0 ? candidates.slice(0, request.maxResults) : candidates;
  const priced = limited.filter((item) => moneyMinorAmount(item.estimatedSpend) > 0);
  const currency = priced[0]?.estimatedSpend.currency;
  const totals = {
    estimatedSpend: currency && priced.every((item) => item.estimatedSpend.currency === currency)
      ? moneyFromMinor(priced.reduce((sum, item) => sum + moneyMinorAmount(item.estimatedSpend), 0), currency)
      : undefined,
    estimatedImpressions: limited.reduce((sum, item) => sum + item.estimatedImpressions, 0),
    estimatedCpm: currency && priced.length && limited.reduce((sum, item) => sum + item.estimatedImpressions, 0) > 0
      ? moneyFromMinor(Math.round((priced.reduce((sum, item) => sum + moneyMinorAmount(item.estimatedSpend), 0) / limited.reduce((sum, item) => sum + item.estimatedImpressions, 0)) * 1000), currency)
      : undefined,
    assetCount: limited.length,
  };

  return { id: planId, companyId: request.companyId, requestedByUserId: request.requestedByUserId, request, candidates: limited, totals, methodologyVersion: "1.0", generatedAt: new Date().toISOString() };
}
