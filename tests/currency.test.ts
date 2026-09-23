import { describe, expect, it } from "vitest";
import { convertMinorUnits, currencyMinorUnits, type ExchangeRateSnapshot } from "@/domain/currency";

describe("currency foundation", () => {
  it("keeps zero-decimal currency precision explicit", () => {
    expect(currencyMinorUnits("JPY")).toBe(0);
    expect(currencyMinorUnits("USD")).toBe(2);
  });

  it("converts integer minor units using a stored rate snapshot", () => {
    const rate: ExchangeRateSnapshot = {
      id: "rate-1",
      companyId: "company-1",
      baseCurrency: "USD",
      quoteCurrency: "PKR",
      rateNumerator: 280,
      rateDenominator: 1,
      asOf: "2026-01-01T00:00:00.000Z",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };

    expect(convertMinorUnits(100, rate, "PKR")).toBe(28000);
  });
});
