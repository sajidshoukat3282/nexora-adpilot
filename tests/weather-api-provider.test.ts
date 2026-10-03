import { describe, expect, it, vi } from "vitest";
import { WeatherApiProvider } from "../worker/weather/WeatherApiProvider";

describe("WeatherApiProvider", () => {
  it("maps WeatherAPI response into the weather domain model", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          location: {
            name: "Lahore",
            localtime: "2026-10-02 15:00",
          },
          current: {
            temp_c: 31,
            feelslike_c: 34,
            humidity: 58,
            wind_kph: 12,
            precip_mm: 0,
            condition: {
              text: "Partly cloudy",
              code: 1003,
            },
          },
          forecast: {
            forecastday: [
              {
                date: "2026-10-02",
                day: {
                  mintemp_c: 24,
                  maxtemp_c: 33,
                  totalprecip_mm: 0.2,
                  daily_chance_of_rain: 20,
                  condition: {
                    text: "Partly cloudy",
                    code: 1003,
                  },
                },
              },
              {
                date: "2026-10-03",
                day: {
                  mintemp_c: 23,
                  maxtemp_c: 32,
                  totalprecip_mm: 4.5,
                  daily_chance_of_rain: 70,
                  condition: {
                    text: "Moderate rain",
                    code: 1189,
                  },
                },
              },
              {
                date: "2026-10-04",
                day: {
                  mintemp_c: 22,
                  maxtemp_c: 31,
                  totalprecip_mm: 8,
                  daily_chance_of_rain: 80,
                  condition: {
                    text: "Heavy rain",
                    code: 1195,
                  },
                },
              },
            ],
          },
        }),
        { status: 200 },
      ),
    );

    const provider = new WeatherApiProvider({
      apiKey: "test-key",
      fetchImpl: fetchMock,
    });

    const result = await provider.getWeather(
      {
        geographyId: "geo-lahore",
        label: "Gulberg, Lahore",
        coordinates: {
          lat: 31.5074,
          lng: 74.3453,
        },
      },
      3,
    );

    expect(result.provider).toBe("weatherapi.com");
    expect(result.location.label).toBe("Gulberg, Lahore");

    expect(result.current.temperatureC).toBe(31);
    expect(result.current.humidityPercent).toBe(58);
    expect(result.current.condition).toBe("partly_cloudy");
    expect(result.current.isRaining).toBe(false);

    expect(result.forecast).toHaveLength(3);
    expect(result.forecast[0].rainProbabilityPercent).toBe(20);
    expect(result.forecast[1].condition).toBe("rain");
    expect(result.forecast[1].isRainExpected).toBe(true);
    expect(result.forecast[2].condition).toBe("heavy_rain");

    const requestedUrl = String(fetchMock.mock.calls[0][0]);

    expect(requestedUrl).toContain("api.weatherapi.com");
    expect(requestedUrl).toContain("forecast.json");
    expect(requestedUrl).toContain("days=3");
    expect(requestedUrl).toContain("q=31.5074%2C74.3453");
  });

  it("rejects an empty API key", () => {
    expect(
      () =>
        new WeatherApiProvider({
          apiKey: "",
        }),
    ).toThrow("WeatherAPI API key is required");
  });
});
