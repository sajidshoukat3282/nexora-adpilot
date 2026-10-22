import { apiRequest } from "@/lib/api/client";

export interface Kpis {
  invoiced: number;
  invoiceCount: number;
  received: number;
  expenses: number;
  profit: number;
  margin: number;
  campaignsStarted: number;
  newClients: number;
  newLeads: number;
}

export interface ReportSummary {
  ok: boolean;
  currency: string;
  period: { from: string; to: string; days: number; prevFrom: string; prevTo: string };
  kpis: { current: Kpis; previous: Kpis };
  outstanding: number;
  overdue: number;
  trend: { month: string; invoiced: number; received: number; expenses: number; profit: number }[];
  topClients: { id: string; name: string; invoiced: number; invoices: number; received: number }[];
  topScreens: { id: string; name: string; type: string; city: string; occupancy: number; revenue: number }[];
  aging: {
    buckets: { key: string; label: string; amount: number; count: number }[];
    rows: { id: string; invoice_number: string; client_name: string; issue_date: string; due_date: string; balance: number; days_late: number }[];
  };
  pnl: { revenue: number; invoiced: number; expensesByCategory: { category: string; amount: number }[]; expenses: number; net: number };
  campaigns: {
    id: string; name: string; status: string; client_name: string; start_date: string; end_date: string;
    contract: number; invoiced: number; received: number; expenses: number; profit: number; screens: number; slots: number;
  }[];
  inventory: {
    occupancy: number;
    rows: { id: string; name: string; type: string; city: string; status: string; capacity: number; occupancy: number; revenue: number }[];
  };
  funnel: {
    leads: { stage: string; count: number; value: number }[];
    totalLeads: number;
    won: number;
    conversion: number;
    campaignsByStatus: { status: string; count: number; value: number }[];
    campaignCount: number;
    avgCampaignValue: number;
  };
}

export interface Statement {
  ok: boolean;
  currency: string;
  client: { id: string; name: string; email: string | null; phone: string | null; address: string | null };
  period: { from: string; to: string };
  opening: number;
  closing: number;
  totals: { debit: number; credit: number };
  lines: { date: string; kind: "invoice" | "payment"; ref: string; description: string; debit: number; credit: number; balance: number }[];
}

export interface EmailLog {
  id: string;
  kind: string;
  recipients: string | null;
  status: string;
  error: string | null;
  created_at: string;
}

export interface SavedReport {
  id: string;
  name: string;
  report: string;
  params: string | null;
  created_at: string;
}

const body = (b: unknown): RequestInit => ({ body: JSON.stringify(b) });

export const reportsApi = {
  summary: (from: string, to: string) => apiRequest<ReportSummary>(`/api/reports/summary?from=${from}&to=${to}`),
  clients: () => apiRequest<{ ok: boolean; clients: { id: string; name: string }[] }>("/api/reports/clients"),
  statement: (id: string, from: string, to: string) => apiRequest<Statement>(`/api/reports/statement/${id}?from=${from}&to=${to}`),
  emailPreview: () => apiRequest<{ ok: boolean; subject: string; html: string }>("/api/reports/email/preview"),
  emailHistory: () => apiRequest<{ ok: boolean; history: EmailLog[] }>("/api/reports/email/history"),
  emailSend: (to: "me" | "all") => apiRequest<{ ok: boolean; message: string }>("/api/reports/email/send", { method: "POST", ...body({ to }) }),
  saved: () => apiRequest<{ ok: boolean; saved: SavedReport[] }>("/api/reports/saved"),
  save: (name: string, report: string, params: unknown) => apiRequest<{ ok: boolean }>("/api/reports/saved", { method: "POST", ...body({ name, report, params }) }),
  removeSaved: (id: string) => apiRequest<{ ok: boolean }>(`/api/reports/saved/${id}`, { method: "DELETE" }),
  saveEmailSettings: (day: string, extra: string) =>
    apiRequest<{ ok: boolean }>("/api/company/email-settings", { method: "PUT", ...body({ report_email_day: day, report_extra_emails: extra }) }),
};
