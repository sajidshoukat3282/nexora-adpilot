import type { ID, TenantScoped } from './shared';
export interface DeliveryMetric extends TenantScoped { campaignId:ID; assetId:ID; periodStart:string; periodEnd:string; plays:number|null; durationSec:number|null; completedPlays:number|null; impressions:number|null; cpmMinor:number|null; utilizationPct:number|null; uptimePct:number|null; }
export interface AnalyticsQuery { companyId:ID; campaignId?:ID; assetId?:ID; startAt:string; endAt:string; }
export interface AnalyticsProvider { query(input:AnalyticsQuery):Promise<DeliveryMetric[]>; }
