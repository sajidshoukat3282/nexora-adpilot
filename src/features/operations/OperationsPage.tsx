import React, { useState, useEffect } from "react";
import { FiSearch, FiZap } from "react-icons/fi";
import { PageHeader } from "@/components/layout/AppShell";
import { Tabs } from "@/components/ui/Tabs";
import { ScreenTile } from "./ScreenTile";
import { ScreenDetailDrawer } from "./ScreenDetailDrawer";
import { AlertPanel } from "./AlertPanel";
import { EmergencyOverrideModal } from "./EmergencyOverrideModal";
import { useAsync } from "@/hooks/useAsync";
import { repo } from "@/repositories/demo";
import { useSearchParams } from "@/lib/router";
import type { LiveScreen, ScreenLiveStatus } from "@/domain";

export const OperationsPage: React.FC = () => {
  const [tab, setTab] = useState<"wall" | "alerts">("wall");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ScreenLiveStatus | "">("");
  const [selectedScreen, setSelectedScreen] = useState<LiveScreen | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [overrideOpen, setOverrideOpen] = useState(false);

  const screens = useAsync(
    () => repo.operations.listScreens({ search: search || undefined, status: statusFilter ? [statusFilter] : undefined }),
    [search, statusFilter]
  );
  const alerts = useAsync(() => repo.operations.listAlerts(), []);

  // Completes the Notifications -> Operations deep link.
  const [linkParams, setLinkParams] = useSearchParams();
  useEffect(() => {
    const screenId = linkParams.get("screen");
    if (screenId && screens.data) {
      const match = screens.data.find((s) => s.id === screenId);
      if (match) setSelectedScreen(match);
      setLinkParams({ screen: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkParams, screens.data]);

  function toggleCheck(id: string) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const checkedScreens = (screens.data ?? []).filter((s) => checkedIds.has(s.id));
  const onlineCount = screens.data?.filter((s) => s.liveStatus === "online").length ?? 0;

  return (
    <div>
      <PageHeader
        title="Live Operations"
        description={`Command-center view across all screens. ${onlineCount} of ${screens.data?.length ?? 0} online.`}
        actions={
          <button className="btn-danger" disabled={checkedScreens.length === 0} onClick={() => setOverrideOpen(true)}>
            <FiZap size={14} /> Emergency Override {checkedScreens.length > 0 && `(${checkedScreens.length})`}
          </button>
        }
      />

      <Tabs
        tabs={[
          { key: "wall", label: "Screen Wall" },
          { key: "alerts", label: "Alerts", badge: alerts.data?.length },
        ]}
        active={tab}
        onChange={(k) => setTab(k as "wall" | "alerts")}
      />

      <div className="mt-5">
        {tab === "wall" && (
          <>
            <div className="flex items-center gap-2 mb-4">
              <div className="relative flex-1 max-w-xs">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" size={14} />
                <input value={search} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)} placeholder="Search screens..." className="input pl-9" />
              </div>
              <select className="input w-auto" value={statusFilter} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value as ScreenLiveStatus | "")}>
                <option value="">All Statuses</option>
                <option value="online">Online</option>
                <option value="warning">Warning</option>
                <option value="offline">Offline</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {screens.data?.map((screen) => (
                <ScreenTile
                  key={screen.id}
                  screen={screen}
                  selected={selectedScreen?.id === screen.id}
                  checked={checkedIds.has(screen.id)}
                  onSelect={() => setSelectedScreen(screen)}
                  onToggleCheck={() => toggleCheck(screen.id)}
                />
              ))}
            </div>
          </>
        )}

        {tab === "alerts" && <AlertPanel alerts={alerts.data ?? []} onChanged={alerts.reload} />}
      </div>

      <ScreenDetailDrawer screen={selectedScreen} onClose={() => setSelectedScreen(null)} />
      <EmergencyOverrideModal
        open={overrideOpen}
        onClose={() => setOverrideOpen(false)}
        selectedScreens={checkedScreens}
        onDone={() => {
          screens.reload();
          setCheckedIds(new Set());
        }}
      />
    </div>
  );
};
