import type { Env } from '../index';
import {
  resolveSession,
  createSession,
  type SessionContext,
} from '../auth/session';
import { hashPassword } from '../auth/password';
import { handleCompanyRoutes } from '../company/companyRoutes';
import { handleAdminRoutes, logAudit, memberEmail } from '../admin/adminRoutes';
import { handleAccountingRoutes } from '../finance/accountingRoutes';
import { handleInventoryRoutes } from '../inventory/inventoryRoutes';
import { handleCampaignRoutes } from '../campaigns/campaignRoutes';
import { handleCampaignExtras } from '../campaigns/campaignExtras';
import { handleCampaignSlots } from '../campaigns/campaignSlots';
import { handleReportRoutes } from '../reports/reportRoutes';
import { handleProposalRoutes } from '../proposals/proposalRoutes';
import {
  ROLE_PERMISSIONS,
  type Permission,
  type Role,
} from '../../src/domain/shared';

/**
 * Team management for a company workspace.
 *
 * Isolation rule: every query is scoped by `session.companyId`, which comes
 * from the signed-in session on the server and is NEVER read from the request.
 */

const INVITE_TTL_HOURS = 72;

const EMPLOYEE_ROLES: Role[] = [
  'campaign_manager',
  'sales_manager',
  'creative_manager',
  'field_operator',
  'finance',
  'viewer',
];

/** Every permission an owner can hand to an employee. `company.manage`
 *  (team + settings) stays with the owner only. */
const GRANTABLE_PERMISSIONS: Permission[] = [
  'campaigns.manage',
  'inventory.manage',
  'creatives.manage',
  'creatives.approve',
  'operations.manage',
  'operations.override',
  'crm.manage',
  'proposals.manage',
  'finance.view',
  'finance.manage',
  'reports.view',
  'reports.generate',
  'reports.send',
  'proof.view',
  'proof.submit',
  'analytics.view',
  'subscription.view',
  'client_portal.view',
];

const ALL_PERMISSIONS: Permission[] = [
  ...GRANTABLE_PERMISSIONS,
  'company.manage',
];

function json(data: unknown, status = 200, setCookie?: string): Response {
  const headers = new Headers({
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  if (setCookie) headers.set('Set-Cookie', setCookie);
  return new Response(JSON.stringify(data), { status, headers });
}

function fail(status: number, error: string, message: string): Response {
  return json({ ok: false, error, message }, status);
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value),
  );
  return bytesToHex(new Uint8Array(digest));
}

function newToken(): string {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
}

function cleanPermissions(input: unknown): Permission[] | null {
  if (!Array.isArray(input)) return null;
  const wanted = new Set<string>();
  for (const item of input) {
    if (typeof item === 'string') wanted.add(item);
  }
  return GRANTABLE_PERMISSIONS.filter((p) => wanted.has(p));
}

