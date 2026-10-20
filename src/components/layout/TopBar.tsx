import React, { useEffect, useRef, useState } from "react";
import {
  FiSearch,
  FiBell,
  FiChevronDown,
  FiMenu,
  FiLogOut,
  FiUser,
  FiShield,
  FiCalendar,
} from "react-icons/fi";
import { useSession } from "@/hooks/useSession";
import { useCurrentPath, useNavigate } from "@/lib/router";
import { ROLE_LABELS } from "@/domain";
import { repo } from "@/repositories/demo";
import { useAsync } from "@/hooks/useAsync";
import { useCompanyProfile } from "@/hooks/useCompanyProfile";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/inventory": "Inventory",
  "/campaigns": "Campaigns",
  "/operations": "Live Operations",
  "/reports": "Analytics & Reports",
  "/crm": "CRM & Leads",
  "/proposals": "Proposals",
  "/finance": "Finance",
  "/clients/credit-risk": "Credit Risk",
  "/client-portal": "Client Portal",
  "/marketplace": "Marketplace",
  "/notifications": "Notifications",
  "/admin": "Admin & Roles",
};

const pageTitleFor = (path: string): string => {
  const key = Object.keys(PAGE_TITLES)
    .sort((a, b) => b.length - a.length)
    .find((k) => path === k || path.startsWith(k + "/"));
  return key ? PAGE_TITLES[key] : "";
};

export const TopBar: React.FC<{ onMobileMenu: () => void }> = ({
  onMobileMenu,
}) => {
  const { user, session, company, signOut } = useSession();
  const navigate = useNavigate();
  const currentPath = useCurrentPath();
  const pageTitle = pageTitleFor(currentPath);
  const searchRef = useRef<HTMLInputElement>(null);
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

  // Ctrl/Cmd + K focuses the search box
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
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
    // Luxury dark top bar (matches the Commander's Dashboard)
    <header className="sticky top-0 z-30 flex h-12 items-center gap-3 border-b border-[#2a2f37] bg-gradient-to-b from-[#14171c]/95 to-[#0b0d10]/95 px-4 shadow-[0_6px_20px_rgba(0,0,0,0.35)] backdrop-blur-xl md:px-5">
      
      {/* Mobile navigation */}
      <button
        type="button"
        className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-white/5 hover:text-[#f1d68a] md:hidden"
        onClick={onMobileMenu}
        aria-label="Open navigation"
      >
        <FiMenu size={18} />
      </button>

      {/* Company (left) - Sleek Design */}
      <div className="flex items-center gap-2.5 min-w-0 max-w-[48vw] md:max-w-64 shrink-0">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[#f6e2a1]/40 text-xs font-bold bg-gradient-to-br from-[#f1d68a] via-[#c99b3b] to-[#a97b22] text-[#1a1204] shadow-[0_4px_14px_rgba(201,155,59,0.3)]">
          {(profile?.legalName || company?.name || "A").charAt(0).toUpperCase()}
        </div>
        <div className="truncate text-[13px] font-semibold tracking-tight text-zinc-100">
          {profile?.legalName || company?.name || "Nexora AdPilot"}
        </div>
      </div>

      {/* Global search - Command Palette Style */}
      <div className="relative hidden sm:block flex-1 max-w-lg ml-4">
        <FiSearch
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
          size={14}
        />

        <input
          ref={searchRef}
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
          className="w-full rounded-lg border border-[#2b3038] bg-[#0f1216] py-1.5 pl-9 pr-14 text-xs text-zinc-100 placeholder-zinc-600 transition-all focus:border-[#c99b3b]/70 focus:outline-none focus:ring-1 focus:ring-[#c99b3b]/30"
        />

        <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1 pointer-events-none">
          <kbd className="rounded border border-[#2b3038] bg-[#171a20] px-1.5 py-0.5 font-sans text-[10px] font-medium text-zinc-400">
            Ctrl K
          </kbd>
        </div>
      </div>

      <div className="flex-1" />

      {/* Current page + date */}
      {pageTitle && (
        <div className="hidden items-center gap-2 text-[11px] text-zinc-500 xl:flex">
          <span>Nexora AdPilot</span>
          <span className="text-[#c99b3b]/60">/</span>
          <span className="font-medium text-[#f1d68a]">{pageTitle}</span>
        </div>
      )}
      <div className="hidden items-center gap-1.5 rounded-md border border-[#2a2f37] bg-[#0f1216] px-2.5 py-1 text-[10.5px] text-zinc-400 lg:flex">
        <FiCalendar size={12} className="text-[#d9b45a]" />
        {new Date().toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}
      </div>

      {/* Notifications */}
      <button
        type="button"
        className="relative flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-white/5 hover:text-[#f1d68a]"
        onClick={() => navigate("/notifications")}
        aria-label={unread > 0 ? `${unread} unread notifications` : "Notifications"}
      >
        <FiBell size={16} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-gradient-to-b from-[#f1d68a] to-[#a97b22] px-1 text-[9px] font-bold leading-none text-[#1a1204] ring-2 ring-[#0b0d10]">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* Account */}
      <div className="relative ml-1 border-l border-[#2a2f37] pl-3" ref={accountMenuRef}>
        <button
          type="button"
          onClick={() => setAccountMenuOpen((value) => !value)}
          className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 hover:bg-white/5 transition-colors"
          aria-expanded={accountMenuOpen}
          aria-haspopup="menu"
          aria-label="Account menu"
        >
          <div className="relative flex h-7 w-7 items-center justify-center rounded-full border border-[#c99b3b]/60 bg-gradient-to-b from-[#232830] to-[#14171c] text-[10px] font-bold text-[#f1d68a] shadow-sm">
            {initials}
            <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border-2 border-[#0b0d10] bg-emerald-500" />
          </div>

          <div className="hidden lg:block leading-tight text-left max-w-36">
            <div className="truncate text-xs font-semibold text-zinc-100">
              {displayName}
            </div>
            <div className="mt-0.5 truncate text-[10px] text-[#d9b45a]/80">
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
            className="absolute right-0 z-40 mt-2 w-72 overflow-hidden rounded-xl border border-[#c99b3b]/25 bg-gradient-to-b from-[#171a20] to-[#0e1115] shadow-2xl shadow-black/60"
            role="menu"
          >
            <div className="border-b border-[#2a2f37] p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#c99b3b]/60 bg-gradient-to-b from-[#232830] to-[#14171c] text-sm font-bold text-[#f1d68a]">
                  {initials}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-zinc-50">
                    {displayName === "Loading..." ? "Account" : displayName}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-zinc-400">
                    {designation}
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-[#2a2f37] bg-[#0f1216] p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="flex h-5 w-5 items-center justify-center rounded bg-[#c99b3b]/15 text-[#f1d68a]">
                    <FiShield size={12} />
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                    Workspace
                  </span>
                </div>
                <div className="truncate text-sm font-medium text-zinc-100">
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
                className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/5 hover:text-rose-400"
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
