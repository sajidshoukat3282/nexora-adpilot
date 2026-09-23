import type { ID } from './shared';
import type { Role } from './shared';
export interface PermissionContext { accountId:ID; companyId:ID; role:Role; permissions:string[]; }
export interface AuthorizationDecision { allowed:boolean; reason?:string; }
export function authorize(ctx:PermissionContext, permission:string):AuthorizationDecision { return ctx.permissions.includes(permission)?{allowed:true}:{allowed:false,reason:`Missing permission: ${permission}`}; }
export interface AuditEvent { id:ID; companyId:ID; actorUserId:ID; action:string; entityType:string; entityId:ID; occurredAt:string; metadata:Record<string,string|number|boolean|null>; }
