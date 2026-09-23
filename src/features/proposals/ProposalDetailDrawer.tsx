import React, { useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { StatusBadge, proposalStatusTone } from "@/components/ui/StatusBadge";
import { PermissionGate } from "@/components/ui/PermissionGate";
import { repo } from "@/repositories/demo";
import { useAsync } from "@/hooks/useAsync";
import type { Proposal, ProposalStatus } from "@/domain";
import { PROPOSAL_STATUS_LABELS, PROPOSAL_TRANSITIONS, formatMoney } from "@/domain";
import { Link } from "@/lib/router";

export const ProposalDetailDrawer: React.FC<{
  proposal: Proposal | null;
  onClose: () => void;
  onChanged: () => void;
}> = ({ proposal, onClose, onChanged }) => {
  const client = useAsync(() => (proposal ? repo.crm.getClient(proposal.clientId) : Promise.resolve(null)), [proposal?.id]);
  const [transitioning, setTransitioning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function transition(next: ProposalStatus) {
    if (!proposal) return;
    setTransitioning(true);
    setError(null);
    try {
      await repo.proposals.transitionProposalStatus(proposal.id, next);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setTransitioning(false);
    }
  }

  const nextOptions = proposal ? PROPOSAL_TRANSITIONS[proposal.status] : [];

  return (
    <Drawer
      open={!!proposal}
      onClose={onClose}
      title={proposal?.code ?? ""}
      subtitle={proposal?.campaignName}
      width="max-w-2xl"
      footer={
        proposal && nextOptions.length > 0 ? (
          <PermissionGate permission="proposals.manage" action="update this proposal's status">
            <div className="flex gap-2 flex-wrap">
              {nextOptions.map((opt) => (
                <button key={opt} className="btn-secondary" disabled={transitioning} onClick={() => transition(opt)}>
                  {opt === "accepted" || opt === "sent" || opt === "preview" ? "→ " : ""}
                  {PROPOSAL_STATUS_LABELS[opt]}
                </button>
              ))}
            </div>
          </PermissionGate>
        ) : undefined
      }
    >
      {proposal && (
        <div className="space-y-6">
          {error && <div className="text-sm text-signal-red bg-signal-red/10 border border-signal-red/25 rounded-lg px-3 py-2">{error}</div>}

          <div className="flex items-center justify-between">
            <StatusBadge label={PROPOSAL_STATUS_LABELS[proposal.status]} tone={proposalStatusTone(proposal.status)} />
            <span className="text-xs text-ink-500">
              {proposal.startDate} → {proposal.endDate}
            </span>
          </div>

          {/* Document-style preview — this is what a client would see */}
          <div className="bg-ink-850 border border-ink-700/60 rounded-xl2 p-6">
            <div className="flex items-start justify-between mb-6 pb-4 border-b border-ink-700/60">
              <div>
                <div className="text-lg font-bold text-ink-50">Vantage Outdoor Media</div>
                <div className="text-xs text-ink-500 mt-0.5">Media Proposal</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-ink-100">{proposal.code}</div>
                <div className="text-xs text-ink-500">{client.data?.name ?? "..."}</div>
              </div>
            </div>

            <div className="text-sm font-semibold text-ink-100 mb-3">{proposal.campaignName}</div>

            <table className="w-full text-sm mb-4">
              <thead>
                <tr className="text-xs text-ink-500 border-b border-ink-700/60">
                  <th className="text-left font-medium pb-2">Item</th>
                  <th className="text-right font-medium pb-2">Days</th>
                  <th className="text-right font-medium pb-2">Rate/day</th>
                  <th className="text-right font-medium pb-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {proposal.items.map((item) => (
                  <tr key={item.id} className="border-b border-ink-800/60">
                    <td className="py-2.5 text-ink-200">{item.description}</td>
                    <td className="py-2.5 text-right text-ink-400">{item.days}</td>
                    <td className="py-2.5 text-right text-ink-400">{formatMoney({ amountCents: item.unitPriceCents, currency: "USD" })}</td>
                    <td className="py-2.5 text-right text-ink-100 font-medium">{formatMoney({ amountCents: item.totalCents, currency: "USD" })}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end">
              <div className="w-48 space-y-1 text-sm">
                <div className="flex justify-between text-ink-400">
                  <span>Subtotal</span>
                  <span>{formatMoney({ amountCents: proposal.items.reduce((s, i) => s + i.totalCents, 0), currency: "USD" })}</span>
                </div>
                {proposal.discountPct > 0 && (
                  <div className="flex justify-between text-signal-green">
                    <span>Discount ({proposal.discountPct}%)</span>
                    <span>
                      -{formatMoney({
                        amountCents: Math.round(proposal.items.reduce((s, i) => s + i.totalCents, 0) * (proposal.discountPct / 100)),
                        currency: "USD",
                      })}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold text-ink-50 pt-1.5 border-t border-ink-700/60">
                  <span>Total</span>
                  <span>{formatMoney(proposal.total)}</span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-ink-700/60 text-xs text-ink-500">
              Estimated impressions: {proposal.estimatedImpressions.toLocaleString()} · This proposal is illustrative demo output.
            </div>
          </div>

          {proposal.status === "accepted" && (
            <div className="panel p-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-ink-100">Ready to book</div>
                <div className="text-xs text-ink-500">Convert this accepted proposal into a campaign.</div>
              </div>
              <Link to={`/campaigns?fromProposal=${proposal.id}`} className="btn-primary !py-2 !px-3 text-xs">
                Convert to Campaign →
              </Link>
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
};
