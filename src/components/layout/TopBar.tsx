import React, { useEffect, useRef, useState } from "react";
import {
  FiSearch,
  FiBell,
  FiChevronDown,
  FiMenu,
  FiLogOut,
  FiUser,
  FiShield,
} from "react-icons/fi";
import { useSession } from "@/hooks/useSession";
import { useNavigate } from "@/lib/router";
import { ROLE_LABELS } from "@/domain";
import { repo } from "@/repositories/demo";
import { useAsync } from "@/hooks/useAsync";
import { useCompanyProfile } from "@/hooks/useCompanyProfile";

export const TopBar: React.FC<{ onMobileMenu: () => void }> = ({
  onMobileMenu,
}) => {
  const { user, session, company, signOut } = useSession();
  const navigate = useNavigate();
  const { profile } = useCompanyProfile();

  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const accountMenuRef = useRef<HTMLDivElement>(null);

  const { data: notifications } = useAsync(
    () => repo.notifications.list(),
    [],
  );

  const unread = notifications?.filter((notification) => !notification.read).length ?? 0;

  const displayName =
    (session?.accountType === "owner" && profile?.ownerName) ||
    user?.name ||
    "Loading...";

  const designation =
    session?.designation ??
    (user?.role ? ROLE_LABELS[user.role] : "Workspace user");

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(event.target as Node)
      ) {
        setAccountMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", onClick);

    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const handleSearch = () => {
    const query = search.trim();
    if (!query) return;
    navigate(`/campaigns?search=${encodeURIComponent(query)}`);
  };

  const handleSignOut = async () => {
    setAccountMenuOpen(false);
    await signOut();
    navigate("/login");
  };

  const initials =
    (displayName !== "Loading..." ? displayName.charAt(0).toUpperCase() : null) ??
    user?.avatarInitial ??
    user?.name
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ??
    "?";

  return (
    // Deep Dark Fintech Background
    <header className="sticky top-0 z-30 h-14 flex items-center gap-4 px-4 md:px-6 border-b border-white/5 bg-[#0B1120]/90 backdrop-blur-xl">
      
      {/* Mobile navigation */}
      <button
        type="button"
        className="md:hidden flex items-center justify-center w-8 h-8 rounded-md text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
        onClick={onMobileMenu}
        aria-label="Open navigation"
      >
        <FiMenu size={18} />
      </button>

      {/* Company (left) - Sleek Design */}
      <div className="flex items-center gap-2.5 min-w-0 max-w-[48vw] md:max-w-64 shrink-0">
        <div className="flex items-center justify-center w-7 h-7 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-400 shrink-0 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
          {(profile?.legalName || company?.name || "A").charAt(0).toUpperCase()}
        </div>
        <div className="truncate text-sm font-semibold text-slate-200 tracking-tight">
          {profile?.legalName || company?.name || "Nexora AdPilot"}
        </div>
      </div>

      {/* Global search - Command Palette Style */}
      <div className="relative hidden sm:block flex-1 max-w-lg ml-4">
        <FiSearch
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
          size={14}
        />

        <input
          value={search}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
            setSearch(event.target.value)
          }
          onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
            if (event.key === "Enter") {
              handleSearch();
            }
          }}
          placeholder="Search campaigns, screens, clients..."
          aria-label="Search AdPilot"
          className="w-full bg-[#151E32] border border-slate-700/50 rounded-lg pl-9 pr-14 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
        />

        <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1 pointer-events-none">
          <kbd className="px-1.5 py-0.5 rounded border border-slate-700 bg-slate-800 text-[10px] text-slate-400 font-medium font-sans">
            ↵
          </kbd>
        </div>
      </div>

      <div className="flex-1" />

      {/* Notifications */}
      <button
        type="button"
        className="relative flex items-center justify-center w-8 h-8 rounded-md text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
        onClick={() => navigate("/notifications")}
        aria-label={unread > 0 ? `${unread} unread notifications` : "Notifications"}
      >
        <FiBell size={16} />
        {unread > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[6px] h-[6px] rounded-full bg-emerald-400 ring-2 ring-[#0B1120]" />
        )}
      </button>

      {/* Account */}
      <div className="relative pl-3 ml-2 border-l border-white/5" ref={accountMenuRef}>
        <button
          type="button"
          onClick={() => setAccountMenuOpen((value) => !value)}
          className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 hover:bg-white/5 transition-colors"
          aria-expanded={accountMenuOpen}
          aria-haspopup="menu"
          aria-label="Account menu"
        >
          <div className="relative flex items-center justify-center w-7 h-7 rounded-full bg-[#1E293B] border border-slate-700 text-[10px] font-bold text-white shadow-sm">
            {initials}
            <span className="absolute -right-0.5 -bottom-0.5 w-2 h-2 rounded-full bg-emerald-500 border-2 border-[#0B1120]" />
          </div>

          <div className="hidden lg:block leading-tight text-left max-w-36">
            <div className="text-xs font-semibold text-slate-200 truncate">
              {displayName}
            </div>
            <div className="text-[10px] text-slate-500 truncate mt-0.5">
              {designation}
            </div>
          </div>

          <FiChevronDown
            size={12}
            className={`hidden sm:block text-slate-500 transition-transform duration-200 ${
              accountMenuOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {/* Dropdown Menu */}
        {accountMenuOpen && (
          <div
            className="absolute right-0 mt-2 w-72 rounded-xl border border-white/10 bg-[#0F172A] shadow-2xl shadow-black/50 overflow-hidden z-40"
            role="menu"
          >
            <div className="p-4 border-b border-white/5 bg-[#151E32]/50">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#1E293B] border border-slate-700 text-sm font-bold text-white">
                  {initials}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-white truncate">
                    {displayName === "Loading..." ? "Account" : displayName}
                  </div>
                  <div className="text-xs text-slate-400 truncate mt-0.5">
                    {designation}
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-white/5 bg-[#0B1120]/50 p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="flex items-center justify-center w-5 h-5 rounded bg-emerald-500/10 text-emerald-400">
                    <FiShield size={12} />
                  </div>
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                    Workspace
                  </span>
                </div>
                <div className="text-sm font-medium text-slate-200 truncate">
                  {company?.name ?? "Nexora AdPilot"}
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Active workspace
                </div>
              </div>
            </div>

            <div className="p-2">
              <button
                type="button"
                role="menuitem"
                onClick={handleSignOut}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium text-slate-300 hover:bg-white/5 hover:text-rose-400 transition-colors"
              >
                <FiLogOut size={14} />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
