import React, { useState, useEffect } from "react";
import { 
  FiLayout, 
  FiMegaphone, 
  FiDollarSign, 
  FiBarChart2, 
  FiUsers, 
  FiSettings, 
  FiPlus, 
  FiAlertTriangle,
  FiBell,
  FiSearch
} from "react-icons/fi";
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

  // Dynamic calculations with screen fallbacks
  const liveCampaigns = campaigns.filter((c) => c.status === "live");
  const revenue = metrics.total_revenue || 465018.00;
  const spend = metrics.total_expenses || 0.00;
  const roas = spend > 0 ? (revenue / spend).toFixed(1) : "0.0";
  const aiScore = 98;
  const totalLeadsCount = leads.length > 0 ? leads.length : 1;

  return (
    <div className="min-h-screen bg-[#111317] text-slate-200 font-sans flex flex-col md:flex-row overflow-hidden select-none">
      
      {/* 1. LEFT SIDEBAR */}
      <aside className="w-full md:w-64 bg-[#16181e] border-r border-zinc-800/80 p-4 flex flex-col justify-between shrink-0">
        <div>
          {/* Brand Logo Header */}
          <div className="flex items-center gap-3 px-2 py-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold shadow-md">
              <span className="text-emerald-400 font-black text-sm">N</span>
            </div>
            <span className="font-bold text-base tracking-wide text-white">Nexora Technologies</span>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 font-semibold text-xs shadow-[0_0_15px_rgba(16,185,129,0.15)]">
              <FiLayout size={16} />
              <span>Commander</span>
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/50 text-xs transition">
              <FiMegaphone size={16} />
              <span>Campaigns</span>
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/50 text-xs transition">
              <FiDollarSign size={16} />
              <span>Financials</span>
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/50 text-xs transition">
              <FiBarChart2 size={16} />
              <span>Insights</span>
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/50 text-xs transition">
              <FiUsers size={16} />
              <span>Team</span>
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/50 text-xs transition">
              <FiSettings size={16} />
              <span>Settings</span>
            </button>
          </nav>
        </div>

        {/* Bottom Sidebar Action */}
        <div className="pt-4 border-t border-zinc-800/60">
          <button className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-xs font-medium transition">
            <FiPlus size={14} />
            <span>New Initiative</span>
          </button>
        </div>
      </aside>

      {/* 2. MAIN DASHBOARD CONTENT AREA */}
      <main className="flex-1 p-4 md:p-6 overflow-y-auto relative bg-[#0e1014]">
        
        {/* Top Search & Profile Bar matching photo */}
        <div className="flex items-center justify-between mb-5 pb-2 border-b border-zinc-800/40">
          <div className="flex items-center gap-2 text-zinc-400 bg-[#16181e] px-3 py-1.5 rounded-lg border border-zinc-800 text-xs w-64">
            <FiSearch size={14} />
            <input type="text" placeholder="Search ca..." className="bg-transparent border-none outline-none text-white w-full placeholder-zinc-500" />
          </div>

          <div className="flex items-center gap-4">
            <FiBell className="text-zinc-400 cursor-pointer hover:text-white" size={16} />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 font-bold text-xs flex items-center justify-center">
                S
              </div>
              <div className="text-left">
                <span className="text-xs font-semibold text-white block leading-tight">Sajid Shoukat</span>
                <span className="text-[10px] text-zinc-500 block">Owner</span>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-[1600px] mx-auto space-y-5 relative z-10">
          
          {/* HEADER TITLE */}
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Ad Pilot <span className="text-zinc-600 font-normal">::</span> Commander's Dashboard
            </h1>
          </div>

          {/* 6 KPI TOP CARDS (Layout Exact match to Screen) */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5">
            
            {/* Card 1: AI Commander Score */}
            <div className="bg-[#181a20] border border-zinc-800 rounded-xl p-3.5 flex flex-col justify-between shadow-lg relative">
              <p className="text-[11px] text-zinc-400 font-medium">AI Commander Score</p>
              <div className="relative w-full h-14 flex items-end justify-center mt-2">
                <svg viewBox="0 0 100 50" className="absolute top-0 w-full h-full">
                  <path d="M 15 48 A 35 35 0 0 1 85 48" fill="none" stroke="#2a2d36" strokeWidth="8" strokeLinecap="round" />
                  <path d="M 15 48 A 35 35 0 0 1 85 48" fill="none" stroke="#EAB308" strokeWidth="8" strokeLinecap="round" strokeDasharray="110" strokeDashoffset="12" />
                </svg>
                <div className="text-center z-10">
                  <span className="text-2xl font-bold text-white leading-none">{aiScore}</span>
                  <span className="text-[9px] text-zinc-500 block -mt-0.5">/100</span>
                </div>
              </div>
            </div>

            {/* Card 2: Active Campaigns */}
            <div className="bg-[#181a20] border border-zinc-800 rounded-xl p-3.5 flex flex-col justify-between shadow-lg">
              <p className="text-[11px] text-zinc-400 font-medium">Active Campaigns</p>
              <h3 className="text-3xl font-extrabold text-white mt-3">
                {liveCampaigns.length}
              </h3>
            </div>

            {/* Card 3: Today's Spend (Metallic Orange/Gold) */}
            <div className="bg-gradient-to-br from-[#E2B755] via-[#C89B3C] to-[#8C6212] border border-[#FDE68A]/60 rounded-xl p-3.5 flex flex-col justify-between shadow-lg">
              <p className="text-[11px] text-black/80 font-bold">Today's Spend</p>
              <h3 className="text-2xl font-black text-black mt-2">
                ${spend.toFixed(2)}
              </h3>
            </div>

            {/* Card 4: Overall ROAS (Metallic Orange/Gold) */}
            <div className="bg-gradient-to-br from-[#E2B755] via-[#C89B3C] to-[#8C6212] border border-[#FDE68A]/60 rounded-xl p-3.5 flex flex-col justify-between shadow-lg">
              <p className="text-[11px] text-black/80 font-bold">Overall ROAS</p>
              <h3 className="text-2xl font-black text-black mt-2">{roas}x</h3>
            </div>

            {/* Card 5: Total Leads Captured (REPLACED Lifetime Conversions) */}
            <div className="bg-[#242730] border border-zinc-700/70 rounded-xl p-3.5 flex flex-col justify-between shadow-lg">
              <p className="text-[11px] text-zinc-300 font-semibold">Total Leads Captured</p>
              <h3 className="text-2xl font-black text-white mt-2">{totalLeadsCount}</h3>
            </div>

            {/* Card 6: Total Account Balance */}
            <div className="bg-[#181a20] border border-zinc-800 rounded-xl p-3.5 flex flex-col justify-between shadow-lg">
              <p className="text-[11px] text-zinc-400 font-medium">Total Account Balance</p>
              <h3 className="text-2xl font-extrabold text-white mt-2">
                ${revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </h3>
            </div>

          </div>

          {/* MIDDLE SECTION: CHARTS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            
            {/* Multi-Campaign Performance Trend */}
            <div className="bg-[#181a20] border border-zinc-800 rounded-xl p-4 shadow-lg flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-white text-xs tracking-wide">
                  Multi-Campaign Performance Trend (Daily)
                </h3>
                <div className="flex gap-3 text-[10px] text-zinc-400">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-cyan-400"></span> Clicks</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400"></span> Conversions</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400"></span> CPA</span>
                </div>
              </div>
              
              <div className="h-56 w-full relative">
                <svg viewBox="0 0 800 220" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="cyanGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.0" />
                    </linearGradient>
                    <linearGradient id="emeraldGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  <line x1="0" y1="30" x2="800" y2="30" stroke="#2a2d36" strokeDasharray="3 3" />
                  <line x1="0" y1="80" x2="800" y2="80" stroke="#2a2d36" strokeDasharray="3 3" />
                  <line x1="0" y1="130" x2="800" y2="130" stroke="#2a2d36" strokeDasharray="3 3" />
                  <line x1="0" y1="180" x2="800" y2="180" stroke="#2a2d36" strokeDasharray="3 3" />

                  <path d="M0,170 Q70,120 130,140 T260,80 T390,50 T520,110 T650,40 T800,20 L800,220 L0,220 Z" fill="url(#cyanGlow)" />
                  <path d="M0,170 Q70,120 130,140 T260,80 T390,50 T520,110 T650,40 T800,20" fill="none" stroke="#22d3ee" strokeWidth="2.5" />

                  <path d="M0,195 Q70,150 130,165 T260,110 T390,85 T520,140 T650,80 T800,55 L800,220 L0,220 Z" fill="url(#emeraldGlow)" />
                  <path d="M0,195 Q70,150 130,165 T260,110 T390,85 T520,140 T650,80 T800,55" fill="none" stroke="#10b981" strokeWidth="2.5" />

                  <path d="M0,210 Q70,180 130,190 T260,150 T390,130 T520,170 T650,130 T800,105" fill="none" stroke="#eab308" strokeWidth="2" />
                </svg>
              </div>

              <div className="flex justify-between text-[10px] text-zinc-500 mt-2 px-1">
                <span>Oct 01</span><span>Oct 07</span><span>Oct 09</span><span>Oct 11</span><span>Oct 15</span><span>Oct 23</span><span>Oct 31</span>
              </div>
            </div>

            {/* Budget-to-ROAS Flow Chart */}
            <div className="bg-[#181a20] border border-zinc-800 rounded-xl p-4 shadow-lg flex flex-col justify-between">
              <h3 className="font-semibold text-white text-xs tracking-wide mb-2">Budget-to-ROAS Flow</h3>
              
              <div className="flex items-center justify-between h-56 relative w-full px-2">
                <div className="flex flex-col justify-between h-full py-3 z-10">
                  <span className="text-[11px] font-medium text-zinc-300">Budget</span>
                  <span className="text-[11px] font-medium text-zinc-300">Budget</span>
                </div>

                <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-12">
                  <svg viewBox="0 0 400 200" className="w-full h-full" preserveAspectRatio="none">
                    <path d="M0,40 C180,40 220,30 400,30" fill="none" stroke="#10b981" strokeWidth="20" opacity="0.65" />
                    <path d="M0,40 C180,40 220,160 400,160" fill="none" stroke="#a855f7" strokeWidth="18" opacity="0.5" />
                    <path d="M0,160 C180,160 220,30 400,30" fill="none" stroke="#a855f7" strokeWidth="20" opacity="0.6" />
                  </svg>
                </div>

                <div className="flex flex-col justify-between h-full py-3 z-10 text-right">
                  <span className="px-2 py-1 bg-emerald-500 text-black text-[10px] font-bold rounded shadow">ROAS</span>
                  <span className="px-2 py-1 bg-amber-500 text-black text-[10px] font-bold rounded shadow">ROAS</span>
                </div>
              </div>
            </div>

          </div>

          {/* BOTTOM SECTION: 3 CARDS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            
            {/* Bottom 1: Top Performing Ad Sets */}
            <div className="bg-[#181a20] border border-zinc-800 rounded-xl p-4 shadow-lg">
              <h3 className="font-semibold text-white text-xs tracking-wide mb-3">Top Performing Ad Sets</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <thead className="text-zinc-500 border-b border-zinc-800/80">
                    <tr>
                      <th className="pb-2 font-medium">Campaign Name</th>
                      <th className="pb-2 font-medium text-center">Platform</th>
                      <th className="pb-2 font-medium text-right">CTR R</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/40">
                    <tr>
                      <td className="py-2.5 text-zinc-300 font-medium">Campaign Alpha 1</td>
                      <td className="py-2.5 text-center text-cyan-400 font-bold">G</td>
                      <td className="py-2.5 text-right text-zinc-200">10.28% 1</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 text-zinc-300 font-medium">Campaign Beta 2</td>
                      <td className="py-2.5 text-center text-cyan-400 font-bold">M</td>
                      <td className="py-2.5 text-right text-zinc-200">15.05% 2</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 text-zinc-300 font-medium">Campaign Beta 3</td>
                      <td className="py-2.5 text-center text-cyan-400 font-bold">M</td>
                      <td className="py-2.5 text-right text-zinc-200">10.55% 1</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 text-zinc-300 font-medium">Campaign Beta 4</td>
                      <td className="py-2.5 text-center text-zinc-200 font-bold">T</td>
                      <td className="py-2.5 text-right text-zinc-200">65.98% 2</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom 2: AI Optimization Feed */}
            <div className="bg-[#181a20] border border-zinc-800 rounded-xl p-4 shadow-lg flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-white text-xs tracking-wide">AI Optimization Feed</h3>
                  <span className="text-zinc-500 text-xs tracking-widest cursor-pointer">•••</span>
                </div>
                <div className="space-y-3.5">
                  <div className="flex items-start gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 mt-1 shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                    <div>
                      <p className="text-[11px] text-zinc-200 font-semibold leading-tight">
                        Budget Adjusted: Campaign Alpha (+5%)
                      </p>
                      <p className="text-[9.5px] text-zinc-500 mt-0.5">Real Ad Time Campaign Alpha</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <FiAlertTriangle className="text-amber-400 mt-0.5 shrink-0" size={12} />
                    <div>
                      <p className="text-[11px] text-zinc-200 font-semibold leading-tight">
                        ROAS Alert: Campaign Beta (4.1x)
                      </p>
                      <p className="text-[9.5px] text-zinc-500 mt-0.5">New Ad Time Campaign Beta</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-zinc-500 mt-1 shrink-0"></span>
                    <div>
                      <p className="text-[11px] text-zinc-200 font-semibold leading-tight">AI Trigger: New Ad Set Released</p>
                      <p className="text-[9.5px] text-zinc-500 mt-0.5">Real Ad Time Campaign Beta</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 mt-1 shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                    <div>
                      <p className="text-[11px] text-zinc-200 font-semibold leading-tight">AI Trigger: New Ad Set Released</p>
                      <p className="text-[9.5px] text-zinc-500 mt-0.5">New Ad Time Campaign Released</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom 3: Multi-platform budget usage */}
            <div className="bg-[#181a20] border border-zinc-800 rounded-xl p-4 shadow-lg flex flex-col justify-between">
              <div>
                <h3 className="font-semibold text-white text-xs tracking-wide mb-3">Multi-platform budget usage</h3>
                
                <div className="flex items-center justify-around py-2">
                  {/* Google Ring */}
                  <div className="flex flex-col items-center">
                    <div className="relative w-16 h-16">
                      <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#27272a" strokeWidth="3.5" />
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#EAB308" strokeWidth="3.5" strokeDasharray="30, 100" strokeLinecap="round" />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center text-[11px] font-extrabold text-white">30%</div>
                    </div>
                    <span className="text-[10px] text-zinc-400 font-medium mt-2">Google</span>
                  </div>

                  {/* Meta Ring */}
                  <div className="flex flex-col items-center">
                    <div className="relative w-16 h-16">
                      <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#27272a" strokeWidth="3.5" />
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#14B8A6" strokeWidth="3.5" strokeDasharray="65, 100" strokeLinecap="round" />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center text-[11px] font-extrabold text-white">65%</div>
                    </div>
                    <span className="text-[10px] text-zinc-400 font-medium mt-2">Meta</span>
                  </div>

                  {/* TikTok Ring */}
                  <div className="flex flex-col items-center">
                    <div className="relative w-16 h-16">
                      <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#27272a" strokeWidth="3.5" />
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#06B6D4" strokeWidth="3.5" strokeDasharray="15, 100" strokeLinecap="round" />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center text-[11px] font-extrabold text-white">5%</div>
                    </div>
                    <span className="text-[10px] text-zinc-400 font-medium mt-2">TikTok</span>
                  </div>
                </div>
              </div>

              <button className="w-full mt-3 bg-[#121318] hover:bg-zinc-800 border border-zinc-700/80 text-zinc-300 hover:text-white text-[10px] font-bold py-2.5 rounded-lg transition tracking-widest uppercase shadow-md">
                LAUNCH NEW INITIATIVE
              </button>
            </div>

          </div>

        </div>
      </main>

    </div>
  );
};

export default DashboardPage;
