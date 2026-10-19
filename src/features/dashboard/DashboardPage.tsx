import React, { useState, useEffect } from "react";
import { FiAlertTriangle, FiTrendingUp, FiTarget } from "react-icons/fi";
import { useSession } from "@/hooks/useSession";
import { formatMoney, money } from "@/domain";

export const DashboardPage: React.FC = () => {
  const { company } = useSession();
  
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<any>({});
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const [mRes, cRes, lRes] = await Promise.all([
          fetch('/api/finance/metrics'),
          fetch('/api/campaigns'),
          fetch('/api/crm/leads')
        ]);
        
        const mData = await mRes.json();
        const cData = await cRes.json();
        const lData = await lRes.json();

        if (mData.ok) setMetrics(mData.metrics || {});
        if (cData.ok) setCampaigns(cData.data || []);
        if (lData.ok) setLeads(lData.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  // Calculations
  const liveCampaigns = campaigns.filter((c) => c.status === "live");
  const revenue = metrics.total_revenue || 0;
  const spend = metrics.total_expenses || 0;
  const roas = spend > 0 ? (revenue / spend).toFixed(1) : "0.0";
  const aiScore = 98; // Fixed as per picture for design parity

  return (
    <div className="min-h-screen bg-[#09090B] text-slate-200 font-sans p-2 md:p-4 rounded-xl flex flex-col relative overflow-hidden">
      
      {/* Background Radial Glow */}
      <div className="absolute top-0 left-1/4 w-[800px] h-[600px] bg-amber-500/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-[1600px] mx-auto">
        
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
             Ad Pilot <span className="text-zinc-600 font-normal">::</span> Commander's Dashboard
          </h1>
        </div>

        {/* 6 KPI Cards - EXACT MATCH */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-5">
          
          {/* 1. AI Commander Score */}
          <div className="bg-[#121215] border border-zinc-800 rounded-xl p-4 flex flex-col justify-between shadow-lg relative overflow-hidden">
            <p className="text-[11px] text-zinc-400 font-semibold mb-2">AI Commander Score</p>
            <div className="relative w-full h-16 flex items-end justify-center">
              {/* SVG Gauge */}
              <svg viewBox="0 0 100 50" className="absolute top-0 w-full h-full overflow-visible">
                <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#27272a" strokeWidth="8" strokeLinecap="round" />
                <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#EAB308" strokeWidth="8" strokeLinecap="round" strokeDasharray="125" strokeDashoffset="10" />
              </svg>
              <div className="text-center z-10 pb-1">
                <span className="text-2xl font-bold text-white leading-none">{aiScore}</span>
                <span className="text-[10px] text-zinc-500 block">/100</span>
              </div>
            </div>
          </div>

          {/* 2. Active Campaigns */}
          <div className="bg-[#121215] border border-zinc-800 rounded-xl p-4 flex flex-col justify-between shadow-lg">
            <p className="text-[11px] text-zinc-400 font-semibold mb-1">Active Campaigns</p>
            <h3 className="text-3xl font-bold text-white">{liveCampaigns.length}</h3>
          </div>

          {/* 3. Today's Spend (GOLD) */}
          <div className="bg-gradient-to-br from-[#F9D976] via-[#E6C27A] to-[#B8860B] border border-[#FDE68A] rounded-xl p-4 flex flex-col justify-between shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_4px_10px_rgba(0,0,0,0.5)] relative overflow-hidden">
            <p className="text-[11px] text-black/70 font-bold mb-1">Today's Spend</p>
            <h3 className="text-2xl font-black text-black">{formatMoney(money(spend * 100))}</h3>
          </div>

          {/* 4. Overall ROAS (GOLD) */}
          <div className="bg-gradient-to-br from-[#F9D976] via-[#E6C27A] to-[#B8860B] border border-[#FDE68A] rounded-xl p-4 flex flex-col justify-between shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_4px_10px_rgba(0,0,0,0.5)] relative overflow-hidden">
            <p className="text-[11px] text-black/70 font-bold mb-1">Overall ROAS</p>
            <h3 className="text-2xl font-black text-black">{roas}x</h3>
          </div>

          {/* 5. Total Conversions (SILVER) */}
          <div className="bg-gradient-to-br from-[#F4F4F5] via-[#D4D4D8] to-[#A1A1AA] border border-[#E4E4E7] rounded-xl p-4 flex flex-col justify-between shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_4px_10px_rgba(0,0,0,0.5)] relative overflow-hidden">
            <p className="text-[11px] text-black/60 font-bold mb-1">Total Lifetime Conversions</p>
            <h3 className="text-2xl font-black text-black">{leads.length}</h3>
          </div>

          {/* 6. Total Account Balance */}
          <div className="bg-[#121215] border border-zinc-800 rounded-xl p-4 flex flex-col justify-between shadow-lg">
            <p className="text-[11px] text-zinc-400 font-semibold mb-1">Total Account Balance</p>
            <h3 className="text-2xl font-bold text-white">{formatMoney(money(revenue * 100))}</h3>
          </div>

        </div>

        {/* Middle Row: Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          
          {/* 1. Multi-Campaign Performance Trend (Custom SVG Chart) */}
          <div className="bg-[#121215] border border-zinc-800 rounded-xl p-4 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white text-sm">Multi-Campaign Performance Trend (Daily)</h3>
              <div className="flex gap-3 text-[10px] text-zinc-400">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-400"></span> Clicks</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400"></span> Conversions</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400"></span> CPA</span>
              </div>
            </div>
            
            <div className="h-64 w-full">
              <svg viewBox="0 0 800 250" className="w-full h-full" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="gradCyan" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="gradGreen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
                  </linearGradient>
                </defs>
                
                {/* Horizontal Grid Lines */}
                <line x1="0" y1="50" x2="800" y2="50" stroke="#27272a" strokeWidth="1" strokeDasharray="4" />
                <line x1="0" y1="100" x2="800" y2="100" stroke="#27272a" strokeWidth="1" strokeDasharray="4" />
                <line x1="0" y1="150" x2="800" y2="150" stroke="#27272a" strokeWidth="1" strokeDasharray="4" />
                <line x1="0" y1="200" x2="800" y2="200" stroke="#27272a" strokeWidth="1" strokeDasharray="4" />

                {/* Area 1 (Cyan) */}
                <path d="M0,200 C50,180 100,120 150,150 C200,180 250,70 300,90 C350,110 400,50 450,80 C500,110 550,180 600,130 C650,80 700,100 800,40 L800,250 L0,250 Z" fill="url(#gradCyan)" />
                <path d="M0,200 C50,180 100,120 150,150 C200,180 250,70 300,90 C350,110 400,50 450,80 C500,110 550,180 600,130 C650,80 700,100 800,40" fill="none" stroke="#22d3ee" strokeWidth="3" />

                {/* Area 2 (Green) */}
                <path d="M0,230 C50,220 100,170 150,190 C200,210 250,130 300,150 C350,170 400,100 450,130 C500,160 550,210 600,160 C650,110 700,140 800,80 L800,250 L0,250 Z" fill="url(#gradGreen)" />
                <path d="M0,230 C50,220 100,170 150,190 C200,210 250,130 300,150 C350,170 400,100 450,130 C500,160 550,210 600,160 C650,110 700,140 800,80" fill="none" stroke="#34d399" strokeWidth="3" />
              </svg>
            </div>
            <div className="flex justify-between text-[10px] text-zinc-500 mt-2 px-1">
              <span>Oct 01</span><span>Oct 07</span><span>Oct 09</span><span>Oct 11</span><span>Oct 15</span><span>Oct 23</span><span>Oct 31</span>
            </div>
          </div>

          {/* 2. Budget-to-ROAS Flow (Custom SVG Sankey Diagram) */}
          <div className="bg-[#121215] border border-zinc-800 rounded-xl p-4 shadow-lg">
            <h3 className="font-semibold text-white text-sm mb-4">Budget-to-ROAS Flow</h3>
            <div className="flex items-center justify-between h-56 relative w-full">
              
              {/* Left Nodes */}
              <div className="flex flex-col justify-around h-full z-10 w-16">
                <div className="bg-[#121215] border border-zinc-700 text-zinc-300 text-[10px] font-bold px-2 py-1.5 rounded text-center shadow-md">Budget</div>
                <div className="bg-[#121215] border border-zinc-700 text-zinc-300 text-[10px] font-bold px-2 py-1.5 rounded text-center shadow-md">Budget</div>
                <div className="bg-[#121215] border border-zinc-700 text-zinc-300 text-[10px] font-bold px-2 py-1.5 rounded text-center shadow-md">TikTok</div>
              </div>
              
              {/* Center Flow Lines (Simulated with SVG) */}
              <div className="absolute inset-0 flex items-center justify-center px-16 pointer-events-none">
                 <svg viewBox="0 0 300 200" className="w-full h-full" preserveAspectRatio="none">
                    {/* Green flow */}
                    <path d="M0,30 C150,30 150,30 300,30" fill="none" stroke="#10b981" strokeWidth="15" opacity="0.6" />
                    <path d="M0,30 C150,30 150,100 300,100" fill="none" stroke="#10b981" strokeWidth="15" opacity="0.4" />
                    
                    {/* Purple flow */}
                    <path d="M0,100 C150,100 150,30 300,30" fill="none" stroke="#8b5cf6" strokeWidth="20" opacity="0.6" />
                    <path d="M0,100 C150,100 150,170 300,170" fill="none" stroke="#8b5cf6" strokeWidth="20" opacity="0.4" />

                    {/* Yellow flow */}
                    <path d="M0,170 C150,170 150,100 300,100" fill="none" stroke="#eab308" strokeWidth="12" opacity="0.6" />
                    <path d="M0,170 C150,170 150,170 300,170" fill="none" stroke="#eab308" strokeWidth="12" opacity="0.4" />
                 </svg>
              </div>

              {/* Right Nodes */}
              <div className="flex flex-col justify-around h-full z-10 w-16">
                <div className="bg-[#10b981] text-white text-[10px] font-bold px-2 py-1.5 rounded text-center shadow-lg shadow-emerald-500/20">ROAS</div>
                <div className="bg-[#eab308] text-white text-[10px] font-bold px-2 py-1.5 rounded text-center shadow-lg shadow-amber-500/20">ROAS</div>
                <div className="bg-[#27272a] border border-zinc-600 text-zinc-300 text-[10px] font-bold px-2 py-1.5 rounded text-center shadow-md">ROAS</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          
          {/* 1. Top Performing Ad Sets */}
          <div className="bg-[#121215] border border-zinc-800 rounded-xl p-4 shadow-lg lg:col-span-1">
            <h3 className="font-semibold text-white text-sm mb-3">Top Performing Ad Sets</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] whitespace-nowrap">
                <thead className="text-zinc-500 border-b border-zinc-800">
                  <tr>
                    <th className="pb-2 font-medium">Campaign Name</th>
                    <th className="pb-2 font-medium text-center">Platform</th>
                    <th className="pb-2 font-medium text-right">CTR</th>
                    <th className="pb-2 font-medium text-right">ROAS</th>
                    <th className="pb-2 font-medium text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  <tr className="hover:bg-white/5">
                    <td className="py-2.5 text-zinc-300">Campaign Alpha 1</td>
                    <td className="py-2.5 text-center text-blue-400 font-bold">G</td>
                    <td className="py-2.5 text-right text-zinc-400">10.28%</td>
                    <td className="py-2.5 text-right text-emerald-400 font-bold">18.39</td>
                    <td className="py-2.5 text-center"><span className="inline-flex items-center gap-1 text-emerald-400"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>Paid</span></td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="py-2.5 text-zinc-300">Campaign Beta 2</td>
                    <td className="py-2.5 text-center text-blue-500 font-bold">M</td>
                    <td className="py-2.5 text-right text-zinc-400">15.05%</td>
                    <td className="py-2.5 text-right text-emerald-400 font-bold">23.50</td>
                    <td className="py-2.5 text-center"><span className="inline-flex items-center gap-1 text-emerald-400"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>Paid</span></td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="py-2.5 text-zinc-300">Campaign Beta 3</td>
                    <td className="py-2.5 text-center text-blue-500 font-bold">M</td>
                    <td className="py-2.5 text-right text-zinc-400">10.55%</td>
                    <td className="py-2.5 text-right text-amber-400 font-bold">13.35</td>
                    <td className="py-2.5 text-center"><span className="inline-flex items-center gap-1 text-amber-400"><span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>Paid</span></td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="py-2.5 text-zinc-300">Campaign Beta 4</td>
                    <td className="py-2.5 text-center text-white font-bold bg-black rounded-sm w-4 h-4 mx-auto">T</td>
                    <td className="py-2.5 text-right text-zinc-400">65.98%</td>
                    <td className="py-2.5 text-right text-emerald-400 font-bold">25.55</td>
                    <td className="py-2.5 text-center"><span className="inline-flex items-center gap-1 text-emerald-400"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>Paid</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 2. AI Optimization Feed */}
          <div className="bg-[#121215] border border-zinc-800 rounded-xl p-4 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-white text-sm">AI Optimization Feed</h3>
              <span className="text-zinc-500">...</span>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-2">
                <div className="mt-0.5 text-emerald-400"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 block"></span></div>
                <div>
                  <p className="text-[11px] text-zinc-200 leading-tight">Budget Adjusted: Campaign Alpha (+5%)</p>
                  <p className="text-[9px] text-zinc-500 mt-0.5">Real Ad Time Campaign Alpha</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="mt-0.5 text-amber-400"><FiAlertTriangle size={10} /></div>
                <div>
                  <p className="text-[11px] text-zinc-200 leading-tight">ROAS Alert: Campaign Beta (4.1x)</p>
                  <p className="text-[9px] text-zinc-500 mt-0.5">New Ad Time Campaign Beta</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="mt-0.5 text-zinc-400"><span className="w-1.5 h-1.5 rounded-full bg-zinc-400 block"></span></div>
                <div>
                  <p className="text-[11px] text-zinc-200 leading-tight">AI Trigger: New Ad Set Released</p>
                  <p className="text-[9px] text-zinc-500 mt-0.5">Real Ad Time Campaign Beta</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="mt-0.5 text-emerald-400"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 block"></span></div>
                <div>
                  <p className="text-[11px] text-zinc-200 leading-tight">AI Trigger: New Ad Set Released</p>
                  <p className="text-[9px] text-zinc-500 mt-0.5">New Ad Time Campaign Released</p>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Multi-platform budget usage */}
          <div className="bg-[#121215] border border-zinc-800 rounded-xl p-4 shadow-lg flex flex-col">
            <h3 className="font-semibold text-white text-sm mb-4">Multi-platform budget usage</h3>
            <div className="flex-1 flex items-center justify-around">
              
              {/* Google Ring (Yellow) */}
              <div className="flex flex-col items-center">
                <div className="relative w-16 h-16">
                  <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#27272a" strokeWidth="4" />
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#eab308" strokeWidth="4" strokeDasharray="30, 100" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">30%</div>
                </div>
                <span className="text-[10px] text-zinc-400 mt-2">Google</span>
              </div>

              {/* Meta Ring (Green) */}
              <div className="flex flex-col items-center">
                <div className="relative w-16 h-16">
                  <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#27272a" strokeWidth="4" />
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#10b981" strokeWidth="4" strokeDasharray="65, 100" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">65%</div>
                </div>
                <span className="text-[10px] text-zinc-400 mt-2">Meta</span>
              </div>

              {/* TikTok Ring (Cyan) */}
              <div className="flex flex-col items-center">
                <div className="relative w-16 h-16">
                  <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#27272a" strokeWidth="4" />
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#22d3ee" strokeWidth="4" strokeDasharray="5, 100" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">5%</div>
                </div>
                <span className="text-[10px] text-zinc-400 mt-2">TikTok</span>
              </div>

            </div>
            <button className="w-full mt-5 bg-transparent border border-zinc-700 hover:bg-zinc-800 hover:border-zinc-500 text-zinc-300 text-[11px] font-bold py-2.5 rounded-lg transition-colors uppercase tracking-wider">
              Launch New Initiative
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};

export default DashboardPage;
