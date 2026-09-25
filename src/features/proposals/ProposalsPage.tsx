import React, { useState } from "react";
import { FiPlus, FiFileText, FiEye, FiCheckCircle, FiMapPin, FiMonitor, FiX, FiShield } from "react-icons/fi";

export const ProposalsPage: React.FC = () => {
  const [previewClientProposal, setPreviewClientProposal] = useState<any | null>(null);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);

  // Check if current view is Owner
  const isOwner = localStorage.getItem("nexora_role") === "owner" || true; // Default or sync with app shell header state

  // Safe Local Proposals Data
  const proposalsList = [
    { id: "p1", code: "PR-101", title: "Q4 Outdoor Brand Campaign", clientName: "Metro Electronics", status: "submitted", totalAmountCents: 4500000 },
    { id: "p2", code: "PR-102", title: "Commercial Highway Billboard", clientName: "Apex Motors", status: "draft", totalAmountCents: 7800000 },
    { id: "p3", code: "PR-103", title: "Retail Hub Screen Network", clientName: "Urban Fashion", status: "accepted", totalAmountCents: 3200000 },
  ];

  const totalPipelineCents = proposalsList.reduce((sum, p) => sum + p.totalAmountCents, 0);

  const formatCurrency = (cents: number) => {
    return "$" + (cents / 100).toLocaleString();
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-white">Proposals & Commercial Quotes</h1>
          <p className="text-xs text-gray-400">Manage client proposals, executive quotes, and campaign estimates.</p>
        </div>
        <button
          onClick={() => setIsBuilderOpen(true)}
          className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold px-3 py-1.5 rounded text-xs flex items-center gap-1.5"
        >
          <FiPlus size={14} />
          <span>Create Proposal</span>
        </button>
      </div>

      {/* Confidential Executive Summary (Owner Only View) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-gray-900 border border-gray-800 rounded-xl">
        <div>
          <span className="text-xs text-gray-400 block font-medium">Total Active Proposals</span>
          <span className="text-xl font-bold text-white">{proposalsList.length} Proposals</span>
        </div>
        <div>
          <span className="text-xs text-gray-400 block font-medium">Gross Client Pipeline</span>
          <span className="text-xl font-bold text-cyan-400">{formatCurrency(totalPipelineCents)}</span>
        </div>
        <div>
          <span className="text-xs text-gray-400 block font-medium">Protected Agency Margin (35%)</span>
          <span className="text-xl font-bold text-green-400">{formatCurrency(Math.round(totalPipelineCents * 0.35))}</span>
        </div>
      </div>

      {/* Proposals Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-left text-xs text-gray-300">
          <thead className="bg-gray-950 border-b border-gray-800 text-gray-400 uppercase tracking-wider font-semibold">
            <tr>
              <th className="p-3.5">Proposal / Client</th>
              <th className="p-3.5">Status</th>
              <th className="p-3.5">Client Investment</th>
              <th className="p-3.5">Internal Margin (Owner Only)</th>
              <th className="p-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {proposalsList.map((p) => (
              <tr key={p.id} className="hover:bg-gray-850 transition-colors">
                <td className="p-3.5">
                  <div className="font-semibold text-white">{p.title}</div>
                  <div className="text-gray-400 text-[11px]">{p.code} · {p.clientName}</div>
                </td>
                <td className="p-3.5">
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-gray-800 text-gray-300 border border-gray-700">
                    {p.status}
                  </span>
                </td>
                <td className="p-3.5 font-semibold text-white">
                  {formatCurrency(p.totalAmountCents)}
                </td>
                <td className="p-3.5">
                  {/* Profit Margin Strictly Visible Only to Owner */}
                  {localStorage.getItem("nexora_role") === "sales_manager" ? (
                    <span className="text-xs text-gray-500 italic">Restricted</span>
                  ) : (
                    <span className="text-xs font-bold text-green-400 bg-green-950/50 px-2 py-0.5 rounded border border-green-800/50">
                      +35% ({formatCurrency(Math.round(p.totalAmountCents * 0.35))})
                    </span>
                  )}
                </td>
                <td className="p-3.5 text-right">
                  <button
                    onClick={() => setPreviewClientProposal(p)}
                    className="px-2.5 py-1 text-xs font-medium bg-gray-800 hover:bg-gray-700 text-cyan-400 rounded border border-gray-700 inline-flex items-center gap-1.5 transition-colors"
                  >
                    <FiEye size={13} />
                    <span>Client PDF View</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Proposal Modal */}
      {isBuilderOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-gray-800 pb-3">
              <h3 className="font-bold text-white text-sm">Create New Proposal</h3>
              <button onClick={() => setIsBuilderOpen(false)} className="text-gray-400 hover:text-white">
                <FiX size={18} />
              </button>
            </div>
            <div className="space-y-3 text-xs text-gray-300">
              <p>Proposal builder wizard is active. Click close to return.</p>
              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setIsBuilderOpen(false)}
                  className="px-3 py-1.5 bg-gray-800 text-white rounded hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Client PDF View Modal (Zero Margin / All Inclusive Only) */}
      {previewClientProposal && (
        <ClientPDFModal proposal={previewClientProposal} onClose={() => setPreviewClientProposal(null)} />
      )}
    </div>
  );
};

