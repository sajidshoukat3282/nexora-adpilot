import type { ID, Timestamps, TenantScoped } from './shared';
export type NotificationChannel='in_app'|'email'|'sms'|'whatsapp';
export type NotificationStatus='queued'|'sent'|'delivered'|'failed'|'read';
export interface NotificationMessage extends Timestamps, TenantScoped { id:ID; recipientAccountId:ID; channel:NotificationChannel; subject?:string; body:string; status:NotificationStatus; relatedEntityType?:string; relatedEntityId?:ID; }
export interface NotificationProvider { send(message:NotificationMessage):Promise<NotificationMessage>; }
