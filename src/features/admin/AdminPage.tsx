import React from "react";
import { PageHeader } from "@/components/layout/AppShell";
import { TeamPanel, PERMISSION_LABELS, ALL_PERMISSIONS } from "./TeamPanel";
import { PermissionGate } from "@/components/ui/PermissionGate";
import { useSession } from "@/hooks/useSession";
import { ROLE_LABELS, roleHasPermission } from "@/domain";
import type { Role } from "@/domain";

const ALL_ROLES = Object.keys(ROLE_LABELS) as Role[];

export const AdminPage: React.FC = () => {
  const { company } = useSession();

  return (
    <PermissionGate permission="company.manage" action="view Admin & Roles">
      <div>
        <PageHeader title="Admin & Roles" description={`Users, permissions and company settings for ${company?.name ?? "your company"}.`} />

        <div className="text-xs text-signal-amber bg-signal-amber/10 border border-signal-amber/25 rounded-lg px-3 py-2 mb-5">
          Invitations, seats and permissions are enforced by the server. Hiding pages from an employee is still done in the
          browser until each module (campaigns, finance, inventory…) moves to server-side data access.
        </div>

        <TeamPanel />

        <div className="panel p-5 mb-5 overflow-x-auto">
          <h3 className="font-semibold text-ink-50 mb-1">Permission Matrix</h3>
          <p className="text-xs text-ink-500 mb-4">Default access for each role. When you invite an employee you can adjust their individual permissions.</p>
          <table className="text-sm min-w-[720px]">
            <thead>
              <tr>
                <th className="text-left text-xs text-ink-500 font-semibold pb-2 pr-4">Permission</th>
                {ALL_ROLES.map((r) => (
                  <th key={r} className="text-center text-xs text-ink-500 font-semibold pb-2 px-2">{ROLE_LABELS[r]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ALL_PERMISSIONS.map((perm) => (
                <tr key={perm} className="border-t border-ink-800">
                  <td className="py-2 pr-4 text-ink-300">{PERMISSION_LABELS[perm]}</td>
                  {ALL_ROLES.map((r) => (
                    <td key={r} className="text-center py-2 px-2">
                      {roleHasPermission(r, perm) ? (
                        <span className="text-signal-green">✓</span>
                      ) : (
                        <span className="text-ink-700">–</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="panel p-5">
          <h3 className="font-semibold text-ink-50 mb-4">Company Settings</h3>
          <dl className="grid grid-cols-2 gap-y-3 text-sm max-w-md">
            <dt className="text-ink-500">Company</dt>
            <dd className="text-ink-100">{company?.name}</dd>
            <dt className="text-ink-500">Plan</dt>
            <dd className="text-ink-100 capitalize">{company?.plan}</dd>
            <dt className="text-ink-500">Seats</dt>
            <dd className="text-ink-100">{company?.seatsUsed} / {company?.seatsLimit}</dd>
            <dt className="text-ink-500">Active Devices</dt>
            <dd className="text-ink-100">{company?.devicesActive} / {company?.devicesLimit}</dd>
            <dt className="text-ink-500">Timezone</dt>
            <dd className="text-ink-100">{company?.timezone}</dd>
          </dl>
          <p className="text-xs text-ink-500 mt-4">Editing company settings is not available yet.</p>
        </div>
      </div>
    </PermissionGate>
  );
};
