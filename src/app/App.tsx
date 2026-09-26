import React, { useState } from "react";
import { FiAlertTriangle, FiShield, FiCheckCircle, FiKey, FiX } from "react-icons/fi";

export const ClientCreditRiskPage: React.FC = () => {
  const [clients, setClients] = useState([
    { id: "c1", name: "Metro Electronics", creditLimitCents: 10000000, currentBalanceCents: 8500000, status: "normal" },
    { id: "c2", name: "Apex Motors", creditLimitCents: 15000000, currentBalanceCents: 16200000, status: "overdue" },
    { id: "c3", name: "Urban Fashion", creditLimitCents: 5000000, currentBalanceCents: 2000000, status: "normal" },
  ]);

  const [selectedClientForOverride, setSelectedClientForOverride] = useState<any | null>(null);

  const formatCurrency = (cents: number) => {
    return "$" + (cents / 100).toLocaleString();
  };

  return (
    <div className="space-y-6 p-6 text-gray-200">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <FiShield className="text-cyan-400" />
            Client Credit Limit & Risk Alerts
          </h1>
          <p className="text-xs text-gray-400">Monitor exposure, enforce financial boundaries, and manage credit overages.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-gray-900 border border-gray-800 rounded-xl">
        <div className="p-3 bg-gray-850 rounded-lg border border-gray-800">
          <span className="text-xs text-gray-400 block font-medium">Total Credit Exposure</span>
          <span className="text-xl font-bold text-white">
            {formatCurrency(clients.reduce((sum, c) => sum + c.currentBalanceCents, 0))}
          </span>
        </div>
        <div className="p-3 bg-gray-850 rounded-lg border border-gray-800">
          <span className="text-xs text-gray-400 block font-medium">Over-Limit Accounts</span>
          <span className="text-xl font-bold text-red-400">
            {clients.filter(c => c.currentBalanceCents > c.creditLimitCents).length} Clients
          </span>
        </div>
        <div className="p-3 bg-gray-850 rounded-lg border border-gray-800">
          <span className="text-xs text-gray-400 block font-medium">Risk Status</span>
          <span className="text-xs font-bold text-yellow-400 bg-yellow-950/50 px-2 py-1 rounded border border-yellow-800/50 inline-block mt-1">
            ACTION REQUIRED
          </span>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-left text-xs text-gray-300">
          <thead className="bg-gray-950 border-b border-gray-800 text-gray-400 uppercase tracking-wider font-semibold">
            <tr>
              <th className="p-3.5">Client Name</th>
              <th className="p-3.5">Approved Credit Limit</th>
              <th className="p-3.5">Current Balance / Exposure</th>
              <th className="p-3.5">Risk Status</th>
              <th className="p-3.5 text-right">Owner Control</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {clients.map((client) => {
              const isOverLimit = client.currentBalanceCents > client.creditLimitCents;
              return (
                <tr key={client.id} className="hover:bg-gray-850 transition-colors">
                  <td className="p-3.5 font-semibold text-white">
                    {client.name}
                  </td>
                  <td className="p-3.5 font-mono text-gray-300">
                    {formatCurrency(client.creditLimitCents)}
                  </td>
                  <td className={`p-3.5 font-mono font-bold ${isOverLimit ? "text-red-400" : "text-white"}`}>
                    {formatCurrency(client.currentBalanceCents)}
                  </td>
                  <td className="p-3.5">
                    {isOverLimit ? (
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-red-950 text-red-400 border border-red-800 flex items-center gap-1 w-max">
                        <FiAlertTriangle size={12} /> Limit Exceeded
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-green-950 text-green-400 border border-green-800 flex items-center gap-1 w-max">
                        <FiCheckCircle size={12} /> Within Limit
                      </span>
                    )}
                  </td>
                  <td className="p-3.5 text-right">
                    {isOverLimit && (
                      <button
                        onClick={() => setSelectedClientForOverride(client)}
                        className="px-2.5 py-1 text-xs font-medium bg-red-900/40 hover:bg-red-900/70 text-red-300 rounded border border-red-700 inline-flex items-center gap-1 transition-colors"
                      >
                        <FiKey size={12} />
                        <span>Override Limit</span>
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedClientForOverride && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-gray-800 pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <FiKey className="text-red-400" />
                Credit Limit Override (Owner Authorization)
              </h3>
              <button onClick={() => setSelectedClientForOverride(null)} className="text-gray-400 hover:text-white">
                <FiX size={18} />
              </button>
            </div>
            <div className="space-y-3 text-xs text-gray-300">
              <p>
                Client <strong className="text-white">{selectedClientForOverride.name}</strong> has exceeded their allocated credit limit. Authorizing this override will allow new campaign proposals to proceed at owner's financial risk.
              </p>
              <div className="p-3 bg-gray-950 rounded-lg border border-gray-800 space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-400">Limit:</span>
                  <span className="font-mono text-white">{formatCurrency(selectedClientForOverride.creditLimitCents)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Current Exposure:</span>
                  <span className="font-mono text-red-400">{formatCurrency(selectedClientForOverride.currentBalanceCents)}</span>
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  onClick={() => setSelectedClientForOverride(null)}
                  className="px-3 py-1.5 bg-gray-800 text-gray-300 rounded hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setClients(clients.map(c => c.id === selectedClientForOverride.id ? { ...c, status: "override_approved" } : c));
                    setSelectedClientForOverride(null);
                  }}
                  className="px-3 py-1.5 bg-red-600 text-white font-semibold rounded hover:bg-red-500"
                >
                  Authorize Over-Limit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
