import { execFileSync } from "node:child_process";
import crypto from "node:crypto";

const email = process.argv[2]?.trim().toLowerCase();
const password = process.env.ADPILOT_OWNER_PASSWORD;

if (!email) {
  console.error("Usage: ADPILOT_OWNER_PASSWORD='...' node scripts/bootstrap-owner.mjs owner@example.com");
  process.exit(1);
}

if (!password) {
  console.error("Set ADPILOT_OWNER_PASSWORD before running this script.");
  process.exit(1);
}

if (password.length < 12) {
  console.error("Owner password must contain at least 12 characters.");
  process.exit(1);
}

const companyId = crypto.randomUUID();
const accountId = crypto.randomUUID();
const membershipId = crypto.randomUUID();
const now = new Date().toISOString();

const salt = crypto.randomBytes(16);
const derivedKey = crypto.pbkdf2Sync(
  password,
  salt,
  310000,
  32,
  "sha256"
);

const passwordHash = [
  "pbkdf2",
  "SHA-256",
  "310000",
  salt.toString("base64"),
  derivedKey.toString("base64"),
].join("$");

function sqlQuote(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

const sql = `
BEGIN TRANSACTION;

INSERT INTO companies (
  id,
  name,
  plan,
  logo_initial,
  seats_used,
  seats_limit,
  devices_active,
  devices_limit,
  timezone,
  default_currency,
  created_at,
  updated_at
) VALUES (
  ${sqlQuote(companyId)},
  'Nexora AdPilot',
  'trial',
  'N',
  1,
  1,
  0,
  0,
  'Asia/Karachi',
  'PKR',
  ${sqlQuote(now)},
  ${sqlQuote(now)}
);

INSERT INTO accounts (
  id,
  email,
  status,
  password_hash,
  auth_provider,
  created_at,
  updated_at
) VALUES (
  ${sqlQuote(accountId)},
  ${sqlQuote(email)},
  'active',
  ${sqlQuote(passwordHash)},
  'password',
  ${sqlQuote(now)},
  ${sqlQuote(now)}
);

INSERT INTO company_memberships (
  id,
  company_id,
  account_id,
  role,
  designation,
  status,
  account_type,
  created_at,
  updated_at
) VALUES (
  ${sqlQuote(membershipId)},
  ${sqlQuote(companyId)},
  ${sqlQuote(accountId)},
  'owner',
  'Owner',
  'active',
  'owner',
  ${sqlQuote(now)},
  ${sqlQuote(now)}
);

COMMIT;
`;

try {
  execFileSync(
    "npx",
    [
      "wrangler",
      "d1",
      "execute",
      "nexora-adpilot",
      "--local",
      "--command",
      sql,
    ],
    {
      stdio: "inherit",
      env: process.env,
    }
  );

  console.log("");
  console.log("Owner bootstrap completed successfully.");
  console.log(`Email: ${email}`);
  console.log(`Company ID: ${companyId}`);
  console.log(`Account ID: ${accountId}`);
  console.log(`Membership ID: ${membershipId}`);
  console.log("");
  console.log("Password was hashed with PBKDF2-SHA-256 and was not stored in plaintext.");
} catch (error) {
  console.error("");
  console.error("Owner bootstrap failed.");
  process.exit(1);
}
