import type { ID, TenantScoped } from './shared';
export type ClientPortalVisibility='campaigns'|'proposals'|'approvals'|'creatives'|'schedules'|'reports'|'proof'|'invoices';
export interface ClientPortalAccess extends TenantScoped { id:ID; clientId:ID; accountId:ID; enabled:boolean; visibility:ClientPortalVisibility[]; }
export function isClientVisible(visibility:ClientPortalVisibility[], section:ClientPortalVisibility):boolean{return visibility.includes(section);}
