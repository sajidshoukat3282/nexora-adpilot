import React, { useState, useEffect } from "react";
import { FiDollarSign, FiTrendingUp, FiArrowDown, FiCreditCard, FiPlus, FiPrinter } from "react-icons/fi";
import AddExpenseForm from "./AddExpenseForm";
import AddInvoiceForm from "./AddInvoiceForm";
import AddPaymentForm from "./AddPaymentForm";
import { PaymentReceiptDrawer } from "./PaymentReceiptDrawer";
import { InvoiceDetailDrawer } from "./InvoiceDetailDrawer";
import { ExpenseDetailDrawer } from "./ExpenseDetailDrawer";
import { useSession } from "@/hooks/useSession";
import { useCompanyProfile } from "@/hooks/useCompanyProfile";

export const FinancePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'invoices' | 'payments' | 'expenses' | 'ledger'>('overview');
  
  const { company } = useSession();
  const { profile } = useCompanyProfile();
  
  const [metrics, setMetrics] = useState<any>({ total_revenue: 0, total_expenses: 0, net_profit: 0, total_pending: 0 });
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Ledger States
  const [ledgerData, setLedgerData] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('all');
  const [ledgerLoading, setLedgerLoading] = useState(false);

  // Modal States
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [selectedExpense, setSelectedExpense] = useState<any>(null);

  const fetchFinanceData = async () => {
    setLoading(true);
    try {
      const [metricsRes, invoicesRes, paymentsRes, expensesRes, clientsRes] = await Promise.all([
        fetch('/api/finance/metrics'),
        fetch('/api/invoices'),
        fetch('/api/payments'),
        fetch('/api/expenses'),
        fetch('/api/crm/clients')
      ]);
      const mData = await metricsRes.json();
      const iData = await invoicesRes.json();
      const pData = await paymentsRes.json();
      const eData = await expensesRes.json();
      const cData = await clientsRes.json();

      if (mData.ok) setMetrics(mData.metrics);
      if (iData.ok) setInvoices(iData.data || []);
      if (pData.ok) setPayments(pData.data || []);
      if (eData.ok) setExpenses(eData.data || []);
      if (cData.ok) setClients(cData.data || []);
    } catch (err: any) { 
      console.error(err); 
    } finally { 
      setLoading(false); 
    }
  };

  const fetchLedger = async (clientId: string) => {
    setLedgerLoading(true);
    try {
      const res = await fetch(`/api/ledger?client_id=${clientId}`);
      const data = await res.json();
      if (data.ok) setLedgerData(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLedgerLoading(false);
    }
  };

  useEffect(() => { 
    fetchFinanceData(); 
  }, []);

  useEffect(() => {
    if (activeTab === 'ledger') {
      fetchLedger(selectedClientId);
    }
  }, [activeTab, selectedClientId]);

  const formatCurrency = (amount: number, currency = 'PKR') => {
    return new Intl.NumberFormat('en-PK', { style: 'currency', currency: currency, minimumFractionDigits: 0 }).format(amount);
  };

  const handlePrintPnL = () => { window.print(); };
  const handlePrintLedger = () => { window.print(); };

  // Running Balance Calculation
  let runningBalance = 0;
  const ledgerWithBalance = ledgerData.map((tx: any) => {
    if (tx.entry_type === 'Debit') runningBalance += tx.amount;
    if (tx.entry_type === 'Credit') runningBalance -= tx.amount;
    return { ...tx, balance: runningBalance };
  });

  const currentClientName = selectedClientId === 'all' ? 'All Transactions' : clients.find(c => c.id === selectedClientId)?.name || 'Client Ledger';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-6 rounded-xl">
      
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #printable-area, #printable-area * { visibility: visible; }
          #printable-area { position: absolute; left: 0; top: 0; width: 100%; background: white !important; color: black !important; padding: 20px; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="flex justify-between items-center mb-8 no-print">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Finance & Accounts</h1>
          <p className="text-sm text-slate-500 mt-1">Manage invoices, payments, expenses, and ledgers.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowPaymentForm(true)} className="bg-white border text-slate-700 px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 shadow-sm hover:bg-slate-50 transition-colors"><FiPlus className="text-emerald-500" /> Receive Payment</button>
          <button onClick={() => setShowExpenseForm(true)} className="bg-white border text-slate-700 px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 shadow-sm hover:bg-slate-50 transition-colors"><FiPlus className="text-rose-500" /> Add Expense</button>
          <button onClick={() => setShowInvoiceForm(true)} className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 shadow-sm hover:bg-emerald-700 transition-colors"><FiPlus /> Create Invoice</button>
        </div>
      </div>

      {/* KPI Cards (Hide on Print) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8 no-print">
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

      {/* Tabs (Hide on Print) */}
      <div className="flex border-b mb-6 bg-white px-2 rounded-t-xl overflow-x-auto no-print">
        <button onClick={() => setActiveTab('overview')} className={`px-6 py-4 text-sm font-semibold whitespace-nowrap border-b-2 ${activeTab === 'overview' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500'}`}>Profit & Loss</button>
        <button onClick={() => setActiveTab('invoices')} className={`px-6 py-4 text-sm font-semibold whitespace-nowrap border-b-2 ${activeTab === 'invoices' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500'}`}>Invoices ({invoices.length})</button>
        <button onClick={() => setActiveTab('payments')} className={`px-6 py-4 text-sm font-semibold whitespace-nowrap border-b-2 ${activeTab === 'payments' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500'}`}>Payments ({payments.length})</button>
        <button onClick={() => setActiveTab('expenses')} className={`px-6 py-4 text-sm font-semibold whitespace-nowrap border-b-2 ${activeTab === 'expenses' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500'}`}>Expenses ({expenses.length})</button>
        <button onClick={() => setActiveTab('ledger')} className={`px-6 py-4 text-sm font-semibold whitespace-nowrap border-b-2 ${activeTab === 'ledger' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500'}`}>Client Ledger</button>
      </div>

      <div className="bg-white border rounded-xl overflow-hidden shadow-sm p-6">
        
        {/* OVERVIEW TAB (P&L) */}
        {activeTab === 'overview' && (
          <div>
            <div className="flex justify-between items-center mb-6 no-print">
              <h2 className="text-lg font-bold text-slate-800">Financial Statement</h2>
              <button onClick={handlePrintPnL} className="bg-slate-800 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 hover:bg-slate-700 transition"><FiPrinter /> Print / PDF Report</button>
            </div>
            <div id="printable-area" className="max-w-4xl mx-auto bg-white text-slate-900 p-8 border border-slate-200 rounded-lg">
              <div className="flex justify-between items-start border-b-2 border-slate-800 pb-6 mb-6">
                <div>
                  <h1 className="text-3xl font-bold uppercase tracking-widest text-slate-900">Profit & Loss</h1>
                  <p className="text-slate-500 mt-1 font-medium">Financial Statement</p>
                </div>
                <div className="text-right">
                  <h2 className="text-lg font-bold text-slate-800">{profile?.legalName || company?.name || "Nexora Technologies"}</h2>
                  {profile?.address && <p className="text-sm text-slate-500">{[profile.address, profile.city, profile.country].filter(Boolean).join(", ")}</p>}
                  {profile?.ntn && <p className="text-sm text-slate-500 font-mono">NTN: {profile.ntn}</p>}
                  <p className="text-sm text-slate-500 mt-2">Generated on: {new Date().toLocaleDateString()}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 border-b border-slate-300 pb-1 mb-2">Revenue</h3>
                  <div className="flex justify-between text-sm py-1"><span className="text-slate-600">Total Revenue Collected (Payments Received)</span><span className="font-semibold text-emerald-700">{formatCurrency(metrics.total_revenue)}</span></div>
                  <div className="flex justify-between text-sm py-1"><span className="text-slate-600">Pending Receivables (Uncollected)</span><span className="font-medium text-slate-500">{formatCurrency(metrics.total_pending)}</span></div>
                </div>
                <div className="mt-6">
                  <h3 className="text-lg font-bold text-slate-800 border-b border-slate-300 pb-1 mb-2">Operating Expenses</h3>
                  <div className="flex justify-between text-sm py-1"><span className="text-slate-600">Total Expenses (Rent, Tax, Utilities, etc.)</span><span className="font-semibold text-rose-700">({formatCurrency(metrics.total_expenses)})</span></div>
                </div>
                <div className="mt-8 border-t-2 border-slate-800 pt-4">
                  <div className="flex justify-between text-xl font-bold text-slate-900"><span>Net Profit / (Loss)</span><span className={metrics.net_profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}>{formatCurrency(metrics.net_profit)}</span></div>
                </div>
              </div>
              <div className="mt-16 pt-8 flex justify-between items-end">
                <div className="text-center w-48 border-t border-slate-400 pt-2"><p className="text-sm font-medium text-slate-800">Prepared By</p></div>
                <div className="text-center w-48 border-t border-slate-400 pt-2"><p className="text-sm font-medium text-slate-800">Approved By</p></div>
              </div>
            </div>
          </div>
        )}

        {/* INVOICES TAB */}
        {activeTab === 'invoices' && (
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase"><tr><th className="p-4">Invoice #</th><th className="p-4">Client</th><th className="p-4 text-right">Total Amount</th><th className="p-4 text-right">Received</th><th className="p-4 text-right">Balance Due</th><th className="p-4 text-center">Status</th><th className="p-4 text-center">Action</th></tr></thead>
            <tbody className="divide-y">
              {invoices.map((inv: any) => {
                const balance = inv.total_amount - inv.amount_paid;
                return (
                  <tr key={inv.id} className="hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => setSelectedInvoice(inv)}>
                    <td className="p-4 font-mono text-sm text-emerald-600 font-medium">{inv.invoice_number}</td>
                    <td className="p-4">{inv.client_name}</td>
                    <td className="p-4 text-right font-medium">{formatCurrency(inv.total_amount)}</td>
                    <td className="p-4 text-right text-emerald-600">{formatCurrency(inv.amount_paid)}</td>
                    <td className={`p-4 text-right font-bold ${balance > 0 ? 'text-rose-600' : 'text-slate-400'}`}>{formatCurrency(balance)}</td>
                    <td className="p-4 text-center"><span className={`px-2 py-1 rounded text-xs font-bold uppercase ${inv.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : inv.status === 'overdue' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>{inv.status.replace('_', ' ')}</span></td>
                    <td className="p-4 text-center"><button className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded transition-colors font-medium">View / Print</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* PAYMENTS TAB */}
        {activeTab === 'payments' && (
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase"><tr><th className="p-4">Date</th><th className="p-4">Invoice</th><th className="p-4">Client</th><th className="p-4">Method</th><th className="p-4 text-right">Amount Received</th><th className="p-4 text-center">Receipt</th></tr></thead>
            <tbody className="divide-y">
              {payments.map((p: any) => (
                <tr key={p.id} className="hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => setSelectedReceipt({ ...p, currency: 'PKR' })}>
                  <td className="p-4 text-sm">{p.payment_date}</td>
                  <td className="p-4 font-mono text-sm text-emerald-600 font-medium">{p.invoice_number}</td>
                  <td className="p-4">{p.client_name}</td>
                  <td className="p-4 text-sm">{p.payment_method}</td>
                  <td className="p-4 text-right text-emerald-600 font-bold">{formatCurrency(p.amount)}</td>
                  <td className="p-4 text-center"><button className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 px-3 py-1.5 rounded transition-colors font-medium">Print Receipt</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* EXPENSES TAB */}
        {activeTab === 'expenses' && (
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase"><tr><th className="p-4">Category</th><th className="p-4">Description</th><th className="p-4">Date</th><th className="p-4">Method</th><th className="p-4 text-right">Amount</th><th className="p-4 text-center">Voucher</th></tr></thead>
            <tbody className="divide-y">
              {expenses.map((e: any) => (
                <tr key={e.id} className="hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => setSelectedExpense(e)}>
                  <td className="p-4 font-medium text-rose-600">{e.category}</td>
                  <td className="p-4 text-sm text-slate-500">{e.description || '-'}</td>
                  <td className="p-4 text-sm">{e.expense_date}</td>
                  <td className="p-4 text-sm">{e.payment_method}</td>
                  <td className="p-4 text-right text-rose-600 font-bold">{formatCurrency(e.amount)}</td>
                  <td className="p-4 text-center"><button className="text-xs bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3 py-1.5 rounded transition-colors font-medium">View / Print</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* LEDGER TAB */}
        {activeTab === 'ledger' && (
          <div>
            <div className="flex justify-between items-center mb-6 no-print">
              <div className="flex items-center gap-3">
                <label className="text-sm font-bold text-slate-700">Select Client:</label>
                <select 
                  className="border border-slate-300 rounded-lg p-2 text-sm outline-none bg-white text-slate-900"
                  value={selectedClientId}
                  onChange={(e: any) => setSelectedClientId(e.target.value)}
                >
                  <option value="all">All Clients (General Ledger)</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <button onClick={handlePrintLedger} className="bg-slate-800 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 hover:bg-slate-700 transition">
                <FiPrinter /> Print Ledger
              </button>
            </div>

            <div id="printable-area" className="bg-white text-slate-900 p-6 border border-slate-200 rounded-lg">
              <div className="text-center border-b-2 border-slate-800 pb-4 mb-6">
                <h2 className="text-2xl font-bold uppercase tracking-widest">{currentClientName}</h2>
                <p className="text-sm text-slate-500 mt-1">Account Ledger - {company?.name}</p>
              </div>

              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 border-b-2 border-slate-300">
                    <th className="p-3">Date</th>
                    <th className="p-3">Description</th>
                    <th className="p-3">Type</th>
                    <th className="p-3 text-right">Debit (+)</th>
                    <th className="p-3 text-right">Credit (-)</th>
                    <th className="p-3 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerLoading ? (
                    <tr><td colSpan={6} className="text-center p-4">Loading ledger...</td></tr>
                  ) : ledgerWithBalance.length === 0 ? (
                    <tr><td colSpan={6} className="text-center p-4 text-slate-400">No transactions found for this client.</td></tr>
                  ) : (
                    ledgerWithBalance.map((tx: any, index: number) => (
                      <tr key={index} className="border-b border-slate-100">
                        <td className="p-3 text-slate-600">{tx.date}</td>
                        <td className="p-3 font-medium">{tx.reference}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${tx.type === 'Invoice' ? 'bg-blue-100 text-blue-700' : tx.type === 'Payment' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                            {tx.type}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono">{tx.entry_type === 'Debit' ? formatCurrency(tx.amount) : '-'}</td>
                        <td className="p-3 text-right font-mono text-emerald-600">{tx.entry_type === 'Credit' ? formatCurrency(tx.amount) : '-'}</td>
                        <td className="p-3 text-right font-mono font-bold">{formatCurrency(tx.balance)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* Modals & Drawers */}
      {showExpenseForm && <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><AddExpenseForm onClose={() => { setShowExpenseForm(false); fetchFinanceData(); }} /></div>}
      {showInvoiceForm && <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><AddInvoiceForm onClose={() => { setShowInvoiceForm(false); fetchFinanceData(); }} /></div>}
      {showPaymentForm && <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><AddPaymentForm onClose={() => setShowPaymentForm(false)} onSuccess={fetchFinanceData} /></div>}
      
      <InvoiceDetailDrawer invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} onRecordPayment={() => { setSelectedInvoice(null); setShowPaymentForm(true); }} />
      <PaymentReceiptDrawer payment={selectedReceipt} onClose={() => setSelectedReceipt(null)} />
      <ExpenseDetailDrawer expense={selectedExpense} onClose={() => setSelectedExpense(null)} />
    </div>
  );
};

export default FinancePage;
