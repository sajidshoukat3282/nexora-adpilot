import React, { useState } from "react";
import { PermissionGate } from "@/components/ui/PermissionGate";
import { EmptyState } from "@/components/ui/Feedback";
import { useAsync } from "@/hooks/useAsync";
import { useSession } from "@/hooks/useSession";
import { repo } from "@/repositories/demo";
import type { Campaign, ApprovalStep } from "@/domain";

const DECISION_TONE: Record<ApprovalStep["decision"], string> = {
  approved: "text-signal-green",
  rejected: "text-signal-red",
  changes_requested: "text-signal-amber",
  pending: "text-ink-400",
};

export const ApprovalsTab: React.FC<{ campaign: Campaign }> = ({ campaign }) => {
  const { user } = useSession();
  const creatives = useAsync(() => repo.creatives.listCreativesForCampaign(campaign.id), [campaign.id]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [comment, setComment] = useState("");

  async function decide(creativeId: string, stage: ApprovalStep["stage"], decision: ApprovalStep["decision"]) {
    setBusyId(creativeId);
    try {
      await repo.creatives.recordApprovalDecision(creativeId, stage, decision, user?.name ?? "You", comment);
      setComment("");
      creatives.reload();
    } finally {
      setBusyId(null);
    }
  }

  const pendingCreatives = (creatives.data ?? []).filter((c) => c.status === "internal_review" || c.status === "client_review");

  return (
    <div className="space-y-5">
      {pendingCreatives.length === 0 && (
        <EmptyState title="Nothing pending approval" description="Creatives awaiting internal or client review will appear here." />
      )}

      {pendingCreatives.map((creative) => {
        const stage = creative.status === "internal_review" ? "internal_review" : "client_review";
        return (
          <div key={creative.id} className="panel p-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-ink-100">{creative.name}</h4>
              <span className="text-xs text-ink-500 uppercase font-semibold">{stage.replace("_", " ")}</span>
            </div>

            <PermissionGate
              permission="creatives.approve"
              action="record an approval decision"
              fallback={
                <p className="text-xs text-ink-500 italic">
                  Your role can view this approval but not decide it — that requires Creative Manager or Owner.
                </p>
              }
            >
              <textarea
                className="input mb-2 text-sm"
                rows={2}
                placeholder="Optional comment..."
                value={comment}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setComment(e.target.value)}
              />
              <div className="flex gap-2">
                <button className="btn-primary !py-1.5 !px-3 text-xs" disabled={busyId === creative.id} onClick={() => decide(creative.id, stage, "approved")}>
                  Approve
                </button>
                <button className="btn-secondary !py-1.5 !px-3 text-xs" disabled={busyId === creative.id} onClick={() => decide(creative.id, stage, "changes_requested")}>
                  Request Changes
                </button>
                <button className="btn-danger !py-1.5 !px-3 text-xs" disabled={busyId === creative.id} onClick={() => decide(creative.id, stage, "rejected")}>
                  Reject
                </button>
              </div>
            </PermissionGate>

            {creative.approvals.length > 0 && (
              <div className="mt-4 pt-4 border-t border-ink-800 space-y-2">
                <div className="text-xs font-semibold text-ink-500 uppercase">History</div>
                {creative.approvals.map((step) => (
                  <div key={step.id} className="text-sm">
                    <span className={`font-semibold ${DECISION_TONE[step.decision]}`}>{step.decision.replace("_", " ")}</span>{" "}
                    <span className="text-ink-400">by {step.reviewerName}</span>
                    {step.comment && <div className="text-xs text-ink-500 mt-0.5">"{step.comment}"</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
