import React, { useState, useEffect } from "react";
import { FiFilm, FiRadio, FiAlertTriangle, FiTrendingUp, FiDollarSign, FiUsers, FiTarget } from "react-icons/fi";
import { PageHeader } from "@/components/layout/AppShell";
import { StatusBadge, campaignStatusTone } from "@/components/ui/StatusBadge";
import { LineChart } from "@/components/charts/LineChart";
import { DonutChart } from "@/components/charts/DonutChart";
import { useSession } from "@/hooks/useSession";
import { Link } from "@/lib/router";
import { CAMPAIGN_STATUS_LABELS, formatMoney, money } from "@/domain";

export const DashboardPage: React.FC = () => {
  const { company } = useSession();
  
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<any>({});
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [screens, setScreens] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const [mRes, cRes, iRes, lRes] = await Promise.all([
          fetch('/api/finance/metrics'),
          fetch('/api/campaigns'),
          fetch('/api/inventory'),
          fetch('/api/crm/leads')
        ]);
        
        const mData = await mRes.json();
        const cData = await cRes.json();
        const iData = await iRes.json();
        const lData = await lRes.json();

        if (mData.ok) setMetrics(mData.metrics || {});
        if (cData.ok) setCampaigns(cData.data || []);
        if (iData.ok) setScreens(iData.data || []);
        if (lData.ok) setLeads(lData.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  // --- Calculations ---
  const liveCampaigns = campaigns.filter((c) => c.status === "live");
  const onlineScreens = screens.filter((s) => s.status === "online").length;
  const totalScreens = screens.length || 1;
  const uptimePct = Math.round((onlineScreens / totalScreens) * 100);
  
  const revenue = metrics.total_revenue || 0;
  const spend = metrics.total_expenses || 0;
  const profit = metrics.net_profit || 0;
  const pending = metrics.total_pending || 0;
  
  // ROAS Calculation (Revenue / Spend)
  const roas = spend > 0 ? (revenue / spend).toFixed(1) : "0.0";
  // AI Score (Mock calculation based on uptime and profit)
  const aiScore = Math.min(99, Math.round((uptimePct * 0.5) + (profit > 0 ? 45 : 20)));

  const pipelineValue = leads.filter((l) => !["won", "lost"].includes(l.stage)).reduce((s, l) => s + (l.estimated_value || 0), 0);

  const deliveryTrend = [92, 94, 89, 96, 91, 95, 97];
  const deliveryLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Today"];

  const statusBreakdown = Object.entries(
    campaigns.reduce<Record<string, number>>((acc, c) => {
      acc[c.status] = (acc[c.status] ?? 0) + 1;
      return acc;
    }, {})
  ).map(([status, count]) => ({
    label: (CAMPAIGN_STATUS_LABELS as any)[status] || status,
    value: count,
    color: statusColor(status),
  }));

  return (
    <div className="relative min-h-screen">
      
      {/* Subtle Grid Background */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.02]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

      <div className="relative z-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Commander's Dashboard</h1>
            <p className="text-xs text-slate-400 mt-1">Live executive overview for {company?.name || "your workspace"}.</p>
          </div>
        </div>

        {/* 6 KPI Cards (Fintech Style) */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
          {/* AI Score */}
          <div className="bg-[#151E32] border border-slate-700/50 rounded-xl p-4 relative overflow-hidden group hover:border-amber-500/50 transition-colors">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-amber-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">AI Commander Score</p>
            <div className="flex items-end gap-2">
              <h3 className="text-2xl font-bold text-amber-400">{aiScore}</h3>
              <span className="text-[10px] text-slate-500 mb-1">/100</span>
            </div>
          </div>

          {/* Active Campaigns */}
          <div className="bg-[#151E32] border border-slate-700/50 rounded-xl p-4 relative overflow-hidden group hover:border-emerald-500/50 transition-colors">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Active Campaigns</p>
            <h3 className="text-2xl font-bold text-white">{liveCampaigns.length}</h3>
          </div>

          {/* Today's Spend */}
          <div className="bg-[#151E32] border border-slate-700/50 rounded-xl p-4 relative overflow-hidden group hover:border-rose-500/50 transition-colors">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-rose-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Total Expenses</p>
            <h3 className="text-2xl font-bold text-white">{formatMoney(money(spend * 100))}</h3>
          </div>

          {/* ROAS */}
          <div className="bg-[#151E32] border border-slate-700/50 rounded-xl p-4 relative overflow-hidden group hover:border-cyan-500/50 transition-colors">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Overall ROAS</p>
            <h3 className="text-2xl font-bold text-cyan-400">{roas}x</h3>
          </div>

          {/* Total Leads / Conversions */}
          <div className="bg-[#151E32] border border-slate-700/50 rounded-xl p-4 relative overflow-hidden group hover:border-purple-500/50 transition-colors">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-purple-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Total Pipeline</p>
            <h3 className="text-2xl font-bold text-white">{formatMoney(money(pipelineValue * 100))}</h3>
          </div>

          {/* Account Balance */}
          <div className="bg-[#151E32] border border-slate-700/50 rounded-xl p-4 relative overflow-hidden group hover:border-emerald-500/50 transition-colors">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Revenue Collected</p>
            <h3 className="text-2xl font-bold text-emerald-400">{formatMoney(money(revenue * 100))}</h3>
          </div>
        </div>

        {/* Charts Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          
          {/* Main Line Chart */}
          <div className="bg-[#151E32] border border-slate-700/50 rounded-xl p-5 lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-semibold text-white text-sm">Multi-Campaign Performance Trend</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Scheduled vs. delivered plays (Last 7 Days)</p>
              </div>
              <span className="px-2 py-1 text-[10px] font-bold bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20">
                {uptimePct}% Uptime
              </span>
            </div>
            <div className="h-64">
              <LineChart
                labels={deliveryLabels}
                series={[{ name: "Delivery %", color: "#34d399", values: deliveryTrend }]}
                formatValue={(n) => `${n}%`}
              />
            </div>
          </div>

          {/* Donut Chart / Budget Split */}
          <div className="bg-[#151E32] border border-slate-700/50 rounded-xl p-5 flex flex-col items-center justify-center relative">
            <h3 className="font-semibold text-white text-sm self-start mb-2">Campaign Mix</h3>
            {statusBreakdown.length > 0 ? (
              <DonutChart data={statusBreakdown} centerLabel="Total" centerValue={String(campaigns.length)} size={160} />
            ) : (
              <p className="text-xs text-slate-500">No data available</p>
            )}
          </div>
        </div>

        {/* Bottom Tables & Feeds */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          
          {/* Active Campaigns Table */}
          <div className="bg-[#151E32] border border-slate-700/50 rounded-xl p-5 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white text-sm">Top Performing Campaigns</h3>
              <Link to="/campaigns" className="text-[11px] text-emerald-400 font-semibold hover:underline">
                View all →
              </Link>
            </div>
            <div className="space-y-1">
              {campaigns.slice(0, 5).map((c) => (
                <Link
                  key={c.id}
                  to={`/campaigns/${c.id}`}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-white/5 -mx-3 transition-colors"
                >
                  <div className="min-w-0 pr-2">
                    <div className="text-xs font-medium text-white truncate">{c.name}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{c.client_name}</div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-semibold text-slate-300">
                      {formatMoney(money(c.total_budget * 100))}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${c.status === 'live' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-700/50 text-slate-300'}`}>
                      {c.status}
                    </span>
                  </div>
                </Link>
              ))}
              {campaigns.length === 0 && (
                <p className="text-xs text-slate-500 py-4">No campaigns found.</p>
              )}
            </div>
          </div>

          {/* AI Feed / Alerts */}
          <div className="bg-[#151E32] border border-slate-700/50 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white text-sm">AI Optimization Feed</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 text-amber-400"><FiAlertTriangle size={14} /></div>
                <div>
                  <p className="text-xs text-slate-200 leading-tight">Budget Adjustment: Campaign Alpha (+5%)</p>
                  <p className="text-[10px] text-slate-500 mt-1">ROAS increased to 4.1x over last 3 days.</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 text-emerald-400"><FiTrendingUp size={14} /></div>
                <div>
                  <p className="text-xs text-slate-200 leading-tight">New Ad Set Released</p>
                  <p className="text-[10px] text-slate-500 mt-1">TikTok Ad Set Beta (v1.4) is now active.</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 text-cyan-400"><FiTarget size={14} /></div>
                <div>
                  <p className="text-xs text-slate-200 leading-tight">Audience Overlap Detected</p>
                  <p className="text-[10px] text-slate-500 mt-1">Google and Meta audiences have 15% overlap.</p>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Outstanding Receivables Panel */}
        <div className="mt-4 bg-[#151E32] border border-amber-500/20 rounded-xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2">
              <FiDollarSign size={16} className="text-amber-400" />
              <h3 className="font-semibold text-white text-sm">Outstanding Receivables (AR)</h3>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/10 text-amber-400 rounded border border-amber-500/20">
              Pending Collection
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mb-3">Across all sent, partially paid, and overdue invoices.</p>
          <div className="text-2xl font-bold text-amber-400 tracking-tight">
            {formatMoney(money(pending * 100))}
          </div>
          <Link to="/finance" className="text-[11px] text-emerald-400 font-semibold hover:underline mt-3 inline-block">
            Manage Accounts Receivable →
          </Link>
        </div>

      </div>
    </div>
  );
};

function statusColor(status: string): string {
  const map: Record<string, string> = {
    live: "#34d399", scheduled: "#22d3ee", booked: "#3b82f6", pending_approval: "#fbbf24",
    proposal: "#8b5cf6", draft: "#5c6b82", completed: "#3b82f6", archived: "#374357", cancelled: "#f87171",
  };
  return map[status] ?? "#5c6b82";
}
