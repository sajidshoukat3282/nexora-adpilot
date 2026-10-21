import { apiRequest } from "@/lib/api/client";

export interface AuditEntry {
  id: string;
  actor: string | null;
  action: string;
  detail: string | null;
  at: string;
}

export interface AdminOverview {
  ok: true;
  auditLog: AuditEntry[];
  invites: { membershipId: string; expiresAt: string }[];
  security: {
    activeSessions: number;
    activeMembers: number;
    mfaEnabled: number;
    unverifiedEmails: number;
  };
}

export interface SetupStatus {
  profile: boolean;
  clients: number;
  leads: number;
  screens: number;
  campaigns: number;
  invoices: number;
  payments: number;
  expenses: number;
  team: number;
}

export function getAdminOverview(): Promise<AdminOverview> {
  return apiRequest<AdminOverview>("/api/admin/overview");
}

export async function getSetupStatus(): Promise<SetupStatus> {
  const res = await apiRequest<{ ok: true; status: SetupStatus }>("/api/admin/setup-status");
  return res.status;
}

export function changeDefaultCurrency(currency: string): Promise<{ ok: true; message: string; currency: string }> {
  return apiRequest("/api/admin/currency", {
    method: "POST",
    body: JSON.stringify({ currency }),
  });
}
