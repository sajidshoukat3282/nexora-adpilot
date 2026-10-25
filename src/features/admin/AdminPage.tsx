import React, { useCallback, useEffect, useState } from "react";
import { TeamPanel, PERMISSION_LABELS, ALL_PERMISSIONS } from "./TeamPanel";
import { CompanyProfilePanel } from "./CompanyProfilePanel";
import { PasswordCard } from "./PasswordCard";
import { ExportCard } from "./ExportCard";
import { ApiKeysCard } from "./ApiKeysCard";
import { AuditLogCard, DefaultCurrencyCard, RoleCards, SecurityCard, TeamOverviewCards } from "./AdminExtras";
import { AuditPanel, LogoCard } from "./AdminPanels";
import { PermissionGate } from "@/components/ui/PermissionGate";
import { useSession } from "@/hooks/useSession";
import { useCompanyName } from "@/hooks/useCompanyProfile";
import { ROLE_LABELS, roleHasPermission } from "@/domain";
import type { Role } from "@/domain";
import type { TeamResponse } from "@/lib/api/team";
import { getAdminOverview, getSetupStatus, type AdminOverview, type SetupStatus } from "@/lib/api/admin";
import { FIN, SectionTitle } from "../finance/financeUi";
import { SetupChecklist } from "../guide/SetupChecklist";
import { setupProgress } from "../guide/setupSteps";

const ALL_ROLES = Object.keys(ROLE_LABELS) as Role[];

export const AdminPage: React.FC = () => {
  const { company } = useSession();
  const companyName = useCompanyName();
  const [team, setTeam] = useState<TeamResponse | null>(null);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [setup, setSetup] = useState<SetupStatus | null>(null);
  const [showSetup, setShowSetup] = useState(true);
  const [tab, setTab] = useState<"overview" | "company" | "team" | "roles" | "activity">("overview");

  const loadOverview = useCallback(async () => {
    try {
      setOverview(await getAdminOverview());
    } catch {
      /* the page still works without the extras */
    }
    try {
      setSetup(await getSetupStatus());
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const progress = setupProgress(setup);
  const setupDone = !!setup && progress.pct === 100;

  return (
    <PermissionGate permission="company.manage" action="view Admin & Roles">
      <div className={FIN.page}>
        <div className="mb-4 border-b border-[#c99b3b]/30 pb-3">
          <h1 className="text-[18px] font-semibold uppercase tracking-[0.24em] text-zinc-50">Admin &amp; Roles</h1>
          <p className="mt-1 text-[11px] font-medium text-[#d9b45a]">{`Users, permissions and company settings for ${companyName}`}</p>
        </div>

        <div className="mb-4 flex gap-1 overflow-x-auto border-b border-[#2a2f37]">
          {([["overview", "Overview"], ["company", "Company"], ["team", "Team"], ["roles", "Roles & Permissions"], ["activity", "Activity"]] as const).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} className={`whitespace-nowrap border-b-2 px-3.5 py-2.5 text-[11px] font-semibold tracking-wide transition-colors ${tab === id ? "border-[#c99b3b] text-[#f1d68a]" : "border-transparent text-zinc-400 hover:text-zinc-100"}`}>{label}</button>
          ))}
        </div>

        <div className={tab === "overview" ? "" : "hidden"}>
        <div className="mb-4 rounded-lg border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-[11px] text-amber-300">
          Invitations, seats and permissions are enforced by the server. Hiding pages from an employee is still done in the
          browser until each module (campaigns, finance, inventory{"\u{2026}"}) moves to server-side data access.
        </div>
        <TeamOverviewCards team={team} />

        {setup && !(setupDone && !showSetup) && (
          <div className={`${FIN.panel} mb-4 p-4`}>
            <div className="mb-3 flex items-center justify-between">
              <SectionTitle>Workspace setup</SectionTitle>
              {setupDone && (
                <button type="button" className={`${FIN.btnGhost} !px-2 !py-1`} onClick={() => setShowSetup(false)}>
                  Hide
                </button>
              )}
            </div>
            <SetupChecklist status={setup} />
          </div>
        )}

        </div>

        <div className={tab === "company" ? "" : "hidden"}>
          <CompanyProfilePanel />
          <LogoCard />
          <DefaultCurrencyCard onChanged={loadOverview} />
        </div>

        <div className={tab === "team" ? "" : "hidden"}>
          <TeamPanel invites={overview?.invites} onTeam={setTeam} onChanged={loadOverview} />
        </div>

        <div className={tab === "roles" ? "" : "hidden"}>
        <RoleCards team={team} />

        <div className={`${FIN.panel} mb-4 overflow-x-auto p-4`}>
          <SectionTitle>Permission Matrix</SectionTitle>
          <p className="mb-3 mt-1 text-[11px] text-zinc-500">
            Default access for each role. When you invite an employee you can adjust their individual permissions.
          </p>
          <table className="min-w-[720px] text-[12px]">
            <thead>
              <tr>
                <th className="pb-2 pr-4 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Permission</th>
                {ALL_ROLES.map((r) => (
                  <th key={r} className="px-2 pb-2 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                    {ROLE_LABELS[r]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ALL_PERMISSIONS.map((perm) => (
                <tr key={perm} className="border-t border-[#1d2128]">
                  <td className="py-1.5 pr-4 text-zinc-300">{PERMISSION_LABELS[perm]}</td>
                  {ALL_ROLES.map((r) => (
                    <td key={r} className="px-2 py-1.5 text-center">
                      {roleHasPermission(r, perm) ? <span className="text-emerald-300">{"\u{2713}"}</span> : <span className="text-zinc-700">{"\u{2013}"}</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        </div>

        <div className={tab === "overview" ? "" : "hidden"}>
        <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="space-y-4">
            <SecurityCard security={overview?.security ?? null} team={team} />
            <PasswordCard />
            <ExportCard />
            <ApiKeysCard />
          </div>
          <div className={`${FIN.panel} p-4`}>
            <SectionTitle>Company Settings</SectionTitle>
            <dl className="mt-3 grid grid-cols-2 gap-y-2 text-[12px]">
              <dt className="text-zinc-500">Company</dt>
              <dd className="text-zinc-100">{companyName}</dd>
              <dt className="text-zinc-500">Plan</dt>
              <dd className="capitalize text-zinc-100">{company?.plan}</dd>
              <dt className="text-zinc-500">Seats</dt>
              <dd className="text-zinc-100">{company?.seatsUsed} / {company?.seatsLimit}</dd>
              <dt className="text-zinc-500">Active Devices</dt>
              <dd className="text-zinc-100">{company?.devicesActive} / {company?.devicesLimit}</dd>
              <dt className="text-zinc-500">Timezone</dt>
              <dd className="text-zinc-100">{company?.timezone}</dd>
              <dt className="text-zinc-500">Default currency</dt>
              <dd className="text-zinc-100">{company?.defaultCurrency ?? "PKR"}</dd>
            </dl>
          </div>
        </div>

        <AuditLogCard entries={overview ? overview.auditLog.slice(0, 8) : null} onRefresh={loadOverview} />
        </div>

        <div className={tab === "activity" ? "" : "hidden"}>
          <AuditPanel />
        </div>
      </div>
    </PermissionGate>
  );
};
