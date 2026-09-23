import React from "react";
import type { Permission } from "@/domain";
import { useSession } from "@/hooks/useSession";
import { PermissionDenied } from "./Feedback";

/**
 * Wraps content that requires a permission. Phase 1 has no server-side
 * enforcement (that's Phase 3+) — this demonstrates the RBAC *pattern* by
 * gating the UI based on the currently-selected demo role.
 */
export const PermissionGate: React.FC<{
  permission: Permission;
  action?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ permission, action, children, fallback }) => {
  const { can } = useSession();
  if (can(permission)) return <>{children}</>;
  return <>{fallback ?? <PermissionDenied action={action} />}</>;
};
