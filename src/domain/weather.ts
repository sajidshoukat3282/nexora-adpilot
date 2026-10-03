import type { GeoCoordinate, GeographyPath } from "./geography";

export type WeatherCondition =
  | "clear"
  | "partly_cloudy"
  | "cloudy"
  | "rain"
  | "heavy_rain"
  | "thunderstorm"
  | "snow"
  | "fog"
  | "unknown";

export interface WeatherLocation {
  geographyId: string;
  label: string;
  coordinates: GeoCoordinate;
  path?: GeographyPath;
}

export interface CurrentWeather {
  observedAt: string;
  temperatureC: number;
  feelsLikeC: number | null;
  humidityPercent: number | null;
  windKph: number | null;
  precipitationMm: number | null;
  rainProbabilityPercent: number | null;
  condition: WeatherCondition;
  isRaining: boolean;
}

export interface WeatherForecastDay {
  date: string;
  minTemperatureC: number | null;
  maxTemperatureC: number | null;
  precipitationMm: number | null;
  rainProbabilityPercent: number | null;
  condition: WeatherCondition;
  isRainExpected: boolean;
}

export interface WeatherSnapshot {
  location: WeatherLocation;
  current: CurrentWeather;
  forecast: WeatherForecastDay[];
  provider: string;
  fetchedAt: string;
}

export interface WeatherProvider {
  getWeather(
    location: WeatherLocation,
    forecastDays?: number,
  ): Promise<WeatherSnapshot>;
}

export function normalizeForecastDays(days = 3): number {
  return Math.min(Math.max(Math.trunc(days), 1), 3);
}
