import React, { useState, useRef, useEffect } from "react";
import { FiSearch, FiBell, FiChevronDown, FiMenu } from "react-icons/fi";
import { useSession } from "@/hooks/useSession";
import { useNavigate } from "@/lib/router";
import { ROLE_LABELS } from "@/domain";
import type { Role } from "@/domain";
import { repo } from "@/repositories/demo";
import { useAsync } from "@/hooks/useAsync";

const ALL_ROLES: Role[] = [
  "owner", "campaign_manager", "sales_manager", "creative_manager",
  "field_operator", "finance", "client", "viewer",
];

export const TopBar: React.FC<{ onMobileMenu: () => void }> = ({ onMobileMenu }) => {
  const { user, setRole } = useSession();
  const navigate = useNavigate();
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const roleMenuRef = useRef<HTMLDivElement>(null);

  const { data: notifications } = useAsync(() => repo.notifications.list(), []);
  const unread = notifications?.filter((n) => !n.read).length ?? 0;

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (roleMenuRef.current && !roleMenuRef.current.contains(e.target as Node)) {
        setRoleMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 px-4 md:px-6 py-3 border-b border-ink-700/60 bg-ink-950/80 backdrop-blur-md">
      <button className="md:hidden text-ink-300 p-1.5" onClick={onMobileMenu}>
        <FiMenu size={20} />
      </button>

      <div className="relative flex-1 max-w-md">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" size={15} />
        <input
          value={search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "Enter" && search.trim()) {
              navigate(`/campaigns?search=${encodeURIComponent(search.trim())}`);
            }
          }}
          placeholder="Search campaigns, screens, clients..."
          className="input pl-9 !bg-ink-900/80"
        />
      </div>

      <div className="flex-1" />

      {/* Role switcher — Phase 1 RBAC demonstration */}
      <div className="relative" ref={roleMenuRef}>
        <button
          onClick={() => setRoleMenuOpen((v) => !v)}
          className="btn-secondary !py-1.5 !px-3 text-xs"
          title="Preview AdPilot as a different role (demo only)"
        >
          Viewing as: <span className="text-signal-cyan font-semibold">{user ? ROLE_LABELS[user.role] : "..."}</span>
          <FiChevronDown size={14} />
        </button>
        {roleMenuOpen && (
          <div className="absolute right-0 mt-2 w-56 panel-solid p-1.5 z-40">
            <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-500">
              Preview as role (demo)
            </div>
            {ALL_ROLES.map((role) => (
              <button
                key={role}
                onClick={() => {
                  setRole(role);
                  setRoleMenuOpen(false);
                }}
                className={`w-full text-left px-2.5 py-2 rounded-md text-sm hover:bg-ink-800 ${
                  user?.role === role ? "text-signal-cyan" : "text-ink-200"
                }`}
              >
                {ROLE_LABELS[role]}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        className="relative text-ink-300 hover:text-ink-50 p-2 rounded-lg hover:bg-ink-800"
        onClick={() => navigate("/notifications")}
      >
        <FiBell size={18} />
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-signal-red ring-2 ring-ink-950" />
        )}
      </button>

      <div className="flex items-center gap-2 pl-2 border-l border-ink-700/60">
        <div className="w-8 h-8 rounded-full bg-ink-700 flex items-center justify-center text-xs font-bold text-ink-100">
          {user?.avatarInitial ?? "?"}
        </div>
        <div className="hidden lg:block leading-tight">
          <div className="text-sm font-semibold text-ink-100">{user?.name ?? "Loading..."}</div>
        </div>
      </div>
    </header>
  );
};
