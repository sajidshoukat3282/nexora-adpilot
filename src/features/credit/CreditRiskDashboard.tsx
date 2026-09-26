import React, { useState } from "react";
import { FiShield, FiAlertTriangle, FiDollarSign, FiUsers, FiSearch, FiPrinter, FiEdit2, FiFilter, FiPieChart } from "react-icons/fi";

interface ClientCredit {
  id: string;
  name: string;
  creditLimit: number;
  currentBalance: number;
  riskLevel: "Low" | "Medium" | "High";
  status: "Active" | "Warning" | "Blocked";
}

const INITIAL_PORTFOLIO: ClientCredit[] = [
  { id: "c-101", name: "Alpha Media Group", creditLimit: 60000, currentBalance: 42000, riskLevel: "Medium", status: "Active" },
  { id: "c-102", name: "Vertex Advertising", creditLimit: 35000, currentBalance: 34500, riskLevel: "High", status: "Warning" },
  { id: "c-103", name: "Pioneer Brand Co.", creditLimit: 80000, currentBalance: 18000, riskLevel: "Low", status: "Active" },
  { id: "c-104", name: "Nexus Global Ltd.", creditLimit: 45000, currentBalance: 45000, riskLevel: "High", status: "Blocked" },
  { id: "c-105", name: "Vantage Outdoor Media", creditLimit: 100000, currentBalance: 25000, riskLevel: "Low", status: "Active" },
];

