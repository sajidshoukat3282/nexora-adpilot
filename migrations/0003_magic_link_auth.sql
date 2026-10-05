CREATE TABLE IF NOT EXISTS magic_link_tokens (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  FOREIGN KEY (account_id) REFERENCES accounts(id)
);

CREATE INDEX IF NOT EXISTS idx_magic_link_tokens_account
  ON magic_link_tokens(account_id);

CREATE INDEX IF NOT EXISTS idx_magic_link_tokens_expires
  ON magic_link_tokens(expires_at);
