import type { ID, Timestamps, TenantScoped, Money } from "./shared";

export type InvoiceStatus = "draft" | "sent" | "partially_paid" | "paid" | "overdue" | "void";

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  partially_paid: "Partially Paid",
  paid: "Paid",
  overdue: "Overdue",
  void: "Void",
};

export interface InvoiceItem {
  id: ID;
  description: string;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
}

export interface Invoice extends Timestamps, TenantScoped {
  id: ID;
  code: string; // e.g. "INV-2031"
  clientId: ID;
  campaignId: ID | null;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  items: InvoiceItem[];
  total: Money;
  amountPaid: Money;
}

export type PaymentMethod = "bank_transfer" | "card" | "cheque" | "cash";

export interface Payment extends Timestamps, TenantScoped {
  id: ID;
  invoiceId: ID;
  amount: Money;
  method: PaymentMethod;
  reference: string;
  paidAt: string;
}
