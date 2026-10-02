ALTER TABLE accounts ADD COLUMN password_hash TEXT;

ALTER TABLE company_memberships ADD COLUMN account_type TEXT NOT NULL DEFAULT 'employee'
  CHECK (account_type IN ('owner', 'employee', 'client'));

UPDATE company_memberships
SET account_type = CASE
  WHEN role = 'owner' THEN 'owner'
  WHEN role = 'client' THEN 'client'
  ELSE 'employee'
END;

ALTER TABLE company_memberships ADD COLUMN permission_version INTEGER NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  membership_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  last_seen_at TEXT,
  revoked_at TEXT,
  FOREIGN KEY (account_id) REFERENCES accounts(id),
  FOREIGN KEY (membership_id) REFERENCES company_memberships(id)
);

CREATE INDEX IF NOT EXISTS idx_sessions_account
  ON sessions(account_id);

CREATE INDEX IF NOT EXISTS idx_sessions_membership
  ON sessions(membership_id);

CREATE INDEX IF NOT EXISTS idx_sessions_expires
  ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS company_membership_permissions (
  id TEXT PRIMARY KEY,
  membership_id TEXT NOT NULL,
  permission TEXT NOT NULL,
  granted_by_account_id TEXT NOT NULL,
  granted_at TEXT NOT NULL,
  expires_at TEXT,
  revoked_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (membership_id) REFERENCES company_memberships(id),
  FOREIGN KEY (granted_by_account_id) REFERENCES accounts(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_membership_permission_active
  ON company_membership_permissions(membership_id, permission)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_membership_permissions_membership
  ON company_membership_permissions(membership_id);

CREATE INDEX IF NOT EXISTS idx_membership_permissions_granted_by
  ON company_membership_permissions(granted_by_account_id);

CREATE INDEX IF NOT EXISTS idx_membership_permissions_expiry
  ON company_membership_permissions(expires_at);

CREATE TABLE IF NOT EXISTS permission_templates (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_by_account_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (created_by_account_id) REFERENCES accounts(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_permission_template_name
  ON permission_templates(company_id, name);

CREATE TABLE IF NOT EXISTS permission_template_permissions (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL,
  permission TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (template_id) REFERENCES permission_templates(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_template_permission
  ON permission_template_permissions(template_id, permission);

CREATE TABLE IF NOT EXISTS permission_audit_log (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  membership_id TEXT NOT NULL,
  target_account_id TEXT NOT NULL,
  actor_account_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (
    action IN ('grant', 'revoke', 'expire', 'template_apply', 'revoke_all')
  ),
  permission TEXT,
  template_id TEXT,
  reason TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (membership_id) REFERENCES company_memberships(id),
  FOREIGN KEY (target_account_id) REFERENCES accounts(id),
  FOREIGN KEY (actor_account_id) REFERENCES accounts(id),
  FOREIGN KEY (template_id) REFERENCES permission_templates(id)
);

CREATE INDEX IF NOT EXISTS idx_permission_audit_company
  ON permission_audit_log(company_id, created_at);

CREATE INDEX IF NOT EXISTS idx_permission_audit_target
  ON permission_audit_log(target_account_id, created_at);

CREATE INDEX IF NOT EXISTS idx_permission_audit_actor
  ON permission_audit_log(actor_account_id, created_at);

CREATE INDEX IF NOT EXISTS idx_permission_audit_membership
  ON permission_audit_log(membership_id, created_at);
