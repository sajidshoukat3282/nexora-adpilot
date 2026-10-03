import React from "react";
import {
  FiGrid,
  FiMap,
  FiFilm,
  FiRadio,
  FiUsers,
  FiFileText,
  FiDollarSign,
  FiBarChart2,
  FiUser,
  FiBell,
  FiShield,
  FiShoppingBag,
} from "react-icons/fi";
import { Link, useCurrentPath } from "@/lib/router";
import { useSession } from "@/hooks/useSession";
import type { Permission } from "@/domain";

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  group: string;
  permission?: Permission;
}

const NAV_ITEMS: NavItem[] = [
  {
    path: "/dashboard",
    label: "Dashboard",
    icon: <FiGrid size={17} />,
    group: "Overview",
  },
  {
    path: "/inventory",
    label: "Inventory",
    icon: <FiMap size={17} />,
    group: "Operations",
    permission: "inventory.manage",
  },
  {
    path: "/campaigns",
    label: "Campaigns",
    icon: <FiFilm size={17} />,
    group: "Operations",
    permission: "campaigns.manage",
  },
  {
    path: "/operations",
    label: "Live Operations",
    icon: <FiRadio size={17} />,
    group: "Operations",
    permission: "operations.manage",
  },
  {
    path: "/reports",
    label: "Analytics & Reports",
    icon: <FiBarChart2 size={17} />,
    group: "Operations",
    permission: "reports.view",
  },
  {
    path: "/crm",
    label: "CRM & Leads",
    icon: <FiUsers size={17} />,
    group: "Commercial",
    permission: "crm.manage",
  },
  {
    path: "/proposals",
    label: "Proposals",
    icon: <FiFileText size={17} />,
    group: "Commercial",
    permission: "proposals.manage",
  },
  {
    path: "/finance",
    label: "Finance",
    icon: <FiDollarSign size={17} />,
    group: "Commercial",
    permission: "finance.view",
  },
  {
    path: "/clients/credit-risk",
    label: "Credit Risk",
    icon: <FiShield size={17} />,
    group: "Commercial",
    permission: "finance.view",
  },
  {
    path: "/client-portal",
    label: "Client Portal",
    icon: <FiUser size={17} />,
    group: "Client",
    permission: "client_portal.view",
  },
  {
    path: "/marketplace",
    label: "Marketplace",
    icon: <FiShoppingBag size={17} />,
    group: "Client",
  },
  {
    path: "/notifications",
    label: "Notifications",
    icon: <FiBell size={17} />,
    group: "System",
  },
  {
    path: "/admin",
    label: "Admin & Roles",
    icon: <FiShield size={17} />,
    group: "System",
    permission: "company.manage",
  },
];

const GROUPS = ["Overview", "Operations", "Commercial", "Client", "System"];

export const Sidebar: React.FC = () => {
  const path = useCurrentPath();
  const { company, session, can } = useSession();

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.permission || can(item.permission),
  );

  return (
    <aside className="hidden md:flex flex-col w-64 shrink-0 h-screen sticky top-0 bg-ink-950 border-r border-ink-800">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-ink-800">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-signal-cyan to-signal-blue text-sm font-black text-ink-950 shadow-lg">
            {company?.logoInitial ?? "N"}
          </div>

          <div className="min-w-0">
            <div className="text-sm font-bold tracking-tight text-ink-50">
              Nexora AdPilot
            </div>
            <div className="mt-0.5 truncate text-[11px] text-ink-500">
              {company?.name ?? "Workspace"}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-5">
        <div className="space-y-6">
          {GROUPS.map((group) => {
            const groupItems = visibleItems.filter(
              (item) => item.group === group,
            );

            if (groupItems.length === 0) {
              return null;
            }

            return (
              <section key={group}>
                <div className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-600">
                  {group}
                </div>

                <div className="space-y-1">
                  {groupItems.map((item) => {
                    const active =
                      path === item.path ||
                      path.startsWith(item.path + "/");

                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all ${
                          active
                            ? "bg-ink-800 text-ink-50 shadow-sm"
                            : "text-ink-400 hover:bg-ink-900 hover:text-ink-100"
                        }`}
                      >
                        <span
                          className={`flex shrink-0 items-center justify-center ${
                            active
                              ? "text-signal-cyan"
                              : "text-ink-500 group-hover:text-ink-300"
                          }`}
                        >
                          {item.icon}
                        </span>

                        <span className="truncate">{item.label}</span>

                        {active && (
                          <span className="ml-auto h-1.5 w-1.5 rounded-full bg-signal-cyan" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </nav>

      {/* Workspace status */}
      <div className="border-t border-ink-800 p-4">
        <div className="rounded-xl border border-ink-800 bg-ink-900/70 p-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-[11px] font-medium text-ink-300">
              Workspace active
            </span>
          </div>

          <div className="mt-2 truncate text-xs text-ink-500">
            {session?.designation ?? "Workspace user"}
          </div>
        </div>
      </div>
    </aside>
  );
};
