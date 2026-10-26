import { apiRequest } from "@/lib/api/client";

export interface SuggestRow {
  id: string;
  name: string;
  city: string;
  location: string;
  type: "Digital" | "Static";
  rate: number;
  currency: string;
  cost: number;
  free_days: number;
  days: number;
  city_match: boolean;
  demand: number;
  score: number;
  reasons: string[];
  ready: boolean;
}

export interface SuggestResult {
  ok: boolean;
  period: { from: string; to: string; days: number };
  want: number;
  slots: number;
  budget: number;
  pick: string[];
  pick_total: number;
  rows: SuggestRow[];
  screens_checked: number;
}

export interface SuggestParams {
  from: string;
  to: string;
  city?: string;
  type?: "" | "digital" | "static";
  budget?: number;
  screens?: number;
  slots?: number;
}

export const inventorySuggestApi = {
  suggest: (p: SuggestParams) => {
    const q = new URLSearchParams({ from: p.from, to: p.to });
    if (p.city) q.set("city", p.city);
    if (p.type) q.set("type", p.type);
    if (p.budget && p.budget > 0) q.set("budget", String(p.budget));
    if (p.screens) q.set("screens", String(p.screens));
    if (p.slots) q.set("slots", String(p.slots));
    return apiRequest<SuggestResult>(`/api/inventory/suggest?${q.toString()}`);
  },
};
