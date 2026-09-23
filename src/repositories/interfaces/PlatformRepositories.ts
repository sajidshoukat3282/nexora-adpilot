import type { ID } from '@/domain';
export interface AccountRepository { getById(id:ID):Promise<import('@/domain').Account|null>; }
export interface MembershipRepository { get(accountId:ID,companyId:ID):Promise<import('@/domain').CompanyMembership|null>; listForAccount(accountId:ID):Promise<import('@/domain').CompanyMembership[]>; }
export interface DeviceRepository { list():Promise<import('@/domain').RegisteredDevice[]>; register(input:Omit<import('@/domain').RegisteredDevice,'id'|'createdAt'|'updatedAt'>):Promise<import('@/domain').RegisteredDevice>; }
export interface IntegrationRepository { list():Promise<import('@/domain').IntegrationConfig[]>; }
export interface ClientPortalRepository { getAccess(accountId:ID):Promise<import('@/domain').ClientPortalAccess|null>; }
