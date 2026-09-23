import type { ID, Timestamps, TenantScoped } from './shared';
export type DeviceType='dooh_player'|'field_device'|'kiosk'|'operational';
export type DeviceStatus='pending'|'active'|'suspended'|'revoked';
export interface RegisteredDevice extends Timestamps, TenantScoped { id:ID; type:DeviceType; name:string; status:DeviceStatus; externalDeviceRef?:string; lastSeenAt?:string; }
export interface DeviceEntitlement { maxDevices:number|null; activeDevices:number; allowed:boolean; reason?:string; }
