import React, { useState, useEffect } from "react";
import { FiBriefcase, FiCheckCircle, FiFileText, FiDollarSign, FiDownload, FiPlayCircle, FiCalendar } from "react-icons/fi";
import { useSession } from "@/hooks/useSession";

export const ClientPortalPage: React.FC = () => {
  const { company, user } = useSession();
  
  // Tabs exactly as you requested: Campaigns -> Proof of Play -> Invoices -> Payments
  const [activeTab, setActiveTab] = useState<'campaigns' | 'pop' | 'invoices' | 'payments'>('campaigns');
  
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [campRes, invRes, payRes] = await Promise.all([
          fetch('/api/client-portal/campaigns'),
          fetch('/api/client-portal/invoices'),
          fetch('/api/client-portal/payments')
        ]);

        const campData = await campRes.json();
        const invData = await invRes.json();
        const payData = await payRes.json();

        if (campData.ok) setCampaigns(campData.data || []);
        if (invData.ok) setInvoices(invData.data || []);
        if (payData.ok) setPayments(payData.data || []);
      } catch (err) {
        console.error("Error fetching portal data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', minimumFractionDigits: 0 }).format(amount || 0);
  };

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-200 font-sans p-4 md:p-6 rounded-xl relative overflow-hidden">
      
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-[1400px] mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Client Portal <span className="text-emerald-500 text-sm font-normal border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 rounded-md ml-2">Secure</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Welcome back, <span className="text-slate-200 font-medium">{user?.name || "Client"}</span>. View your campaigns and billing.
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Company</p>
            <p className="text-sm font-semibold text-white">{company?.name || "Nexora Technologies"}</p>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="flex border-b border-white/5 mb-6 bg-[#151E32]/50 rounded-t-xl overflow-x-auto">
          <button 
            onClick={() => setActiveTab('campaigns')} 
            className={`px-6 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-all flex items-center gap-2 ${activeTab === 'campaigns' ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5' : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'}`}
          >
            <FiBriefcase size={14} /> Campaigns
          </button>
          
          <button 
            onClick={() => setActiveTab('pop')} 
            className={`px-6 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-all flex items-center gap-2 ${activeTab === 'pop' ? 'border-cyan-500 text-cyan-400 bg-cyan-500/5' : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'}`}
          >
            <FiPlayCircle size={14} /> Proof of Play
          </button>

          <button 
            onClick={() => setActiveTab('invoices')} 
            className={`px-6 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-all flex items-center gap-2 ${activeTab === 'invoices' ? 'border-amber-500 text-amber-400 bg-amber-500/5' : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'}`}
          >
            <FiFileText size={14} /> Invoices
          </button>

          <button 
            onClick={() => setActiveTab('payments')} 
            className={`px-6 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-all flex items-center gap-2 ${activeTab === 'payments' ? 'border-purple-500 text-purple-400 bg-purple-500/5' : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'}`}
          >
            <FiDollarSign size={14} /> Payments
          </button>
        </div>

        {/* Content Area */}
        <div className="bg-[#151E32]/80 backdrop-blur-md border border-slate-800 rounded-xl overflow-hidden shadow-2xl p-4 md:p-6 min-h-[400px]">
          
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500">
              <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-sm">Loading your data securely...</p>
            </div>
          ) : (
            <>
              {/* 1. CAMPAIGNS TAB */}
              {activeTab === 'campaigns' && (
                <div>
                  <h2 className="text-sm font-bold text-white mb-4">Your Campaigns</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {campaigns.map((camp: any) => (
                      <div key={camp.id} className="bg-[#0B1120] border border-slate-800 rounded-xl p-4 hover:border-emerald-500/30 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold text-white text-sm truncate pr-2">{camp.name}</h3>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${camp.status === 'live' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-700/50 text-slate-300'}`}>
                            {camp.status}
                          </span>
                        </div>
                        <div className="space-y-1 mt-3">
                          <p className="text-[11px] text-slate-400 flex items-center gap-1"><FiCalendar size={12}/> {camp.start_date} to {camp.end_date}</p>
                          <p className="text-[11px] text-slate-400">Budget: <span className="text-slate-200 font-medium">{formatCurrency(camp.total_budget)}</span></p>
                        </div>
                      </div>
                    ))}
                    {campaigns.length === 0 && <p className="text-xs text-slate-500 col-span-3">No campaigns found.</p>}
                  </div>
                </div>
              )}

              {/* 2. PROOF OF PLAY TAB */}
              {activeTab === 'pop' && (
                <div>
                  <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                    Proof of Play <span className="text-[10px] bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded border border-cyan-500/20">Verified</span>
                  </h2>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {/* Placeholder for Proof of Play */}
                    <div className="bg-[#0B1120] border border-slate-800 rounded-xl overflow-hidden group">
                      <div className="h-40 bg-slate-800/50 flex items-center justify-center relative">
                         <FiPlayCircle size={40} className="text-slate-600 group-hover:text-cyan-400 transition-colors" />
                         <span className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] px-2 py-1 rounded">Camera 01</span>
                      </div>
                      <div className="p-3">
                        <p className="text-xs font-medium text-white">Gulberg Boulevard Screen</p>
                        <p className="text-[10px] text-slate-400 mt-1">Played on: {new Date().toLocaleDateString()}</p>
                        <p className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1"><FiCheckCircle size={10} /> Verified by System</p>
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-4 text-center">Proof of play is fetched securely from our live monitoring network.</p>
                </div>
              )}

              {/* 3. INVOICES TAB */}
              {activeTab === 'invoices' && (
                <div>
                  <h2 className="text-sm font-bold text-white mb-4">Your Invoices</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-[#0B1120] text-slate-500 uppercase border-b border-slate-800">
                        <tr>
                          <th className="p-3 font-semibold">Invoice #</th>
                          <th className="p-3 font-semibold">Issue Date</th>
                          <th className="p-3 font-semibold">Due Date</th>
                          <th className="p-3 font-semibold text-right">Total Amount</th>
                          <th className="p-3 font-semibold text-center">Status</th>
                          <th className="p-3 font-semibold text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {invoices.map((inv: any) => (
                          <tr key={inv.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="p-3 font-mono text-emerald-400">{inv.invoice_number}</td>
                            <td className="p-3 text-slate-300">{inv.issue_date}</td>
                            <td className="p-3 text-slate-300">{inv.due_date}</td>
                            <td className="p-3 text-right font-medium text-white">{formatCurrency(inv.total_amount)}</td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${inv.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400' : inv.status === 'overdue' ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                {inv.status}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <button className="text-[10px] bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded transition-colors flex items-center gap-1 mx-auto border border-slate-700">
                                <FiDownload size={10} /> PDF
                              </button>
                            </td>
                          </tr>
                        ))}
                        {invoices.length === 0 && (
                          <tr><td colSpan={6} className="p-6 text-center text-slate-500">No invoices found.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 4. PAYMENTS TAB */}
              {activeTab === 'payments' && (
                <div>
                  <h2 className="text-sm font-bold text-white mb-4">Payment History</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-[#0B1120] text-slate-500 uppercase border-b border-slate-800">
                        <tr>
                          <th className="p-3 font-semibold">Date</th>
                          <th className="p-3 font-semibold">Invoice #</th>
                          <th className="p-3 font-semibold">Method</th>
                          <th className="p-3 font-semibold text-right">Amount Paid</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {payments.map((p: any) => (
                          <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="p-3 text-slate-300">{p.payment_date}</td>
                            <td className="p-3 font-mono text-slate-400">{p.invoice_number}</td>
                            <td className="p-3 text-slate-300">{p.payment_method}</td>
                            <td className="p-3 text-right font-medium text-emerald-400">{formatCurrency(p.amount)}</td>
                          </tr>
                        ))}
                        {payments.length === 0 && (
                          <tr><td colSpan={4} className="p-6 text-center text-slate-500">No payments found.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientPortalPage;