async function readBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    return body && typeof body === 'object'
      ? (body as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

/* ------------------------------------------------------------------ */
/* Seats                                                               */
/* ------------------------------------------------------------------ */

async function seatsUsed(db: D1Database, companyId: string): Promise<number> {
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS n
       FROM company_memberships
       WHERE company_id = ?
         AND account_type IN ('owner', 'employee')
         AND status IN ('invited', 'active', 'suspended')`,
    )
    .bind(companyId)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

async function seatsLimit(db: D1Database, companyId: string): Promise<number> {
  const row = await db
    .prepare('SELECT seats_limit FROM companies WHERE id = ? LIMIT 1')
    .bind(companyId)
    .first<{ seats_limit: number }>();
  return row?.seats_limit ?? 1;
}

async function syncSeats(db: D1Database, companyId: string): Promise<number> {
  const used = await seatsUsed(db, companyId);
  await db
    .prepare('UPDATE companies SET seats_used = ?, updated_at = ? WHERE id = ?')
    .bind(used, new Date().toISOString(), companyId)
    .run();
  return used;
}

/* ------------------------------------------------------------------ */
/* Email                                                               */
/* ------------------------------------------------------------------ */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function sendInvitationEmail(
  env: Env,
  email: string,
  companyName: string,
  token: string,
): Promise<void> {
  if (!env.BREVO_API_KEY) throw new Error('EMAIL_PROVIDER_NOT_CONFIGURED');

  const baseUrl = (env.AUTH_BASE_URL || 'http://localhost:5173').replace(
    /\/$/,
    '',
  );
  const acceptUrl = `${baseUrl}/#/auth/accept-invite?token=${encodeURIComponent(token)}`;
  const safeCompany = escapeHtml(companyName);

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': env.BREVO_API_KEY,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: {
        name: env.MAIL_FROM_NAME || 'Nexora AdPilot',
        email: env.MAIL_FROM_EMAIL || 'hello@nexoratechnologies.pk',
      },
      to: [{ email }],
      subject: `You have been invited to join ${companyName} on Nexora AdPilot`,
      htmlContent: `
        <p>You have been invited to join <strong>${safeCompany}</strong> on Nexora AdPilot.</p>
        <p>Click the link below to choose your password and join the team:</p>
        <p><a href="${acceptUrl}">Accept invitation</a></p>
        <p>This link expires in ${INVITE_TTL_HOURS} hours and can only be used once.</p>
        <p>If you were not expecting this invitation, you can safely ignore this email.</p>
      `,
    }),
  });

  if (!response.ok) throw new Error('EMAIL_SEND_FAILED');
}

/* ------------------------------------------------------------------ */
/* Guards                                                              */
/* ------------------------------------------------------------------ */

async function requireManager(
  request: Request,
  env: Env,
): Promise<{ session: SessionContext } | { response: Response }> {
  const session = await resolveSession(request, env.DB);
  if (!session) {
    return {
      response: fail(401, 'UNAUTHENTICATED', 'No active authenticated session.'),
    };
  }
  if (!session.permissions.includes('company.manage')) {
    return {
      response: fail(
        403,
        'FORBIDDEN',
        'Only the workspace owner can manage the team.',
      ),
    };
  }
  return { session };
}

interface TargetMembership {
  id: string;
  account_id: string;
  account_type: 'owner' | 'employee' | 'client';
  status: string;
  email: string;
}

async function loadTarget(
  env: Env,
  session: SessionContext,
  membershipId: string,
): Promise<TargetMembership | null> {
  // company_id comes from the session, so another company's member can never match.
  return env.DB
    .prepare(
      `SELECT cm.id, cm.account_id, cm.account_type, cm.status, a.email
       FROM company_memberships cm
       INNER JOIN accounts a ON a.id = cm.account_id
       WHERE cm.id = ? AND cm.company_id = ?
       LIMIT 1`,
    )
    .bind(membershipId, session.companyId)
    .first<TargetMembership>();
}

/* ------------------------------------------------------------------ */
/* Permission writes                                                   */
/* ------------------------------------------------------------------ */

async function setMemberPermissions(
  db: D1Database,
  membershipId: string,
  grantedBy: string,
  desired: Permission[],
): Promise<void> {
  const now = new Date().toISOString();
  const desiredSet = new Set<string>(desired);

  const existing = await db
    .prepare(
      `SELECT permission, revoked_at
       FROM company_membership_permissions
       WHERE membership_id = ?`,
    )
    .bind(membershipId)
    .all<{ permission: string; revoked_at: string | null }>();

  const known = new Map<string, boolean>(); // permission -> currently active
  for (const row of existing.results) {
    known.set(row.permission, row.revoked_at === null);
  }

  const statements: D1PreparedStatement[] = [];

  for (const [permission, active] of known) {
    if (active && !desiredSet.has(permission)) {
      statements.push(
        db
          .prepare(
            `UPDATE company_membership_permissions
             SET revoked_at = ?, updated_at = ?
             WHERE membership_id = ? AND permission = ? AND revoked_at IS NULL`,
          )
          .bind(now, now, membershipId, permission),
      );
    }
  }

  for (const permission of desiredSet) {
    const state = known.get(permission);
    if (state === undefined) {
      statements.push(
        db
          .prepare(
            `INSERT INTO company_membership_permissions
              (id, membership_id, permission, granted_by_account_id,
               granted_at, expires_at, revoked_at, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, NULL, NULL, ?, ?)`,
          )
          .bind(crypto.randomUUID(), membershipId, permission, grantedBy, now, now, now),
      );
    } else if (state === false) {
      statements.push(
        db
          .prepare(
            `UPDATE company_membership_permissions
             SET revoked_at = NULL, expires_at = NULL,
                 granted_by_account_id = ?, granted_at = ?, updated_at = ?
             WHERE membership_id = ? AND permission = ?`,
          )
          .bind(grantedBy, now, now, membershipId, permission),
      );
    }
  }

  statements.push(
    db
      .prepare(
        `UPDATE company_memberships
         SET permission_version = COALESCE(permission_version, 0) + 1,
             updated_at = ?
         WHERE id = ?`,
      )
      .bind(now, membershipId),
  );

  await db.batch(statements);
}

