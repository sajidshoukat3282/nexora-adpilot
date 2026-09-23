import React from "react";
import { EmptyState } from "@/components/ui/Feedback";
import { useAsync } from "@/hooks/useAsync";
import { repo } from "@/repositories/demo";
import type { Campaign } from "@/domain";

export const ActivityTab: React.FC<{ campaign: Campaign }> = ({ campaign }) => {
  const activity = useAsync(() => repo.campaigns.getActivity(campaign.id), [campaign.id]);

  if (!activity.loading && activity.data?.length === 0) {
    return <EmptyState title="No activity recorded" description="Every status change, inventory update and approval will be logged here." />;
  }

  return (
    <div className="relative pl-5">
      <div className="absolute left-[7px] top-1 bottom-1 w-px bg-ink-700" />
      <div className="space-y-5">
        {activity.data?.map((entry) => (
          <div key={entry.id} className="relative">
            <div className="absolute -left-5 top-1 w-3 h-3 rounded-full bg-signal-cyan border-2 border-ink-950" />
            <div className="text-sm text-ink-100">
              <span className="font-semibold">{entry.actorName}</span> {entry.detail}
            </div>
            <div className="text-xs text-ink-500 mt-0.5">
              {new Date(entry.createdAt).toLocaleString()} · {entry.action.replace(/_/g, " ")}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
