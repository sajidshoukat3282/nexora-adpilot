CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  plan TEXT NOT NULL CHECK (plan IN ('trial', 'growth', 'enterprise')),
  logo_initial TEXT NOT NULL,
  seats_used INTEGER NOT NULL DEFAULT 0,
  seats_limit INTEGER NOT NULL DEFAULT 1,
  devices_active INTEGER NOT NULL DEFAULT 0,
  devices_limit INTEGER NOT NULL DEFAULT 0,
  timezone TEXT NOT NULL,
  default_currency TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (
    status IN ('pending', 'active', 'suspended', 'disabled')
  ),
  email_verified_at TEXT,
  last_login_at TEXT,
  mfa_enabled INTEGER NOT NULL DEFAULT 0,
  auth_provider TEXT NOT NULL CHECK (
    auth_provider IN ('password', 'external')
  ),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS company_memberships (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  role TEXT NOT NULL,
  designation TEXT NOT NULL,
  status TEXT NOT NULL CHECK (
    status IN ('invited', 'active', 'suspended', 'removed')
  ),
  invited_by_user_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,

  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (account_id) REFERENCES accounts(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_company_membership_account
  ON company_memberships(company_id, account_id);

CREATE INDEX IF NOT EXISTS idx_company_membership_company
  ON company_memberships(company_id);

CREATE INDEX IF NOT EXISTS idx_company_membership_account_id
  ON company_memberships(account_id);

CREATE INDEX IF NOT EXISTS idx_accounts_email
  ON accounts(email);
