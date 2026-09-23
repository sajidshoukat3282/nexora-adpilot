import React, { useState } from "react";
import { FiCheckCircle } from "react-icons/fi";
import { PageHeader } from "@/components/layout/AppShell";
import { StatusBadge, alertSeverityTone } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/Feedback";
import { useAsync } from "@/hooks/useAsync";
import { repo } from "@/repositories/demo";
import { useNavigate } from "@/lib/router";
import type { Notification } from "@/domain";

const CATEGORY_LABELS: Record<Notification["category"], string> = {
  campaign: "Campaign", creative: "Creative", inventory: "Inventory",
  operations: "Operations", finance: "Finance", system: "System",
};

export const NotificationsPage: React.FC = () => {
  const notifications = useAsync(() => repo.notifications.list(), []);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const navigate = useNavigate();

  const filtered = (notifications.data ?? []).filter((n) => filter === "all" || !n.read);

  async function open(n: Notification) {
    if (!n.read) await repo.notifications.markRead(n.id);
    notifications.reload();
    if (n.linkPath) navigate(n.linkPath);
  }

  async function markAllRead() {
    await repo.notifications.markAllRead();
    notifications.reload();
  }

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Everything AdPilot has flagged across campaigns, operations, creatives and finance."
        actions={
          <button className="btn-secondary" onClick={markAllRead}>
            <FiCheckCircle size={14} /> Mark All Read
          </button>
        }
      />

      <div className="flex items-center gap-1.5 mb-4">
        {(["all", "unread"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filter === f ? "bg-signal-cyan text-ink-950" : "bg-ink-800 text-ink-300 hover:bg-ink-700"
            }`}
          >
            {f === "all" ? "All" : "Unread"}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Nothing here" description="You're all caught up." />
      ) : (
        <div className="panel divide-y divide-ink-800">
          {filtered.map((n) => (
            <button
              key={n.id}
              onClick={() => open(n)}
              className={`w-full text-left flex items-start gap-3 p-4 hover:bg-ink-800/40 ${!n.read ? "bg-ink-800/20" : ""}`}
            >
              <div className="mt-1"><StatusBadge label="" tone={alertSeverityTone(n.severity)} /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm ${n.read ? "text-ink-300" : "text-ink-50 font-semibold"}`}>{n.title}</span>
                  {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-signal-cyan shrink-0" />}
                </div>
                <div className="text-xs text-ink-500 mt-0.5">{n.detail}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[10px] uppercase font-semibold text-ink-600">{CATEGORY_LABELS[n.category]}</div>
                <div className="text-xs text-ink-600 mt-1">{new Date(n.createdAt).toLocaleDateString()}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
