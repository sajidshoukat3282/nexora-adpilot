import React, { useState, useEffect } from "react";
import { FiShield, FiAlertTriangle, FiDollarSign, FiEdit2, FiX } from "react-icons/fi";

export const CreditRiskDashboard: React.FC = () => {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit Limit States
  const [editingClient, setEditingClient] = useState<any>(null);
  const [newLimit, setNewLimit] = useState<number>(0);
  const [saving, setSaving] = useState(false);

  const fetchRiskData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/credit-risk');
      const data = await res.json();
      if (data.ok) setClients(data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRiskData();
  }, []);

  const handleUpdateLimit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/crm/clients/${editingClient.id}/credit-limit`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credit_limit: newLimit })
      });
      if (res.ok) {
        setEditingClient(null);
        fetchRiskData(); // Data refresh karein
      } else {
        alert("Failed to update limit");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', minimumFractionDigits: 0 }).format(amount);
  };

  const totalLimit = clients.reduce((sum, c) => sum + (c.credit_limit || 0), 0);
  const totalOutstanding = clients.reduce((sum, c) => sum + (c.outstanding_balance || 0), 0);
  
  const highRiskClients = clients.filter(c => {
    if (!c.credit_limit || c.credit_limit === 0) return c.outstanding_balance > 0;
    return (c.outstanding_balance / c.credit_limit) >= 0.8;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-6 rounded-xl relative">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FiShield className="text-rose-600" /> Client Credit Risk
          </h1>
          <p className="text-sm text-slate-500 mt-1">Monitor client credit limits, outstanding balances, and risk exposure.</p>
        </div>
      </div>

      {highRiskClients.length > 0 && (
        <div className="bg-rose-50 border-l-4 border-rose-500 p-4 mb-6 rounded-r-lg flex items-start gap-3">
          <FiAlertTriangle className="text-rose-600 mt-0.5" size={20} />
          <div>
            <h3 className="text-rose-800 font-bold">Credit Limit Alert</h3>
            <p className="text-rose-700 text-sm mt-1">
              You have <b>{highRiskClients.length} client(s)</b> approaching or exceeding their credit limits.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600"><FiDollarSign size={16} /></div>
            <p className="text-sm text-slate-500 font-medium">Total Credit Limit</p>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(totalLimit)}</h3>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600"><FiShield size={16} /></div>
            <p className="text-sm text-slate-500 font-medium">Total Outstanding Balance</p>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(totalOutstanding)}</h3>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-600"><FiAlertTriangle size={16} /></div>
            <p className="text-sm text-slate-500 font-medium">High Risk Clients</p>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{highRiskClients.length}</h3>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-10 text-center text-slate-500">Loading credit portfolio...</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
              <tr>
                <th className="p-4 font-semibold">Client Name</th>
                <th className="p-4 font-semibold text-right">Credit Limit</th>
                <th className="p-4 font-semibold text-right">Outstanding Balance</th>
                <th className="p-4 font-semibold">Credit Utilization</th>
                <th className="p-4 font-semibold text-center">Risk Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clients.map((client: any) => {
                const limit = client.credit_limit || 0;
                const balance = client.outstanding_balance || 0;
                
                let utilization = 0;
                if (limit > 0) utilization = Math.round((balance / limit) * 100);
                else if (balance > 0) utilization = 100;

                let statusColor = "bg-slate-100 text-slate-600";
                let statusText = "No Limit Set";
                let barColor = "bg-slate-300";

                if (limit > 0) {
                  if (utilization >= 100) {
                    statusColor = "bg-rose-100 text-rose-700 border border-rose-200";
                    statusText = "Blocked";
                    barColor = "bg-rose-500";
                  } else if (utilization >= 80) {
                    statusColor = "bg-amber-100 text-amber-700 border border-amber-200";
                    statusText = "High Risk";
                    barColor = "bg-amber-500";
                  } else if (utilization >= 50) {
                    statusColor = "bg-blue-100 text-blue-700 border border-blue-200";
                    statusText = "Medium";
                    barColor = "bg-blue-500";
                  } else {
                    statusColor = "bg-emerald-100 text-emerald-700 border border-emerald-200";
                    statusText = "Low Risk";
                    barColor = "bg-emerald-500";
                  }
                }

                return (
                  <tr key={client.id} className="hover:bg-slate-50">
                    <td className="p-4 font-medium text-slate-900">{client.name}</td>
                    <td className="p-4 text-right font-mono text-sm">
                      {formatCurrency(limit)}
                      {/* Edit Button */}
                      <button 
                        onClick={() => { setEditingClient(client); setNewLimit(limit); }}
                        className="ml-2 text-blue-500 hover:text-blue-700 inline-flex items-center"
                        title="Increase/Edit Credit Limit"
                      >
                        <FiEdit2 size={14} />
                      </button>
                    </td>
                    <td className="p-4 text-right font-mono text-sm text-slate-700">{formatCurrency(balance)}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${barColor}`} 
                            style={{ width: `${Math.min(utilization, 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-semibold text-slate-500 w-10">{utilization}%</span>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${statusColor}`}>
                        {statusText}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Edit Limit Modal */}
      {editingClient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-slate-800">Update Credit Limit</h3>
              <button onClick={() => setEditingClient(null)} className="text-slate-400 hover:text-slate-700">
                <FiX size={20} />
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-4">Client: <span className="font-semibold text-slate-800">{editingClient.name}</span></p>
            
            <form onSubmit={handleUpdateLimit}>
              <label className="block text-sm font-medium text-slate-600 mb-1">New Credit Limit</label>
              <input 
                type="number" 
                value={newLimit}
                onChange={(e) => setNewLimit(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-lg font-bold text-slate-800 outline-none focus:border-emerald-500 mb-6"
                required
              />
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setEditingClient(null)} className="px-4 py-2 text-slate-500 font-medium">Cancel</button>
                <button type="submit" disabled={saving} className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-medium">
                  {saving ? "Saving..." : "Update Limit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default CreditRiskDashboard;
