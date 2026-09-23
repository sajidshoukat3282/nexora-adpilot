import React from "react";
import {
  FiGrid, FiMap, FiFilm, FiRadio, FiUsers, FiFileText,
  FiDollarSign, FiBarChart2, FiUser, FiBell, FiShield, FiShoppingBag, FiX,
} from "react-icons/fi";
import { Link, useCurrentPath } from "@/lib/router";

const NAV_ITEMS = [
  { path: "/dashboard", label: "Dashboard", icon: <FiGrid size={18} /> },
  { path: "/inventory", label: "Inventory & Map", icon: <FiMap size={18} /> },
  { path: "/campaigns", label: "Campaigns", icon: <FiFilm size={18} /> },
  { path: "/operations", label: "Live Operations", icon: <FiRadio size={18} /> },
  { path: "/reports", label: "Analytics & Reports", icon: <FiBarChart2 size={18} /> },
  { path: "/crm", label: "CRM & Leads", icon: <FiUsers size={18} /> },
  { path: "/proposals", label: "Proposals", icon: <FiFileText size={18} /> },
  { path: "/finance", label: "Finance", icon: <FiDollarSign size={18} /> },
  { path: "/client-portal", label: "Client Portal", icon: <FiUser size={18} /> },
  { path: "/marketplace", label: "Marketplace", icon: <FiShoppingBag size={18} /> },
  { path: "/notifications", label: "Notifications", icon: <FiBell size={18} /> },
  { path: "/admin", label: "Admin & Roles", icon: <FiShield size={18} /> },
];

export const MobileNav: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const path = useCurrentPath();
  return (
    <div className={`fixed inset-0 z-50 md:hidden ${open ? "" : "pointer-events-none"}`}>
      <div
        className={`absolute inset-0 bg-black/60 transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />
      <div
        className={`absolute left-0 top-0 h-full w-72 bg-ink-900 border-r border-ink-700/60 transition-transform duration-250 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-ink-700/60">
          <div className="text-sm font-bold text-ink-50">Nexora AdPilot</div>
          <button onClick={onClose} className="text-ink-400 p-1">
            <FiX size={20} />
          </button>
        </div>
        <nav className="p-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const active = path === item.path || path.startsWith(item.path + "/");
            return (
              <Link key={item.path} to={item.path} onClick={onClose} className={`nav-link ${active ? "nav-link-active" : ""}`}>
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
