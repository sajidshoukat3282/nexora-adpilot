import type { Permission, Role } from "../../src/domain/shared";

export interface SessionContext {
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

const SESSION_COOKIE = "adpilot_session";

const ALL_PERMISSIONS: Permission[] = [
  "campaigns.manage",
  "inventory.manage",
  "creatives.manage",
  "creatives.approve",
  "operations.manage",
  "operations.override",
  "crm.manage",
  "proposals.manage",
  "finance.view",
  "finance.manage",
  "company.manage",
  "reports.view",
  "reports.generate",
  "reports.send",
  "client_portal.view",
  "proof.view",
  "proof.submit",
  "analytics.view",
  "subscription.view",
];

function getSessionToken(request: Request): string | null {
  const cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader) return null;

  for (const part of cookieHeader.split(";")) {
    const [name, ...valueParts] = part.trim().split("=");

    if (name === SESSION_COOKIE) {
      const value = valueParts.join("=").trim();
      return value || null;
    }
  }

  return null;
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function resolveSession(
  request: Request,
  db: D1Database,
): Promise<SessionContext | null> {
  const token = getSessionToken(request);

  if (!token) return null;

  const tokenHash = await sha256(token);
  const now = new Date().toISOString();

  const row = await db
    .prepare(
      `SELECT
        s.id AS session_id,
        s.account_id,
        s.membership_id,
        s.expires_at,
        a.status AS account_status,
        cm.company_id,
        cm.account_type,
        cm.role,
        cm.designation,
        cm.status AS membership_status
       FROM sessions s
       INNER JOIN accounts a
         ON a.id = s.account_id
       INNER JOIN company_memberships cm
         ON cm.id = s.membership_id
        AND cm.account_id = s.account_id
       WHERE s.token_hash = ?
         AND s.revoked_at IS NULL
         AND s.expires_at > ?
       LIMIT 1`,
    )
    .bind(tokenHash, now)
    .first<{
      session_id: string;
      account_id: string;
      membership_id: string;
      expires_at: string;
      account_status: string;
      company_id: string;
      account_type: "owner" | "employee" | "client";
      role: Role;
      designation: string;
      membership_status: string;
    }>();

  if (!row) return null;

  if (row.account_status !== "active") return null;
  if (row.membership_status !== "active") return null;

  let permissions: Permission[];

  if (row.account_type === "owner") {
    permissions = [...ALL_PERMISSIONS];
  } else {
    const permissionRows = await db
      .prepare(
        `SELECT permission
         FROM company_membership_permissions
         WHERE membership_id = ?
           AND revoked_at IS NULL
           AND (expires_at IS NULL OR expires_at > ?)`,
      )
      .bind(row.membership_id, now)
      .all<{ permission: Permission }>();

    permissions = permissionRows.results.map(
      (item) => item.permission,
    );
  }

  await db
    .prepare(
      "UPDATE sessions SET last_seen_at = ? WHERE id = ?",
    )
    .bind(now, row.session_id)
    .run();

  return {
    accountId: row.account_id,
    sessionId: row.session_id,
    companyId: row.company_id,
    membershipId: row.membership_id,
    accountType: row.account_type,
    role: row.role,
    designation: row.designation,
    permissions,
    expiresAt: row.expires_at,
  };
}

export function hasPermission(
  session: SessionContext,
  permission: Permission,
): boolean {
  return session.permissions.includes(permission);
}
