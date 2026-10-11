CREATE TABLE IF NOT EXISTS client_invitation_tokens (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  membership_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  invited_by_account_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (account_id) REFERENCES accounts(id),
  FOREIGN KEY (membership_id) REFERENCES company_memberships(id),
  FOREIGN KEY (invited_by_account_id) REFERENCES accounts(id)
);

CREATE INDEX IF NOT EXISTS idx_client_invitation_tokens_account
  ON client_invitation_tokens(account_id);

CREATE INDEX IF NOT EXISTS idx_client_invitation_tokens_expiry
  ON client_invitation_tokens(expires_at);
