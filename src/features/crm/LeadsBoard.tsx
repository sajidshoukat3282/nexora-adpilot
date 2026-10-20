import React, { useState } from "react";
import { FiArrowRight } from "react-icons/fi";
import type { LeadStage } from "@/domain";
import { LEAD_STAGE_LABELS, LEAD_TRANSITIONS } from "@/domain";
import { leadStageTone, StatusBadge } from "@/components/ui/StatusBadge";
import { SkeletonCard } from "@/components/ui/Feedback";
import { FIN } from "../finance/financeUi";
import { mailtoUrl, normalizePhone, whatsappUrl } from "../finance/financeTools";
import { TierBadge, followChip } from "./LeadActivityPanel";
import {
  STAGE_WEIGHT,
  followUpState,
  isStaleLead,
  leadContact,
  leadName,
  leadValue,
  moneyShort,
  nextFollowUps,
  scoreLead,
  todayIso,
  type CrmActivity,
} from "./crmTools";

const STAGES: LeadStage[] = ["lead", "qualified", "proposal", "negotiation", "won", "lost"];

const STAGE_ACCENT: Record<string, string> = {
  lead: "#94a3b8",
  qualified: "#38bdf8",
  proposal: "#a78bfa",
  negotiation: "#e0b24a",
  won: "#34d399",
  lost: "#fb7185",
};

