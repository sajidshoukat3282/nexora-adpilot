import { apiRequest } from "@/lib/api/client";

export interface Vendor {
  id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  ntn: string | null;
  category: string | null;
  notes: string | null;
  outstanding: number;
  bill_count: number;
}

export interface Bill {
  id: string;
  vendor_id: string;
  vendor_name: string;
  bill_number: string | null;
  bill_date: string;
  due_date: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  amount_paid: number;
  currency: string;
  status: "unpaid" | "partial" | "overdue" | "paid";
  notes: string | null;
}

export interface CashAccount {
  id: string;
  name: string;
  kind: "cash" | "bank" | "wallet";
  opening_balance: number;
  currency: string;
  balance: number;
}

export interface AccountTx {
  id: string;
  account_id: string;
  tx_date: string;
  direction: "in" | "out";
  amount: number;
  description: string | null;
  ref_type: string | null;
}

type Msg = { ok: true; message: string };
const send = (method: string, path: string, body?: unknown) =>
  apiRequest<Msg>(path, { method, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
const list = async <T>(path: string): Promise<T[]> => (await apiRequest<{ ok: true; data: T[] }>(path)).data;

export const getVendors = () => list<Vendor>("/api/accounting/vendors");
export const saveVendor = (v: Partial<Vendor>, id?: string) =>
  send(id ? "PUT" : "POST", id ? `/api/accounting/vendors/${id}` : "/api/accounting/vendors", v);
export const deleteVendor = (id: string) => send("DELETE", `/api/accounting/vendors/${id}`);

export const getBills = () => list<Bill>("/api/accounting/bills");
export const createBill = (b: Record<string, unknown>) => send("POST", "/api/accounting/bills", b);
export const deleteBill = (id: string) => send("DELETE", `/api/accounting/bills/${id}`);
export const payBill = (id: string, p: Record<string, unknown>) => send("POST", `/api/accounting/bills/${id}/pay`, p);

export const getAccounts = () => list<CashAccount>("/api/accounting/accounts");
export const createAccount = (a: Record<string, unknown>) => send("POST", "/api/accounting/accounts", a);
export const deleteAccount = (id: string) => send("DELETE", `/api/accounting/accounts/${id}`);
export const addTransaction = (accountId: string, t: Record<string, unknown>) =>
  send("POST", `/api/accounting/accounts/${accountId}/transactions`, t);
export const getTransactions = (accountId?: string) =>
  list<AccountTx>(`/api/accounting/transactions${accountId ? `?account_id=${encodeURIComponent(accountId)}` : ""}`);
export const deleteTransaction = (id: string) => send("DELETE", `/api/accounting/transactions/${id}`);

export interface UnlinkedPayment {
  id: string;
  amount: number;
  payment_date: string;
  payment_method: string | null;
  invoice_number: string;
  currency: string;
  client_name: string;
}
export const getUnlinkedPayments = () => list<UnlinkedPayment>("/api/accounting/payments/unlinked");
export const depositPayment = (paymentId: string, accountId: string) =>
  send("POST", `/api/accounting/payments/${paymentId}/deposit`, { account_id: accountId });
