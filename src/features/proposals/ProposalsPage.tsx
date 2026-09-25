import React, { useState } from "react";
import { 
  FiPlus, FiPrinter, FiEye, FiDownload, FiCheckCircle, 
  FiMapPin, FiTv, FiBarChart2, FiX, FiShield 
} from "react-icons/fi";
import { PageHeader } from "@/components/layout/AppShell";
import { DataTable, ColumnDef } from "@/components/ui/DataTable";
import { StatusBadge, proposalStatusTone } from "@/components/ui/StatusBadge";
import { PermissionGate } from "@/components/ui/PermissionGate";
import { ProposalBuilderModal } from "./ProposalBuilderModal";
import { useAsync } from "@/hooks/useAsync";
import { repo } from "@/repositories/demo";
import { formatMoney, money } from "@/domain";
import type { Proposal } from "@/domain";

export const ProposalsPage: React.FC = () => {
  const proposals = useAsync(() => repo.proposals.listProposals(), []);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [previewClientProposal, setPreviewClientProposal] = useState<Proposal | null>(null);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);

  const columns: ColumnDef<Proposal>[] = [
    {
      key: "title",
      header: "Proposal",
      cell: (p) => (
        <div>
          <div className="font-semibold text-ink-50">{p.title}</div>
          <div className="text-xs text-ink-500">{p.code} · {p.clientName}</div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (p) => <StatusBadge label={p.status} tone={proposalStatusTone(p.status)} />,
    },
    {
      key: "totalValue",
      header: "Client Investment",
      cell: (p) => (
        <span className="font-semibold text-ink-100">
          {formatMoney(p.totalAmount)}
        </span>
      ),
    },
    {
      key: "profitMargin",
      header: "Internal Margin (Owner Only)",
      cell: (p) => (
        <PermissionGate permission="view:financials">
          <span className="text-xs font-bold text-signal-green bg-signal-green/10 px-2 py-0.5 rounded border border-signal-green/20">
            +35% ({formatMoney(money(Math.round(p.totalAmount.amountCents * 0.35)))})
          </span>
        </PermissionGate>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (p) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setPreviewClientProposal(p);
          }}
          className="px-2.5 py-1 text-xs font-medium bg-ink-800 hover:bg-ink-700 text-signal-cyan rounded border border-ink-700 flex items-center gap-1.5 transition-colors"
        >
          <FiEye size={13} />
          <span>Client PDF View</span>
        </button>
      ),
    },
  ];

  return (
    <div>
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
      <PermissionGate permission="view:financials">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 p-4 bg-surface-bg/80 border border-surface-border rounded-xl">
          <div>
            <span className="text-xs text-ink-400 font-medium block">Total Active Proposals</span>
            <span className="text-xl font-bold text-ink-50">
              {proposals.data?.length ?? 0} Proposals
            </span>
          </div>
          <div>
            <span className="text-xs text-ink-400 font-medium block">Gross Client Pipeline</span>
            <span className="text-xl font-bold text-signal-cyan">
              {formatMoney(money(proposals.data?.reduce((s, p) => s + p.totalAmount.amountCents, 0) ?? 0))}
            </span>
          </div>
          <div>
            <span className="text-xs text-ink-400 font-medium block">Protected Agency Margin (35%)</span>
            <span className="text-xl font-bold text-signal-green">
              {formatMoney(money(Math.round((proposals.data?.reduce((s, p) => s + p.totalAmount.amountCents, 0) ?? 0) * 0.35)))}
            </span>
          </div>
        </div>
      </PermissionGate>

      <div className="panel p-5">
        <DataTable
          data={proposals.data ?? []}
          columns={columns}
          onRowClick={(p) => setPreviewClientProposal(p)}
          loading={proposals.loading}
        />
      </div>

      {isBuilderOpen && (
        <ProposalBuilderModal 
          onClose={() => setIsBuilderOpen(false)} 
          onCreated={proposals.reload} 
        />
      )}

      {/* 100% Confidential Client Presentation & PDF View Modal */}
      {previewClientProposal && (
        <ClientProposalPDFModal 
          proposal={previewClientProposal} 
          onClose={() => setPreviewClientProposal(null)} 
        />
      )}
    </div>
  );
};

/* Client Presentation & PDF View Component (All-Inclusive Pricing Only) */
const ClientProposalPDFModal: React.FC<{ proposal: Proposal; onClose: () => void }> = ({ proposal, onClose }) => {
  const baseCents = proposal.totalAmount.amountCents;
  const gstCents = Math.round(baseCents * 0.16); // 16% Provincial Services Tax
  const grandTotalCents = baseCents + gstCents;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-surface-card border border-surface-border rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        
        {/* Modal Top Actions */}
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
              <FiPrinter size={14} />
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

        {/* Client Proposal Document Body (Printable) */}
        <div className="p-8 space-y-8 bg-surface-bg text-ink-100 print:bg-white print:text-black">
          
          {/* Header & Branding */}
          <div className="flex justify-between items-start border-b border-surface-border pb-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-ink-50">VANTAGE OUTDOOR MEDIA</h1>
              <p className="text-xs text-ink-400 mt-1">Premium Digital Out-of-Home (DOOH) Advertising Proposal</p>
            </div>
            <div className="text-right">
              <span className="px-3 py-1 text-xs font-bold bg-signal-cyan/10 text-signal-cyan rounded border border-signal-cyan/20">
                OFFERCIAL QUOTATION
              </span>
              <div className="text-xs text-ink-400 mt-2">Ref: <span className="font-mono text-ink-200">{proposal.code}</span></div>
              <div className="text-xs text-ink-400">Date: {new Date().toLocaleDateString()}</div>
            </div>
          </div>

          {/* Client Info */}
          <div className="bg-surface-card/60 p-4 rounded-xl border border-surface-border flex justify-between items-center">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-ink-500 font-semibold block">Prepared For</span>
              <div className="text-base font-bold text-ink-50">{proposal.clientName}</div>
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider text-ink-500 font-semibold block">Campaign Title</span>
              <div className="text-base font-bold text-signal-cyan">{proposal.title}</div>
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
                  <FiTv size={14} className="text-signal-cyan" />
                  <span>Main Boulevard LED Display — Site A</span>
                </div>
                <p className="text-xs text-ink-400">High-visibility digital billboard · 15-second loop slot · 18 Hours/day</p>
              </div>
              <div className="p-3 bg-surface-card rounded-lg border border-surface-border">
                <div className="flex items-center gap-2 text-xs font-semibold text-ink-200 mb-1">
                  <FiTv size={14} className="text-signal-cyan" />
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

          {/* 3. Single All-Inclusive Financial Investment (Zero Internal Margins) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-surface-border pb-2">
              <FiCheckCircle className="text-signal-green" size={18} />
              <h3 className="font-semibold text-ink-50 text-base">3. All-Inclusive Campaign Investment</h3>
            </div>
            
            <div className="p-5 bg-surface-card rounded-xl border border-surface-border space-y-3">
              <div className="flex justify-between text-sm text-ink-300">
                <span>DOOH Network & Media Package (30 Days)</span>
                <span className="font-semibold text-ink-100">{formatMoney(proposal.totalAmount)}</span>
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
