/**
 * Company-wide defaults (currency, phone country code) that plain helper
 * functions can read without props. AppShell refreshes them on every render,
 * so they are always in sync with the signed-in workspace.
 */

let currency = "PKR";
let dialCode = "92";

/** phone dial codes for the supported currencies (EUR is multi-country, so no guess) */
const CURRENCY_DIAL: Record<string, string> = {
  PKR: "92", USD: "1", CAD: "1", GBP: "44", AED: "971", SAR: "966", QAR: "974",
  INR: "91", AUD: "61", CNY: "86", JPY: "81", CHF: "41", ZAR: "27", TRY: "90",
};

const COUNTRY_DIAL: Record<string, string> = {
  pakistan: "92", "united states": "1", usa: "1", us: "1", "united states of america": "1",
  canada: "1", "united kingdom": "44", uk: "44", "great britain": "44", england: "44",
  "united arab emirates": "971", uae: "971", "saudi arabia": "966", ksa: "966", qatar: "974",
  india: "91", australia: "61", china: "86", japan: "81", switzerland: "41",
  "south africa": "27", turkey: "90", germany: "49", france: "33", italy: "39", spain: "34",
  netherlands: "31", ireland: "353",
};

/** Dial code from the company's country (preferred) or its currency. "" when unknown. */
export function dialCodeFor(country?: string | null, currencyCode?: string | null): string {
  const byCountry = COUNTRY_DIAL[String(country ?? "").trim().toLowerCase()];
  if (byCountry) return byCountry;
  return CURRENCY_DIAL[String(currencyCode ?? "").toUpperCase()] ?? "";
}

export function setCompanyDefaults(next: { currency?: string | null; country?: string | null }): void {
  const c = String(next.currency ?? "").toUpperCase();
  if (c) currency = c;
  dialCode = dialCodeFor(next.country, c || currency);
}

export const getDefaultCurrency = (): string => currency;
export const getDefaultDialCode = (): string => dialCode;
