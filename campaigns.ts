import { apiRequest } from "@/lib/api/client";

export interface CampaignRow {
  id: string;
  client_id: string;
  client_name?: string | null;
  name: string;
  status: string;
  start_date: string;
  end_date: string;
  total_budget: number;
  currency: string;
}

export interface CampaignDetail extends CampaignRow {
  client_phone?: string | null;
  client_email?: string | null;
}

export interface CampaignScreen {
  id: string;
  inventory_id: string;
  rate_applied: number;
  name: string | null;
  city: string | null;
  screen_type: string | null;
  status: string | null;
  currency: string | null;
}

export interface CampaignInvoice {
  id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  status: string;
  total_amount: number;
  amount_paid: number;
  currency: string;
}

export interface CampaignExpense {
  id: string;
  category: string | null;
  description: string | null;
  amount: number;
  expense_date: string;
}

export interface CampaignActivityRow {
  id: string;
  actor_email: string | null;
  action: string;
  detail: string | null;
  created_at: string;
}

export interface CampaignBundle {
  ok: boolean;
  campaign: CampaignDetail;
  nextStatuses: string[];
  screens: CampaignScreen[];
  invoices: CampaignInvoice[];
  expenses: CampaignExpense[];
  activity: CampaignActivityRow[];
}

export interface Creative {
  id: string;
  name: string;
  url: string | null;
  notes: string | null;
  status: string;
  version: number;
  created_at: string;
  updated_at: string;
}
export interface CreativeReview {
  id: string;
  creative_id: string;
  from_status: string | null;
  to_status: string;
  comment: string | null;
  actor_email: string | null;
  created_at: string;
}
export interface Proof {
  id: string;
  inventory_id: string | null;
  screen_name: string | null;
  city: string | null;
  proof_date: string;
  photo_url: string | null;
  notes: string | null;
  actor_email: string | null;
  created_at: string;
}

const json = (body: unknown): RequestInit => ({ body: JSON.stringify(body) });

export const campaignsApi = {
  list: () => apiRequest<{ ok: boolean; data: CampaignRow[] }>("/api/campaigns"),
  get: (id: string) => apiRequest<CampaignBundle>(`/api/campaigns/${id}`),
  edit: (id: string, body: { name: string; start_date: string; end_date: string; total_budget: number; currency: string }) =>
    apiRequest<{ ok: boolean; message?: string }>(`/api/campaigns/${id}`, { method: "PUT", ...json(body) }),
  setStatus: (id: string, status: string) =>
    apiRequest<{ ok: boolean; message?: string }>(`/api/campaigns/${id}/status`, { method: "PUT", ...json({ status }) }),
  remove: (id: string) => apiRequest<{ ok: boolean; message?: string }>(`/api/campaigns/${id}`, { method: "DELETE" }),
  addScreen: (id: string, body: { inventory_id: string; rate_applied?: number; force?: boolean }) =>
    apiRequest<{ ok: boolean; message?: string }>(`/api/campaigns/${id}/screens`, { method: "POST", ...json(body) }),
  removeScreen: (id: string, csId: string) =>
    apiRequest<{ ok: boolean; message?: string }>(`/api/campaigns/${id}/screens/${csId}`, { method: "DELETE" }),
  duplicate: (id: string, body: { name?: string; start_date: string; end_date: string }) =>
    apiRequest<{ ok: boolean; id: string; message?: string }>(`/api/campaigns/${id}/duplicate`, { method: "POST", ...json(body) }),
  creatives: (id: string) =>
    apiRequest<{ ok: boolean; creatives: Creative[]; reviews: CreativeReview[]; next: Record<string, string[]> }>(`/api/campaigns/${id}/creatives`),
  addCreative: (id: string, body: { name: string; url?: string; notes?: string }) =>
    apiRequest<{ ok: boolean }>(`/api/campaigns/${id}/creatives`, { method: "POST", ...json(body) }),
  editCreative: (id: string, cid: string, body: { name: string; url?: string; notes?: string }) =>
    apiRequest<{ ok: boolean }>(`/api/campaigns/${id}/creatives/${cid}`, { method: "PUT", ...json(body) }),
  deleteCreative: (id: string, cid: string) =>
    apiRequest<{ ok: boolean }>(`/api/campaigns/${id}/creatives/${cid}`, { method: "DELETE" }),
  creativeStatus: (id: string, cid: string, status: string, comment?: string) =>
    apiRequest<{ ok: boolean }>(`/api/campaigns/${id}/creatives/${cid}/status`, { method: "POST", ...json({ status, comment }) }),
  proofs: (id: string) => apiRequest<{ ok: boolean; proofs: Proof[] }>(`/api/campaigns/${id}/proofs`),
  addProof: (id: string, body: { proof_date: string; inventory_id?: string; photo_url?: string; notes?: string }) =>
    apiRequest<{ ok: boolean }>(`/api/campaigns/${id}/proofs`, { method: "POST", ...json(body) }),
  deleteProof: (id: string, pid: string) => apiRequest<{ ok: boolean }>(`/api/campaigns/${id}/proofs/${pid}`, { method: "DELETE" }),
};