export const LeadsBoard: React.FC<{
  leads: any[];
  loading: boolean;
  onChanged: () => void;
  activities?: CrmActivity[];
  onOpenLead?: (lead: any) => void;
}> = ({ leads, loading, onChanged, activities = [], onOpenLead }) => {
  const [moving, setMoving] = useState<string | null>(null);
  const [converting, setConverting] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);

  const today = todayIso();
  const follow = nextFollowUps(activities);

  async function move(leadId: string, next: LeadStage) {
    setMoving(leadId);
    setMenuFor(null);
    try {
      const res = await fetch(`/api/crm/leads/${leadId}/stage`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: next })
      });
      if (!res.ok) throw new Error("Failed to move stage");
      onChanged();
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setMoving(null);
    }
  }

  async function convertToClient(leadId: string) {
    if (!confirm("Are you sure you want to convert this lead to a Client?")) return;

    setConverting(leadId);
    try {
      const res = await fetch(`/api/crm/leads/${leadId}/convert`, {
        method: 'POST'
      });
      if (!res.ok) throw new Error("Failed to convert lead");

      alert("Lead successfully converted to Client! You can view it in the Clients tab.");
      onChanged();
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setConverting(null);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3 xl:grid-cols-6">
      {STAGES.map((stage) => {
        const stageLeads = leads
          .filter((l) => l.stage === stage)
          .map((l) => ({ lead: l, score: scoreLead(l, follow[String(l.id)], today) }))
          .sort((a, b) => b.score.score - a.score.score);
        const stageValue = stageLeads.reduce((n, x) => n + leadValue(x.lead), 0);
        const weighted = stageValue * (STAGE_WEIGHT[stage] ?? 0);
        return (
          <div key={stage} className="min-w-0 rounded-xl border border-[#22262d] bg-[#0f1216]/70 p-2">
            <div className="mb-2 px-1">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-300">
                  <i className="h-2 w-2 rounded-full" style={{ background: STAGE_ACCENT[stage] }} />
                  {LEAD_STAGE_LABELS[stage]}
                </span>
                <span className="rounded-full bg-white/5 px-1.5 text-[10px] tabular-nums text-zinc-400">{stageLeads.length}</span>
              </div>
              <p className="mt-0.5 text-[10px] text-zinc-500">
                {moneyShort(stageValue)}
                {stage !== "won" && stage !== "lost" && stageValue > 0 && <span className="text-[#d9b45a]/80"> · wtd {moneyShort(weighted)}</span>}
              </p>
            </div>
            <div className="min-h-[60px] space-y-2">
              {loading && <SkeletonCard />}
              {!loading &&
                stageLeads.map(({ lead, score }) => {
                  const nextOptions = LEAD_TRANSITIONS[lead.stage as LeadStage] || [];
                  const fstate = followUpState(follow[String(lead.id)], today);
                  const stale = isStaleLead(lead, today);
                  const phone = normalizePhone(lead.phone);
                  return (
                    <div key={lead.id} className={`${FIN.panel} relative p-2.5`}>
                      <button
                        type="button"
                        onClick={() => onOpenLead?.(lead)}
                        className="block w-full text-left"
                        title="Open lead"
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <div className="min-w-0 truncate text-[12px] font-semibold text-zinc-100">{leadName(lead)}</div>
                          <TierBadge score={score} />
                        </div>
                        <div className="mt-0.5 truncate text-[11px] text-zinc-500">{leadContact(lead)}</div>
                        <div className="mt-1.5 text-[12px] font-semibold text-[#f1d68a]">PKR {leadValue(lead).toLocaleString()}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-1">
                          {lead.source && <span className="rounded-full border border-[#2b3038] px-1.5 py-0.5 text-[9px] text-zinc-400">{lead.source}</span>}
                          {stale && <span className="rounded-full border border-orange-400/40 bg-orange-500/10 px-1.5 py-0.5 text-[9px] text-orange-300">Stale</span>}
                          {fstate !== "none" && (
                            <span className={`rounded-full border px-1.5 py-0.5 text-[9px] ${followChip(fstate)}`}>
                              {fstate === "overdue" ? "Follow-up overdue" : fstate === "today" ? "Follow-up today" : `Follow-up ${String(follow[String(lead.id)]).slice(5)}`}
                            </span>
                          )}
                        </div>
                      </button>

                      <div className="mt-2 flex items-center gap-1.5 border-t border-[#22262d] pt-2">
                        {lead.phone && (
                          <a
                            href={`tel:${lead.phone}`}
                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                            className="rounded-md border border-[#2b3038] px-1.5 py-1 text-[11px] text-zinc-300 hover:border-[#c99b3b]/50"
                            title="Call"
                          >
                            📞
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => window.open(whatsappUrl(phone, `Assalam o Alaikum ${leadContact(lead) || leadName(lead)},`), "_blank", "noopener")}
                          className="rounded-md border border-[#2b3038] px-1.5 py-1 text-[11px] text-zinc-300 hover:border-[#c99b3b]/50"
                          title="WhatsApp"
                        >
                          💬
                        </button>
                        {lead.email && (
                          <button
                            type="button"
                            onClick={() => {
                              window.location.href = mailtoUrl(lead.email, `Regarding ${leadName(lead)}`, "");
                            }}
                            className="rounded-md border border-[#2b3038] px-1.5 py-1 text-[11px] text-zinc-300 hover:border-[#c99b3b]/50"
                            title="Email"
                          >
                            ✉️
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onOpenLead?.(lead)}
                          className="ml-auto text-[10px] font-semibold text-[#e5c36a] hover:text-[#f1d68a]"
                        >
                          Log / Follow-up
                        </button>
                      </div>

                      {nextOptions.length > 0 && (
                        <div className="relative mt-2">
                          <button
                            disabled={moving === lead.id || converting === lead.id}
                            onClick={() => setMenuFor(menuFor === lead.id ? null : lead.id)}
                            className="flex w-full items-center gap-1 text-[11px] font-semibold text-[#e5c36a] hover:text-[#f1d68a] disabled:opacity-40"
                          >
                            Move stage <FiArrowRight size={11} />
                          </button>

                          {menuFor === lead.id && (
                            <div className="absolute left-0 right-0 z-10 mt-1 rounded-lg border border-[#2b3038] bg-[#14171c] p-1 shadow-xl">
                              {nextOptions.map((opt: LeadStage) => (
                                <button
                                  key={opt}
                                  onClick={() => move(lead.id, opt)}
                                  className="w-full rounded-md px-2.5 py-1.5 text-left text-xs text-zinc-200 hover:bg-white/5"
                                >
                                  <StatusBadge label={LEAD_STAGE_LABELS[opt]} tone={leadStageTone(opt)} dot={false} />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {lead.stage === 'won' && !lead.convertedClientId && !lead.converted_client_id && (
                        <button
                          disabled={converting === lead.id}
                          onClick={() => convertToClient(lead.id)}
                          className="mt-2 w-full rounded-md border border-emerald-500/30 bg-emerald-500/15 py-1.5 text-[11px] font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/25"
                        >
                          {converting === lead.id ? "Converting..." : "Convert to Client"}
                        </button>
                      )}
                    </div>
                  );
                })}
              {!loading && stageLeads.length === 0 && (
                <div className="rounded-lg border border-dashed border-[#2b3038] py-4 text-center text-[11px] text-zinc-600">
                  Empty
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
