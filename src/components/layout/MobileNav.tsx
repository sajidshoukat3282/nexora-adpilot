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
  FiX,
} from "react-icons/fi";
import { Link, useCurrentPath } from "@/lib/router";
import { useSession } from "@/hooks/useSession";
import type { Permission } from "@/domain";

type NavItem = {
  path: string;
  label: string;
  icon: React.ReactNode;
  permission?: Permission;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      {
        path: "/dashboard",
        label: "Dashboard",
        icon: <FiGrid size={18} />,
      },
    ],
  },
  {
    label: "Operations",
    items: [
      {
        path: "/inventory",
        label: "Inventory & Map",
        icon: <FiMap size={18} />,
        permission: "inventory.manage",
      },
      {
        path: "/campaigns",
        label: "Campaigns",
        icon: <FiFilm size={18} />,
        permission: "campaigns.manage",
      },
      {
        path: "/operations",
        label: "Live Operations",
        icon: <FiRadio size={18} />,
        permission: "operations.manage",
      },
      {
        path: "/reports",
        label: "Analytics & Reports",
        icon: <FiBarChart2 size={18} />,
        permission: "reports.view",
      },
    ],
  },
  {
    label: "Commercial",
    items: [
      {
        path: "/crm",
        label: "CRM & Leads",
        icon: <FiUsers size={18} />,
        permission: "crm.manage",
      },
      {
        path: "/proposals",
        label: "Proposals",
        icon: <FiFileText size={18} />,
        permission: "proposals.manage",
      },
      {
        path: "/finance",
        label: "Finance",
        icon: <FiDollarSign size={18} />,
        permission: "finance.view",
      },
      {
        path: "/clients/credit-risk",
        label: "Credit Risk",
        icon: <FiShield size={18} />,
        permission: "finance.view",
      },
    ],
  },
  {
    label: "Client",
    items: [
      {
        path: "/client-portal",
        label: "Client Portal",
        icon: <FiUser size={18} />,
        permission: "client_portal.view",
      },
      {
        path: "/marketplace",
        label: "Marketplace",
        icon: <FiShoppingBag size={18} />,
      },
      {
        path: "/notifications",
        label: "Notifications",
        icon: <FiBell size={18} />,
      },
    ],
  },
  {
    label: "System",
    items: [
      {
        path: "/admin",
        label: "Admin & Roles",
        icon: <FiShield size={18} />,
        permission: "company.manage",
      },
    ],
  },
];

export const MobileNav: React.FC<{
  open: boolean;
  onClose: () => void;
}> = ({ open, onClose }) => {
  const path = useCurrentPath();
  const { can, company, session } = useSession();

  const visibleGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter(
      (item) => !item.permission || can(item.permission),
    ),
  })).filter((group) => group.items.length > 0);

  return (
    <div
      className={`fixed inset-0 z-50 md:hidden ${
        open ? "" : "pointer-events-none"
      }`}
      aria-hidden={!open}
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/70 backdrop-blur-[2px] transition-opacity duration-200 ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <aside
        className={`absolute left-0 top-0 flex h-full w-[300px] max-w-[86vw] flex-col border-r border-ink-700/70 bg-ink-950 shadow-2xl shadow-black/50 transition-transform duration-200 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Mobile navigation"
      >
        {/* Header */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-ink-800/80 px-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-signal-cyan to-signal-cyan/50 text-xs font-black text-ink-950 shadow-lg shadow-signal-cyan/10">
              NA
            </div>

            <div className="min-w-0">
              <div className="truncate text-sm font-bold tracking-tight text-ink-50">
                Nexora AdPilot
              </div>
              <div className="truncate text-[10px] uppercase tracking-[0.14em] text-ink-500">
                {company?.name ?? "Workspace"}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-ink-800 hover:text-ink-50"
            aria-label="Close navigation"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Workspace status */}
        <div className="mx-3 mt-3 rounded-xl border border-ink-800 bg-ink-900/60 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/40" />

            <span className="text-[11px] font-medium text-ink-300">
              Workspace active
            </span>
          </div>

          {session?.designation && (
            <div className="mt-1 truncate pl-4 text-[10px] text-ink-600">
              {session.designation}
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {visibleGroups.map((group) => (
            <div key={group.label} className="mb-5 last:mb-0">
              <div className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-600">
                {group.label}
              </div>

              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active =
                    path === item.path ||
                    path.startsWith(item.path + "/");

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={onClose}
                      className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all ${
                        active
                          ? "bg-signal-cyan/10 text-signal-cyan shadow-sm"
                          : "text-ink-400 hover:bg-ink-900 hover:text-ink-100"
                      }`}
                    >
                      <span
                        className={`flex w-5 shrink-0 items-center justify-center ${
                          active
                            ? "text-signal-cyan"
                            : "text-ink-500 group-hover:text-ink-300"
                        }`}
                      >
                        {item.icon}
                      </span>

                      <span className="min-w-0 flex-1 truncate">
                        {item.label}
                      </span>

                      {active && (
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-signal-cyan shadow-sm shadow-signal-cyan/50" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="shrink-0 border-t border-ink-800/80 p-3">
          <div className="rounded-lg px-3 py-2 text-[10px] text-ink-600">
            Nexora AdPilot
            <span className="mx-1.5">•</span>
            Secure workspace
          </div>
        </div>
      </aside>
    </div>
  );
};
