import { apiRequest } from "@/lib/api/client";

export interface PlatformCompany {
  id: string; name: string; plan: string; owner_email: string | null; created_at: string; last_login: string | null; team: number;
  screens: number; campaigns: number; clients: number; invoices: number; storage_bytes: number;
}
export interface PlatformOverview {
  ok: boolean;
  totals: { companies: number; active_7d: number; new_this_month: number; trial: number; storage_bytes: number };
  weeks: { week: string; n: number }[];
  companies: PlatformCompany[];
}
export const platformApi = {
  me: () => apiRequest<{ ok: boolean; admin: boolean }>("/api/platform/me"),
  overview: () => apiRequest<PlatformOverview>("/api/platform/overview"),
};
