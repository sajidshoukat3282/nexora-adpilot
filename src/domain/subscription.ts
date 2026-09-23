import type { ID, Timestamps, TenantScoped } from './shared';
export type PlanId='starter'|'professional'|'business'|'enterprise';
export type SubscriptionStatus='trial'|'active'|'past_due'|'paused'|'cancelled'|'expired';
export type BillingCycle='monthly'|'annual';
export type EntitlementKey='crm'|'inventory'|'campaigns'|'advanced_planning'|'proof_of_play'|'field_verification'|'analytics'|'finance'|'client_portal'|'api'|'programmatic'|'ai_planning';
export interface SubscriptionPlan { id:PlanId; name:string; entitlements:EntitlementKey[]; maxSeats:number|null; maxDevices:number|null; usageLimits:Record<string,number|null>; }
export interface Subscription extends Timestamps, TenantScoped { id:ID; planId:PlanId; status:SubscriptionStatus; billingCycle:BillingCycle; startsAt:string; renewsAt?:string; cancellationAt?:string; trialEndsAt?:string; graceEndsAt?:string; maxSeats:number|null; maxDevices:number|null; paymentStatus:'pending'|'paid'|'failed'|'unknown'; }
export interface EntitlementDecision { allowed:boolean; reason?:string; }
export function hasEntitlement(s:Subscription,key:EntitlementKey):EntitlementDecision { return ['trial','active'].includes(s.status)&&PLAN_ENTITLEMENTS[s.planId].includes(key)?{allowed:true}:{allowed:false,reason:'Subscription does not grant this entitlement.'}; }
const PLAN_ENTITLEMENTS:Record<PlanId,EntitlementKey[]>={starter:['crm','inventory','campaigns'],professional:['crm','inventory','campaigns','advanced_planning','analytics','client_portal','proof_of_play','field_verification'],business:['crm','inventory','campaigns','advanced_planning','analytics','finance','client_portal','proof_of_play','field_verification','api'],enterprise:['crm','inventory','campaigns','advanced_planning','analytics','finance','client_portal','proof_of_play','field_verification','api','programmatic','ai_planning']};