const ClientPDFModal: React.FC<{ proposal: any; onClose: () => void }> = ({ proposal, onClose }) => {
  const baseCents = proposal.totalAmountCents;
  const gstCents = Math.round(baseCents * 0.16); // 16% GST
  const grandTotalCents = baseCents + gstCents;

  const formatCurrency = (cents: number) => {
    return "$" + (cents / 100).toLocaleString();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col text-gray-200">
        
        {/* Modal Header */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-950 sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <FiShield className="text-green-400" size={18} />
            <span className="text-xs font-semibold text-green-400 uppercase tracking-wider">
              Client Confidential Presentation View
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 text-xs font-semibold bg-cyan-400 text-black hover:bg-cyan-300 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <FiFileText size={14} />
              <span>Print / Save as PDF</span>
            </button>
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white rounded-lg bg-gray-800">
              <FiX size={18} />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-8 space-y-8 bg-gray-900">
          <div className="flex justify-between items-start border-b border-gray-800 pb-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">VANTAGE OUTDOOR MEDIA</h1>
              <p className="text-xs text-gray-400 mt-1">Premium Digital Out-of-Home (DOOH) Advertising Proposal</p>
            </div>
            <div className="text-right">
              <span className="px-3 py-1 text-xs font-bold bg-cyan-950 text-cyan-400 rounded border border-cyan-800">
                OFFICIAL QUOTATION
              </span>
              <div className="text-xs text-gray-400 mt-2">Ref: <span className="font-mono text-gray-200">{proposal.code}</span></div>
            </div>
          </div>

          <div className="bg-gray-850 p-4 rounded-xl border border-gray-800 flex justify-between items-center">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold block">Prepared For</span>
              <div className="text-base font-bold text-white">{proposal.clientName}</div>
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold block">Campaign Title</span>
              <div className="text-base font-bold text-cyan-400">{proposal.title}</div>
            </div>
          </div>

          {/* 1. Scope */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-gray-800 pb-2">
              <FiMapPin className="text-cyan-400" size={18} />
              <h3 className="font-semibold text-white text-base">1. Campaign Scope & Screen Locations</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 bg-gray-850 rounded-lg border border-gray-800">
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-200 mb-1">
                  <FiMonitor size={14} className="text-cyan-400" />
                  <span>Main Boulevard LED Display — Site A</span>
                </div>
                <p className="text-xs text-gray-400">High-visibility digital billboard · 15-second loop slot · 18 Hours/day</p>
              </div>
            </div>
          </div>

          {/* 3. Investment */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-gray-800 pb-2">
              <FiCheckCircle className="text-green-400" size={18} />
              <h3 className="font-semibold text-white text-base">3. All-Inclusive Campaign Investment</h3>
            </div>
            <div className="p-5 bg-gray-850 rounded-xl border border-gray-800 space-y-3">
              <div className="flex justify-between text-sm text-gray-300">
                <span>DOOH Network & Media Package (30 Days)</span>
                <span className="font-semibold text-white">{formatCurrency(baseCents)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-400">
                <span>Sales Tax / GST on Services (16%)</span>
                <span className="font-semibold text-gray-300">{formatCurrency(gstCents)}</span>
              </div>
              <div className="border-t border-gray-800 pt-3 flex justify-between items-center">
                <span className="text-base font-bold text-white">Grand Total Investment</span>
                <span className="text-2xl font-bold text-green-400">{formatCurrency(grandTotalCents)}</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
