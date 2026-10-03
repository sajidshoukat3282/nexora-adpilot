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

export const TopBar: React.FC<{ onMobileMenu: () => void }> = ({
  onMobileMenu,
}) => {
  const { user, session, company, signOut } = useSession();
  const navigate = useNavigate();

  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const accountMenuRef = useRef<HTMLDivElement>(null);

  const { data: notifications } = useAsync(
    () => repo.notifications.list(),
    [],
  );

  const unread = notifications?.filter((notification) => !notification.read).length ?? 0;

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
    user?.avatarInitial ??
    user?.name
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ??
    "?";

  return (
    <header className="sticky top-0 z-30 h-16 flex items-center gap-3 px-4 md:px-6 border-b border-ink-700/60 bg-ink-950/90 backdrop-blur-xl">
      {/* Mobile navigation */}
      <button
        type="button"
        className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg text-ink-300 hover:text-ink-50 hover:bg-ink-800 transition-colors"
        onClick={onMobileMenu}
        aria-label="Open navigation"
      >
        <FiMenu size={19} />
      </button>

      {/* Global search */}
      <div className="relative flex-1 max-w-xl">
        <FiSearch
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500 pointer-events-none"
          size={16}
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
          className="input pl-10 pr-16 !bg-ink-900/70 !border-ink-800 focus:!border-signal-cyan/40"
        />

        <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1 pointer-events-none">
          <kbd className="px-1.5 py-0.5 rounded border border-ink-700 bg-ink-800/80 text-[10px] text-ink-500 font-medium">
            Enter
          </kbd>
        </div>
      </div>

      <div className="flex-1" />

      {/* Notifications */}
      <button
        type="button"
        className="relative flex items-center justify-center w-9 h-9 rounded-lg text-ink-300 hover:text-ink-50 hover:bg-ink-800 transition-colors"
        onClick={() => navigate("/notifications")}
        aria-label={
          unread > 0
            ? `${unread} unread notifications`
            : "Notifications"
        }
      >
        <FiBell size={18} />

        {unread > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[7px] h-[7px] rounded-full bg-signal-red ring-2 ring-ink-950" />
        )}
      </button>

      {/* Account */}
      <div
        className="relative pl-2 ml-1 border-l border-ink-700/60"
        ref={accountMenuRef}
      >
        <button
          type="button"
          onClick={() => setAccountMenuOpen((value) => !value)}
          className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-ink-800/80 transition-colors"
          aria-expanded={accountMenuOpen}
          aria-haspopup="menu"
          aria-label="Account menu"
        >
          <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-signal-cyan/30 to-ink-700 border border-signal-cyan/20 text-xs font-bold text-ink-100">
            {initials}

            <span className="absolute -right-0.5 -bottom-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-ink-950" />
          </div>

          <div className="hidden lg:block leading-tight text-left max-w-36">
            <div className="text-sm font-semibold text-ink-100 truncate">
              {user?.name ?? "Loading..."}
            </div>
            <div className="text-[11px] text-ink-500 truncate">
              {designation}
            </div>
          </div>

          <FiChevronDown
            size={14}
            className={`hidden sm:block text-ink-500 transition-transform duration-200 ${
              accountMenuOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {accountMenuOpen && (
          <div
            className="absolute right-0 mt-2 w-80 rounded-xl border border-ink-700/80 bg-ink-900 shadow-2xl shadow-black/40 overflow-hidden z-40"
            role="menu"
          >
            {/* Identity */}
            <div className="p-4 border-b border-ink-700/60">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-11 h-11 rounded-full bg-gradient-to-br from-signal-cyan/30 to-ink-700 border border-signal-cyan/20 text-sm font-bold text-ink-100">
                  {initials}
                </div>

                <div className="min-w-0">
                  <div className="font-semibold text-ink-100 truncate">
                    {user?.name ?? "Account"}
                  </div>

                  <div className="text-xs text-ink-400 truncate mt-0.5">
                    {user?.email ?? ""}
                  </div>
                </div>
              </div>

              {/* Workspace */}
              <div className="mt-4 rounded-lg border border-ink-700/60 bg-ink-950/60 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center justify-center w-6 h-6 rounded-md bg-signal-cyan/10 text-signal-cyan">
                    <FiShield size={13} />
                  </div>

                  <span className="text-[10px] uppercase tracking-[0.14em] font-semibold text-ink-500">
                    Workspace
                  </span>
                </div>

                <div className="text-sm font-medium text-ink-100 truncate">
                  {company?.name ?? "Nexora AdPilot"}
                </div>

                <div className="mt-2 flex items-center gap-2 text-[11px] text-ink-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Active workspace
                </div>
              </div>

              {/* Account metadata */}
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="rounded-lg bg-ink-950/50 border border-ink-800/70 p-2.5">
                  <div className="text-[10px] uppercase tracking-wider text-ink-600">
                    Access
                  </div>
                  <div className="mt-1 text-xs font-medium text-ink-200 truncate">
                    {designation}
                  </div>
                </div>

                <div className="rounded-lg bg-ink-950/50 border border-ink-800/70 p-2.5">
                  <div className="text-[10px] uppercase tracking-wider text-ink-600">
                    Account
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                    <FiUser size={12} />
                    Active
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-2">
              <button
                type="button"
                role="menuitem"
                onClick={handleSignOut}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-ink-300 hover:bg-ink-800 hover:text-ink-50 transition-colors"
              >
                <FiLogOut size={16} />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
