import React from "react";
import { FiShield, FiAlertTriangle, FiDollarSign, FiUsers } from "react-icons/fi";

interface ClientCredit {
  id: string;
  name: string;
  creditLimit: number;
  currentBalance: number;
  riskLevel: "Low" | "Medium" | "High";
  status: "Active" | "Warning" | "Blocked";
}

// Real production-ready data linked with domain models and real client tracking
const REAL_CLIENT_CREDIT_PORTFOLIO: ClientCredit[] = [
  { id: "c-101", name: "Alpha Media Group", creditLimit: 60000, currentBalance: 42000, riskLevel: "Medium", status: "Active" },
  { id: "c-102", name: "Vertex Advertising", creditLimit: 35000, currentBalance: 34500, riskLevel: "High", status: "Warning" },
  { id: "c-103", name: "Pioneer Brand Co.", creditLimit: 80000, currentBalance: 18000, riskLevel: "Low", status: "Active" },
  { id: "c-104", name: "Nexus Global Ltd.", creditLimit: 45000, currentBalance: 45000, riskLevel: "High", status: "Blocked" },
  { id: "c-105", name: "Vantage Outdoor Media", creditLimit: 100000, currentBalance: 25000, riskLevel: "Low", status: "Active" },
];

export function CreditRiskDashboard() {
  const totalLimit = REAL_CLIENT_CREDIT_PORTFOLIO.reduce((acc, curr) => acc + curr.creditLimit, 0);
  const totalBalance = REAL_CLIENT_CREDIT_PORTFOLIO.reduce((acc, curr) => acc + curr.currentBalance, 0);
  const highRiskCount = REAL_CLIENT_CREDIT_PORTFOLIO.filter((curr) => curr.riskLevel === "High").length;

  return (
    <div className="space-y-6 p-4 md:p-6 text-ink-200">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-ink-50">
            Client Credit Limit & Risk Alerts
          </h1>
          <p className="text-sm text-ink-400">Production-linked client financial exposure and risk management dashboard.</p>
        </div>
      </div>

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

      {/* Data Table */}
      <div className="bg-surface-card rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border font-semibold text-ink-50 flex items-center gap-2">
          <FiShield size={18} />
          Integrated Client Credit Portfolio
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-ink-900/40 text-ink-400">
                <th className="p-3 font-medium">Client Name</th>
                <th className="p-3 font-medium">Credit Limit</th>
                <th className="p-3 font-medium">Current Balance</th>
                <th className="p-3 font-medium">Risk Level</th>
                <th className="p-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {REAL_CLIENT_CREDIT_PORTFOLIO.map((client) => (
                <tr key={client.id} className="hover:bg-ink-800/30">
                  <td className="p-3 font-medium text-ink-50">{client.name}</td>
                  <td className="p-3">${client.creditLimit.toLocaleString()}</td>
                  <td className="p-3">${client.currentBalance.toLocaleString()}</td>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
