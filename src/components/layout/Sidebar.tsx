import React, { useState } from "react";
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
  FiChevronRight,
} from "react-icons/fi";
import { Link, useCurrentPath } from "@/lib/router";
import { useSession } from "@/hooks/useSession";
import { CompanyMark } from "./CompanyMark";
import { useCompanyName } from "@/hooks/useCompanyProfile";
import { usePlatformAdmin } from "@/hooks/usePlatformAdmin";
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
    path: "/field",
    label: "Field Proof",
    icon: <FiRadio size={16} />,
    group: "Operations",
    permission: "proof.submit",
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

const GROUPS = ["Overview", "Operations", "Commercial", "Client", "System", "Platform"];

export const Sidebar: React.FC = () => {
  const path = useCurrentPath();
  const { company, session, can } = useSession();
  const companyName = useCompanyName();

  // Collapse to an icon-only rail (remembered in this browser)
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem("adpilot.sidebar.collapsed") === "1";
    } catch {
      return false;
    }
  });
  const toggleCollapsed = () => {
    setCollapsed((value) => {
      const next = !value;
      try {
        window.localStorage.setItem("adpilot.sidebar.collapsed", next ? "1" : "0");
      } catch {
        /* storage unavailable - ignore */
      }
      return next;
    });
  };

  const isPlatformAdmin = usePlatformAdmin();
  const visibleItems = [
    ...NAV_ITEMS,
    ...(isPlatformAdmin ? [{ path: "/platform", label: "Platform", icon: <FiShield size={16} />, group: "Platform" } as NavItem] : []),
  ].filter((item) => !item.permission || can(item.permission));

  return (
    // Luxury dark sidebar (matches the Commander's Dashboard)
    <aside className={`hidden md:flex flex-col ${collapsed ? "w-[60px]" : "w-56"} shrink-0 h-screen sticky top-0 transition-[width] duration-200 bg-gradient-to-b from-[#12151a] to-[#0b0d10] border-r border-[#2a2f37] shadow-[8px_0_24px_rgba(0,0,0,0.35)]`}>
      
      {/* Brand */}
      <div className={`border-b border-[#2a2f37] py-3.5 ${collapsed ? "px-2" : "px-4"}`}>
        <div className={`flex items-center ${collapsed ? "justify-center" : "gap-3"}`}>
          <CompanyMark name={companyName} box="h-8 w-8" text="text-sm font-black" />

          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold tracking-tight text-zinc-50">
                Nexora <span className="text-[#f1d68a]">AdPilot</span>
              </div>
              <div className="mt-0.5 truncate text-[10px] font-medium text-zinc-500">
                {companyName}
              </div>
            </div>
          )}

          {!collapsed && (
            <button
              type="button"
              onClick={toggleCollapsed}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-white/5 hover:text-[#f1d68a]"
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
            >
              <FiChevronRight size={14} className="rotate-180" />
            </button>
          )}
        </div>
      </div>

      {collapsed && (
        <button
          type="button"
          onClick={toggleCollapsed}
          className="mx-auto mt-2 flex h-6 w-6 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-white/5 hover:text-[#f1d68a]"
          aria-label="Expand sidebar"
          title="Expand sidebar"
        >
          <FiChevronRight size={14} />
        </button>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-3 custom-scrollbar">
        <div className="space-y-4">
          {GROUPS.map((group) => {
            const groupItems = visibleItems.filter(
              (item) => item.group === group,
            );

            if (groupItems.length === 0) {
              return null;
            }

            return (
              <section key={group}>
                <div className="mb-1.5 flex items-center gap-2 px-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  <span className={`h-px bg-gradient-to-r from-[#c99b3b] to-transparent ${collapsed ? "w-full" : "w-3"}`} />
                  {!collapsed && group}
                </div>

                <div className="space-y-0.5">
                  {groupItems.map((item) => {
                    const active =
                      path === item.path ||
                      path.startsWith(item.path + "/");

                    return (
                      <div key={item.path} title={collapsed ? item.label : undefined}>
                      <Link
                        to={item.path}
                        className={`group relative flex items-center ${collapsed ? "justify-center" : "gap-2.5"} rounded-lg border px-2.5 py-1.5 text-[12px] font-medium transition-all ${
                          active
                            ? "border-[#c99b3b]/30 bg-gradient-to-r from-[#c99b3b]/20 to-[#c99b3b]/5 text-[#f1d68a]"
                            : "border-transparent text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100"
                        }`}
                      >
                        {/* Gold active line */}
                        {active && (
                          <div className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-md bg-gradient-to-b from-[#f1d68a] to-[#a97b22] shadow-[0_0_8px_rgba(201,155,59,0.6)]" />
                        )}

                        <span
                          className={`flex shrink-0 items-center justify-center ${
                            active
                              ? "text-[#f1d68a]"
                              : "text-zinc-500 group-hover:text-zinc-300"
                          }`}
                        >
                          {item.icon}
                        </span>

                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </Link>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </nav>

      {/* Workspace status */}
      <div className="border-t border-[#2a2f37] p-2.5">
        <div className={`rounded-lg border border-[#2a2f37] bg-gradient-to-b from-[#171a20] to-[#0f1216] ${collapsed ? "flex justify-center p-2" : "p-2.5"}`} title={collapsed ? "Workspace active" : undefined}>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_5px_rgba(16,185,129,0.8)]" />
            {!collapsed && (
              <span className="text-[11px] font-medium text-zinc-200">
                Workspace active
              </span>
            )}
          </div>

          {!collapsed && (
            <div className="mt-1 truncate text-[10px] text-[#d9b45a]/80">
              {session?.designation ?? "Workspace user"}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
