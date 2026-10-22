import type { Bill } from "@/lib/api/accounting";

export const isoToday = (): string => new Date().toISOString().slice(0, 10);

export function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export const outstanding = (b: Bill): number => Math.max(0, Math.round((b.total_amount - b.amount_paid) * 100) / 100);

/** Sum a list of {amount,currency} into one total per currency. */
export function sumByCurrency(items: { amount: number; currency: string }[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const i of items) out[i.currency] = Math.round(((out[i.currency] ?? 0) + i.amount) * 100) / 100;
  return out;
}

export function billStats(bills: Bill[], today = isoToday()) {
  const open = bills.filter((b) => b.status !== "paid");
  const soonLimit = addDays(today, 7);
  return {
    due: sumByCurrency(open.map((b) => ({ amount: outstanding(b), currency: b.currency }))),
    overdue: sumByCurrency(open.filter((b) => b.due_date < today).map((b) => ({ amount: outstanding(b), currency: b.currency }))),
    soon: sumByCurrency(open.filter((b) => b.due_date >= today && b.due_date <= soonLimit).map((b) => ({ amount: outstanding(b), currency: b.currency }))),
    openCount: open.length,
    overdueCount: open.filter((b) => b.due_date < today).length,
  };
}

/* ---------------- periods ---------------- */

export type PeriodKey = "month" | "last-month" | "quarter" | "year" | "custom";

export function periodRange(key: PeriodKey, now = new Date(), custom?: { from: string; to: string }): { from: string; to: string } {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  if (key === "month") return { from: iso(new Date(Date.UTC(y, m, 1))), to: iso(new Date(Date.UTC(y, m + 1, 0))) };
  if (key === "last-month") return { from: iso(new Date(Date.UTC(y, m - 1, 1))), to: iso(new Date(Date.UTC(y, m, 0))) };
  if (key === "quarter") {
    const q = Math.floor(m / 3) * 3;
    return { from: iso(new Date(Date.UTC(y, q, 1))), to: iso(new Date(Date.UTC(y, q + 3, 0))) };
  }
  if (key === "year") return { from: `${y}-01-01`, to: `${y}-12-31` };
  return custom ?? { from: `${y}-01-01`, to: `${y}-12-31` };
}

const inRange = (d: unknown, r: { from: string; to: string }): boolean => {
  const s = String(d ?? "").slice(0, 10);
  return s >= r.from && s <= r.to;
};

/* ---------------- tax summary ---------------- */

