PRAGMA foreign_keys=OFF;

CREATE TABLE accounts_new (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (
    status IN ('pending', 'active', 'suspended', 'disabled')
  ),
  email_verified_at TEXT,
  last_login_at TEXT,
  mfa_enabled INTEGER NOT NULL DEFAULT 0,
  auth_provider TEXT NOT NULL CHECK (
    auth_provider IN ('password', 'external', 'magic_link')
  ),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  password_hash TEXT
);

INSERT INTO accounts_new (
  id,
  email,
  status,
  email_verified_at,
  last_login_at,
  mfa_enabled,
  auth_provider,
  created_at,
  updated_at,
  password_hash
)
SELECT
  id,
  email,
  status,
  email_verified_at,
  last_login_at,
  mfa_enabled,
  auth_provider,
  created_at,
  updated_at,
  password_hash
FROM accounts;

DROP TABLE accounts;

ALTER TABLE accounts_new RENAME TO accounts;

CREATE INDEX IF NOT EXISTS idx_accounts_email
  ON accounts(email);

PRAGMA foreign_keys=ON;