async function revokeMemberSessions(
  db: D1Database,
  membershipId: string,
): Promise<void> {
  await db
    .prepare(
      `UPDATE sessions SET revoked_at = ?
       WHERE membership_id = ? AND revoked_at IS NULL`,
    )
    .bind(new Date().toISOString(), membershipId)
    .run();
}

async function issueInvitation(
  db: D1Database,
  companyId: string,
  membershipId: string,
  accountId: string,
): Promise<string> {
  const token = newToken();
  const tokenHash = await sha256(token);
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + INVITE_TTL_HOURS * 60 * 60 * 1000,
  ).toISOString();

  await db.batch([
    db
      .prepare(
        `UPDATE team_invitations SET used_at = ?
         WHERE membership_id = ? AND used_at IS NULL`,
      )
      .bind(now.toISOString(), membershipId),
    db
      .prepare(
        `INSERT INTO team_invitations
          (id, company_id, membership_id, account_id, token_hash,
           created_at, expires_at, used_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NULL)`,
      )
      .bind(
        crypto.randomUUID(),
        companyId,
        membershipId,
        accountId,
        tokenHash,
        now.toISOString(),
        expiresAt,
      ),
  ]);

  return token;
}

async function companyName(db: D1Database, companyId: string): Promise<string> {
  const row = await db
    .prepare('SELECT name FROM companies WHERE id = ? LIMIT 1')
    .bind(companyId)
    .first<{ name: string }>();
  return row?.name ?? 'your company';
}

/* ------------------------------------------------------------------ */
/* Handlers                                                            */
/* ------------------------------------------------------------------ */

async function listTeam(request: Request, env: Env): Promise<Response> {
  const guard = await requireManager(request, env);
  if ('response' in guard) return guard.response;
  const { session } = guard;
  const now = new Date().toISOString();

  const members = await env.DB
    .prepare(
      `SELECT cm.id AS membership_id, cm.account_id, a.email, cm.role,
              cm.designation, cm.account_type, cm.status, cm.created_at,
              a.last_login_at
       FROM company_memberships cm
       INNER JOIN accounts a ON a.id = cm.account_id
       WHERE cm.company_id = ?
         AND cm.account_type IN ('owner', 'employee')
         AND cm.status != 'removed'
       ORDER BY cm.created_at ASC`,
    )
    .bind(session.companyId)
    .all<{
      membership_id: string;
      account_id: string;
      email: string;
      role: string;
      designation: string;
      account_type: string;
      status: string;
      created_at: string;
      last_login_at: string | null;
    }>();

  const grants = await env.DB
    .prepare(
      `SELECT p.membership_id, p.permission
       FROM company_membership_permissions p
       INNER JOIN company_memberships cm ON cm.id = p.membership_id
       WHERE cm.company_id = ?
         AND p.revoked_at IS NULL
         AND (p.expires_at IS NULL OR p.expires_at > ?)`,
    )
    .bind(session.companyId, now)
    .all<{ membership_id: string; permission: string }>();

  const byMember = new Map<string, string[]>();
  for (const grant of grants.results) {
    const list = byMember.get(grant.membership_id) ?? [];
    list.push(grant.permission);
    byMember.set(grant.membership_id, list);
  }

  return json({
    ok: true,
    seats: {
      used: await seatsUsed(env.DB, session.companyId),
      limit: await seatsLimit(env.DB, session.companyId),
    },
    members: members.results.map((m) => ({
      membershipId: m.membership_id,
      accountId: m.account_id,
      email: m.email,
      role: m.role,
      designation: m.designation,
      accountType: m.account_type,
      status: m.status,
      createdAt: m.created_at,
      lastLoginAt: m.status === 'active' ? m.last_login_at : null,
      isYou: m.membership_id === session.membershipId,
      permissions:
        m.account_type === 'owner'
          ? ALL_PERMISSIONS
          : (byMember.get(m.membership_id) ?? []),
    })),
  });
}