export interface TaxRow {
  currency: string;
  sales: number;
  outputTax: number;
  purchases: number;
  inputTax: number;
  net: number;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Output tax from issued (non-draft) invoices, input tax from bills, per currency. */
export function taxSummary(invoices: any[], bills: Bill[], range: { from: string; to: string }): TaxRow[] {
  const map: Record<string, TaxRow> = {};
  const row = (c: string) => (map[c] ??= { currency: c, sales: 0, outputTax: 0, purchases: 0, inputTax: 0, net: 0 });
  for (const i of invoices) {
    if (i.status === "draft" || !inRange(i.issue_date, range)) continue;
    const r = row(String(i.currency || "PKR"));
    const tax = Number(i.tax_amount) || 0;
    r.outputTax += tax;
    r.sales += (Number(i.total_amount) || 0) - tax;
  }
  for (const b of bills) {
    if (!inRange(b.bill_date, range)) continue;
    const r = row(b.currency);
    r.inputTax += b.tax_amount;
    r.purchases += b.subtotal;
  }
  return Object.values(map).map((r) => ({
    currency: r.currency,
    sales: r2(r.sales),
    outputTax: r2(r.outputTax),
    purchases: r2(r.purchases),
    inputTax: r2(r.inputTax),
    net: r2(r.outputTax - r.inputTax),
  }));
}

/* ---------------- exports ---------------- */

export type Row = Record<string, unknown>;

const issued = (invoices: any[], range: { from: string; to: string }) =>
  invoices.filter((i) => i.status !== "draft" && inRange(i.issue_date, range));

/** One line per invoice, using Xero's sales-invoice import column names. */
export function xeroInvoiceRows(invoices: any[], clients: any[], range: { from: string; to: string }): { rows: Row[]; columns: { key: string; label: string }[] } {
  const email = (id: string) => clients.find((c) => String(c.id) === String(id))?.email ?? "";
  const rows = issued(invoices, range).map((i) => {
    const tax = Number(i.tax_amount) || 0;
    return {
      contact: i.client_name,
      email: email(i.client_id),
      number: i.invoice_number,
      ref: i.campaign_id ? "Campaign" : "",
      date: String(i.issue_date).slice(0, 10),
      due: String(i.due_date).slice(0, 10),
      desc: `Invoice ${i.invoice_number}`,
      qty: 1,
      unit: r2((Number(i.total_amount) || 0) - tax),
      account: "200",
      taxType: tax > 0 ? "Tax on Sales" : "No Tax",
      currency: i.currency || "PKR",
    };
  });
  return {
    rows,
    columns: [
      { key: "contact", label: "*ContactName" }, { key: "email", label: "EmailAddress" },
      { key: "number", label: "*InvoiceNumber" }, { key: "ref", label: "Reference" },
      { key: "date", label: "*InvoiceDate" }, { key: "due", label: "*DueDate" },
      { key: "desc", label: "Description" }, { key: "qty", label: "*Quantity" },
      { key: "unit", label: "*UnitAmount" }, { key: "account", label: "*AccountCode" },
      { key: "taxType", label: "*TaxType" }, { key: "currency", label: "Currency" },
    ],
  };
}

/** One line per invoice, using QuickBooks' invoice import column names. */
export function quickbooksInvoiceRows(invoices: any[], range: { from: string; to: string }): { rows: Row[]; columns: { key: string; label: string }[] } {
  const rows = issued(invoices, range).map((i) => {
    const tax = Number(i.tax_amount) || 0;
    const net = r2((Number(i.total_amount) || 0) - tax);
    return {
      no: i.invoice_number,
      customer: i.client_name,
      date: String(i.issue_date).slice(0, 10),
      due: String(i.due_date).slice(0, 10),
      memo: i.notes ?? "",
      item: "Services",
      desc: `Invoice ${i.invoice_number}`,
      qty: 1,
      rate: net,
      amount: net,
      taxCode: tax > 0 ? "Tax" : "Non",
      taxAmount: r2(tax),
      currency: i.currency || "PKR",
    };
  });
  return {
    rows,
    columns: [
      { key: "no", label: "InvoiceNo" }, { key: "customer", label: "Customer" },
      { key: "date", label: "InvoiceDate" }, { key: "due", label: "DueDate" }, { key: "memo", label: "Memo" },
      { key: "item", label: "Item(Product/Service)" }, { key: "desc", label: "ItemDescription" },
      { key: "qty", label: "ItemQuantity" }, { key: "rate", label: "ItemRate" }, { key: "amount", label: "ItemAmount" },
      { key: "taxCode", label: "ItemTaxCode" }, { key: "taxAmount", label: "ItemTaxAmount" }, { key: "currency", label: "Currency" },
    ],
  };
}

export function paymentRows(payments: any[], range: { from: string; to: string }) {
  return {
    rows: payments
      .filter((p) => inRange(p.payment_date, range))
      .map((p) => ({
        date: String(p.payment_date).slice(0, 10), client: p.client_name, invoice: p.invoice_number,
        amount: p.amount, method: p.payment_method ?? "", ref: p.reference_no ?? "",
      })) as Row[],
    columns: [
      { key: "date", label: "Date" }, { key: "client", label: "Client" }, { key: "invoice", label: "Invoice" },
      { key: "amount", label: "Amount" }, { key: "method", label: "Method" }, { key: "ref", label: "Reference" },
    ],
  };
}

export function expenseRows(expenses: any[], range: { from: string; to: string }) {
  return {
    rows: expenses
      .filter((e) => inRange(e.expense_date, range))
      .map((e) => ({
        date: String(e.expense_date).slice(0, 10), category: e.category, description: e.description ?? "",
        amount: e.amount, method: e.payment_method ?? "", ref: e.reference_no ?? "",
      })) as Row[],
    columns: [
      { key: "date", label: "Date" }, { key: "category", label: "Category" }, { key: "description", label: "Description" },
      { key: "amount", label: "Amount" }, { key: "method", label: "Method" }, { key: "ref", label: "Reference" },
    ],
  };
}

export function billRows(bills: Bill[], range: { from: string; to: string }) {
  return {
    rows: bills
      .filter((b) => inRange(b.bill_date, range))
      .map((b) => ({
        vendor: b.vendor_name, number: b.bill_number ?? "", date: b.bill_date, due: b.due_date,
        subtotal: b.subtotal, tax: b.tax_amount, total: b.total_amount, paid: b.amount_paid,
        balance: outstanding(b), status: b.status, currency: b.currency,
      })) as Row[],
    columns: [
      { key: "vendor", label: "Vendor" }, { key: "number", label: "Bill No" }, { key: "date", label: "Bill Date" },
      { key: "due", label: "Due Date" }, { key: "subtotal", label: "Amount" }, { key: "tax", label: "Tax" },
      { key: "total", label: "Total" }, { key: "paid", label: "Paid" }, { key: "balance", label: "Balance" },
      { key: "status", label: "Status" }, { key: "currency", label: "Currency" },
    ],
  };
}

export function taxRows(rows: TaxRow[], range: { from: string; to: string }) {
  return {
    rows: rows.map((r) => ({ period: `${range.from} to ${range.to}`, ...r })) as Row[],
    columns: [
      { key: "period", label: "Period" }, { key: "currency", label: "Currency" },
      { key: "sales", label: "Sales (before tax)" }, { key: "outputTax", label: "Output tax (collected)" },
      { key: "purchases", label: "Purchases (before tax)" }, { key: "inputTax", label: "Input tax (paid)" },
      { key: "net", label: "Net tax payable" },
    ],
  };
}
