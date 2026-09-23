import React, { useState } from "react";
import { StatusBadge, alertSeverityTone } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/Feedback";
import { repo } from "@/repositories/demo";
import type { OperationsAlert } from "@/domain";

export const AlertPanel: React.FC<{ alerts: OperationsAlert[]; onChanged: () => void }> = ({ alerts, onChanged }) => {
  const [busyId, setBusyId] = useState<string | null>(null);

  async function acknowledge(id: string) {
    setBusyId(id);
    try {
      await repo.operations.acknowledgeAlert(id);
      onChanged();
    } finally {
      setBusyId(null);
    }
  }

  if (alerts.length === 0) {
    return <EmptyState title="No active alerts" description="All screens and campaigns are operating normally." />;
  }

  return (
    <div className="space-y-2.5">
      {alerts.map((alert) => (
        <div key={alert.id} className="panel p-3.5 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <StatusBadge label="" tone={alertSeverityTone(alert.severity)} />
            <div className="min-w-0">
              <div className="text-sm text-ink-100">{alert.title}</div>
              <div className="text-xs text-ink-500 mt-0.5">{alert.detail}</div>
            </div>
          </div>
          <button className="btn-ghost !py-1 !px-2 text-xs shrink-0" disabled={busyId === alert.id} onClick={() => acknowledge(alert.id)}>
            Acknowledge
          </button>
        </div>
      ))}
    </div>
  );
};
