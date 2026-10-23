import { apiRequest } from "@/lib/api/client";

export type RiskLevel = "none" | "low" | "watch" | "high" | "critical";

export interface ClientRisk {
  id: string;
  name: string;
  currency: string;
  credit_limit: number;
  outstanding: number;
  overdue: number;
  overdue_count: number;
  oldest_overdue_days: number;
  ageing: { current: number; d1_30: number; d31_60: number; d61_90: number; d90: number };
  accepted_proposals: number;
  unbilled_campaigns: number;
  exposure: number;
  utilization: number;
  headroom: number | null;
  avg_delay_days: number | null;
  on_time_pct: number | null;
  paid_invoices: number;
  last_payment_date: string | null;
  billed_12m: number;
  score: number;
  level: RiskLevel;
  on_hold: boolean;
  hold_reason: string | null;
  suggested_limit: number | null;
  phone: string | null;
  email: string | null;
}

export interface CreditHistoryRow {
  id: string;
  kind: string;
  old_limit: number | null;
  new_limit: number | null;
  reason: string | null;
  actor_email: string | null;
  created_at: string;
}

export interface CreditDetail {
  ok: boolean;
  risk: ClientRisk;
  history: CreditHistoryRow[];
  open_invoices: { id: string; invoice_number: string; due_date: string; balance: number; days_late: number }[];
}

const body = (b: unknown): RequestInit => ({ body: JSON.stringify(b) });

export const creditApi = {
  list: () => apiRequest<{ ok: boolean; data: ClientRisk[]; currency: string }>("/api/credit-risk"),
  get: (id: string) => apiRequest<CreditDetail>(`/api/credit-risk/${id}`),
  setLimit: (id: string, credit_limit: number, reason: string) =>
    apiRequest<{ ok: boolean }>(`/api/crm/clients/${id}/credit-limit`, { method: "PUT", ...body({ credit_limit, reason }) }),
  setHold: (id: string, on_hold: boolean, reason: string) =>
    apiRequest<{ ok: boolean }>(`/api/credit-risk/${id}/hold`, { method: "PUT", ...body({ on_hold, reason }) }),
};
