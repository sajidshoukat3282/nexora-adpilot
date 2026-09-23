import type { ID, Role, Permission } from "./shared";
import type { Subscription, EntitlementKey } from "./subscription";
import { hasEntitlement } from "./subscription";
import { roleHasPermission } from "./shared";
import { checkUsage } from "./usage";

export interface ProtectedRequestContext {
  accountId: ID;
  companyId: ID;
  membershipCompanyId: ID;
  role: Role;
  permission: Permission;
  entitlement?: EntitlementKey;
  subscription?: Subscription;
  seatUsage?: { current: number; increment?: number; limit: number | null };
  deviceUsage?: { current: number; increment?: number; limit: number | null };
}

export type ProtectedRequestStage =
  | "authentication"
  | "tenant"
  | "subscription"
  | "entitlement"
  | "seat"
  | "device"
  | "permission";

export interface ProtectedRequestDecision {
  allowed: boolean;
  stage: ProtectedRequestStage;
  reason?: string;
}

/**
 * Canonical authorization pipeline for the future server boundary.
 * The demo can exercise this logic, but it must be re-evaluated server-side
 * once authenticated API requests exist. Client state is never authoritative.
 */
export function authorizeProtectedRequest(ctx: ProtectedRequestContext): ProtectedRequestDecision {
  if (!ctx.accountId) return { allowed: false, stage: "authentication", reason: "Authentication required." };
  if (ctx.companyId !== ctx.membershipCompanyId) return { allowed: false, stage: "tenant", reason: "Tenant mismatch." };

  if (ctx.entitlement) {
    if (!ctx.subscription) return { allowed: false, stage: "subscription", reason: "Subscription context required." };
    const entitlement = hasEntitlement(ctx.subscription, ctx.entitlement);
    if (!entitlement.allowed) return { allowed: false, stage: "entitlement", reason: entitlement.reason };
  }

  if (ctx.seatUsage) {
    const seat = checkUsage(ctx.seatUsage.current, ctx.seatUsage.increment ?? 1, ctx.seatUsage.limit);
    if (!seat.allowed) return { allowed: false, stage: "seat", reason: seat.reason };
  }

  if (ctx.deviceUsage) {
    const device = checkUsage(ctx.deviceUsage.current, ctx.deviceUsage.increment ?? 1, ctx.deviceUsage.limit);
    if (!device.allowed) return { allowed: false, stage: "device", reason: device.reason };
  }

  if (!roleHasPermission(ctx.role, ctx.permission)) {
    return { allowed: false, stage: "permission", reason: "Permission denied." };
  }

  return { allowed: true, stage: "permission" };
}
