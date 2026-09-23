import type { ID, Money, Timestamps, TenantScoped } from './shared';
export type InvoiceLifecycle='draft'|'issued'|'partially_paid'|'paid'|'overdue'|'void';
export interface InvoiceRecord extends Timestamps, TenantScoped { id:ID; clientId:ID; campaignId?:ID; invoiceNumber:string; status:InvoiceLifecycle; currency:string; subtotal:Money; tax:Money; total:Money; dueAt:string; }
export interface PaymentRecord extends Timestamps, TenantScoped { id:ID; invoiceId:ID; amount:Money; paidAt:string; providerRef?:string; method:'bank_transfer'|'cash'|'card'|'provider'|'other'; }
