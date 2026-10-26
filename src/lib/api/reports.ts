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

export interface LeakageReport {
  ok: boolean;
  currency: string;
  period: { from: string; to: string; days: number };
  unsold: {
    value: number; slot_days: number; not_sellable_screens: number; missing_rate: number;
    rows: { id: string; name: string; city: string; rate: number; free_slot_days: number; occupancy: number; unsold_value: number; no_rate: boolean }[];
  };
  discount: { value: number; rows: { id: string; name: string; client_name: string; screens: number; card_value: number; lost: number; pct: number }[] };
  not_invoiced: { value: number; rows: { id: string; name: string; client_name: string; status: string; start_date: string; contract: number; invoiced: number; gap: number }[] };
  uncollected: { outstanding: number; overdue: number; rows: { id: string; invoice_number: string; client_name: string; due_date: string; balance: number; days_late: number }[] };
  delivery: { tracked_screens: number; booked_days: number; missed_days: number; missed_value: number; rows: { id: string; name: string; client_name: string; screens: number; booked_days: number; missed_days: number; value: number }[] };
  lost: {
    cancelled: { count: number; value: number; rows: { id: string; name: string; client_name: string; start_date: string; end_date: string; value: number }[] };
    delayed: { count: number; value: number; rows: { id: string; name: string; client_name: string; status: string; start_date: string; days_late: number; value: number }[] };
    incidents: { count: number; open: number; at_risk_value: number; rows: { id: string; title: string; severity: string; status: string; created: string; campaign_name: string; screen_name: string; value: number }[] };
  };
}

export interface ForecastReport {
  ok: boolean;
  currency: string;
  months: { key: string; booked: number; collections: number }[];
  later_collections: number;
  pipeline: { open_leads: number; value: number; weighted: number };
  campaigns: { id: string; name: string; client_name: string; status: string; end_date: string; m1: number; m2: number; m3: number; total: number }[];
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
  forecast: () => apiRequest<ForecastReport>(`/api/reports/forecast`),
  leakage: (from: string, to: string) => apiRequest<LeakageReport>(`/api/reports/leakage?from=${from}&to=${to}`),
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
