import React, { useCallback, useEffect, useState } from "react";
import { FIN, SectionTitle } from "../finance/financeUi";
import { inviteExpiry, needsResend, timeAgo } from "./adminTools";
import { useSession } from "@/hooks/useSession";
import { ROLE_LABELS, ROLE_PERMISSIONS } from "@/domain";
import type { Permission, Role } from "@/domain";
import {
  getTeam,
  inviteMember,
  memberAction,
  updateMember,
  type MemberAction,
  type TeamMember,
  type TeamResponse,
} from "@/lib/api/team";

export const PERMISSION_LABELS: Record<Permission, string> = {
  "campaigns.manage": "Manage Campaigns",
  "inventory.manage": "Manage Inventory",
  "creatives.manage": "Manage Creatives",
  "creatives.approve": "Approve Creatives",
  "operations.manage": "Manage Operations",
  "operations.override": "Emergency Override",
  "crm.manage": "Manage CRM",
  "proposals.manage": "Manage Proposals",
  "finance.view": "View Finance",
  "finance.manage": "Manage Finance",
  "company.manage": "Manage Company & Team",
  "reports.view": "View Reports",
  "reports.generate": "Generate Reports",
  "reports.send": "Send Reports",
  "proof.view": "View Proof",
  "proof.submit": "Submit Proof",
  "analytics.view": "View Analytics",
  "subscription.view": "View Subscription",
  "client_portal.view": "Client Portal Access",
};

export const ALL_PERMISSIONS = Object.keys(PERMISSION_LABELS) as Permission[];

/** Permissions an owner can hand out. Team & company management stays with the owner. */
const GRANTABLE: Permission[] = ALL_PERMISSIONS.filter((p) => p !== "company.manage");

const EMPLOYEE_ROLES: Role[] = [
  "campaign_manager",
  "sales_manager",
  "creative_manager",
  "field_operator",
  "finance",
  "viewer",
];

function presetFor(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role].filter((p) => GRANTABLE.includes(p));
}

const PermissionChecklist: React.FC<{
  value: Permission[];
  onChange: (next: Permission[]) => void;
  disabled?: boolean;
}> = ({ value, onChange, disabled }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
    {GRANTABLE.map((perm) => {
      const checked = value.includes(perm);
      return (
        <label
          key={perm}
          className="flex items-center gap-2 text-[12px] text-zinc-200 cursor-pointer"
        >
          <input
            type="checkbox"
            checked={checked}
            disabled={disabled}
            onChange={() =>
              onChange(
                checked ? value.filter((p) => p !== perm) : [...value, perm],
              )
            }
          />
          {PERMISSION_LABELS[perm]}
        </label>
      );
    })}
  </div>
);

const PILL = "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold";
function statusBadge(status: TeamMember["status"]) {
  if (status === "active") return <span className={`${PILL} border-emerald-400/30 bg-emerald-400/10 text-emerald-300`}>Active</span>;
  if (status === "invited") return <span className={`${PILL} border-amber-400/30 bg-amber-400/10 text-amber-300`}>Invite pending</span>;
  if (status === "suspended") return <span className={`${PILL} border-rose-400/30 bg-rose-400/10 text-rose-300`}>Suspended</span>;
  return <span className={`${PILL} border-zinc-500/30 text-zinc-400`}>Removed</span>;
}

const BTN = `${FIN.btnGhost} !px-2 !py-1 !text-[11px]`;

