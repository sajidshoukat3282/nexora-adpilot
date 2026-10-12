CREATE TABLE IF NOT EXISTS email_verification_tokens (
id TEXT PRIMARY KEY,
account_id TEXT NOT NULL,
token_hash TEXT NOT NULL UNIQUE,
created_at TEXT NOT NULL,
expires_at TEXT NOT NULL,
used_at TEXT,
FOREIGN KEY (account_id) REFERENCES accounts(id)
);

CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_account
ON email_verification_tokens(account_id);

CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_expires
ON email_verification_tokens(expires_at);
