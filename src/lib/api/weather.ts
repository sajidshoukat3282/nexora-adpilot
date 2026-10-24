import { apiRequest } from "@/lib/api/client";

export interface WarnItem { kind: string; level: "warn" | "bad"; text: string }
export interface WeatherView {
  temp: number; feels: number | null; condition: string; label: string; humidity: number | null; wind: number | null;
  rain_today: number | null;
  days: { date: string; min: number | null; max: number | null; rain: number | null; label: string }[];
  warnings: WarnItem[];
  fetched_at: string;
}
export interface CampaignWeather {
  ok: boolean; configured: boolean;
  summary: { total: number; affected: number; unavailable: number; missing: number };
  screens: { id: string; name: string; city: string; location: string; has_location: boolean; weather: WeatherView | null }[];
}
export interface CompanyWeather {
  ok: boolean; configured: boolean; source: string; live_screens: number;
  areas: { name: string; screens: number; weather: WeatherView | null }[];
  alerts: { campaign_id: string; campaign: string; screen: string; city: string; kind: string; level: "warn" | "bad"; text: string }[];
}

export const weatherApi = {
  campaign: (id: string) => apiRequest<CampaignWeather>(`/api/weather/campaign/${encodeURIComponent(id)}`),
  company: () => apiRequest<CompanyWeather>("/api/weather/company"),
};
