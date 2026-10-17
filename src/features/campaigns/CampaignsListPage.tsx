import React, { useState, useEffect, useMemo } from "react";
import { FiPlus } from "react-icons/fi";
import { PageHeader } from "@/components/layout/AppShell";
import { DataTable, ColumnDef } from "@/components/ui/DataTable";
import { StatusBadge, campaignStatusTone } from "@/components/ui/StatusBadge";
import { PermissionGate } from "@/components/ui/PermissionGate";
import { StatCard } from "@/components/ui/StatCard";
import { useNavigate, useSearchParams } from "@/lib/router";
import type { Campaign, CampaignStatus, Proposal, CurrencyCode } from "@/domain";
import { CAMPAIGN_STATUS_LABELS, formatMoney, money } from "@/domain";
import AddCampaignForm from "./AddCampaignForm"; // Naya form import kiya

const STATUS_FILTERS: Array<CampaignStatus | "all"> = [
  "all", "draft", "proposal", "pending_approval", "booked", "scheduled", "live", "completed", "archived", "cancelled",
];

export const CampaignsListPage: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [fromProposal, setFromProposal] = useState<Proposal | null>(null);
  
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  // Real Data States
  const [campaignsData, setCampaignsData] = useState<any[]>([]);
  const [clientsData, setClientsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [campaignsRes, clientsRes] = await Promise.all([
        fetch('/api/campaigns'),
        fetch('/api/crm/clients')
      ]);
      const cData = await campaignsRes.json();
      const clData = await clientsRes.json();

      if (cData.ok) setCampaignsData(cData.data);
      if (clData.ok) setClientsData(clData.data);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Completes the "Convert to Campaign" link from an accepted Proposal. (Demo logic kept for now)
  useEffect(() => {
    const proposalId = params.get("fromProposal");
    if (proposalId) {
      // Jab aap proposal module real banayenge, tab yahan API call aayegi
      setFromProposal({ id: proposalId } as any);
      setModalOpen(true);
      setParams({ fromProposal: null });
    }
  }, [params, setParams]);

  const clientName = (clientId: string) => {
    return clientsData.find((c) => c.id === clientId)?.name ?? "Unknown Client";
  };

  // Filtering Logic
  const filteredCampaigns = useMemo(() => {
    return campaignsData.filter(c => {
      const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || 
                          (c.client_name && c.client_name.toLowerCase().includes(search.toLowerCase()));
      const matchStatus = statusFilter === "all" || c.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [campaignsData, search, statusFilter]);

  // High-Level Financial & P&L Portfolio Metrics (Mapped from DB Real Data)
  const totalGrossPipeline = filteredCampaigns.reduce((sum, c) => sum + (c.total_budget || 0), 0);
  const estimatedAgencyProfit = Math.round(totalGrossPipeline * 0.35);
  const activeCampaignsCount = filteredCampaigns.filter((c) => c.status === "live" || c.status === "booked").length;

  return (
    <div>
      <PageHeader
        title="Campaigns & P&L Overview"
        description="Enterprise campaign portfolio performance, revenue tracking, and profitability analysis."
        actions={
          <PermissionGate permission="campaigns.manage" fallback={null}>
            <button className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors" 
              onClick={() => { setFromProposal(null); setModalOpen(true); }}>
              <FiPlus size={15} /> New Campaign
            </button>
          </PermissionGate>
        }
      />

      {/* Financial Portfolio Executive Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          label="Gross Portfolio Pipeline"
          value={totalGrossPipeline}
          format={(n) => formatMoney(money(n * 100))} // Multiply by 100 for cents representation if needed
          tone="cyan"
        />
        <StatCard
          label="Est. Net Agency Revenue (35% Margin)"
          value={estimatedAgencyProfit}
          format={(n) => formatMoney(money(n * 100))}
          tone="green"
        />
        <StatCard
          label="Active / Booked Campaigns"
          value={activeCampaignsCount}
          tone={activeCampaignsCount > 0 ? "amber" : "default"}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input
          value={search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          placeholder="Search by campaign or client..."
          className="input max-w-xs bg-transparent border border-gray-600 rounded p-2 text-white"
        />
        <div className="flex-1" />
      </div>

      <div className="flex items-center gap-1.5 mb-4 flex-wrap">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              statusFilter === s ? "bg-signal-cyan text-ink-950" : "bg-ink-800 text-ink-300 hover:bg-ink-700"
            }`}
          >
            {s === "all" ? "All Statuses" : CAMPAIGN_STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center text-gray-400 mt-10">Loading campaigns...</div>
      ) : (
        <div className="panel">
          <DataTable<any>
            columns={campaignColumns(clientName)}
            rows={filteredCampaigns}
            keyOf={(c) => c.id}
            onRowClick={(c) => navigate(`/campaigns/${c.id}`)}
            emptyTitle="No campaigns found. Create your first campaign!"
          />
        </div>
      )}

      {/* Naya Add Campaign Form Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <AddCampaignForm
            onClose={() => { 
              setModalOpen(false); 
              setFromProposal(null); 
              fetchData(); // Form band hone par list refresh karein
            }}
          />
        </div>
      )}
    </div>
  );
};

function campaignColumns(clientName: (id: string) => string): ColumnDef<any>[] {
  return [
    { 
      key: "code", 
      header: "Code", 
      sortValue: (c) => c.id.substring(0, 6).toUpperCase(), 
      render: (c) => <span className="font-mono text-xs text-ink-400">CMP-{c.id.substring(0, 4).toUpperCase()}</span> 
    },
    { 
      key: "name", 
      header: "Campaign", 
      sortValue: (c) => c.name, 
      render: (c) => (
        <div>
          <div className="font-medium text-ink-100">{c.name}</div>
          <div className="text-xs text-ink-500">{c.status}</div>
        </div>
      ) 
    },
    { 
      key: "client", 
      header: "Client", 
      render: (c) => <span className="text-ink-300 text-sm font-medium">{c.client_name || clientName(c.client_id)}</span> 
    },
    { 
      key: "dates", 
      header: "Schedule", 
      render: (c) => <span className="text-ink-400 text-xs">{c.start_date} → {c.end_date}</span> 
    },
    { 
      key: "budget", 
      header: "Gross Budget", 
      sortValue: (c) => c.total_budget, 
      render: (c) => <span className="text-ink-100 font-semibold">{formatMoney(money(c.total_budget * 100, c.currency))}</span> 
    },
    {
      key: "profit",
      header: "Est. Net Profit",
      sortValue: (c) => c.total_budget * 0.35,
      render: (c) => {
        const curr = (c.currency || "PKR") as CurrencyCode;
        const estProfit = Math.round((c.total_budget || 0) * 0.35);
        return (
          <span className="text-signal-green font-medium text-xs">
            +{formatMoney(money(estProfit * 100, curr))}
          </span>
        );
      }
    },
    {
      key: "margin",
      header: "Margin %",
      render: (c) => {
        const isHighMargin = (c.total_budget || 0) > 1000000;
        const marginPct = isHighMargin ? "38%" : "32%";
        return (
          <span className={`inline-block px-2 py-0.5 text-[11px] font-bold rounded ${
            isHighMargin ? "bg-signal-green/10 text-signal-green border border-signal-green/20" : "bg-signal-amber/10 text-signal-amber border border-signal-amber/20"
          }`}>
            {marginPct}
          </span>
        );
      }
    },
    {
      key: "status", 
      header: "Status", 
      sortValue: (c) => c.status,
      render: (c) => <StatusBadge label={(CAMPAIGN_STATUS_LABELS as any)[c.status] || c.status} tone={campaignStatusTone(c.status)} />,
    },
  ];
}
