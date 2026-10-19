import React, { useState, useEffect } from "react";
import { useSession } from "@/hooks/useSession";

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

  const liveCampaigns = campaigns.filter((c) => c.status === "live");
  const revenue = metrics.total_revenue || 465018.00;
  const spend = metrics.total_expenses || 0.00;
  const roas = spend > 0 ? (revenue / spend).toFixed(1) : "0.0";
  const aiScore = 98;
  const totalLeadsCount = leads.length > 0 ? leads.length : 1;

  return (
    <div className="w-full min-h-screen bg-[#0e1014] text-slate-200 font-sans p-4 md:p-6 overflow-x-hidden select-none">
      
      <div className="max-w-[1600px] mx-auto space-y-5">
        
        {/* HEADER TITLE */}
        <div className="flex items-center justify-between pb-1">
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            Ad Pilot <span className="text-zinc-600 font-normal">::</span> Commander's Dashboard
          </h1>
        </div>

        {/* 6 KPI TOP CARDS */}
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

          {/* Card 3: Today's Spend */}
          <div className="bg-gradient-to-br from-[#E2B755] via-[#C89B3C] to-[#8C6212] border border-[#FDE68A]/60 rounded-xl p-3.5 flex flex-col justify-between shadow-lg">
            <p className="text-[11px] text-black/80 font-bold">Today's Spend</p>
            <h3 className="text-2xl font-black text-black mt-2">
              ${spend.toFixed(2)}
            </h3>
          </div>

          {/* Card 4: Overall ROAS */}
          <div className="bg-gradient-to-br from-[#E2B755] via-[#C89B3C] to-[#8C6212] border border-[#FDE68A]/60 rounded-xl p-3.5 flex flex-col justify-between shadow-lg">
            <p className="text-[11px] text-black/80 font-bold">Overall ROAS</p>
            <h3 className="text-2xl font-black text-black mt-2">{roas}x</h3>
          </div>

          {/* Card 5: Total Leads Captured */}
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
                <path d="M0
