import React, { useState } from "react";
import { 
  FiPlus, FiFileText, FiEye, FiCheckCircle, 
  FiMapPin, FiMonitor, FiBarChart2, FiX, FiShield 
} from "react-icons/fi";
import { PageHeader } from "@/components/layout/AppShell";
import { StatusBadge, proposalStatusTone } from "@/components/ui/StatusBadge";
import { PermissionGate } from "@/components/ui/PermissionGate";
import { useAsync } from "@/hooks/useAsync";
import { repo } from "@/repositories/demo";
import { formatMoney, money } from "@/domain";

// Safe Helper Extractors
function getTitle(p: any): string {
  if (!p) return "Commercial Proposal";
  return p.title || p.name || "Commercial Proposal";
}

function getClientName(p: any): string {
  if (!p) return "Client";
  return p.clientName || p.client || p.brand || "Client";
}

function getValueCents(p: any): number {
  if (!p) return 0;
  if (p.totalAmount?.amountCents) return p.totalAmount.amountCents;
  if (p.value?.amountCents) return p.value.amountCents;
  if (typeof p.value === "number") return p.value;
  if (typeof p.totalAmount === "number") return p.totalAmount;
  return 4500000;
}

export const ProposalsPage: React.FC = () => {
  const proposals = useAsync(() => repo.proposals.listProposals(), []);
  const [previewClientProposal, setPreviewClientProposal] = useState<any | null>(null);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);

  // Proposal Creation Form State
  const [newTitle, setNewTitle] = useState("");
  const [newClient, setNewClient] = useState("");
  const [newValue, setNewValue] = useState("50000");

  const rawList = Array.isArray(proposals.data) ? proposals.data : [];

  const totalPipelineCents = rawList.reduce((sum: number, p: any) => sum + getValueCents(p), 0);

  const handleCreateProposal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newClient) return;
    const newProp = {
      id: `p-${Date.now()}`,
      code: `PR-${Math.floor(100 + Math.random() * 900)}`,
      title: newTitle,
      clientName: newClient,
      status: "draft",
      totalAmount: { amountCents: Number(newValue) * 100 }
    };
    rawList.unshift(newProp);
    setIsBuilderOpen(false);
    setNewTitle("");
    setNewClient("");
    proposals.reload();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Proposals & Commercial Quotes"
        description="Manage client proposals, executive quotes, and campaign estimates."
        actions={
          <button
            onClick={() => setIsBuilderOpen(true)}
            className="btn-primary flex items-center gap-2 text-xs"
          >
            <FiPlus size={14} />
            <span>Create Proposal</span>
          </button>
        }
      />

      {/* Owner Confidential Financial Summary */}
      <PermissionGate permission={"financials:read" as any} fallback={null}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-surface-bg/80 border border-surface-border rounded-xl">
          <div>
            <span className="text-xs text-ink-400 font-medium block">Total Active Proposals</span>
            <span className="text-xl font-bold text-ink-50">
              {rawList.length} Proposals
            </span>
          </div>
          <div>
            <span className="text-xs text-ink-400 font-medium block">Gross Client Pipeline</span>
            <span className="text-xl font-bold text-signal-cyan">
              {formatMoney(money(totalPipelineCents))}
            </span>
          </div>
          <div>
            <span className="text-xs text-ink-400 font-medium block">Protected Agency Margin (35%)</span>
            <span className="text-xl font-bold text-signal-green">
              {formatMoney(money(Math.round(totalPipelineCents * 0.35)))}
            </span>
          </div>
        </div>
      </PermissionGate>

      {/* Crash-Proof Native Table Rendering */}
      <div className="panel overflow-x-auto p-0 border border-surface-border rounded-xl bg-surface-card">
        {proposals.loading ? (
          <div className="p-8 text-center text-ink-400 text-xs">
            Loading proposals...
          </div>
        ) : (
          <table className="w-full text-left text-xs text-ink-200">
            <thead className="bg-surface-bg border-b border-surface-border text-ink-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="p-3.5">Proposal / Client</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Client Investment</th>
                <th className="p-3.5">Internal Margin (Owner Only)</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {rawList.map((p: any, idx: number) => (
                <tr key={p.id || p.code || idx} className="hover:bg-surface-bg/50 transition-colors">
                  <td className="p-3.5">
                    <div className="font-semibold text-ink-50">{getTitle(p)}</div>
                    <div className="text-ink-500 text-[11px]">{p.code || "PR-001"} · {getClientName(p)}</div>
                  </td>
                  <td className="p-3.5">
                    <StatusBadge label={p.status || "draft"} tone={proposalStatusTone(p.status)} />
                  </td>
                  <td className="p-3.5 font-semibold text-ink-100">
                    {formatMoney(money(getValueCents(p)))}
                  </td>
                  <td className="p-3.5">
                    <PermissionGate permission={"financials:read" as any} fallback={<span className="text-ink-500 text-[11px]">Restricted</span>}>
                      <span className="text-xs font-bold text-signal-green bg-signal-green/10 px-2 py-0.5 rounded border border-signal-green/20">
                        +35% ({formatMoney(money(Math.round(getValueCents(p) * 0.35)))})
                      </span>
                    </PermissionGate>
                  </td>
                  <td className="p-3.5 text-right">
                    <button
                      onClick={() => setPreviewClientProposal(p)}
                      className="px-2.5 py-1 text-xs font-medium bg-ink-800 hover:bg-ink-700 text-signal-cyan rounded border border-ink-700 inline-flex items-center gap-1.5 transition-colors"
                    >
                      <FiEye size={13} />
                      <span>Client PDF View</span>
                    </button>
                  </td>
                </tr>
              ))}
              {rawList.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-ink-400">
                    No proposals found. Click "Create Proposal" to add one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Proposal Builder Modal */}
      {isBuilderOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-card border border-surface-border rounded-xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-surface-border pb-3">
              <h3 className="font-bold text-ink-50 text-sm">Create New Proposal</h3>
              <button onClick={() => setIsBuilderOpen(false)} className="text-ink-400 hover:text-ink-100">
                <FiX size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateProposal} className="space-y-3 text-xs">
              <div>
                <label className="block text-ink-300 mb-1">Proposal Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Q4 DOOH Network Flight"
                  className="w-full bg-surface-bg border border-surface-border rounded p-2 text-ink-100 focus:outline-none focus:border-signal-cyan"
                />
              </div>
              <div>
                <label className="block text-ink-300 mb-1">Client Name</label>
                <input
                  type="text"
                  required
                  value={newClient}
                  onChange={(e) => setNewClient(e.target.value)}
                  placeholder="e.g. Samsung Pakistan"
                  className="w-full bg-surface-bg border border-surface-border rounded p-2 text-ink-100 focus:outline-none focus:border-signal-cyan"
                />
              </div>
              <div>
                <label className="block text-ink-300 mb-1">Gross Investment Value ($)</label>
                <input
                  type="number"
                  required
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  className="w-full bg-surface-bg border border-surface-border rounded p-2 text-ink-100 focus:outline-none focus:border-signal-cyan"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsBuilderOpen(false)}
                  className="px-3 py-1.5 bg-ink-800 text-ink-300 rounded hover:bg-ink-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary px-3 py-1.5"
                >
                  Save Proposal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Client Presentation & PDF View Modal */}
      {previewClientProposal && (
        <ClientProposalPDFModal 
          proposal={previewClientProposal} 
          onClose={() => setPreviewClientProposal(null)} 
        />
      )}
    </div>
  );
};

