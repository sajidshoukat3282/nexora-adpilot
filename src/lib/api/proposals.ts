import { apiRequest } from "@/lib/api/client";

export interface ProposalRow {
  id: string;
  code: string;
  client_id: string;
  client_name: string | null;
  campaign_name: string;
  status: string;
  start_date: string;
  end_date: string;
  discount_pct: number;
  tax_rate: number;
  valid_until: string | null;
  currency: string;
  campaign_id: string | null;
  sent_at: string | null;
  decided_at: string | null;
  created_at: string;
  screens: number;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
}

export interface ProposalItemRow {
  id: string;
  inventory_id: string;
  description: string | null;
  slots: number;
  rate: number;
  days: number;
  name: string | null;
  city: string | null;
  screen_type: string | null;
}

export interface ProposalDetail {
  ok: boolean;
  proposal: ProposalRow & { terms: string | null; notes: string | null; client_email: string | null; client_phone: string | null; revision_of: string | null };
  items: ProposalItemRow[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  nextStatuses: string[];
  activity: { id: string; actor_email: string | null; action: string; detail: string | null; created_at: string }[];
  campaign: { id: string; name: string } | null;
}

export interface ProposalInput {
  client_id: string;
  campaign_name: string;
  start_date: string;
  end_date: string;
  discount_pct: number;
  tax_rate: number;
  valid_until: string;
  currency: string;
  terms: string;
  notes: string;
  items: { inventory_id: string; slots: number; rate: number; days: number }[];
}

const body = (b: unknown): RequestInit => ({ body: JSON.stringify(b) });

export const proposalsApi = {
  list: () => apiRequest<{ ok: boolean; proposals: ProposalRow[] }>("/api/proposals"),
  get: (id: string) => apiRequest<ProposalDetail>(`/api/proposals/${id}`),
  create: (b: ProposalInput) => apiRequest<{ ok: boolean; id: string; code: string }>("/api/proposals", { method: "POST", ...body(b) }),
  edit: (id: string, b: ProposalInput) => apiRequest<{ ok: boolean }>(`/api/proposals/${id}`, { method: "PUT", ...body(b) }),
  setStatus: (id: string, status: string) => apiRequest<{ ok: boolean; message?: string }>(`/api/proposals/${id}/status`, { method: "PUT", ...body({ status }) }),
  remove: (id: string) => apiRequest<{ ok: boolean }>(`/api/proposals/${id}`, { method: "DELETE" }),
  revise: (id: string) => apiRequest<{ ok: boolean; id: string; code: string }>(`/api/proposals/${id}/revise`, { method: "POST" }),
  convert: (id: string, force = false, credit_override = false) => apiRequest<{ ok: boolean; campaign_id: string; message?: string }>(`/api/proposals/${id}/convert`, { method: "POST", ...body({ force, credit_override }) }),
};
