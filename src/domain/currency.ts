import type { ID, Timestamps, TenantScoped } from "./shared";

/** Supported ISO 4217 currencies used by AdPilot's global-ready foundation. */
export type CurrencyCode =
  | "PKR" | "USD" | "GBP" | "EUR" | "AED" | "CAD" | "AUD" | "SAR" | "QAR"
  | "INR" | "CNY" | "JPY" | "CHF" | "ZAR" | "TRY";

export const CURRENCY_CODES: readonly CurrencyCode[] = [
  "PKR", "USD", "GBP", "EUR", "AED", "CAD", "AUD", "SAR", "QAR",
  "INR", "CNY", "JPY", "CHF", "ZAR", "TRY",
];

/** ISO-style minor-unit precision. JPY has 0; most listed currencies have 2. */
export const CURRENCY_MINOR_UNITS: Record<CurrencyCode, number> = {
  PKR: 2, USD: 2, GBP: 2, EUR: 2, AED: 2, CAD: 2, AUD: 2, SAR: 2,
  QAR: 2, INR: 2, CNY: 2, JPY: 0, CHF: 2, ZAR: 2, TRY: 2,
};

export function isCurrencyCode(value: string): value is CurrencyCode {
  return CURRENCY_CODES.includes(value as CurrencyCode);
}

export function currencyMinorUnits(currency: CurrencyCode): number {
  return CURRENCY_MINOR_UNITS[currency];
}

export interface ExchangeRateSnapshot extends Timestamps, TenantScoped {
  id: ID;
  baseCurrency: CurrencyCode;
  quoteCurrency: CurrencyCode;
  rateNumerator: number;
  rateDenominator: number;
  asOf: string;
  provider?: string;
  sourceReference?: string;
}

export interface ConvertedMoneySnapshot {
  originalAmountMinor: number;
  originalCurrency: CurrencyCode;
  convertedAmountMinor: number;
  convertedCurrency: CurrencyCode;
  exchangeRateId?: ID;
  exchangeRate: number;
  convertedAt: string;
}

export function exchangeRateValue(rate: ExchangeRateSnapshot): number {
  if (!Number.isFinite(rate.rateNumerator) || !Number.isFinite(rate.rateDenominator) || rate.rateDenominator === 0) {
    return NaN;
  }
  return rate.rateNumerator / rate.rateDenominator;
}

export function convertMinorUnits(amountMinor: number, rate: ExchangeRateSnapshot, targetCurrency: CurrencyCode): number {
  if (rate.quoteCurrency !== targetCurrency) throw new Error("Exchange-rate quote currency does not match target currency");
  if (!Number.isInteger(amountMinor) || amountMinor < 0) throw new Error("Money amount must be a non-negative integer in minor units");
  const converted = amountMinor * exchangeRateValue(rate);
  if (!Number.isFinite(converted)) throw new Error("Invalid exchange rate");
  return Math.round(converted);
}