async function inviteMember(request: Request, env: Env): Promise<Response> {
  const guard = await requireManager(request, env);
  if ('response' in guard) return guard.response;
  const { session } = guard;

  const body = await readBody(request);
  const email =
    typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const role = typeof body.role === 'string' ? (body.role as Role) : null;
  const designationInput =
    typeof body.designation === 'string' ? body.designation.trim() : '';

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 254 ||
    !role ||
    !EMPLOYEE_ROLES.includes(role) ||
    designationInput.length > 80
  ) {
    return fail(
      400,
      'INVALID_INPUT',
      'Enter a valid email address and choose a role for the employee.',
    );
  }

  const permissions =
    cleanPermissions(body.permissions) ??
    ROLE_PERMISSIONS[role].filter((p) => GRANTABLE_PERMISSIONS.includes(p));
  const designation = designationInput || role.replace(/_/g, ' ');

  const account = await env.DB
    .prepare('SELECT id FROM accounts WHERE LOWER(email) = ? LIMIT 1')
    .bind(email)
    .first<{ id: string }>();

  let membershipId: string;
  let accountId: string;
  let needsNewSeat = true;
  const now = new Date().toISOString();

  if (account) {
    const existing = await env.DB
      .prepare(
        `SELECT id, status, account_type
         FROM company_memberships
         WHERE account_id = ? AND company_id = ?
         LIMIT 1`,
      )
      .bind(account.id, session.companyId)
      .first<{ id: string; status: string; account_type: string }>();

    if (
      !existing ||
      existing.account_type !== 'employee' ||
      !['invited', 'removed'].includes(existing.status)
    ) {
      return fail(
        409,
        'EMAIL_UNAVAILABLE',
        'This email already has an account, so it cannot be invited. Use a different email address.',
      );
    }

    accountId = account.id;
    membershipId = existing.id;
    needsNewSeat = existing.status === 'removed';
  } else {
    accountId = crypto.randomUUID();
    membershipId = crypto.randomUUID();
  }

  if (needsNewSeat) {
    const used = await seatsUsed(env.DB, session.companyId);
    const limit = await seatsLimit(env.DB, session.companyId);
    if (used >= limit) {
      return fail(
        409,
        'SEAT_LIMIT_REACHED',
        `Your plan allows ${limit} team seat(s) and all are in use. Remove a member or upgrade your plan to add more.`,
      );
    }
  }

  if (!account) {
    await env.DB.batch([
      env.DB
        .prepare(
          `INSERT INTO accounts
            (id, email, status, email_verified_at, last_login_at,
             mfa_enabled, auth_provider, created_at, updated_at, password_hash)
           VALUES (?, ?, 'active', NULL, ?, 0, 'password', ?, ?, NULL)`,
        )
        .bind(accountId, email, now, now, now),
      env.DB
        .prepare(
          `INSERT INTO company_memberships
            (id, company_id, account_id, role, designation, status,
             invited_by_user_id, created_at, updated_at, account_type)
           VALUES (?, ?, ?, ?, ?, 'invited', ?, ?, ?, 'employee')`,
        )
        .bind(
          membershipId,
          session.companyId,
          accountId,
          role,
          designation,
          session.accountId,
          now,
          now,
        ),
    ]);
  } else {
    await env.DB
      .prepare(
        `UPDATE company_memberships
         SET role = ?, designation = ?, status = 'invited',
             invited_by_user_id = ?, updated_at = ?
         WHERE id = ? AND company_id = ?`,
      )
      .bind(role, designation, session.accountId, now, membershipId, session.companyId)
      .run();
  }

  await setMemberPermissions(env.DB, membershipId, session.accountId, permissions);

  const token = await issueInvitation(
    env.DB,
    session.companyId,
    membershipId,
    accountId,
  );
  await syncSeats(env.DB, session.companyId);

  let emailSent = true;
  try {
    await sendInvitationEmail(
      env,
      email,
      await companyName(env.DB, session.companyId),
      token,
    );
  } catch {
    emailSent = false;
  }

  return json(
    {
      ok: true,
      emailSent,
      membershipId,
      message: emailSent
        ? `Invitation sent to ${email}.`
        : 'The invitation was created, but the email could not be sent. Use "Resend invite" to try again.',
    },
    201,
  );
}

