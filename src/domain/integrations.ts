import type { ID, TenantScoped } from './shared';
export type IntegrationKind='cms'|'dooh_player'|'payment'|'maps'|'geocoding'|'analytics'|'email'|'messaging'|'crm'|'api'|'dsp'|'ssp'|'programmatic';
export interface IntegrationConfig extends TenantScoped { id:ID; kind:IntegrationKind; providerKey:string; enabled:boolean; externalAccountRef?:string; }
export interface IntegrationCapability { kind:IntegrationKind; operations:string[]; version?:string; }
export interface ProgrammaticContract { protocol:'openrtb'|'pmp'|'custom'; version:string; capabilities:string[]; }
export interface IntegrationProvider { capabilities():Promise<IntegrationCapability[]>; }
