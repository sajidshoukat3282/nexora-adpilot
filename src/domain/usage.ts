import type { ID, TenantScoped } from './shared';
export interface UsageMetric extends TenantScoped { key:string; periodStart:string; periodEnd:string; value:number; limit:number|null; }
export interface UsageDecision { allowed:boolean; current:number; limit:number|null; reason?:string; }
export function checkUsage(current:number, increment:number, limit:number|null):UsageDecision { const next=current+increment; return limit!==null&&next>limit?{allowed:false,current,limit,reason:'Usage limit exceeded.'}:{allowed:true,current,limit}; }