async function memberAction(
  request: Request,
  env: Env,
  membershipId: string,
  action: string,
): Promise<Response> {
  const guard = await requireManager(request, env);
  if ('response' in guard) return guard.response;
  const { session } = guard;

  const target = await loadTarget(env, session, membershipId);
  if (!target) return fail(404, 'NOT_FOUND', 'Team member not found.');

  if (target.account_type !== 'employee' || target.id === session.membershipId) {
    return fail(403, 'FORBIDDEN', 'This member cannot be changed.');
  }

  const now = new Date().toISOString();

  if (action === 'permissions') {
    if (target.status === 'removed') {
      return fail(409, 'INVALID_STATE', 'This member has been removed.');
    }
    const body = await readBody(request);
    const permissions = cleanPermissions(body.permissions);
    if (!permissions) {
      return fail(400, 'INVALID_INPUT', 'A permissions list is required.');
    }

    const role = typeof body.role === 'string' ? (body.role as Role) : null;
    const designation =
      typeof body.designation === 'string' ? body.designation.trim() : null;

    if (role && !EMPLOYEE_ROLES.includes(role)) {
      return fail(400, 'INVALID_INPUT', 'Choose a valid role.');
    }
    if (designation !== null && designation.length > 80) {
      return fail(400, 'INVALID_INPUT', 'Job title is too long.');
    }

    if (role || designation) {
      await env.DB
        .prepare(
          `UPDATE company_memberships
           SET role = COALESCE(?, role),
               designation = COALESCE(?, designation),
               updated_at = ?
           WHERE id = ? AND company_id = ?`,
        )
        .bind(role, designation || null, now, membershipId, session.companyId)
        .run();
    }

    await setMemberPermissions(env.DB, membershipId, session.accountId, permissions);
    return json({ ok: true, message: 'Permissions updated.' });
  }

  if (action === 'suspend') {
    if (target.status !== 'active') {
      return fail(409, 'INVALID_STATE', 'Only active members can be suspended.');
    }
    await env.DB
      .prepare(
        `UPDATE company_memberships SET status = 'suspended', updated_at = ?
         WHERE id = ? AND company_id = ?`,
      )
      .bind(now, membershipId, session.companyId)
      .run();
    await revokeMemberSessions(env.DB, membershipId);
    return json({ ok: true, message: 'Member suspended.' });
  }

  if (action === 'reactivate') {
    if (target.status !== 'suspended') {
      return fail(409, 'INVALID_STATE', 'Only suspended members can be reactivated.');
    }
    await env.DB
      .prepare(
        `UPDATE company_memberships SET status = 'active', updated_at = ?
         WHERE id = ? AND company_id = ?`,
      )
      .bind(now, membershipId, session.companyId)
      .run();
    return json({ ok: true, message: 'Member reactivated.' });
  }

  if (action === 'remove') {
    await env.DB.batch([
      env.DB
        .prepare(
          `UPDATE company_memberships SET status = 'removed', updated_at = ?
           WHERE id = ? AND company_id = ?`,
        )
        .bind(now, membershipId, session.companyId),
      env.DB
        .prepare(
          `UPDATE team_invitations SET used_at = ?
           WHERE membership_id = ? AND used_at IS NULL`,
        )
        .bind(now, membershipId),
    ]);
    await revokeMemberSessions(env.DB, membershipId);
    await syncSeats(env.DB, session.companyId);
    return json({ ok: true, message: 'Member removed.' });
  }

  if (action === 'resend-invite') {
    if (target.status !== 'invited') {
      return fail(409, 'INVALID_STATE', 'Only pending invitations can be re-sent.');
    }
    const token = await issueInvitation(
      env.DB,
      session.companyId,
      membershipId,
      target.account_id,
    );
    try {
      await sendInvitationEmail(
        env,
        target.email,
        await companyName(env.DB, session.companyId),
        token,
      );
    } catch {
      return fail(
        502,
        'EMAIL_SEND_FAILED',
        'The invitation email could not be sent. Please try again in a moment.',
      );
    }
    return json({ ok: true, message: `Invitation re-sent to ${target.email}.` });
  }

  return fail(404, 'NOT_FOUND', 'Unknown action.');
}

