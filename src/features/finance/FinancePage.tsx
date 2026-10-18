import React, { useState, useEffect } from "react";
import { FiDollarSign, FiTrendingUp, FiTrendingDown, FiFileText, FiCreditCard, FiPlus } from "react-icons/fi";
import { PageHeader } from "@/components/layout/AppShell";
import AddExpenseForm from "./AddExpenseForm"; // Naya Form import kiya

export const FinancePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'invoices' | 'expenses'>('overview');
  
  const [metrics, setMetrics] = useState<any>({ total_revenue: 0, total_expenses: 0, net_profit: 0, total_pending: 0 });
  const [invoices, setInvoices] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showExpenseForm, setShowExpenseForm] = useState(false);

  const fetchFinanceData = async () => {
    setLoading(true);
    try {
      const [metricsRes, invoicesRes, expensesRes] = await Promise.all([
        fetch('/api/finance/metrics'),
        fetch('/api/invoices'),
        fetch('/api/expenses')
      ]);
      
      const mData = await metricsRes.json();
      const iData = await invoicesRes.json();
      const eData = await expensesRes.json();

      if (mData.ok) setMetrics(mData.metrics);
      if (iData.ok) setInvoices(iData.data || []);
      if (eData.ok) setExpenses(eData.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinanceData();
  }, []);

  const formatCurrency = (amount: number, currency = 'PKR') => {
    return new Intl.NumberFormat('en-PK', { style: 'currency', currency: currency, minimumFractionDigits: 0 }).format(amount);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-6 rounded-xl">
      
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Finance & Accounts</h1>
          <p className="text-sm text-slate-500 mt-1">Manage invoices, expenses, and profit & loss.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowExpenseForm(true)}
            className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors shadow-sm"
          >
            <FiPlus className="text-rose-500" /> Add Expense
          </button>
          <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors shadow-sm">
            <FiPlus /> Create Invoice
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
              <FiTrendingUp size={16} />
            </div>
            <p className="text-sm text-slate-500 font-medium">Revenue Collected</p>
          </div>
          <h3 className="text-2xl font-bold text-slate-900 tabular-nums">{formatCurrency(metrics.total_revenue)}</h3>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
              <FiTrendingDown size={16} />
            </div>
            <p className="text-sm text-slate-500 font-medium">Total Expenses</p>
          </div>
          <h3 className="text-2xl font-bold text-slate-900 tabular-nums">{formatCurrency(metrics.total_expenses)}</h3>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              <FiDollarSign size={16} />
            </div>
            <p className="text-sm text-slate-500 font-medium">Net Profit / Loss</p>
          </div>
          <h3 className={`text-2xl font-bold tabular-nums ${metrics.net_profit >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
            {formatCurrency(metrics.net_profit)}
          </h3>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
              <FiCreditCard size={16} />
            </div>
            <p className="text-sm text-slate-500 font-medium">Pending Receivables</p>
          </div>
          <h3 className="text-2xl font-bold text-slate-900 tabular-nums">{formatCurrency(metrics.total_pending)}</h3>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-6 bg-white px-2 rounded-t-xl">
        <button onClick={() => setActiveTab('overview')} className={`px-6 py-4 text-sm font-semibold transition-colors border-b-2 ${activeTab === 'overview' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>Profit & Loss</button>
        <button onClick={() => setActiveTab('invoices')} className={`px-6 py-4 text-sm font-semibold transition-colors border-b-2 ${activeTab === 'invoices' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>Invoices ({invoices.length})</button>
        <button onClick={() => setActiveTab('expenses')} className={`px-6 py-4 text-sm font-semibold transition-colors border-b-2 ${activeTab === 'expenses' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>Expenses ({expenses.length})</button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {activeTab === 'overview' && (
          <div className="p-10 text-center text-slate-400">
            <FiTrendingUp size={48} className="mx-auto mb-4 opacity-50 text-slate-300" />
            <h2 className="text-xl font-semibold text-slate-700 mb-2">Financial Summary</h2>
            <p className="text-sm">Detailed Profit & Loss charts will appear here.</p>
          </div>
        )}

        {activeTab === 'invoices' && (
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-10 text-center text-slate-500">Loading invoices...</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                    <th className="p-4 font-semibold">Invoice #</th>
                    <th className="p-4 font-semibold">Client</th>
                    <th className="p-4 font-semibold">Issue Date</th>
                    <th className="p-4 font-semibold text-right">Total Amount</th>
                    <th className="p-4 font-semibold text-right">Paid</th>
                    <th className="p-4 font-semibold text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50 transition-colors cursor-pointer">
                      <td className="p-4 font-mono text-sm text-slate-700">{inv.invoice_number}</td>
                      <td className="p-4 font-medium text-slate-900">{inv.client_name}</td>
                      <td className="p-4 text-sm text-slate-500">{inv.issue_date}</td>
                      <td className="p-4 text-right font-semibold text-slate-800 tabular-nums">{formatCurrency(inv.total_amount, inv.currency)}</td>
                      <td className="p-4 text-right text-emerald-600 font-medium tabular-nums">{formatCurrency(inv.amount_paid, inv.currency)}</td>
                      <td className="p-4 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wide
                          ${inv.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 
                            inv.status === 'overdue' ? 'bg-rose-100 text-rose-700' : 
                            'bg-amber-100 text-amber-700'}`}>
                          {inv.status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {invoices.length === 0 && (
                    <tr><td colSpan={6} className="p-10 text-center text-slate-500">No invoices found.</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'expenses' && (
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-10 text-center text-slate-500">Loading expenses...</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                    <th className="p-4 font-semibold">Category</th>
                    <th className="p-4 font-semibold">Description</th>
                    <th className="p-4 font-semibold">Date</th>
                    <th className="p-4 font-semibold">Method</th>
                    <th className="p-4 font-semibold text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {expenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-medium text-slate-800">{exp.category}</td>
                      <td className="p-4 text-sm text-slate-500">{exp.description || '-'}</td>
                      <td className="p-4 text-sm text-slate-500">{exp.expense_date}</td>
                      <td className="p-4 text-sm text-slate-500">{exp.payment_method || '-'}</td>
                      <td className="p-4 text-right font-semibold text-rose-600 tabular-nums">{formatCurrency(exp.amount)}</td>
                    </tr>
                  ))}
                  {expenses.length === 0 && (
                    <tr><td colSpan={5} className="p-10 text-center text-slate-500">No expenses found.</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Add Expense Modal */}
      {showExpenseForm && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50">
          <AddExpenseForm 
            onClose={() => { 
              setShowExpenseForm(false); 
              fetchFinanceData(); // Naya kharcha add hone par dashboard refresh karein
            }} 
          />
        </div>
      )}
    </div>
  );
};

export default FinancePage;
