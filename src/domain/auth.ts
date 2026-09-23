import type { ID, Timestamps, TenantScoped } from './shared';
export type AccountStatus='pending'|'active'|'suspended'|'disabled';
export type MembershipStatus='invited'|'active'|'suspended'|'removed';
export type Designation='Owner'|'Director'|'Managing Director'|'CEO'|'COO'|'CFO'|'General Manager'|'Operations Manager'|'Sales Manager'|'Account Manager'|'Creative Director'|'Finance Manager'|'Executive'|'Coordinator'|'Field Officer'|'Custom';
export interface Account extends Timestamps { id:ID; email:string; status:AccountStatus; emailVerifiedAt?:string; lastLoginAt?:string; mfaEnabled:boolean; authProvider:'password'|'external'; }
export interface CompanyMembership extends Timestamps, TenantScoped { id:ID; accountId:ID; role:import('./shared').Role; designation:Designation|string; status:MembershipStatus; invitedByUserId?:ID; }
export interface AuthenticatedSession { accountId:ID; sessionId:ID; authenticatedAt:string; expiresAt:string; }
export interface TenantContext { companyId:ID; accountId:ID; membershipId:ID; }
