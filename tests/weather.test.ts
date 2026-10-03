import { describe, expect, it } from "vitest";
import {
  normalizeForecastDays,
  type WeatherCondition,
} from "@/domain/weather";

describe("Weather domain", () => {
  it("clamps forecast days to 1-3", () => {
    expect(normalizeForecastDays()).toBe(3);
    expect(normalizeForecastDays(0)).toBe(1);
    expect(normalizeForecastDays(2)).toBe(2);
    expect(normalizeForecastDays(5)).toBe(3);
  });

  it("accepts the defined weather condition model", () => {
    const conditions: WeatherCondition[] = [
      "clear",
      "partly_cloudy",
      "cloudy",
      "rain",
      "heavy_rain",
      "thunderstorm",
      "snow",
      "fog",
      "unknown",
    ];

    expect(conditions).toHaveLength(9);
  });
});
