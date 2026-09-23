import type { ID, Timestamps, TenantScoped } from './shared';
export type DeliveryStatus='pending'|'queued'|'sent'|'acknowledged'|'failed'|'cancelled';
export interface DeliveryCommand extends TenantScoped { id:ID; campaignId:ID; assetId:ID; creativeVersionId:ID; action:'publish'|'unpublish'|'sync'; requestedByUserId:ID; requestedAt:string; status:DeliveryStatus; providerRef?:string; }
export interface ScreenHealth extends Timestamps, TenantScoped { assetId:ID; online:boolean; lastSeenAt?:string; playerVersion?:string; providerRef?:string; }
export interface DeliveryProvider { publish(command:DeliveryCommand):Promise<DeliveryCommand>; unpublish(command:DeliveryCommand):Promise<DeliveryCommand>; health(assetId:ID):Promise<ScreenHealth|null>; }
