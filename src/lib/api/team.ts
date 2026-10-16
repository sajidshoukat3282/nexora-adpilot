import { apiRequest } from "@/lib/api/client";
import type { Permission, Role } from "@/domain";

export type MemberStatus = "invited" | "active" | "suspended" | "removed";

export interface TeamMember {
  membershipId: string;
  accountId: string;
  email: string;
  role: Role;
  designation: string;
  accountType: "owner" | "employee" | "client";
  status: MemberStatus;
  createdAt: string;
  lastLoginAt: string | null;
  isYou: boolean;
  permissions: Permission[];
}

export interface TeamResponse {
  ok: true;
  seats: { used: number; limit: number };
  members: TeamMember[];
}

export function getTeam(): Promise<TeamResponse> {
  return apiRequest<TeamResponse>("/api/team");
}

export function inviteMember(input: {
  email: string;
  role: Role;
  designation: string;
  permissions: Permission[];
}): Promise<{ ok: true; emailSent: boolean; message: string }> {
  return apiRequest("/api/team/invite", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateMember(
  membershipId: string,
  input: { permissions: Permission[]; role?: Role; designation?: string },
): Promise<{ ok: true; message: string }> {
  return apiRequest(`/api/team/${membershipId}/permissions`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export type MemberAction = "suspend" | "reactivate" | "remove" | "resend-invite";

export function memberAction(
  membershipId: string,
  action: MemberAction,
): Promise<{ ok: true; message: string }> {
  return apiRequest(`/api/team/${membershipId}/${action}`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function getInvitation(
  token: string,
): Promise<{ ok: true; email: string; companyName: string; designation: string }> {
  return apiRequest(`/api/auth/invitation?token=${encodeURIComponent(token)}`);
}

export function acceptInvitation(
  token: string,
  password: string,
): Promise<{ ok: true; message: string }> {
  return apiRequest("/api/auth/invitation/accept", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });
}