export const TeamPanel: React.FC<{
  invites?: { membershipId: string; expiresAt: string }[];
  onTeam?: (team: TeamResponse) => void;
  onChanged?: () => void;
}> = ({ invites = [], onTeam, onChanged }) => {
  const { refresh } = useSession();
  const [team, setTeam] = useState<TeamResponse | null>(null);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  // invite form
  const [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState("");
  const [designation, setDesignation] = useState("");
  const [role, setRole] = useState<Role>("campaign_manager");
  const [perms, setPerms] = useState<Permission[]>(presetFor("campaign_manager"));

  // inline editor
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPerms, setEditPerms] = useState<Permission[]>([]);
  const [editRole, setEditRole] = useState<Role>("viewer");
  const [editTitle, setEditTitle] = useState("");

  const load = useCallback(async () => {
    try {
      const next = await getTeam();
      setTeam(next);
      onTeam?.(next);
      setLoadError("");
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Unable to load the team.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const seatsFull = !!team && team.seats.used >= team.seats.limit;

  function chooseRole(next: Role) {
    setRole(next);
    setPerms(presetFor(next));
  }

  async function run(work: () => Promise<{ message: string }>) {
    setBusy(true);
    setNotice(null);
    try {
      const result = await work();
      setNotice({ tone: "ok", text: result.message });
      await load();
      await refresh();
      onChanged?.();
      return true;
    } catch (err) {
      setNotice({
        tone: "error",
        text: err instanceof Error ? err.message : "Something went wrong.",
      });
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function submitInvite(event: React.FormEvent) {
    event.preventDefault();
    const ok = await run(() =>
      inviteMember({ email: email.trim(), role, designation: designation.trim(), permissions: perms }),
    );
    if (ok) {
      setEmail("");
      setDesignation("");
      setShowInvite(false);
    }
  }

  function startEdit(member: TeamMember) {
    setEditingId(member.membershipId);
    setEditPerms(member.permissions);
    setEditRole(member.role);
    setEditTitle(member.designation);
  }

  async function saveEdit(member: TeamMember) {
    const ok = await run(() =>
      updateMember(member.membershipId, {
        permissions: editPerms,
        role: editRole,
        designation: editTitle.trim() || undefined,
      }),
    );
    if (ok) setEditingId(null);
  }

  async function act(member: TeamMember, action: MemberAction) {
    if (
      action === "remove" &&
      !window.confirm(`Remove ${member.email} from the workspace? They will lose access immediately.`)
    ) {
      return;
    }
    await run(() => memberAction(member.membershipId, action));
  }

  const expiryOf = (id: string) => inviteExpiry(invites.find((i) => i.membershipId === id)?.expiresAt);
  const resendTargets = (team?.members ?? []).filter((m) => m.status === "invited" && needsResend(expiryOf(m.membershipId)));

  async function resendAll() {
    if (resendTargets.length === 0) return;
    setBusy(true);
    setNotice(null);
    let ok = 0;
    for (const m of resendTargets) {
      try {
        await memberAction(m.membershipId, "resend-invite");
        ok += 1;
      } catch {
        /* keep going */
      }
    }
    setNotice({
      tone: ok === resendTargets.length ? "ok" : "error",
      text: `${ok} of ${resendTargets.length} invitations re-sent.`,
    });
    setBusy(false);
    await load();
    onChanged?.();
  }

  return (
    <div className={`${FIN.panel} p-4 mb-4`}>
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <SectionTitle>Team</SectionTitle>
          <p className="mt-1 text-[11px] text-zinc-500">
            {team ? `${team.seats.used} of ${team.seats.limit} seats used` : "Loading\u{2026}"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {resendTargets.length > 0 && (
            <button type="button" className={FIN.btnGhost} disabled={busy} onClick={resendAll}>
              Resend {resendTargets.length} expiring invite{resendTargets.length > 1 ? "s" : ""}
            </button>
          )}
          <button
            type="button"
            className={FIN.btnGold}
            disabled={!team || seatsFull}
            onClick={() => setShowInvite((v) => !v)}
          >
            {showInvite ? "Close" : "Invite employee"}
          </button>
        </div>
      </div>

      {seatsFull && (
        <div className="mb-3 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-[11px] text-amber-300">
          All seats are in use. Remove a member or upgrade your plan to invite more people.
        </div>
      )}

      {notice && (
        <div
          role="status"
          className={
            notice.tone === "ok"
              ? "mb-3 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-[12px] text-emerald-300"
              : "mb-3 rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-[12px] text-rose-300"
          }
        >
          {notice.text}
        </div>
      )}

      {loadError && <div className="mb-3 text-[12px] text-rose-300">{loadError}</div>}

      {showInvite && (
        <form onSubmit={submitInvite} className="mb-4 space-y-4 rounded-xl border border-[#c99b3b]/25 bg-[#0f1216] p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={FIN.label} htmlFor="invite-email">Email address</label>
              <input
                id="invite-email"
                type="email"
                required
                className={FIN.input}
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className={FIN.label} htmlFor="invite-title">Job title (optional)</label>
              <input
                id="invite-title"
                type="text"
                maxLength={80}
                className={FIN.input}
                value={designation}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDesignation(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className={FIN.label} htmlFor="invite-role">Role (fills the permissions below)</label>
            <select
              id="invite-role"
              className={`${FIN.input} sm:w-72`}
              value={role}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => chooseRole(e.target.value as Role)}
            >
              {EMPLOYEE_ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
          </div>

          <div>
            <div className={FIN.label}>This employee can access:</div>
            <PermissionChecklist value={perms} onChange={setPerms} />
          </div>

          <div className="flex gap-2">
            <button type="submit" className={FIN.btnGold} disabled={busy}>
              {busy ? "Sending\u{2026}" : "Send invitation"}
            </button>
            <button type="button" className={FIN.btnText} onClick={() => setShowInvite(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="divide-y divide-[#1d2128]">
        {team?.members.map((m) => {
          const isOwner = m.accountType === "owner";
          const editing = editingId === m.membershipId;
          const expiry = m.status === "invited" ? expiryOf(m.membershipId) : null;
          return (
            <div key={m.membershipId} className="py-2.5">
              <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[#f1d68a] to-[#a97b22] text-[12px] font-bold text-[#1a1204]">
                    {m.email.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[12px] font-medium text-zinc-100">
                      {m.email}{m.isYou ? " (you)" : ""}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-zinc-500">
                      <span className="capitalize">{isOwner ? "Owner" : m.designation || ROLE_LABELS[m.role]}</span>
                      {m.status === "active" && <span>{"\u{B7}"} Last login {timeAgo(m.lastLoginAt)}</span>}
                      {m.status === "invited" && <span>{"\u{B7}"} Invited {timeAgo(m.createdAt)}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {isOwner ? (
                    <span className={`${PILL} border-sky-400/30 bg-sky-400/10 text-sky-300`}>Owner {"\u{2014}"} full access</span>
                  ) : (
                    statusBadge(m.status)
                  )}
                  {expiry && (
                    <span
                      className={`${PILL} ${
                        expiry.tone === "expired"
                          ? "border-rose-400/30 bg-rose-400/10 text-rose-300"
                          : expiry.tone === "soon"
                            ? "border-amber-400/30 bg-amber-400/10 text-amber-300"
                            : "border-zinc-500/30 text-zinc-400"
                      }`}
                    >
                      {expiry.label}
                    </span>
                  )}
                  {!isOwner && (
                    <>
                      {m.status !== "removed" && (
                        <button className={BTN} disabled={busy} onClick={() => (editing ? setEditingId(null) : startEdit(m))}>
                          {editing ? "Close" : "Permissions"}
                        </button>
                      )}
                      {m.status === "invited" && (
                        <button className={BTN} disabled={busy} onClick={() => act(m, "resend-invite")}>
                          Resend invite
                        </button>
                      )}
                      {m.status === "active" && (
                        <button className={BTN} disabled={busy} onClick={() => act(m, "suspend")}>
                          Suspend
                        </button>
                      )}
                      {m.status === "suspended" && (
                        <button className={BTN} disabled={busy} onClick={() => act(m, "reactivate")}>
                          Reactivate
                        </button>
                      )}
                      <button className={`${BTN} !text-rose-300`} disabled={busy} onClick={() => act(m, "remove")}>
                        Remove
                      </button>
                    </>
                  )}
                </div>
              </div>

              {!isOwner && m.status !== "removed" && !editing && (
                <p className="mt-1.5 pl-11 text-[10px] text-zinc-600">
                  {m.permissions.length} of {GRANTABLE.length} permissions
                </p>
              )}

              {editing && (
                <div className="mt-3 space-y-4 rounded-xl border border-[#c99b3b]/25 bg-[#0f1216] p-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className={FIN.label}>Job title</label>
                      <input
                        className={FIN.input}
                        maxLength={80}
                        value={editTitle}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditTitle(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={FIN.label}>Role</label>
                      <select
                        className={FIN.input}
                        value={editRole}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setEditRole(e.target.value as Role)}
                      >
                        {EMPLOYEE_ROLES.map((r) => (
                          <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <PermissionChecklist value={editPerms} onChange={setEditPerms} disabled={busy} />
                  <div className="flex gap-2">
                    <button className={FIN.btnGold} disabled={busy} onClick={() => saveEdit(m)}>
                      {busy ? "Saving\u{2026}" : "Save permissions"}
                    </button>
                    <button className={FIN.btnText} onClick={() => setEditingId(null)}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {team && team.members.length === 0 && (
          <div className="py-4 text-[12px] text-zinc-500">No team members yet.</div>
        )}
      </div>
    </div>
  );
};