export function CreditRiskDashboard() {
  const [portfolio, setPortfolio] = useState<ClientCredit[]>(INITIAL_PORTFOLIO);
  const [searchTerm, setSearchTerm] = useState("");
  const [riskFilter, setRiskFilter] = useState<string>("All");
  const [editingClient, setEditingClient] = useState<ClientCredit | null>(null);
  const [newLimitInput, setNewLimitInput] = useState("");

  // Calculations
  const totalLimit = portfolio.reduce((acc, curr) => acc + curr.creditLimit, 0);
  const totalBalance = portfolio.reduce((acc, curr) => acc + curr.currentBalance, 0);
  const highRiskCount = portfolio.filter((curr) => curr.riskLevel === "High").length;
  const mediumRiskCount = portfolio.filter((curr) => curr.riskLevel === "Medium").length;
  const lowRiskCount = portfolio.filter((curr) => curr.riskLevel === "Low").length;

  // Filter logic
  const filteredPortfolio = portfolio.filter((client) => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRisk = riskFilter === "All" || client.riskLevel === riskFilter;
    return matchesSearch && matchesRisk;
  });

  // Print / Save to PDF Function
  const handlePrintPDF = () => {
    window.print();
  };

  // Handle Save Limit Update
  const handleSaveLimit = () => {
    if (!editingClient) return;
    const updatedLimit = parseFloat(newLimitInput);
    if (isNaN(updatedLimit)) return;

    setPortfolio(prev =>
      prev.map(c => c.id === editingClient.id ? { ...c, creditLimit: updatedLimit } : c)
    );
    setEditingClient(null);
    setNewLimitInput("");
  };

  return (
    <div className="space-y-6 p-4 md:p-6 text-ink-200">
      {/* Header & PDF Export Button */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-ink-50">
            Client Credit Limit & Risk Alerts
          </h1>
          <p className="text-sm text-ink-400">Advanced credit exposure monitoring and risk management portfolio.</p>
        </div>
        <button
          onClick={handlePrintPDF}
          className="flex items-center gap-2 px-4 py-2 bg-signal-blue text-white rounded-lg text-sm font-medium hover:bg-signal-blue/90 transition-colors shadow-sm"
        >
          <FiPrinter size={16} />
          Save to PDF / Print Report
        </button>
      </div>

      {/* Dynamic Alert Banner */}
      {highRiskCount > 0 && (
        <div className="bg-rose-500/10 border border-rose-500/30 p-4 rounded-xl flex items-center gap-3 text-rose-300">
          <FiAlertTriangle size={20} className="shrink-0 text-rose-400" />
          <div className="text-sm">
            <span className="font-semibold">Security Alert:</span> There are <span className="font-bold underline">{highRiskCount} high-risk clients</span> currently approaching or exceeding credit limitations. Immediate financial review recommended.
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-surface-card p-5 rounded-xl border border-border flex items-center gap-4">
          <div className="p-3 rounded-lg bg-signal-blue/10 text-signal-blue">
            <FiDollarSign size={24} />
          </div>
          <div>
            <div className="text-xs text-ink-400 font-medium">TOTAL CREDIT LIMIT</div>
            <div className="text-lg md:text-xl font-bold text-ink-50">${totalLimit.toLocaleString()}</div>
          </div>
        </div>

        <div className="bg-surface-card p-5 rounded-xl border border-border flex items-center gap-4">
          <div className="p-3 rounded-lg bg-amber-500/10 text-amber-500">
            <FiUsers size={24} />
          </div>
          <div>
            <div className="text-xs text-ink-400 font-medium">OUTSTANDING BALANCE</div>
            <div className="text-lg md:text-xl font-bold text-ink-50">${totalBalance.toLocaleString()}</div>
          </div>
        </div>

        <div className="bg-surface-card p-5 rounded-xl border border-border flex items-center gap-4">
          <div className="p-3 rounded-lg bg-rose-500/10 text-rose-500">
            <FiAlertTriangle size={24} />
          </div>
          <div>
            <div className="text-xs text-ink-400 font-medium">HIGH RISK CLIENTS</div>
            <div className="text-lg md:text-xl font-bold text-rose-400">{highRiskCount}</div>
          </div>
        </div>
      </div>

      {/* Risk Breakdown Quick Filters */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => setRiskFilter("Low")}
          className={`p-3 rounded-xl border text-left transition-all ${riskFilter === "Low" ? "bg-emerald-500/20 border-emerald-500/50" : "bg-surface-card border-border hover:bg-ink-800/40"}`}
        >
          <div className="text-xs text-ink-400 font-medium">Low Risk</div>
          <div className="text-lg font-bold text-emerald-400">{lowRiskCount} Clients</div>
        </button>
        <button
          onClick={() => setRiskFilter("Medium")}
          className={`p-3 rounded-xl border text-left transition-all ${riskFilter === "Medium" ? "bg-amber-500/20 border-amber-500/50" : "bg-surface-card border-border hover:bg-ink-800/40"}`}
        >
          <div className="text-xs text-ink-400 font-medium">Medium Risk</div>
          <div className="text-lg font-bold text-amber-400">{mediumRiskCount} Clients</div>
        </button>
        <button
          onClick={() => setRiskFilter("High")}
          className={`p-3 rounded-xl border text-left transition-all ${riskFilter === "High" ? "bg-rose-500/20 border-rose-500/50" : "bg-surface-card border-border hover:bg-ink-800/40"}`}
        >
          <div className="text-xs text-ink-400 font-medium">High Risk</div>
          <div className="text-lg font-bold text-rose-400">{highRiskCount} Clients</div>
        </button>
      </div>

      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-surface-card p-4 rounded-xl border border-border">
        <div className="relative w-full sm:w-72">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" size={16} />
          <input
            type="text"
            placeholder="Search client name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-ink-900/60 border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-ink-50 focus:outline-none focus:border-signal-blue"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <FiFilter size={16} className="text-ink-400" />
          <span className="text-xs text-ink-400 font-medium">Risk Filter:</span>
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="bg-ink-900/60 border border-border rounded-lg px-3 py-2 text-sm text-ink-50 focus:outline-none focus:border-signal-blue"
          >
            <option value="All">All Risks</option>
            <option value="Low">Low Risk</option>
            <option value="Medium">Medium Risk</option>
            <option value="High">High Risk</option>
          </select>
          {riskFilter !== "All" && (
            <button
              onClick={() => setRiskFilter("All")}
              className="text-xs text-signal-blue underline ml-2"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-surface-card rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border font-semibold text-ink-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FiShield size={18} />
            Client Credit Portfolio ({filteredPortfolio.length})
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-ink-900/40 text-ink-400">
                <th className="p-3 font-medium">Client Name</th>
                <th className="p-3 font-medium">Credit Limit</th>
                <th className="p-3 font-medium">Current Balance</th>
                <th className="p-3 font-medium">Credit Utilization</th>
                <th className="p-3 font-medium">Risk Level</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredPortfolio.length > 0 ? (
                filteredPortfolio.map((client) => {
                  const utilization = Math.min(Math.round((client.currentBalance / client.creditLimit) * 100), 100);
                  return (
                    <tr key={client.id} className="hover:bg-ink-800/30">
                      <td className="p-3 font-medium text-ink-50">{client.name}</td>
                      <td className="p-3">${client.creditLimit.toLocaleString()}</td>
                      <td className="p-3">${client.currentBalance.toLocaleString()}</td>
                      <td className="p-3 w-36">
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-ink-400">
                            <span>{utilization}%</span>
                          </div>
                          <div className="w-full bg-ink-900 rounded-full h-2 overflow-hidden border border-border">
                            <div
                              className={`h-full rounded-full ${
                                utilization >= 90
                                  ? "bg-rose-500"
                                  : utilization >= 70
                                  ? "bg-amber-500"
                                  : "bg-signal-blue"
                              }`}
                              style={{ width: `${utilization}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            client.riskLevel === "High"
                              ? "bg-rose-500/10 text-rose-400"
                              : client.riskLevel === "Medium"
                              ? "bg-amber-500/10 text-amber-400"
                              : "bg-emerald-500/10 text-emerald-400"
                          }`}
                        >
                          {client.riskLevel}
                        </span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            client.status === "Blocked"
                              ? "bg-rose-500/10 text-rose-400"
                              : client.status === "Warning"
                              ? "bg-amber-500/10 text-amber-400"
                              : "bg-emerald-500/10 text-emerald-400"
                          }`}
                        >
                          {client.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => {
                            setEditingClient(client);
                            setNewLimitInput(client.creditLimit.toString());
                          }}
                          className="p-1.5 hover:bg-ink-800 rounded text-ink-400 hover:text-ink-50 transition-colors"
                          title="Edit Credit Limit"
                        >
                          <FiEdit2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-ink-400">
                    No matching clients found in portfolio.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editingClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-surface-card border border-border rounded-xl p-6 w-full max-w-md space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-ink-50">Edit Credit Limit</h3>
            <p className="text-sm text-ink-400">
              Update maximum credit threshold for <span className="text-ink-50 font-semibold">{editingClient.name}</span>.
            </p>
            <div>
              <label className="block text-xs font-medium text-ink-400 mb-1">New Credit Limit ($)</label>
              <input
                type="number"
                value={newLimitInput}
                onChange={(e) => setNewLimitInput(e.target.value)}
                className="w-full bg-ink-900 border border-border rounded-lg px-3 py-2 text-sm text-ink-50 focus:outline-none focus:border-signal-blue"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingClient(null)}
                className="px-4 py-2 bg-ink-800 text-ink-300 rounded-lg text-sm hover:bg-ink-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveLimit}
                className="px-4 py-2 bg-signal-blue text-white rounded-lg text-sm hover:bg-signal-blue/90 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
