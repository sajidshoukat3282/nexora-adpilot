CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL UNIQUE,

  plan_id TEXT NOT NULL CHECK (
    plan_id IN (
      'starter',
      'professional',
      'business',
      'enterprise'
    )
  ),

  status TEXT NOT NULL CHECK (
    status IN (
      'trial',
      'active',
      'past_due',
      'paused',
      'cancelled',
      'expired'
    )
  ),

  billing_cycle TEXT NOT NULL CHECK (
    billing_cycle IN ('monthly', 'annual')
  ),

  payment_status TEXT NOT NULL DEFAULT 'unknown' CHECK (
    payment_status IN ('pending', 'paid', 'failed', 'unknown')
  ),

  max_seats INTEGER,
  max_devices INTEGER,
  max_locations INTEGER,

  paddle_customer_id TEXT,
  paddle_subscription_id TEXT,
  paddle_price_id TEXT,

  starts_at TEXT NOT NULL,
  renews_at TEXT,
  cancellation_at TEXT,
  trial_ends_at TEXT,
  grace_ends_at TEXT,

  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,

  FOREIGN KEY (company_id) REFERENCES companies(id)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_company
  ON subscriptions(company_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_paddle_customer
  ON subscriptions(paddle_customer_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_paddle_subscription
  ON subscriptions(paddle_subscription_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_status
  ON subscriptions(status);

CREATE TABLE IF NOT EXISTS subscription_entitlements (
  id TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL,
  entitlement TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,

  FOREIGN KEY (subscription_id)
    REFERENCES subscriptions(id)
    ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscription_entitlement
  ON subscription_entitlements(subscription_id, entitlement);

CREATE INDEX IF NOT EXISTS idx_subscription_entitlements_lookup
  ON subscription_entitlements(subscription_id, enabled);
