import React, { useState, useEffect } from "react";
import { FiDollarSign, FiTrendingUp, FiArrowDown, FiCreditCard, FiPlus } from "react-icons/fi";
import AddExpenseForm from "./AddExpenseForm";
import AddInvoiceForm from "./AddInvoiceForm";
import AddPaymentForm from "./AddPaymentForm";

export const FinancePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'invoices' | 'payments' | 'expenses'>('overview');
  
  const [metrics, setMetrics] = useState<any>({ total_revenue: 0, total_expenses: 0, net_profit: 0, total_pending: 0 });
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  const fetchFinanceData = async () => {
    setLoading(true);
    try {
      const [metricsRes, invoicesRes, paymentsRes, expensesRes] = await Promise.all([
        fetch('/api/finance/metrics'),
        fetch('/api/invoices'),
        fetch('/api/payments'),
        fetch('/api/expenses')
      ]);
      const mData = await metricsRes.json();
      const iData = await invoicesRes.json();
      const pData = await paymentsRes.json();
      const eData = await expensesRes.json();

      if (mData.ok) setMetrics(mData.metrics);
      if (iData.ok) setInvoices(iData.data || []);
      if (pData.ok) setPayments(pData.data || []);
      if (eData.ok) setExpenses(eData.data || []);
    } catch (err: any) { 
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
          <p className="text-sm text-slate-500 mt-1">Manage invoices, payments, expenses, and P&L.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowPaymentForm(true)} className="bg-white border text-slate-700 px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 shadow-sm hover:bg-slate-50 transition-colors">
            <FiPlus className="text-emerald-500" /> Receive Payment
          </button>
          <button onClick={() => setShowExpenseForm(true)} className="bg-white border text-slate-700 px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 shadow-sm hover:bg-slate-50 transition-colors">
            <FiPlus className="text-rose-500" /> Add Expense
          </button>
          <button onClick={() => setShowInvoiceForm(true)} className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 shadow-sm hover:bg-emerald-700 transition-colors">
            <FiPlus /> Create Invoice
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
        <div className="bg-white border rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2"><div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600"><FiTrendingUp size={16} /></div><p className="text-sm text-slate-500 font-medium">Revenue Collected</p></div>
          <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(metrics.total_revenue)}</h3>
        </div>
        <div className="bg-white border rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2"><div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-600"><FiArrowDown size={16} /></div><p className="text-sm text-slate-500 font-medium">Total Expenses</p></div>
          <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(metrics.total_expenses)}</h3>
        </div>
        <div className="bg-white border rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2"><div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600"><FiDollarSign size={16} /></div><p className="text-sm text-slate-500 font-medium">Net Profit / Loss</p></div>
          <h3 className={`text-2xl font-bold ${metrics.net_profit >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>{formatCurrency(metrics.net_profit)}</h3>
        </div>
        <div className="bg-white border rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2"><div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600"><FiCreditCard size={16} /></div><p className="text-sm text-slate-500 font-medium">Pending Receivables</p></div>
          <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(metrics.total_pending)}</h3>
        </div>
      </div>

      <div className="flex border-b mb-6 bg-white px-2 rounded-t-xl overflow-x-auto">
        <button onClick={() => setActiveTab('overview')} className={`px-6 py-4 text-sm font-semibold whitespace-nowrap border-b-2 ${activeTab === 'overview' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500'}`}>Profit & Loss</button>
        <button onClick={() => setActiveTab('invoices')} className={`px-6 py-4 text-sm font-semibold whitespace-nowrap border-b-2 ${activeTab === 'invoices' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500'}`}>Invoices ({invoices.length})</button>
        <button onClick={() => setActiveTab('payments')} className={`px-6 py-4 text-sm font-semibold whitespace-nowrap border-b-2 ${activeTab === 'payments' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500'}`}>Payments ({payments.length})</button>
        <button onClick={() => setActiveTab('expenses')} className={`px-6 py-4 text-sm font-semibold whitespace-nowrap border-b-2 ${activeTab === 'expenses' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500'}`}>Expenses ({expenses.length})</button>
      </div>

      <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
        {activeTab === 'overview' && <div className="p-10 text-center text-slate-400">Financial Summary Chart</div>}

        {activeTab === 'invoices' && (
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
              <tr>
                <th className="p-4">Invoice #</th>
                <th className="p-4">Client</th>
                <th className="p-4 text-right">Total Amount</th>
                <th className="p-4 text-right">Received</th>
                <th className="p-4 text-right">Balance Due</th>
                <th className="p-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {invoices.map((inv: any) => {
                const balance = inv.total_amount - inv.amount_paid;
                return (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <td className="p-4 font-mono text-sm">{inv.invoice_number}</td>
                    <td className="p-4">{inv.client_name}</td>
                    <td className="p-4 text-right font-medium">{formatCurrency(inv.total_amount)}</td>
                    <td className="p-4 text-right text-emerald-600">{formatCurrency(inv.amount_paid)}</td>
                    <td className={`p-4 text-right font-bold ${balance > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                      {formatCurrency(balance)}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${inv.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : inv.status === 'overdue' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                        {inv.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {invoices.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-slate-500">No invoices found</td></tr>}
            </tbody>
          </table>
        )}

        {activeTab === 'payments' && (
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
              <tr>
                <th className="p-4">Date</th>
                <th className="p-4">Invoice</th>
                <th className="p-4">Client</th>
                <th className="p-4">Method</th>
                <th className="p-4 text-right">Amount Received</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {payments.map((p: any) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="p-4 text-sm">{p.payment_date}</td>
                  <td className="p-4 font-mono text-sm">{p.invoice_number}</td>
                  <td className="p-4">{p.client_name}</td>
                  <td className="p-4 text-sm">{p.payment_method}</td>
                  <td className="p-4 text-right text-emerald-600 font-bold">{formatCurrency(p.amount)}</td>
                </tr>
              ))}
              {payments.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-slate-500">No payments found</td></tr>}
            </tbody>
          </table>
        )}

        {activeTab === 'expenses' && (
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase"><tr><th className="p-4">Category</th><th className="p-4">Date</th><th className="p-4">Method</th><th className="p-4 text-right">Amount</th></tr></thead>
            <tbody className="divide-y">
              {expenses.map((e: any) => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="p-4 font-medium">{e.category}</td><td className="p-4 text-sm">{e.expense_date}</td><td className="p-4 text-sm">{e.payment_method}</td>
                  <td className="p-4 text-right text-rose-600 font-bold">{formatCurrency(e.amount)}</td>
                </tr>
              ))}
              {expenses.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-slate-500">No expenses found</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {showExpenseForm && <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><AddExpenseForm onClose={() => { setShowExpenseForm(false); fetchFinanceData(); }} /></div>}
      {showInvoiceForm && <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><AddInvoiceForm onClose={() => { setShowInvoiceForm(false); fetchFinanceData(); }} /></div>}
      {showPaymentForm && <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><AddPaymentForm onClose={() => setShowPaymentForm(false)} onSuccess={fetchFinanceData} /></div>}
    </div>
  );
};

export default FinancePage;
