import type { ID, TenantScoped, Timestamps } from "./shared";
import type { CurrencyCode } from "./currency";

/** ISO 4217 currency code. Currency conversion is intentionally outside rate-card logic. */
export type RateUnit =
  | "cpm"
  | "fixed_placement"
  | "daily"
  | "weekly"
  | "monthly"
  | "campaign_package"
  | "time_based";

export type RateCardStatus = "draft" | "active" | "expired" | "archived";

export type RateScopeType = "company" | "site" | "asset" | "media_type";

export interface RateCardScope {
  type: RateScopeType;
  referenceId?: ID;
}

export interface RateDaypart {
  startTime: string; // HH:mm, local inventory timezone
  endTime: string; // HH:mm, local inventory timezone
  daysOfWeek?: Array<1 | 2 | 3 | 4 | 5 | 6 | 7>;
  timezone?: string;
}

export interface RateValidity {
  effectiveFrom: string; // ISO 8601
  effectiveTo?: string; // ISO 8601, exclusive when supplied
}

export interface RateAmount {
  amountMinor: number;
  currency: CurrencyCode;
}

export interface RateRule {
  minimumUnits?: number;
  maximumUnits?: number;
  minimumDays?: number;
  premiumMultiplier?: number;
  daypart?: RateDaypart;
}

export interface RateCardEntry extends Timestamps {
  id: ID;
  code: string;
  label: string;
  description?: string;
  unit: RateUnit;
  amount: RateAmount;
  rule?: RateRule;
  active: boolean;
  sortOrder: number;
}

export interface InventoryRateCard extends Timestamps, TenantScoped {
  id: ID;
  name: string;
  description?: string;
  currency: CurrencyCode;
  status: RateCardStatus;
  validity: RateValidity;
  scopes: RateCardScope[];
  entries: RateCardEntry[];
  defaultEntryId?: ID;
  version: number;
}

/** Explicit negotiated price override; it does not mutate the published rate card. */
export interface NegotiatedRate extends Timestamps, TenantScoped {
  id: ID;
  rateCardId?: ID;
  clientId?: ID;
  assetId?: ID;
  campaignId?: ID;
  unit: RateUnit;
  amount: RateAmount;
  validity: RateValidity;
  reason?: string;
  approvedByUserId?: ID;
}

export interface RateCardSelectionContext {
  assetId?: ID;
  siteId?: ID;
  mediaType?: string;
  date?: string;
  daypart?: RateDaypart;
  clientId?: ID;
}

export interface ResolvedRate {
  source: "rate_card" | "negotiated_rate";
  rateCardId?: ID;
  rateEntryId?: ID;
  negotiatedRateId?: ID;
  unit: RateUnit;
  amount: RateAmount;
}

export function isRateUnit(value: string): value is RateUnit {
  return [
    "cpm",
    "fixed_placement",
    "daily",
    "weekly",
    "monthly",
    "campaign_package",
    "time_based",
  ].includes(value);
}

export function isValidCurrencyCode(value: string): boolean {
  return /^[A-Z]{3}$/.test(value);
}

export function isValidRateAmount(amount: RateAmount): boolean {
  return Number.isInteger(amount.amountMinor) && amount.amountMinor >= 0 && isValidCurrencyCode(amount.currency);
}

export function rateCardIsEffective(card: InventoryRateCard, at: string): boolean {
  if (card.status !== "active") return false;
  const timestamp = Date.parse(at);
  const from = Date.parse(card.validity.effectiveFrom);
  if (!Number.isFinite(timestamp) || !Number.isFinite(from) || timestamp < from) return false;
  if (!card.validity.effectiveTo) return true;
  const to = Date.parse(card.validity.effectiveTo);
  return Number.isFinite(to) && timestamp < to;
}
