import React, { useState, useEffect } from "react";
import { FiAlertTriangle, FiTrendingUp, FiTarget, FiDollarSign } from "react-icons/fi";
import { LineChart } from "@/components/charts/LineChart";
import { DonutChart } from "@/components/charts/DonutChart";
import { useSession } from "@/hooks/useSession";
import { Link } from "@/lib/router";
import { formatMoney, money } from "@/domain";

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

  // --- Metric Calculations ---
  const liveCampaigns = campaigns.filter((c) => c.status === "live");
  const onlineScreens = screens.filter((s) => s.status === "online").length;
  const totalScreens = screens.length || 1;
  const uptimePct = Math.round((onlineScreens / totalScreens) * 100);
  
  const revenue = metrics.total_revenue || 0;
  const spend = metrics.total_expenses || 0;
  const profit = metrics.net_profit || 0;
  
  const roas = spend > 0 ? (revenue / spend).toFixed(1) : "0.0";
  const aiScore = Math.min(99, Math.round((uptimePct * 0.4) + (profit > 0 ? 55 : 30)));
  
  const deliveryLabels = ["Oct 01", "Oct 07", "Oct 09", "Oct 11", "Oct 15", "Oct 23", "Oct 31"];

  return (
    <div className="relative min-h-screen bg-[#0B1120] text-slate-200 p-2 md:p-4 rounded-xl font-sans">
      
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
             Ad Pilot <span className="text-slate-500 font-normal">::</span> Commander's Dashboard
          </h1>
          <p className="text-[11px] text-slate-400 mt-1">Live executive overview for {company?.name || "your workspace"}.</p>
        </div>
      </div>

      {/* 6 KPI Cards (Exact Match with Reference) */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-4">
        
        {/* 1. AI Commander Score (Gauge) */}
        <div className="bg-[#111827] border border-slate-700/50 rounded-xl p-3 flex flex-col justify-between shadow-lg relative overflow-hidden">
          <p className="text-[10px] text-slate-300 font-bold uppercase tracking-wider mb-2">AI Commander Score</p>
          <div className="relative w-full h-14 flex items-end justify-center overflow-hidden">
            <div className="absolute top-1 w-[72px] h-[72px] rounded-full border-[6px] border-slate-700/50 border-b-transparent border-l-transparent rotate-45"></div>
            <div className="absolute top-1 w-[72px] h-[72px] rounded-full border-[6px] border-amber-400 border-b-transparent border-l-transparent rotate-45" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 50%, 0 50%)' }}></div>
            <div className="text-center z-10 pb-1">
              <span className="text-xl font-bold text-white leading-none">{aiScore}</span>
              <span className="text-[9px] text-slate-400 block mt-0.5">/100</span>
            </div>
          </div>
        </div>

        {/* 2. Active Campaigns */}
        <div className="bg-[#111827] border border-slate-700/50 rounded-xl p-3 flex flex-col justify-between shadow-lg">
          <p className="text-[10px] text-slate-300 font-bold uppercase tracking-wider mb-1">Active Campaigns</p>
          <h3 className="text-3xl font-bold text-white">{liveCampaigns.length}</h3>
        </div>

        {/* 3. Today's Spend (GOLD GRADIENT) */}
        <div className="bg-gradient-to-br from-[#FCD34D] to-[#B45309] border border-amber-300/30 rounded-xl p-3 flex flex-col justify-between shadow-[0_0_15px_rgba(245,158,11,0.2)] relative overflow-hidden">
          <div className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity"></div>
          <p className="text-[10px] text-amber-900 font-extrabold uppercase tracking-wider mb-1">Today's Spend</p>
          <h3 className="text-2xl font-black text-black drop-shadow-sm">{formatMoney(money(spend * 100))}</h3>
        </div>

        {/* 4. Overall ROAS (GOLD GRADIENT) */}
        <div className="bg-gradient-to-br from-[#FCD34D] to-[#B45309] border border-amber-300/30 rounded-xl p-3 flex flex-col justify-between shadow-[0_0_15px_rgba(245,158,11,0.2)] relative overflow-hidden">
          <div className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity"></div>
          <p className="text-[10px] text-amber-900 font-extrabold uppercase tracking-wider mb-1">Overall ROAS</p>
          <h3 className="text-2xl font-black text-black drop-shadow-sm">{roas}x</h3>
        </div>

        {/* 5. Total Conversions (SILVER GRADIENT) */}
        <div className="bg-gradient-to-br from-[#F1F5F9] to-[#94A3B8] border border-slate-300/30 rounded-xl p-3 flex flex-col justify-between shadow-[0_0_15px_rgba(148,163,184,0.2)] relative overflow-hidden">
          <div className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity"></div>
          <p className="text-[10px] text-slate-800 font-extrabold uppercase tracking-wider mb-1">Total Conversions</p>
          <h3 className="text-2xl font-black text-black drop-shadow-sm">{leads.length}</h3>
        </div>

        {/* 6. Total Account Balance */}
        <div className="bg-[#111827] border border-slate-700/50 rounded-xl p-3 flex flex-col justify-between shadow-lg">
          <p className="text-[10px] text-slate-300 font-bold uppercase tracking-wider mb-1">Total Account Balance</p>
          <h3 className="text-2xl font-bold text-white">{formatMoney(money(revenue * 100))}</h3>
        </div>

      </div>

      {/* Middle Row: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        
        {/* Main Line Chart */}
        <div className="bg-[#111827] border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white text-xs">Multi-Campaign Performance Trend (Daily)</h3>
            <div className="flex gap-3 text-[10px] text-slate-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-400"></span> Clicks</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400"></span> Conversions</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400"></span> CPA</span>
            </div>
          </div>
          <div className="h-56">
            <LineChart
              labels={deliveryLabels}
              series={[
                { name: "Clicks", color: "#22d3ee", values: [200, 400, 350, 500, 300, 450, 550] },
                { name: "Conversions", color: "#34d399", values: [100, 200, 250, 400, 200, 350, 450] }
              ]}
              formatValue={(n) => `${n}`}
            />
          </div>
        </div>

        {/* Budget-to-ROAS Flow (Custom CSS Representation) */}
        <div className="bg-[#111827] border border-slate-700/50 rounded-xl p-4">
          <h3 className="font-semibold text-white text-xs mb-4">Budget-to-ROAS Flow</h3>
          <div className="flex items-center justify-between h-56 px-4">
             <div className="flex flex-col justify-around h-full w-1/4 space-y-4">
                <div className="bg-slate-800 border border-slate-600 p-2 rounded text-[10px] text-center text-white">Budget</div>
                <div className="bg-slate-800 border border-slate-600 p-2 rounded text-[10px] text-center text-white">Budget</div>
                <div className="bg-slate-800 border border-slate-600 p-2 rounded text-[10px] text-center text-white">TikTok</div>
             </div>
             
             <div className="flex-1 flex flex-col justify-center gap-1 relative">
                <div className="h-4 bg-gradient-to-r from-amber-400/50 to-purple-500/50 rounded-full w-full"></div>
                <div className="h-4 bg-gradient-to-r from-emerald-400/50 to-cyan-500/50 rounded-full w-3/4"></div>
                <div className="h-4 bg-gradient-to-r from-slate-500/50 to-blue-500/50 rounded-full w-5/6"></div>
             </div>

             <div className="flex flex-col justify-around h-full w-1/4 space-y-4">
                <div className="bg-emerald-600 p-2 rounded text-[10px] text-center text-white">ROAS</div>
                <div className="bg-amber-600 p-2 rounded text-[10px] text-center text-white">ROAS</div>
                <div className="bg-slate-700 p-2 rounded text-[10px] text-center text-white">ROAS</div>
             </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Tables & Feeds */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Top Performing Ad Sets */}
        <div className="bg-[#111827] border border-slate-700/50 rounded-xl p-4 lg:col-span-1">
          <h3 className="font-semibold text-white text-xs mb-3">Top Performing Ad Sets</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px]">
              <thead className="text-slate-500 border-b border-slate-700/50">
                <tr>
                  <th className="pb-2 font-medium">Campaign Name</th>
                  <th className="pb-2 font-medium text-center">Platform</th>
                  <th className="pb-2 font-medium text-right">ROAS</th>
                  <th className="pb-2 font-medium text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {campaigns.slice(0, 4).map((c, idx) => (
                  <tr key={idx} className="hover:bg-white/5">
                    <td className="py-2 text-slate-200 truncate max-w-[100px]">{c.name}</td>
                    <td className="py-2 text-center text-cyan-400">{idx % 2 === 0 ? 'Meta' : 'Google'}</td>
                    <td className="py-2 text-right text-emerald-400 font-bold">{(roas as any) * (1 - idx*0.1)}x</td>
                    <td className="py-2 text-center text-emerald-400">
                      <span className="flex items-center justify-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Paid
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* AI Optimization Feed */}
        <div className="bg-[#111827] border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-white text-xs">AI Optimization Feed</h3>
            <span className="text-slate-500">...</span>
          </div>
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <div className="mt-0.5 text-amber-400"><FiAlertTriangle size={12} /></div>
              <div>
                <p className="text-[11px] text-slate-200 leading-tight">Budget Adjusted: Campaign Alpha (+5%)</p>
                <p className="text-[9px] text-slate-500 mt-0.5">Real Ad Time Campaign Alpha</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="mt-0.5 text-emerald-400"><FiTrendingUp size={12} /></div>
              <div>
                <p className="text-[11px] text-slate-200 leading-tight">ROAS Alert: Campaign Beta (4.1x)</p>
                <p className="text-[9px] text-slate-500 mt-0.5">New Ad Time Campaign Beta</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="mt-0.5 text-cyan-400"><FiTarget size={12} /></div>
              <div>
                <p className="text-[11px] text-slate-200 leading-tight">AI Trigger: New Ad Set Released</p>
                <p className="text-[9px] text-slate-500 mt-0.5">Real Ad Time Campaign</p>
              </div>
            </div>
          </div>
        </div>

        {/* Multi-Platform Budget Usage */}
        <div className="bg-[#111827] border border-slate-700/50 rounded-xl p-4 flex flex-col">
          <h3 className="font-semibold text-white text-xs mb-3">Multi-platform budget usage</h3>
          <div className="flex-1 flex items-center justify-around">
            <div className="flex flex-col items-center">
              <DonutChart data={[{label: 'Used', value: 30, color: '#FCD34D'}, {label: 'Left', value: 70, color: '#1F2937'}]} centerLabel="30%" centerValue="" size={60} />
              <span className="text-[10px] text-slate-400 mt-2">Google</span>
            </div>
            <div className="flex flex-col items-center">
              <DonutChart data={[{label: 'Used', value: 65, color: '#34D399'}, {label: 'Left', value: 35, color: '#1F2937'}]} centerLabel="65%" centerValue="" size={60} />
              <span className="text-[10px] text-slate-400 mt-2">Meta</span>
            </div>
            <div className="flex flex-col items-center">
              <DonutChart data={[{label: 'Used', value: 5, color: '#22d3ee'}, {label: 'Left', value: 95, color: '#1F2937'}]} centerLabel="5%" centerValue="" size={60} />
              <span className="text-[10px] text-slate-400 mt-2">TikTok</span>
            </div>
          </div>
          <button className="w-full mt-4 bg-transparent border border-slate-600 hover:bg-slate-800 text-slate-300 text-xs font-semibold py-2 rounded-lg transition-colors">
            LAUNCH NEW INITIATIVE
          </button>
        </div>

      </div>

    </div>
  );
};

export default DashboardPage;
