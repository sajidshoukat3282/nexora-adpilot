import type { Invoice, Payment } from "@/domain";
import { money } from "@/domain";
import { COMPANY } from "./company";
import { isoDaysAgo, daysFromNow } from "./helpers";

export const INVOICES: Invoice[] = [
  {
    id: "invoice-1", companyId: COMPANY.id, code: "INV-3081", clientId: "client-zenith", campaignId: "campaign-1",
    status: "paid", issueDate: isoDaysAgo(14).slice(0,10), dueDate: isoDaysAgo(-1).slice(0,10),
    items: [{ id: "ii-1", description: "Zenith Summer Refresh — Media + Fees", quantity: 1, unitPriceCents: 2055000, totalCents: 2055000 }],
    total: money(2055000), amountPaid: money(2055000),
    createdAt: isoDaysAgo(14), updatedAt: isoDaysAgo(8),
  },
  {
    id: "invoice-2", companyId: COMPANY.id, code: "INV-3082", clientId: "client-orbit", campaignId: "campaign-2",
    status: "partially_paid", issueDate: isoDaysAgo(10).slice(0,10), dueDate: daysFromNow(5).slice(0,10),
    items: [{ id: "ii-2", description: "Orbit 5G Launch — Media + Fees", quantity: 1, unitPriceCents: 627000, totalCents: 627000 }],
    total: money(627000), amountPaid: money(300000),
    createdAt: isoDaysAgo(10), updatedAt: isoDaysAgo(3),
  },
  {
    id: "invoice-3", companyId: COMPANY.id, code: "INV-3070", clientId: "client-pinnacle", campaignId: "campaign-4",
    status: "paid", issueDate: isoDaysAgo(30).slice(0,10), dueDate: isoDaysAgo(15).slice(0,10),
    items: [{ id: "ii-3", description: "Pinnacle Motors New Model Reveal — Media + Fees", quantity: 1, unitPriceCents: 1373000, totalCents: 1373000 }],
    total: money(1373000), amountPaid: money(1373000),
    createdAt: isoDaysAgo(30), updatedAt: isoDaysAgo(20),
  },
  {
    id: "invoice-4", companyId: COMPANY.id, code: "INV-3090", clientId: "client-lumen", campaignId: "campaign-3",
    status: "sent", issueDate: isoDaysAgo(1).slice(0,10), dueDate: daysFromNow(14).slice(0,10),
    items: [{ id: "ii-4", description: "Lumen Digital Savings Push — Deposit (50%)", quantity: 1, unitPriceCents: 502500, totalCents: 502500 }],
    total: money(502500), amountPaid: money(0),
    createdAt: isoDaysAgo(1), updatedAt: isoDaysAgo(1),
  },
  {
    id: "invoice-5", companyId: COMPANY.id, code: "INV-3055", clientId: "client-pinnacle", campaignId: "campaign-9",
    status: "overdue", issueDate: isoDaysAgo(45).slice(0,10), dueDate: isoDaysAgo(15).slice(0,10),
    items: [{ id: "ii-5", description: "Pinnacle Motors Service Reminder — Final Balance", quantity: 1, unitPriceCents: 165000, totalCents: 165000 }],
    total: money(165000), amountPaid: money(0),
    createdAt: isoDaysAgo(45), updatedAt: isoDaysAgo(45),
  },
];

export const PAYMENTS: Payment[] = [
  { id: "pay-1", companyId: COMPANY.id, invoiceId: "invoice-1", amount: money(2055000), method: "bank_transfer", reference: "TXN-88213", paidAt: isoDaysAgo(8), createdAt: isoDaysAgo(8), updatedAt: isoDaysAgo(8) },
  { id: "pay-2", companyId: COMPANY.id, invoiceId: "invoice-2", amount: money(300000), method: "bank_transfer", reference: "TXN-88340", paidAt: isoDaysAgo(3), createdAt: isoDaysAgo(3), updatedAt: isoDaysAgo(3) },
  { id: "pay-3", companyId: COMPANY.id, invoiceId: "invoice-3", amount: money(1373000), method: "cheque", reference: "CHQ-00219", paidAt: isoDaysAgo(20), createdAt: isoDaysAgo(20), updatedAt: isoDaysAgo(20) },
];

export function invoiceById(id: string): Invoice | undefined {
  return INVOICES.find((i) => i.id === id);
}
