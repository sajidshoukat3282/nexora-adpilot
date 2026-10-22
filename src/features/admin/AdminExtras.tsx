import React, { useState } from "react";
import { useSession } from "@/hooks/useSession";
import { ROLE_LABELS, ROLE_PERMISSIONS } from "@/domain";
import type { Role } from "@/domain";
import type { TeamResponse } from "@/lib/api/team";
import { changeDefaultCurrency, type AdminOverview, type AuditEntry } from "@/lib/api/admin";
import { FIN, SectionTitle } from "../finance/financeUi";
import { PERMISSION_LABELS } from "./TeamPanel";
import { CURRENCY_NAMES, fmtDateTime, timeAgo } from "./adminTools";

/* ---------- 1. Team overview cards ---------- */
export const TeamOverviewCards: React.FC<{ team: TeamResponse | null }> = ({ team }) => {
  const count = (s: string) => team?.members.filter((m) => m.status === s).length ?? 0;
  const used = team?.seats.used ?? 0;
  const limit = team?.seats.limit ?? 0;
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const card = `${FIN.panel} p-3`;
  const label = "text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500";
  return (
    <div className="mb-4 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
      <div className={card}>
        <p className={label}>Active members</p>
        <p className="mt-1 text-[20px] font-semibold text-emerald-300">{count("active")}</p>
      </div>
      <div className={card}>
        <p className={label}>Pending invites</p>
        <p className="mt-1 text-[20px] font-semibold text-amber-300">{count("invited")}</p>
      </div>
      <div className={card}>
        <p className={label}>Suspended</p>
        <p className="mt-1 text-[20px] font-semibold text-rose-300">{count("suspended")}</p>
      </div>
      <div className={card}>
        <p className={label}>Seats used</p>
        <p className="mt-1 text-[20px] font-semibold text-[#f1d68a]">
          {used} <span className="text-[12px] font-normal text-zinc-500">/ {limit}</span>
        </p>
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[#0f1216]">
          <div
            className={`h-full rounded-full ${pct >= 100 ? "bg-rose-400" : "bg-gradient-to-r from-[#f1d68a] to-[#a97b22]"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
};

/* ---------- 5. Role cards ---------- */
const ROLE_NOTE: Partial<Record<Role, string>> = {
  owner: "Full control of the workspace",
  campaign_manager: "Plans and runs campaigns",
  sales_manager: "CRM, leads and proposals",
  creative_manager: "Creatives and approvals",
  field_operator: "Screens and proof of play",
  finance: "Invoices, payments and expenses",
  viewer: "Read-only access",
};

export const RoleCards: React.FC<{ team: TeamResponse | null }> = ({ team }) => {
  const [openRole, setOpenRole] = useState<Role | null>(null);
  const roles = (["owner", "campaign_manager", "sales_manager", "creative_manager", "field_operator", "finance", "viewer"] as Role[]);
  return (
    <div className={`${FIN.panel} mb-4 p-4`}>
      <div className="mb-3">
        <SectionTitle>Roles</SectionTitle>
        <p className="mt-1 text-[11px] text-zinc-500">Click a role to see what it can do and who has it.</p>
      </div>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        {roles.map((r) => {
          const perms = ROLE_PERMISSIONS[r] ?? [];
          const members = team?.members.filter((m) => m.role === r && m.status !== "removed") ?? [];
          const open = openRole === r;
          return (
            <button
              key={r}
              type="button"
              onClick={() => setOpenRole(open ? null : r)}
              className={`rounded-xl border p-3 text-left transition ${
                open ? "border-[#c99b3b]/60 bg-[#c99b3b]/5" : "border-[#22262d] bg-[#0f1216] hover:border-[#c99b3b]/40"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] font-semibold text-zinc-100">{ROLE_LABELS[r]}</span>
                <span className="rounded-full bg-white/5 px-1.5 text-[10px] tabular-nums text-zinc-400">{members.length}</span>
              </div>
              <p className="mt-0.5 text-[11px] text-zinc-500">{ROLE_NOTE[r]}</p>
              <p className="mt-1.5 text-[10px] font-semibold text-[#d9b45a]">{perms.length} permissions</p>
              {open && (
                <div className="mt-2 border-t border-[#22262d] pt-2">
                  <ul className="space-y-0.5">
                    {perms.map((p) => (
                      <li key={p} className="text-[11px] text-zinc-300">
                        <span className="mr-1 text-emerald-300">{"\u{2713}"}</span>
                        {PERMISSION_LABELS[p]}
                      </li>
                    ))}
                  </ul>
                  {members.length > 0 && (
                    <p className="mt-2 text-[10px] text-zinc-500">{members.map((m) => m.email).join(", ")}</p>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

/* ---------- 6. Default currency ---------- */
export const DefaultCurrencyCard: React.FC<{ onChanged: () => void }> = ({ onChanged }) => {
  const { company, refresh } = useSession();
  const current = company?.defaultCurrency ?? "PKR";
  const [value, setValue] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const selected = value || current;

  async function save() {
    if (selected === current) return;
    const ok = window.confirm(
      `Change the default currency from ${current} to ${selected}?\n\nNew invoices, campaigns and reports will use ${selected}. Existing records keep the currency they were created with, and amounts are NOT converted.`,
    );
    if (!ok) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await changeDefaultCurrency(selected);
      setMsg({ ok: true, text: res.message });
      setValue("");
      await refresh();
      onChanged();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Unable to change the currency." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`${FIN.panel} mb-4 p-4`}>
      <SectionTitle>Default currency</SectionTitle>
      <p className="mb-3 mt-1 text-[11px] text-zinc-500">
        Used for new invoices, payments, expenses and CRM values. Current: <b className="text-[#f1d68a]">{current}</b>
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <div className="w-full sm:w-64">
          <label className={FIN.label} htmlFor="default-currency">Currency</label>
          <select
            id="default-currency"
            className={FIN.input}
            value={selected}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setValue(e.target.value)}
          >
            {Object.keys(CURRENCY_NAMES).map((code) => (
              <option key={code} value={code}>{code} - {CURRENCY_NAMES[code]}</option>
            ))}
          </select>
        </div>
        <button type="button" className={FIN.btnGold} disabled={busy || selected === current} onClick={save}>
          {busy ? "Saving..." : "Change currency"}
        </button>
        {msg && <span className={`text-[11px] ${msg.ok ? "text-emerald-300" : "text-rose-300"}`}>{msg.text}</span>}
      </div>
      <p className="mt-2 text-[10px] text-amber-300/80">
        Changing the currency does not convert existing amounts. Only change it if your billing currency has really changed.
      </p>
    </div>
  );
};

/* ---------- 8. Security ---------- */
export const SecurityCard: React.FC<{ security: AdminOverview["security"] | null; team: TeamResponse | null }> = ({ security, team }) => {
  const suspended = team?.members.filter((m) => m.status === "suspended").length ?? 0;
  const pending = team?.members.filter((m) => m.status === "invited").length ?? 0;
  const neverLoggedIn = team?.members.filter((m) => m.status === "active" && !m.lastLoginAt).length ?? 0;
  const rows: { label: string; value: string; tone: "ok" | "warn" | "info" }[] = security
    ? [
        { label: "Active sessions", value: String(security.activeSessions), tone: "info" },
        {
          label: "2-step verification",
          value: `${security.mfaEnabled} of ${security.activeMembers} members`,
          tone: security.activeMembers > 0 && security.mfaEnabled === security.activeMembers ? "ok" : "warn",
        },
        { label: "Unverified emails", value: String(security.unverifiedEmails), tone: security.unverifiedEmails > 0 ? "warn" : "ok" },
        { label: "Suspended accounts", value: String(suspended), tone: "info" },
        { label: "Pending invitations", value: String(pending), tone: pending > 0 ? "warn" : "ok" },
        { label: "Active, never signed in", value: String(neverLoggedIn), tone: neverLoggedIn > 0 ? "warn" : "ok" },
      ]
    : [];
  const tone = { ok: "text-emerald-300", warn: "text-amber-300", info: "text-zinc-200" } as const;
  return (
    <div className={`${FIN.panel} p-4`}>
      <SectionTitle>Security</SectionTitle>
      {!security ? (
        <p className="py-3 text-[12px] text-zinc-500">Loading...</p>
      ) : (
        <>
          <dl className="mt-3 divide-y divide-[#1d2128]">
            {rows.map((r) => (
              <div key={r.label} className="flex items-center justify-between py-1.5 text-[12px]">
                <dt className="text-zinc-400">{r.label}</dt>
                <dd className={`font-semibold ${tone[r.tone]}`}>{r.value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-2.5 text-[10px] text-zinc-500">
            Suspend or remove a member to end their sessions immediately. Remove people who no longer work with you.
          </p>
        </>
      )}
    </div>
  );
};

/* ---------- 1. Audit log ---------- */
export const AuditLogCard: React.FC<{ entries: AuditEntry[] | null; onRefresh: () => void }> = ({ entries, onRefresh }) => (
  <div className={`${FIN.panel} p-4`}>
    <div className="mb-3 flex items-center justify-between">
      <SectionTitle>Activity Log</SectionTitle>
      <button type="button" className={`${FIN.btnGhost} !px-2 !py-1`} onClick={onRefresh}>
        Refresh
      </button>
    </div>
    {!entries ? (
      <p className="py-3 text-[12px] text-zinc-500">Loading...</p>
    ) : entries.length === 0 ? (
      <p className="py-3 text-center text-[12px] text-zinc-500">
        No activity yet. Team, profile and currency changes will appear here.
      </p>
    ) : (
      <ul className="max-h-[320px] space-y-1.5 overflow-y-auto pr-1">
        {entries.map((e) => (
          <li key={e.id} className="flex items-start gap-2.5 rounded-lg border border-[#22262d] bg-[#0f1216] px-2.5 py-2">
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#e5c36a]" />
            <div className="min-w-0 flex-1">
              <p className="text-[12px] text-zinc-100">
                {e.action}
                {e.detail ? <span className="text-zinc-400"> {"\u{B7}"} {e.detail}</span> : null}
              </p>
              <p className="text-[10px] text-zinc-500">
                {e.actor ?? "System"} {"\u{B7}"} {fmtDateTime(e.at)} ({timeAgo(e.at)})
              </p>
            </div>
          </li>
        ))}
      </ul>
    )}
  </div>
);
