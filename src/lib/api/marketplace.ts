import { apiRequest } from "@/lib/api/client";

export interface MarketSettings { enabled: boolean; slug: string | null; headline: string; about: string; contact_phone: string; contact_email: string }
export interface MarketListing {
  id: string; name: string; city: string | null; location: string | null; screen_type: string | null; size: string | null;
  rate: number; currency: string; listed: boolean; title: string | null; description: string | null; photo_url: string | null; min_days: number | null;
}
export interface MarketAdmin { ok: boolean; settings: MarketSettings; public_url: string | null; listings: MarketListing[]; request_counts: Record<string, number> }
export interface MarketRequest {
  id: string; name: string; company_name: string | null; phone: string | null; email: string | null; start_date: string | null; end_date: string | null;
  budget: string | null; message: string | null; status: "new" | "contacted" | "quoted" | "won" | "lost"; notes: string | null; lead_id: string | null; created_at: string;
  screens: { id: string; name: string; busy_with: string | null }[];
}
export interface PublicListing { id: string; title: string; name: string; city: string | null; location: string | null; screen_type: string | null; size: string | null; description: string | null; min_days: number | null; photo: string | null }
export interface PublicPage { ok: boolean; name: string; headline: string; about: string; phone: string; email: string; logo: string | null; listings: PublicListing[] }
type Msg = { ok: boolean; message?: string };
const body = (b: unknown) => ({ headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) });

export const marketApi = {
  admin: () => apiRequest<MarketAdmin>("/api/marketplace/admin"),
  saveSettings: (b: Omit<MarketSettings, "slug">) => apiRequest<Msg>("/api/marketplace/settings", { method: "PUT", ...body(b) }),
  saveListing: (id: string, b: { listed: boolean; title: string; description: string; photo_url: string; min_days: number }) =>
    apiRequest<Msg>(`/api/marketplace/listings/${id}`, { method: "PUT", ...body(b) }),
  requests: (status = "") => apiRequest<{ ok: boolean; requests: MarketRequest[] }>(`/api/marketplace/requests${status ? `?status=${status}` : ""}`),
  updateRequest: (id: string, b: { status?: string; notes?: string }) => apiRequest<Msg>(`/api/marketplace/requests/${id}`, { method: "PUT", ...body(b) }),
  deleteRequest: (id: string) => apiRequest<Msg>(`/api/marketplace/requests/${id}`, { method: "DELETE" }),
  toLead: (id: string) => apiRequest<Msg & { lead_id: string }>(`/api/marketplace/requests/${id}/lead`, { method: "POST" }),
  publicPage: (slug: string) => apiRequest<PublicPage>(`/api/public/market/${slug}`),
  availability: (slug: string, start: string, end: string) => apiRequest<{ ok: boolean; unavailable: string[] }>(`/api/public/market/${slug}/availability?start=${start}&end=${end}`),
  sendRequest: (slug: string, b: Record<string, unknown>) => apiRequest<Msg>(`/api/public/market/${slug}/request`, { method: "POST", ...body(b) }),
};
