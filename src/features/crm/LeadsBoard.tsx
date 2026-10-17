import React, { useState } from "react";
import { FiArrowRight, FiPlus } from "react-icons/fi";
import type { Lead, LeadStage } from "@/domain";
import { LEAD_STAGE_LABELS, LEAD_TRANSITIONS } from "@/domain";
import { leadStageTone, StatusBadge } from "@/components/ui/StatusBadge";
import { SkeletonCard } from "@/components/ui/Feedback";

const STAGES: LeadStage[] = ["lead", "qualified", "proposal", "negotiation", "won", "lost"];

export const LeadsBoard: React.FC<{
  leads: any[]; // Yahan 'any' kiya hai taake database ka data easily map ho jaye
  loading: boolean;
  onChanged: () => void;
}> = ({ leads, loading, onChanged }) => {
  const [moving, setMoving] = useState<string | null>(null);
  const [converting, setConverting] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);

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
    if (!confirm("Kya aap waqai is lead ko client mein convert karna chahte hain?")) return;
    
    setConverting(leadId);
    try {
      const res = await fetch(`/api/crm/leads/${leadId}/convert`, {
        method: 'POST'
      });
      if (!res.ok) throw new Error("Failed to convert lead");
      
      alert("Lead successfully converted to Client! Ab aap 'Clients' tab mein dekh sakte hain.");
      onChanged(); // Data refresh karein
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setConverting(null);
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-3">
      {STAGES.map((stage) => {
        const stageLeads = leads.filter((l) => l.stage === stage);
        return (
          <div key={stage} className="min-w-0">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-xs font-bold uppercase tracking-wide text-ink-400">
                {LEAD_STAGE_LABELS[stage]}
              </span>
              <span className="text-xs text-ink-500 tabular-nums">{stageLeads.length}</span>
            </div>
            <div className="space-y-2 min-h-[60px]">
              {loading && <SkeletonCard />}
              {!loading &&
                stageLeads.map((lead) => {
                  const nextOptions = LEAD_TRANSITIONS[lead.stage as LeadStage] || [];
                  return (
                    <div key={lead.id} className="panel p-3 relative">
                      <div className="text-sm font-semibold text-ink-100 truncate">{lead.companyName || lead.company_name}</div>
                      <div className="text-xs text-ink-500 truncate mt-0.5">{lead.contactName || lead.contact_name}</div>
                      <div className="text-xs text-ink-400 mt-1.5">${(lead.estimatedValue || lead.estimated_value || 0).toLocaleString()}</div>
                      <div className="text-[11px] text-ink-600 mt-1">{lead.source}</div>

                      {nextOptions.length > 0 && (
                        <div className="mt-2.5 relative">
                          <button
                            disabled={moving === lead.id || converting === lead.id}
                            onClick={() => setMenuFor(menuFor === lead.id ? null : lead.id)}
                            className="w-full text-xs font-semibold text-signal-cyan hover:text-cyan-300 flex items-center gap-1 disabled:opacity-40"
                          >
                            Move stage <FiArrowRight size={11} />
                          </button>
                          
                          {menuFor === lead.id && (
                            <div className="absolute left-0 right-0 mt-1 panel-solid p-1 z-10 bg-ink-800 rounded shadow-lg border border-ink-700">
                              {nextOptions.map((opt: LeadStage) => (
                                <button
                                  key={opt}
                                  onClick={() => move(lead.id, opt)}
                                  className="w-full text-left px-2.5 py-1.5 text-xs rounded-md hover:bg-ink-700 text-ink-200"
                                >
                                  <StatusBadge label={LEAD_STAGE_LABELS[opt]} tone={leadStageTone(opt)} dot={false} />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Convert Button for Won Leads */}
                      {lead.stage === 'won' && !lead.convertedClientId && !lead.converted_client_id && (
                        <button
                          disabled={converting === lead.id}
                          onClick={() => convertToClient(lead.id)}
                          className="mt-3 w-full bg-green-600/20 text-green-400 border border-green-600/30 hover:bg-green-600/30 text-xs font-semibold py-1.5 rounded transition-colors"
                        >
                          {converting === lead.id ? "Converting..." : "Convert to Client"}
                        </button>
                      )}
                    </div>
                  );
                })}
              {!loading && stageLeads.length === 0 && (
                <div className="text-xs text-ink-600 text-center py-4 border border-dashed border-ink-700 rounded-lg">
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
