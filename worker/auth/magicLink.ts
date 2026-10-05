const MAGIC_LINK_TTL_SECONDS = 10 * 60;

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function generateToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));

  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

export interface CreatedMagicLink {
  token: string;
  tokenId: string;
  expiresAt: string;
}

export async function createMagicLinkToken(
  db: D1Database,
  accountId: string,
): Promise<CreatedMagicLink> {
  const tokenId = crypto.randomUUID();
  const token = generateToken();
  const tokenHash = await sha256(token);

  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + MAGIC_LINK_TTL_SECONDS * 1000,
  );

  await db
    .prepare(
      `INSERT INTO magic_link_tokens (
        id,
        account_id,
        token_hash,
        created_at,
        expires_at,
        used_at
      )
      VALUES (?, ?, ?, ?, ?, NULL)`,
    )
    .bind(
      tokenId,
      accountId,
      tokenHash,
      now.toISOString(),
      expiresAt.toISOString(),
    )
    .run();

  return {
    token,
    tokenId,
    expiresAt: expiresAt.toISOString(),
  };
}

export async function consumeMagicLinkToken(
  db: D1Database,
  token: string,
): Promise<string | null> {
  if (!token) return null;

  const tokenHash = await sha256(token);
  const now = new Date().toISOString();

  const result = await db
    .prepare(
      `UPDATE magic_link_tokens
       SET used_at = ?
       WHERE token_hash = ?
         AND used_at IS NULL
         AND expires_at > ?`,
    )
    .bind(now, tokenHash, now)
    .run();

  if (result.meta.changes !== 1) {
    return null;
  }

  const row = await db
    .prepare(
      `SELECT account_id
       FROM magic_link_tokens
       WHERE token_hash = ?
       LIMIT 1`,
    )
    .bind(tokenHash)
    .first<{ account_id: string }>();

  return row?.account_id ?? null;
}
