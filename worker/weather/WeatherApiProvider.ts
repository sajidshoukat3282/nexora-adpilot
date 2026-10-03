import type {
  CurrentWeather,
  WeatherCondition,
  WeatherForecastDay,
  WeatherLocation,
  WeatherProvider,
  WeatherSnapshot,
} from "@/domain/weather";

interface WeatherApiResponse {
  location?: {
    name?: string;
    localtime?: string;
  };
  current?: {
    temp_c?: number;
    feelslike_c?: number;
    humidity?: number;
    wind_kph?: number;
    precip_mm?: number;
    condition?: {
      text?: string;
      code?: number;
    };
  };
  forecast?: {
    forecastday?: Array<{
      date?: string;
      day?: {
        mintemp_c?: number;
        maxtemp_c?: number;
        totalprecip_mm?: number;
        daily_chance_of_rain?: number;
        condition?: {
          text?: string;
          code?: number;
        };
      };
    }>;
  };
}

export interface WeatherApiProviderOptions {
  apiKey: string;
  fetchImpl?: typeof fetch;
}

function mapCondition(text = "", code?: number): WeatherCondition {
  const value = text.toLowerCase();

  if (code === 1087 || code === 1273 || code === 1276 || value.includes("thunder")) {
    return "thunderstorm";
  }

  if (
    value.includes("heavy rain") ||
    value.includes("torrential") ||
    value.includes("moderate or heavy rain")
  ) {
    return "heavy_rain";
  }

  if (
    value.includes("rain") ||
    value.includes("drizzle") ||
    value.includes("shower")
  ) {
    return "rain";
  }

  if (value.includes("snow") || value.includes("sleet") || value.includes("ice")) {
    return "snow";
  }

  if (value.includes("fog") || value.includes("mist")) {
    return "fog";
  }

  if (value.includes("partly")) {
    return "partly_cloudy";
  }

  if (value.includes("cloudy") || value.includes("overcast")) {
    return "cloudy";
  }

  if (value.includes("clear") || value.includes("sunny")) {
    return "clear";
  }

  return "unknown";
}

function isRainCondition(condition: WeatherCondition): boolean {
  return (
    condition === "rain" ||
    condition === "heavy_rain" ||
    condition === "thunderstorm"
  );
}

function requireNumber(value: number | undefined, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Invalid WeatherAPI response: ${field}`);
  }

  return value;
}

export class WeatherApiProvider implements WeatherProvider {
  private readonly apiKey: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: WeatherApiProviderOptions) {
    if (!options.apiKey.trim()) {
      throw new Error("WeatherAPI API key is required");
    }

    this.apiKey = options.apiKey;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async getWeather(
    location: WeatherLocation,
    forecastDays = 3,
  ): Promise<WeatherSnapshot> {
    const days = Math.min(Math.max(Math.trunc(forecastDays), 1), 3);

    const query = `${location.coordinates.lat},${location.coordinates.lng}`;
    const url = new URL("https://api.weatherapi.com/v1/forecast.json");

    url.searchParams.set("key", this.apiKey);
    url.searchParams.set("q", query);
    url.searchParams.set("days", String(days));
    url.searchParams.set("aqi", "no");
    url.searchParams.set("alerts", "no");

    const response = await this.fetchImpl(url.toString());

    if (!response.ok) {
      throw new Error(`WeatherAPI request failed: ${response.status}`);
    }

    const payload = (await response.json()) as WeatherApiResponse;

    if (!payload.current || !payload.forecast?.forecastday) {
      throw new Error("Invalid WeatherAPI response");
    }

    const currentCondition = mapCondition(
      payload.current.condition?.text,
      payload.current.condition?.code,
    );

    const current: CurrentWeather = {
      observedAt: payload.location?.localtime ?? new Date().toISOString(),
      temperatureC: requireNumber(payload.current.temp_c, "current.temp_c"),
      feelsLikeC:
        typeof payload.current.feelslike_c === "number"
          ? payload.current.feelslike_c
          : null,
      humidityPercent:
        typeof payload.current.humidity === "number"
          ? payload.current.humidity
          : null,
      windKph:
        typeof payload.current.wind_kph === "number"
          ? payload.current.wind_kph
          : null,
      precipitationMm:
        typeof payload.current.precip_mm === "number"
          ? payload.current.precip_mm
          : null,
      rainProbabilityPercent: null,
      condition: currentCondition,
      isRaining: isRainCondition(currentCondition),
    };

    const forecast: WeatherForecastDay[] = payload.forecast.forecastday
      .slice(0, days)
      .map((day) => {
        const condition = mapCondition(
          day.day?.condition?.text,
          day.day?.condition?.code,
        );

        return {
          date: day.date ?? "",
          minTemperatureC:
            typeof day.day?.mintemp_c === "number"
              ? day.day.mintemp_c
              : null,
          maxTemperatureC:
            typeof day.day?.maxtemp_c === "number"
              ? day.day.maxtemp_c
              : null,
          precipitationMm:
            typeof day.day?.totalprecip_mm === "number"
              ? day.day.totalprecip_mm
              : null,
          rainProbabilityPercent:
            typeof day.day?.daily_chance_of_rain === "number"
              ? day.day.daily_chance_of_rain
              : null,
          condition,
          isRainExpected: isRainCondition(condition),
        };
      });

    return {
      location,
      current,
      forecast,
      provider: "weatherapi.com",
      fetchedAt: new Date().toISOString(),
    };
  }
}
