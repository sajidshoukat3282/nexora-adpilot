import type { ID, Money, TenantScoped } from './shared';
export type FinanceEntryType='revenue'|'expense'|'invoice'|'payment'|'refund'|'adjustment';
export interface FinanceEntry extends TenantScoped { id:ID; type:FinanceEntryType; referenceId?:ID; amount:Money; occurredAt:string; description:string; }
export interface FinancialVisibility { canViewRevenue:boolean; canViewCosts:boolean; canViewMargins:boolean; canViewProfit:boolean; }