/* ---------------- public invitation endpoints ---------------- */

async function invitationInfo(env: Env, url: URL): Promise<Response> {
  const token = url.searchParams.get('token') ?? '';
  if (!/^[a-f0-9]{64}$/i.test(token)) {
    return fail(400, 'INVALID_TOKEN', 'This invitation link is invalid or has expired.');
  }

  const tokenHash = await sha256(token);
  const now = new Date().toISOString();

  const row = await env.DB
    .prepare(
      `SELECT a.email, c.name AS company_name, cm.designation
       FROM team_invitations ti
       INNER JOIN company_memberships cm ON cm.id = ti.membership_id
       INNER JOIN accounts a ON a.id = ti.account_id
       INNER JOIN companies c ON c.id = ti.company_id
       WHERE ti.token_hash = ?
         AND ti.used_at IS NULL
         AND ti.expires_at > ?
         AND cm.status = 'invited'
       LIMIT 1`,
    )
    .bind(tokenHash, now)
    .first<{ email: string; company_name: string; designation: string }>();

  if (!row) {
    return fail(400, 'INVALID_TOKEN', 'This invitation link is invalid or has expired.');
  }

  return json({
    ok: true,
    email: row.email,
    companyName: row.company_name,
    designation: row.designation,
  });
}

async function acceptInvitation(request: Request, env: Env): Promise<Response> {
  const body = await readBody(request);
  const token = typeof body.token === 'string' ? body.token : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!/^[a-f0-9]{64}$/i.test(token)) {
    return fail(400, 'INVALID_TOKEN', 'This invitation link is invalid or has expired.');
  }
  if (password.length < 12 || password.length > 256) {
    return fail(400, 'INVALID_INPUT', 'Password must contain 12\u{2013}256 characters.');
  }

  // Hash first so a slow hash can never leave a consumed-but-unused token.
  const passwordHash = await hashPassword(password);
  const tokenHash = await sha256(token);
  const now = new Date().toISOString();

  const claimed = await env.DB
    .prepare(
      `UPDATE team_invitations
       SET used_at = ?
       WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?
       RETURNING membership_id, account_id, company_id`,
    )
    .bind(now, tokenHash, now)
    .first<{ membership_id: string; account_id: string; company_id: string }>();

  if (!claimed) {
    return fail(400, 'INVALID_TOKEN', 'This invitation link is invalid or has expired.');
  }

  const membership = await env.DB
    .prepare(
      `SELECT status FROM company_memberships
       WHERE id = ? AND company_id = ? AND account_id = ? LIMIT 1`,
    )
    .bind(claimed.membership_id, claimed.company_id, claimed.account_id)
    .first<{ status: string }>();

  if (!membership || membership.status !== 'invited') {
    return fail(400, 'INVALID_TOKEN', 'This invitation is no longer active.');
  }

  await env.DB.batch([
    env.DB
      .prepare(
        `UPDATE accounts
         SET password_hash = ?,
             email_verified_at = COALESCE(email_verified_at, ?),
             status = 'active',
             last_login_at = ?,
             updated_at = ?
         WHERE id = ?`,
      )
      .bind(passwordHash, now, now, now, claimed.account_id),
    env.DB
      .prepare(
        `UPDATE company_memberships
         SET status = 'active', updated_at = ?
         WHERE id = ? AND company_id = ?`,
      )
      .bind(now, claimed.membership_id, claimed.company_id),
  ]);

  await syncSeats(env.DB, claimed.company_id);

  const created = await createSession(
    env.DB,
    claimed.account_id,
    claimed.membership_id,
  );

  return json(
    { ok: true, message: 'Welcome to the team.' },
    200,
    created.setCookie,
  );
}

