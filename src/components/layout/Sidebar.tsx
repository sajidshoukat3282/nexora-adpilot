import React from "react";
import {
  FiGrid, FiMap, FiFilm, FiRadio, FiUsers, FiFileText,
  FiDollarSign, FiBarChart2, FiUser, FiBell, FiShield, FiShoppingBag,
} from "react-icons/fi";
import { Link, useCurrentPath } from "@/lib/router";
import { useSession } from "@/hooks/useSession";

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  group: string;
}

const NAV_ITEMS: NavItem[] = [
  { path: "/dashboard", label: "Dashboard", icon: <FiGrid size={17} />, group: "Overview" },
  { path: "/inventory", label: "Inventory & Map", icon: <FiMap size={17} />, group: "Operate" },
  { path: "/campaigns", label: "Campaigns", icon: <FiFilm size={17} />, group: "Operate" },
  { path: "/operations", label: "Live Operations", icon: <FiRadio size={17} />, group: "Operate" },
  { path: "/reports", label: "Analytics & Reports", icon: <FiBarChart2 size={17} />, group: "Operate" },
  { path: "/crm", label: "CRM & Leads", icon: <FiUsers size={17} />, group: "Sell" },
  { path: "/proposals", label: "Proposals", icon: <FiFileText size={17} />, group: "Sell" },
  { path: "/finance", label: "Finance", icon: <FiDollarSign size={17} />, group: "Sell" },
  { path: "/client-portal", label: "Client Portal", icon: <FiUser size={17} />, group: "Client" },
  { path: "/marketplace", label: "Marketplace", icon: <FiShoppingBag size={17} />, group: "Client" },
  { path: "/notifications", label: "Notifications", icon: <FiBell size={17} />, group: "System" },
  { path: "/admin", label: "Admin & Roles", icon: <FiShield size={17} />, group: "System" },
];

const GROUPS = ["Overview", "Operate", "Sell", "Client", "System"];

export const Sidebar: React.FC = () => {
  const path = useCurrentPath();
  const { company } = useSession();

  return (
    <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-ink-700/60 bg-ink-900/60 h-screen sticky top-0">
      <div className="px-5 py-5 flex items-center gap-2.5 border-b border-ink-700/60">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-signal-cyan to-signal-blue flex items-center justify-center text-ink-950 font-black text-sm">
          {company?.logoInitial ?? "N"}
        </div>
        <div className="leading-tight">
          <div className="text-sm font-bold text-ink-50">Nexora AdPilot</div>
          <div className="text-[11px] text-ink-400">{company?.name ?? "Loading..."}</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {GROUPS.map((group) => (
          <div key={group}>
            <div className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-500">{group}</div>
            <div className="space-y-0.5">
              {NAV_ITEMS.filter((item) => item.group === group).map((item) => {
                const active = path === item.path || path.startsWith(item.path + "/");
                return (
                  <Link key={item.path} to={item.path} className={`nav-link ${active ? "nav-link-active" : ""}`}>
                    {item.icon}
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-4 py-3 border-t border-ink-700/60 text-[11px] text-ink-500">
        Phase 2 — Architecture Demo Foundation
      </div>
    </aside>
  );
};
