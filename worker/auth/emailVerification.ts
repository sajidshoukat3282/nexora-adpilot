const TOKEN_TTL_MINUTES = 10;

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function sha256(value: string): Promise<string> {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return bytesToHex(new Uint8Array(digest));
}

export async function createEmailVerificationToken(
  db: D1Database,
  accountId: string,
): Promise<{ token: string; expiresAt: string }> {
  const token = bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
  const tokenHash = await sha256(token);
  const now = new Date();
  const createdAt = now.toISOString();
  const expiresAt = new Date(
    now.getTime() + TOKEN_TTL_MINUTES * 60 * 1000,
  ).toISOString();

  await db.batch([
    db.prepare(
      `UPDATE email_verification_tokens
       SET used_at = ?
       WHERE account_id = ? AND used_at IS NULL`,
    ).bind(createdAt, accountId),
    db.prepare(
      `INSERT INTO email_verification_tokens
       (id, account_id, token_hash, created_at, expires_at, used_at)
       VALUES (?, ?, ?, ?, ?, NULL)`,
    ).bind(crypto.randomUUID(), accountId, tokenHash, createdAt, expiresAt),
  ]);

  return { token, expiresAt };
}

export async function consumeEmailVerificationToken(
  db: D1Database,
  token: string,
): Promise<string | null> {
  if (!/^[a-f0-9]{64}$/i.test(token)) return null;

  const tokenHash = await sha256(token);
  const now = new Date().toISOString();

  const result = await db.prepare(
    `UPDATE email_verification_tokens
     SET used_at = ?
     WHERE token_hash = ?
       AND used_at IS NULL
       AND expires_at > ?
     RETURNING account_id`,
  ).bind(now, tokenHash, now).first<{ account_id: string }>();

  return result?.account_id ?? null;
}
