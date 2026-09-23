import React from "react";
import { PageHeader } from "@/components/layout/AppShell";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PermissionGate } from "@/components/ui/PermissionGate";
import { useAsync } from "@/hooks/useAsync";
import { useSession } from "@/hooks/useSession";
import { repo } from "@/repositories/demo";
import { ROLE_LABELS, ROLE_PERMISSIONS, roleHasPermission } from "@/domain";
import type { Role, Permission } from "@/domain";

const ALL_ROLES = Object.keys(ROLE_LABELS) as Role[];
const ALL_PERMISSIONS: Permission[] = [
  "campaigns.manage", "inventory.manage", "creatives.manage", "creatives.approve",
  "operations.manage", "operations.override", "crm.manage", "proposals.manage",
  "finance.view", "finance.manage", "company.manage", "reports.view", "reports.generate", "reports.send", "proof.view", "proof.submit", "analytics.view", "subscription.view", "client_portal.view",
];
const PERMISSION_LABELS: Record<Permission, string> = {
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
  "company.manage": "Manage Company",
  "reports.view": "View Reports",
  "reports.generate": "Generate Reports",
  "reports.send": "Send Reports",
  "proof.view": "View Proof",
  "proof.submit": "Submit Proof",
  "analytics.view": "View Analytics",
  "subscription.view": "View Subscription",
  "client_portal.view": "Client Portal Access",
};

export const AdminPage: React.FC = () => {
  const { company } = useSession();
  const users = useAsync(() => repo.company.listUsers(), []);

  return (
    <PermissionGate permission="company.manage" action="view Admin & Roles">
      <div>
        <PageHeader title="Admin & Roles" description="Users, permissions and company settings for Vantage Outdoor Media." />

        <div className="text-xs text-signal-amber bg-signal-amber/10 border border-signal-amber/25 rounded-lg px-3 py-2 mb-5">
          Demo Enforcement — this permission matrix reflects client-side RBAC used to shape this demo's UI. It is not a
          production authorization boundary; every gate here runs in the visitor's own browser and can be bypassed by
          anyone with developer tools. Real enforcement requires a server-side authorization layer, which this Phase 2
          frontend does not include.
        </div>

        <div className="panel p-5 mb-5">
          <h3 className="font-semibold text-ink-50 mb-4">Team ({users.data?.length ?? 0} users)</h3>
          <div className="divide-y divide-ink-800">
            {users.data?.map((u) => (
              <div key={u.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-ink-700 flex items-center justify-center text-xs font-bold text-ink-100">
                    {u.avatarInitial}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-ink-100">{u.name}</div>
                    <div className="text-xs text-ink-500">{u.email}</div>
                  </div>
                </div>
                <StatusBadge label={ROLE_LABELS[u.role]} tone="cyan" dot={false} />
              </div>
            ))}
          </div>
        </div>

        <div className="panel p-5 mb-5 overflow-x-auto">
          <h3 className="font-semibold text-ink-50 mb-1">Permission Matrix</h3>
          <p className="text-xs text-ink-500 mb-4">Generated directly from the app's ROLE_PERMISSIONS constant — not a separately maintained table.</p>
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
          <p className="text-xs text-ink-500 mt-4">Editing company settings is not available in this Phase 2 demo foundation.</p>
        </div>
      </div>
    </PermissionGate>
  );
};
