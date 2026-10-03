import { apiRequest } from "@/lib/api/client";
import type { Company, Permission, Role, User } from "@/domain";

export interface ServerSession {
  accountId: string;
  sessionId: string;
  companyId: string;
  membershipId: string;
  accountType: "owner" | "employee" | "client";
  role: Role;
  designation: string;
  permissions: Permission[];
  expiresAt: string;
}

interface AuthAccount {
  id: string;
  email: string;
}

interface AuthCompany {
  id: string;
  name?: string;
  plan?: "trial" | "growth" | "enterprise";
  logoInitial?: string;
  seatsUsed?: number;
  seatsLimit?: number;
  devicesActive?: number;
  devicesLimit?: number;
  timezone?: string;
  defaultCurrency?: string;
}

interface AuthMembership {
  id: string;
  role: Role;
  designation: string;
  accountType: "owner" | "employee" | "client";
}

interface AuthResponse {
  ok: true;
  authenticated: true;
  account: AuthAccount;
  company: AuthCompany;
  membership: AuthMembership;
  session: ServerSession;
  expiresAt: string;
}

interface SessionResponse {
  ok: true;
  authenticated: true;
  account: AuthAccount;
  company: AuthCompany;
  membership: AuthMembership;
  session: ServerSession;
}

export interface AuthResult {
  user: User;
  company: Company;
  session: ServerSession;
}

function mapUser(
  account: AuthAccount,
  session: ServerSession,
): User {
  const name =
    account.email
      .split("@")[0]
      .replace(/[._-]+/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase()) || "User";

  const now = new Date().toISOString();

  return {
    id: account.id,
    companyId: session.companyId,
    name,
    email: account.email,
    role: session.role,
    avatarInitial: name.charAt(0).toUpperCase(),
    lastActiveAt: now,
    createdAt: now,
    updatedAt: now,
  };
}

function mapCompany(
  company: AuthCompany,
  session: ServerSession,
): Company {
  const name = company.name || "Nexora AdPilot";
  const now = new Date().toISOString();

  return {
    id: company.id || session.companyId,
    name,
    plan: company.plan || "trial",
    logoInitial: company.logoInitial || name.charAt(0).toUpperCase(),
    seatsUsed: company.seatsUsed ?? 0,
    seatsLimit: company.seatsLimit ?? 1,
    devicesActive: company.devicesActive ?? 0,
    devicesLimit: company.devicesLimit ?? 0,
    timezone: company.timezone || "Asia/Karachi",
    defaultCurrency: (company.defaultCurrency || "PKR") as Company["defaultCurrency"],
    createdAt: now,
    updatedAt: now,
  };
}

function mapResult(
  response: AuthResponse | SessionResponse,
): AuthResult {
  return {
    user: mapUser(response.account, response.session),
    company: mapCompany(response.company, response.session),
    session: response.session,
  };
}

export async function login(
  email: string,
  password: string,
): Promise<AuthResult> {
  const response = await apiRequest<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  return mapResult(response);
}

export async function getSession(): Promise<AuthResult | null> {
  try {
    const response = await apiRequest<SessionResponse>("/api/session");
    return mapResult(response);
  } catch (error) {
    if (
      error instanceof Error &&
      "status" in error &&
      (error as Error & { status?: number }).status === 401
    ) {
      return null;
    }

    throw error;
  }
}

export async function logout(): Promise<void> {
  await apiRequest("/api/auth/logout", {
    method: "POST",
  });
}
