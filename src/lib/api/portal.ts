import { apiRequest } from "@/lib/api/client";
import type { ProposalDetail } from "@/lib/api/proposals";

export interface PortalCompany {
  name: string; address: string; phone: string; email: string; ntn: string;
  bankName: string; bankTitle: string; bankIban: string; footer: string; currency: string; logoUrl?: string;
}
export interface PortalOverview {
  ok: boolean;
  client: { id: string; name: string; email: string | null; phone: string | null } | null;
  company: PortalCompany;
  kpis: {
    active_campaigns: number; outstanding: number; overdue: number; total_paid: number;
    next_due: { id: string; invoice_number: string; due_date: string; balance: number } | null;
    pending_creatives: number; open_proposals: number;
  };
}
export interface PortalCampaign {
  id: string; name: string; status: string; start_date: string; end_date: string;
  total_budget: number; currency: string; screens: number; pending_creatives: number;
}
export interface PortalCampaignDetail {
  ok: boolean;
  campaign: { id: string; name: string; status: string; start_date: string; end_date: string; total_budget: number; currency: string };
  screens: { slots: number; rate_applied: number; name: string | null; city: string | null; screen_type: string | null }[];
  creatives: { id: string; name: string; url: string | null; status: string; version: number; updated_at: string }[];
  proofs: { id: string; proof_date: string; photo_url: string | null; notes: string | null; screen_name: string | null; city: string | null }[];
}
export interface PortalProposal {
  id: string; code: string; campaign_name: string; status: string; start_date: string; end_date: string;
  valid_until: string | null; currency: string; total: number; screens: number;
}
export type PortalProposalDetail = ProposalDetail & { company: PortalCompany };
export interface PortalInvoice {
  id: string; invoice_number: string; issue_date: string; due_date: string;
  total_amount: number; amount_paid: number; currency: string; status: string; balance: number;
}
export interface PortalInvoiceDetail {
  ok: boolean;
  invoice: PortalInvoice & { subtotal?: number; discount_amount?: number; tax_rate?: number; tax_amount?: number; notes?: string | null };
  items: { description: string; quantity: number; rate: number; amount: number }[];
  payments: { id: string; amount: number; payment_date: string; payment_method: string | null; reference_no: string | null }[];
  notices: { id: string; amount: number | null; method: string | null; reference: string | null; status: string; created_at: string }[];
  client: { name: string; email: string | null; phone: string | null; address: string | null } | null;
  company: PortalCompany;
}
export interface PortalPayment { id: string; amount: number; payment_date: string; payment_method: string | null; reference_no: string | null; invoice_number: string; currency: string }
export interface PortalStatement {
  ok: boolean;
  invoices: { id: string; invoice_number: string; issue_date: string; due_date: string; total_amount: number; amount_paid: number; currency: string; status: string }[];
  payments: { amount: number; payment_date: string; payment_method: string | null; reference_no: string | null; invoice_number: string }[];
  client: { name: string; email: string | null; phone: string | null; address: string | null } | null;
  company: PortalCompany;
  as_of: string;
}

const body = (b: unknown): RequestInit => ({ body: JSON.stringify(b) });
const B = "/api/client-portal";

export const portalApi = {
  overview: () => apiRequest<PortalOverview>(`${B}/overview`),
  campaigns: () => apiRequest<{ ok: boolean; data: PortalCampaign[] }>(`${B}/campaigns`),
  campaign: (id: string) => apiRequest<PortalCampaignDetail>(`${B}/campaigns/${id}`),
  decideCreative: (campaignId: string, creativeId: string, decision: "approved" | "rejected", comment: string) =>
    apiRequest<{ ok: boolean }>(`${B}/campaigns/${campaignId}/creatives/${creativeId}/decision`, { method: "POST", ...body({ decision, comment }) }),
  proposals: () => apiRequest<{ ok: boolean; data: PortalProposal[] }>(`${B}/proposals`),
  proposal: (id: string) => apiRequest<PortalProposalDetail>(`${B}/proposals/${id}`),
  decideProposal: (id: string, decision: "accepted" | "rejected", name: string, comment: string) =>
    apiRequest<{ ok: boolean }>(`${B}/proposals/${id}/decision`, { method: "POST", ...body({ decision, name, comment }) }),
  invoices: () => apiRequest<{ ok: boolean; data: PortalInvoice[] }>(`${B}/invoices`),
  invoice: (id: string) => apiRequest<PortalInvoiceDetail>(`${B}/invoices/${id}`),
  paidNotice: (id: string, b: { reference: string; amount: number; method: string; note: string }) =>
    apiRequest<{ ok: boolean; message: string }>(`${B}/invoices/${id}/paid-notice`, { method: "POST", ...body(b) }),
  payments: () => apiRequest<{ ok: boolean; data: PortalPayment[] }>(`${B}/payments`),
  statement: () => apiRequest<PortalStatement>(`${B}/statement`),
  messages: () => apiRequest<{ ok: boolean; data: { id: string; subject: string | null; body: string; created_at: string }[] }>(`${B}/messages`),
  sendMessage: (subject: string, bodyText: string) => apiRequest<{ ok: boolean; message: string }>(`${B}/messages`, { method: "POST", ...body({ subject, body: bodyText }) }),
};
