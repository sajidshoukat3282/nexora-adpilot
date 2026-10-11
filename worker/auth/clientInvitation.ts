const INVITATION_TTL_SECONDS = 60 * 60 * 24;

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function generateToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export interface ClientInvitation {
  companyId: string;
  accountId: string;
  membershipId: string;
  invitedByAccountId: string;
}

export async function createClientInvitationToken(
  db: D1Database,
  input: ClientInvitation,
): Promise<{ token: string; expiresAt: string }> {
  const token = generateToken();
  const tokenHash = await sha256(token);
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + INVITATION_TTL_SECONDS * 1000,
  );

  await db.prepare(
    `INSERT INTO client_invitation_tokens
      (id, company_id, account_id, membership_id, token_hash,
       invited_by_account_id, created_at, expires_at, used_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
  ).bind(
    crypto.randomUUID(),
    input.companyId,
    input.accountId,
    input.membershipId,
    tokenHash,
    input.invitedByAccountId,
    now.toISOString(),
    expiresAt.toISOString(),
  ).run();

  return { token, expiresAt: expiresAt.toISOString() };
}

export async function consumeClientInvitationToken(
  db: D1Database,
  token: string,
): Promise<{
  accountId: string;
  companyId: string;
  membershipId: string;
} | null> {
  if (!token) return null;

  const tokenHash = await sha256(token);
  const now = new Date().toISOString();

  // Conditional UPDATE ensures a token can be claimed only once.
  const result = await db.prepare(
    `UPDATE client_invitation_tokens
     SET used_at = ?
     WHERE token_hash = ?
       AND used_at IS NULL
       AND expires_at > ?`,
  ).bind(now, tokenHash, now).run();

  if (result.meta.changes !== 1) return null;

  const row = await db.prepare(
    `SELECT account_id, company_id, membership_id
     FROM client_invitation_tokens
     WHERE token_hash = ?
       AND used_at = ?
     LIMIT 1`,
  ).bind(tokenHash, now).first<{
    account_id: string;
    company_id: string;
    membership_id: string;
  }>();

  if (!row) return null;

  return {
    accountId: row.account_id,
    companyId: row.company_id,
    membershipId: row.membership_id,
  };
}