/* Client Presentation & PDF View Component */
const ClientProposalPDFModal: React.FC<{ proposal: any; onClose: () => void }> = ({ proposal, onClose }) => {
  if (!proposal) return null;

  const baseCents = getValueCents(proposal);
  const gstCents = Math.round(baseCents * 0.16);
  const grandTotalCents = baseCents + gstCents;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-surface-card border border-surface-border rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        
        {/* Modal Header */}
        <div className="p-4 border-b border-surface-border flex items-center justify-between bg-surface-bg sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <FiShield className="text-signal-green" size={18} />
            <span className="text-xs font-semibold text-signal-green uppercase tracking-wider">
              Client Confidential Presentation View
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 text-xs font-semibold bg-signal-cyan text-ink-900 hover:bg-signal-cyan/90 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <FiFileText size={14} />
              <span>Print / Save as PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-ink-400 hover:text-ink-100 rounded-lg bg-ink-800"
            >
              <FiX size={18} />
            </button>
          </div>
        </div>

        {/* Client Proposal Printable Area */}
        <div className="p-8 space-y-8 bg-surface-bg text-ink-100">
          
          {/* Header & Branding */}
          <div className="flex justify-between items-start border-b border-surface-border pb-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-ink-50">VANTAGE OUTDOOR MEDIA</h1>
              <p className="text-xs text-ink-400 mt-1">Premium Digital Out-of-Home (DOOH) Advertising Proposal</p>
            </div>
            <div className="text-right">
              <span className="px-3 py-1 text-xs font-bold bg-signal-cyan/10 text-signal-cyan rounded border border-signal-cyan/20">
                OFFICIAL QUOTATION
              </span>
              <div className="text-xs text-ink-400 mt-2">Ref: <span className="font-mono text-ink-200">{(proposal && proposal.code) || "PR-001"}</span></div>
              <div className="text-xs text-ink-400">Date: {new Date().toLocaleDateString()}</div>
            </div>
          </div>

          {/* Client Info */}
          <div className="bg-surface-card/60 p-4 rounded-xl border border-surface-border flex justify-between items-center">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-ink-500 font-semibold block">Prepared For</span>
              <div className="text-base font-bold text-ink-50">{getClientName(proposal)}</div>
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider text-ink-500 font-semibold block">Campaign Title</span>
              <div className="text-base font-bold text-signal-cyan">{getTitle(proposal)}</div>
            </div>
          </div>

          {/* 1. Campaign Scope & Network Locations */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-surface-border pb-2">
              <FiMapPin className="text-signal-cyan" size={18} />
              <h3 className="font-semibold text-ink-50 text-base">1. Campaign Scope & Screen Locations</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 bg-surface-card rounded-lg border border-surface-border">
                <div className="flex items-center gap-2 text-xs font-semibold text-ink-200 mb-1">
                  <FiMonitor size={14} className="text-signal-cyan" />
                  <span>Main Boulevard LED Display — Site A</span>
                </div>
                <p className="text-xs text-ink-400">High-visibility digital billboard · 15-second loop slot · 18 Hours/day</p>
              </div>
              <div className="p-3 bg-surface-card rounded-lg border border-surface-border">
                <div className="flex items-center gap-2 text-xs font-semibold text-ink-200 mb-1">
                  <FiMonitor size={14} className="text-signal-cyan" />
                  <span>Commercial Square Screen — Site B</span>
                </div>
                <p className="text-xs text-ink-400">High-traffic retail zone · Prime time slots · 18 Hours/day</p>
              </div>
            </div>
          </div>

          {/* 2. Deliverables & Estimated Reach */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-surface-border pb-2">
              <FiBarChart2 className="text-signal-cyan" size={18} />
              <h3 className="font-semibold text-ink-50 text-base">2. Campaign Deliverables & Estimated Reach</h3>
            </div>
            <div className="grid grid-cols-3 gap-4 p-4 bg-surface-card/40 rounded-xl border border-surface-border">
              <div className="text-center">
                <span className="text-[11px] text-ink-400 uppercase font-semibold block">Daily Ad Plays</span>
                <span className="text-lg font-bold text-ink-50">720 Plays / Day</span>
              </div>
              <div className="text-center border-x border-surface-border px-2">
                <span className="text-[11px] text-ink-400 uppercase font-semibold block">Est. Daily Impressions</span>
                <span className="text-lg font-bold text-signal-green">145,000+ Reach</span>
              </div>
              <div className="text-center">
                <span className="text-[11px] text-ink-400 uppercase font-semibold block">Campaign Duration</span>
                <span className="text-lg font-bold text-ink-50">30 Flight Days</span>
              </div>
            </div>
          </div>

          {/* 3. Single All-Inclusive Financial Investment */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-surface-border pb-2">
              <FiCheckCircle className="text-signal-green" size={18} />
              <h3 className="font-semibold text-ink-50 text-base">3. All-Inclusive Campaign Investment</h3>
            </div>
            
            <div className="p-5 bg-surface-card rounded-xl border border-surface-border space-y-3">
              <div className="flex justify-between text-sm text-ink-300">
                <span>DOOH Network & Media Package (30 Days)</span>
                <span className="font-semibold text-ink-100">{formatMoney(money(baseCents))}</span>
              </div>
              <div className="flex justify-between text-sm text-ink-400">
                <span>Sales Tax / GST on Services (16%)</span>
                <span className="font-semibold text-ink-300">{formatMoney(money(gstCents))}</span>
              </div>
              <div className="border-t border-surface-border pt-3 flex justify-between items-center">
                <div>
                  <span className="text-base font-bold text-ink-50 block">Grand Total Investment</span>
                  <span className="text-xs text-ink-500">Includes all production, media slots, and provincial taxes.</span>
                </div>
                <div className="text-2xl font-bold text-signal-green">
                  {formatMoney(money(grandTotalCents))}
                </div>
              </div>
            </div>
          </div>

          {/* Terms Footer */}
          <div className="text-xs text-ink-500 border-t border-surface-border pt-4 space-y-1">
            <p>• Proposal valid for 15 days from issue date.</p>
            <p>• Payment Terms: 50% advance upon booking, 50% upon campaign launch.</p>
            <p>• Artwork creative specs: 1920x1080 MP4 format, 30fps.</p>
          </div>

        </div>
      </div>
    </div>
  );
};