/* ------------------------------------------------------------------ */
/* Router                                                              */
/* ------------------------------------------------------------------ */

export async function handleTeamRoutes(
  request: Request,
  env: Env,
  url: URL,
): Promise<Response | null> {
  const path = url.pathname;

  // Company profile routes (/api/company/profile) share this entry point.
  const adminResponse = await handleAdminRoutes(request, env, url);
  if (adminResponse) return adminResponse;

  const accountingResponse = await handleAccountingRoutes(request, env, url);
  if (accountingResponse) return accountingResponse;

  const inventoryResponse = await handleInventoryRoutes(request, env, url);
  if (inventoryResponse) return inventoryResponse;

  const proposalsResponse = await handleProposalRoutes(request, env, url);
  if (proposalsResponse) return proposalsResponse;

  const reportsResponse = await handleReportRoutes(request, env, url);
  if (reportsResponse) return reportsResponse;

  const slotsResponse = await handleCampaignSlots(request, env, url);
  if (slotsResponse) return slotsResponse;

  const extrasResponse = await handleCampaignExtras(request, env, url);
  if (extrasResponse) return extrasResponse;

  const campaignResponse = await handleCampaignRoutes(request, env, url);
  if (campaignResponse) return campaignResponse;

  const companyResponse = await handleCompanyRoutes(request, env, url);
  if (companyResponse) {
    if (request.method === 'PUT' && companyResponse.status === 200) {
      const s = await resolveSession(request, env.DB).catch(() => null);
      if (s) await logAudit(env, s.companyId, s.accountId, 'Company profile updated');
    }
    return companyResponse;
  }

  try {
    if (path === '/api/auth/invitation' && request.method === 'GET') {
      return await invitationInfo(env, url);
    }
    if (path === '/api/auth/invitation/accept' && request.method === 'POST') {
      return await acceptInvitation(request, env);
    }
    if (path === '/api/team' && request.method === 'GET') {
      return await listTeam(request, env);
    }
    if (path === '/api/team/invite' && request.method === 'POST') {
      const inviteEmail = await request.clone().json().then((b: any) => String(b?.email ?? '')).catch(() => '');
      const res = await inviteMember(request, env);
      if (res.status === 200) {
        const s = await resolveSession(request, env.DB).catch(() => null);
        if (s) await logAudit(env, s.companyId, s.accountId, 'Employee invited', inviteEmail);
      }
      return res;
    }

    const match = path.match(
      /^\/api\/team\/([0-9a-fA-F-]{36})\/(permissions|suspend|reactivate|remove|resend-invite)$/,
    );
    if (match && request.method === 'POST') {
      const res = await memberAction(request, env, match[1], match[2]);
      if (res.status === 200) {
        const s = await resolveSession(request, env.DB).catch(() => null);
        if (s) {
          const labels: Record<string, string> = {
            permissions: 'Permissions updated',
            suspend: 'Member suspended',
            reactivate: 'Member reactivated',
            remove: 'Member removed',
            'resend-invite': 'Invitation re-sent',
          };
          await logAudit(env, s.companyId, s.accountId, labels[match[2]] ?? match[2], await memberEmail(env, match[1]));
        }
      }
      return res;
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : '';
    if (detail.includes('UNIQUE constraint failed')) {
      return fail(409, 'EMAIL_UNAVAILABLE', 'This email cannot be used for an invitation.');
    }
    return fail(500, 'TEAM_REQUEST_FAILED', 'Unable to complete the team request. Please try again.');
  }

  return null;
}
