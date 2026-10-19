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
    icon: <FiGrid size={16} />,
    group: "Overview",
  },
  {
    path: "/inventory",
    label: "Inventory",
    icon: <FiMap size={16} />,
    group: "Operations",
    permission: "inventory.manage",
  },
  {
    path: "/campaigns",
    label: "Campaigns",
    icon: <FiFilm size={16} />,
    group: "Operations",
    permission: "campaigns.manage",
  },
  {
    path: "/operations",
    label: "Live Operations",
    icon: <FiRadio size={16} />,
    group: "Operations",
    permission: "operations.manage",
  },
  {
    path: "/reports",
    label: "Analytics & Reports",
    icon: <FiBarChart2 size={16} />,
    group: "Operations",
    permission: "reports.view",
  },
  {
    path: "/crm",
    label: "CRM & Leads",
    icon: <FiUsers size={16} />,
    group: "Commercial",
    permission: "crm.manage",
  },
  {
    path: "/proposals",
    label: "Proposals",
    icon: <FiFileText size={16} />,
    group: "Commercial",
    permission: "proposals.manage",
  },
  {
    path: "/finance",
    label: "Finance",
    icon: <FiDollarSign size={16} />,
    group: "Commercial",
    permission: "finance.view",
  },
  {
    path: "/clients/credit-risk",
    label: "Credit Risk",
    icon: <FiShield size={16} />,
    group: "Commercial",
    permission: "finance.view",
  },
  {
    path: "/client-portal",
    label: "Client Portal",
    icon: <FiUser size={16} />,
    group: "Client",
    permission: "client_portal.view",
  },
  {
    path: "/marketplace",
    label: "Marketplace",
    icon: <FiShoppingBag size={16} />,
    group: "Client",
  },
  {
    path: "/notifications",
    label: "Notifications",
    icon: <FiBell size={16} />,
    group: "System",
  },
  {
    path: "/admin",
    label: "Admin & Roles",
    icon: <FiShield size={16} />,
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
    // Deep Dark Sidebar with subtle right border
    <aside className="hidden md:flex flex-col w-60 shrink-0 h-screen sticky top-0 bg-[#0B1120] border-r border-white/5">
      
      {/* Brand */}
      <div className="px-4 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm font-black text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.15)]">
            {company?.logoInitial ?? "N"}
          </div>

          <div className="min-w-0">
            <div className="text-sm font-bold tracking-tight text-white">
              Nexora AdPilot
            </div>
            <div className="mt-0.5 truncate text-[10px] text-slate-500 font-medium">
              {company?.name ?? "Workspace"}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 custom-scrollbar">
        <div className="space-y-5">
          {GROUPS.map((group) => {
            const groupItems = visibleItems.filter(
              (item) => item.group === group,
            );

            if (groupItems.length === 0) {
              return null;
            }

            return (
              <section key={group}>
                <div className="px-2 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500/80">
                  {group}
                </div>

                <div className="space-y-0.5">
                  {groupItems.map((item) => {
                    const active =
                      path === item.path ||
                      path.startsWith(item.path + "/");

                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`group relative flex items-center gap-3 rounded-md px-2.5 py-2 text-xs font-medium transition-all ${
                          active
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                        }`}
                      >
                        {/* Neon Green Active Line */}
                        {active && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-emerald-400 rounded-r-md shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                        )}

                        <span
                          className={`flex shrink-0 items-center justify-center ${
                            active
                              ? "text-emerald-400"
                              : "text-slate-500 group-hover:text-slate-300"
                          }`}
                        >
                          {item.icon}
                        </span>

                        <span className="truncate">{item.label}</span>
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
      <div className="border-t border-white/5 p-3">
        <div className="rounded-lg border border-white/5 bg-[#151E32]/50 p-3">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_5px_rgba(16,185,129,0.8)]" />
            <span className="text-[11px] font-medium text-slate-300">
              Workspace active
            </span>
          </div>

          <div className="mt-1.5 truncate text-[10px] text-slate-500">
            {session?.designation ?? "Workspace user"}
          </div>
        </div>
      </div>
    </aside>
  );
};
