import React, { useCallback, useEffect, useState } from "react";
import { StatusBadge } from "@/components/ui/StatusBadge";
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
const GRANTABLE = ALL_PERMISSIONS.filter((p) => p !== "company.manage");

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
          className="flex items-center gap-2 text-sm text-ink-200 cursor-pointer"
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

function statusBadge(status: TeamMember["status"]) {
  if (status === "active") return <StatusBadge label="Active" tone="green" />;
  if (status === "invited") return <StatusBadge label="Invite pending" tone="amber" />;
  if (status === "suspended") return <StatusBadge label="Suspended" tone="red" />;
  return <StatusBadge label="Removed" tone="slate" />;
}

export const TeamPanel: React.FC = () => {
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
      setTeam(await getTeam());
      setLoadError("");
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Unable to load the team.");
    }
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

  return (
    <div className="panel p-5 mb-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h3 className="font-semibold text-ink-50">Team</h3>
          <p className="text-xs text-ink-500 mt-0.5">
            {team ? `${team.seats.used} of ${team.seats.limit} seats used` : "Loading…"}
          </p>
        </div>
        <button
          type="button"
          className="btn-primary"
          disabled={!team || seatsFull}
          onClick={() => setShowInvite((v) => !v)}
        >
          {showInvite ? "Close" : "Invite employee"}
        </button>
      </div>

      {seatsFull && (
        <div className="text-xs text-signal-amber bg-signal-amber/10 border border-signal-amber/25 rounded-lg px-3 py-2 mb-4">
          All seats are in use. Remove a member or upgrade your plan to invite more people.
        </div>
      )}

      {notice && (
        <div
          role="status"
          className={
            notice.tone === "ok"
              ? "text-sm text-signal-green bg-signal-green/10 border border-signal-green/25 rounded-lg px-3 py-2 mb-4"
              : "text-sm text-signal-red bg-signal-red/10 border border-signal-red/25 rounded-lg px-3 py-2 mb-4"
          }
        >
          {notice.text}
        </div>
      )}

      {loadError && (
        <div className="text-sm text-signal-red mb-4">{loadError}</div>
      )}

      {showInvite && (
        <form
          onSubmit={submitInvite}
          className="rounded-xl border border-ink-700/60 bg-ink-850 p-4 mb-5 space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="invite-email">Email address</label>
              <input
                id="invite-email"
                type="email"
                required
                className="input w-full"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="invite-title">Job title (optional)</label>
              <input
                id="invite-title"
                type="text"
                maxLength={80}
                className="input w-full"
                value={designation}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDesignation(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="invite-role">Role (fills the permissions below)</label>
            <select
              id="invite-role"
              className="input w-full sm:w-72"
              value={role}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => chooseRole(e.target.value as Role)}
            >
              {EMPLOYEE_ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="text-xs font-semibold text-ink-400 mb-2">
              This employee can access:
            </div>
            <PermissionChecklist value={perms} onChange={setPerms} />
          </div>

          <div className="flex gap-2">
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? "Sending…" : "Send invitation"}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setShowInvite(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="divide-y divide-ink-800">
        {team?.members.map((m) => {
          const isOwner = m.accountType === "owner";
          const editing = editingId === m.membershipId;
          return (
            <div key={m.membershipId} className="py-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-ink-700 flex items-center justify-center text-xs font-bold text-ink-100 shrink-0">
                    {m.email.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-ink-100 truncate">
                      {m.email}{m.isYou ? " (you)" : ""}
                    </div>
                    <div className="text-xs text-ink-500 capitalize">
                      {isOwner ? "Owner" : m.designation || ROLE_LABELS[m.role]}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {isOwner ? <StatusBadge label="Owner — full access" tone="cyan" dot={false} /> : statusBadge(m.status)}
                  {!isOwner && (
                    <>
                      {m.status !== "removed" && (
                        <button className="btn-secondary !py-1 !px-2 text-xs" disabled={busy} onClick={() => (editing ? setEditingId(null) : startEdit(m))}>
                          {editing ? "Close" : "Permissions"}
                        </button>
                      )}
                      {m.status === "invited" && (
                        <button className="btn-secondary !py-1 !px-2 text-xs" disabled={busy} onClick={() => act(m, "resend-invite")}>
                          Resend invite
                        </button>
                      )}
                      {m.status === "active" && (
                        <button className="btn-secondary !py-1 !px-2 text-xs" disabled={busy} onClick={() => act(m, "suspend")}>
                          Suspend
                        </button>
                      )}
                      {m.status === "suspended" && (
                        <button className="btn-secondary !py-1 !px-2 text-xs" disabled={busy} onClick={() => act(m, "reactivate")}>
                          Reactivate
                        </button>
                      )}
                      <button className="btn-secondary !py-1 !px-2 text-xs text-signal-red" disabled={busy} onClick={() => act(m, "remove")}>
                        Remove
                      </button>
                    </>
                  )}
                </div>
              </div>

              {editing && (
                <div className="mt-3 rounded-xl border border-ink-700/60 bg-ink-850 p-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Job title</label>
                      <input
                        className="input w-full"
                        maxLength={80}
                        value={editTitle}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditTitle(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="label">Role</label>
                      <select
                        className="input w-full"
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
                    <button className="btn-primary" disabled={busy} onClick={() => saveEdit(m)}>
                      {busy ? "Saving…" : "Save permissions"}
                    </button>
                    <button className="btn-secondary" onClick={() => setEditingId(null)}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {team && team.members.length === 0 && (
          <div className="py-4 text-sm text-ink-500">No team members yet.</div>
        )}
      </div>
    </div>
  );
};
