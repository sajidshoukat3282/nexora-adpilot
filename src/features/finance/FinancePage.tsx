import React, { useState, useEffect, useMemo } from "react";
import { FiDollarSign, FiTrendingUp, FiArrowDown, FiCreditCard, FiPlus, FiFileText } from "react-icons/fi";
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

  const [ledgerData, setLedgerData] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('all');
  const [ledgerLoading, setLedgerLoading] = useState(false);

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

  const handlePrint = () => { window.print(); };

  // Ledger Calculations & Totals
  let runningBalance = 0;
  let totalDebit = 0;
  let totalCredit = 0;

  const ledgerWithBalance = ledgerData.map((tx: any) => {
    if (tx.entry_type === 'Debit') {
      runningBalance += tx.amount;
      totalDebit += tx.amount;
    }
    if (tx.entry_type === 'Credit') {
      runningBalance -= tx.amount;
      totalCredit += tx.amount;
    }
    return { ...tx, balance: runningBalance };
  });

  const currentClientName = selectedClientId === 'all' ? 'All Transactions' : clients.find(c => c.id === selectedClientId)?.name || 'Client Ledger';

  const PrintHeader = ({ title }: { title: string }) => (
    <div className="flex justify-between items-start border-b-2 border-slate-800 pb-4 mb-4">
      <div>
        <h1 className="text-2xl font-bold uppercase tracking-widest text-slate-900">{title}</h1>
        <p className="text-slate-500 mt-1 text-sm font-medium">Financial Document</p>
      </div>
      <div className="text-right">
        <h2 className="text-base font-bold text-slate-800">{profile?.legalName || company?.name || "Nexora Technologies"}</h2>
        {profile?.address && <p className="text-xs text-slate-500">{[profile.address, profile.city, profile.country].filter(Boolean).join(", ")}</p>}
        {profile?.phone && <p className="text-xs text-slate-500">Tel: {profile.phone}</p>}
        {profile?.ntn && <p className="text-xs text-slate-500 font-mono">NTN: {profile.ntn}</p>}
        <p className="text-xs text-slate-500 mt-1">Generated on: {new Date().toLocaleDateString()}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-4 rounded-xl">
      
      <style>{`
  @media print {
    @page { size: A4; margin: 0; }
    body, html { margin: 0; padding: 0; background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body * { visibility: hidden; }
    
    /* Agar koi Drawer khula hai (Invoice/Receipt/Expense), to list ko print mat karo */
    ${selectedInvoice || selectedReceipt || selectedExpense ? '#printable-area { display: none !important; }' : '#printable-area, #printable-area * { visibility: visible; }'}
    
    #printable-area {
      position: absolute; left: 0; top: 0; width: 100%;
      min-height: 100vh;
      padding-top: 25mm !important; 
      padding-left: 15mm !important;
      padding-right: 15mm !important;
      padding-bottom: 20mm !important;
      background: white !important; color: black !important;
    }
    
    .no-print { display: none !important; }
    table { width: 100% !important; border-collapse: collapse !important; }
    th, td { border-bottom: 1px solid #e2e8f0 !important; padding: 8px !important; color: black !important; font-size: 12px !important; }
    thead { background-color: #f1f5f9 !important; }

    .print-footer {
      position: absolute;
      bottom: 10mm;
      left: 15mm;
      right: 15mm;
      text-align: center;
      border-top: 1px solid #e2e8f0;
      padding-top: 10px;
    }
  }
`}</style>

      <div className="flex justify-between items-center mb-6 no-print">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Finance & Accounts</h1>
          <p className="text-xs text-slate-500 mt-1">Manage invoices, payments, expenses, and ledgers.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setActiveTab('ledger')} className="bg-white border text-slate-700 px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 shadow-sm hover:bg-slate-50 transition-colors">
            <FiFileText className="text-blue-500" size={14} /> Client Ledger
          </button>
          <button onClick={() => setShowPaymentForm(true)} className="bg-white border text-slate-700 px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 shadow-sm hover:bg-slate-50 transition-colors">
            <FiPlus className="text-emerald-500" size={14} /> Receive Payment
          </button>
          <button onClick={() => setShowExpenseForm(true)} className="bg-white border text-slate-700 px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 shadow-sm hover:bg-slate-50 transition-colors">
            <FiPlus className="text-rose-500" size={14} /> Add Expense
          </button>
          <button onClick={() => setShowInvoiceForm(true)} className="bg-emerald-600 text-white px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 shadow-sm hover:bg-emerald-700 transition-colors">
            <FiPlus size={14} /> Create Invoice
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6 no-print">
        <div className="bg-white border rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1"><div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600"><FiTrendingUp size={14} /></div><p className="text-xs text-slate-500 font-medium">Revenue Collected</p></div>
          <h3 className="text-xl font-bold text-slate-900">{formatCurrency(metrics.total_revenue)}</h3>
        </div>
        <div className="bg-white border rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1"><div className="w-6 h-6 rounded-full bg-rose-100 flex items-center justify-center text-rose-600"><FiArrowDown size={14} /></div><p className="text-xs text-slate-500 font-medium">Total Expenses</p></div>
          <h3 className="text-xl font-bold text-slate-900">{formatCurrency(metrics.total_expenses)}</h3>
        </div>
        <div className="bg-white border rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1"><div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600"><FiDollarSign size={14} /></div><p className="text-xs text-slate-500 font-medium">Net Profit / Loss</p></div>
          <h3 className={`text-xl font-bold ${metrics.net_profit >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>{formatCurrency(metrics.net_profit)}</h3>
        </div>
        <div className="bg-white border rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1"><div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-amber-600"><FiCreditCard size={14} /></div><p className="text-xs text-slate-500 font-medium">Pending Receivables</p></div>
          <h3 className="text-xl font-bold text-slate-900">{formatCurrency(metrics.total_pending)}</h3>
        </div>
      </div>

      <div className="flex border-b mb-4 bg-white px-1 rounded-t-lg overflow-x-auto no-print">
        <button onClick={() => setActiveTab('overview')} className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 ${activeTab === 'overview' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500'}`}>Profit & Loss</button>
        <button onClick={() => setActiveTab('invoices')} className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 ${activeTab === 'invoices' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500'}`}>Invoices ({invoices.length})</button>
        <button onClick={() => setActiveTab('payments')} className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 ${activeTab === 'payments' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500'}`}>Payments ({payments.length})</button>
        <button onClick={() => setActiveTab('expenses')} className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 ${activeTab === 'expenses' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500'}`}>Expenses ({expenses.length})</button>
        <button onClick={() => setActiveTab('ledger')} className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 ${activeTab === 'ledger' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500'}`}>Client Ledger</button>
      </div>

      <div className="bg-white border rounded-lg overflow-hidden shadow-sm p-4">
        
        {activeTab === 'overview' && (
          <div>
            <div className="flex justify-between items-center mb-4 no-print">
              <h2 className="text-base font-bold text-slate-800">Financial Statement</h2>
              <button onClick={handlePrint} className="bg-slate-800 text-white px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 hover:bg-slate-700 transition">🖨️ Print / PDF</button>
            </div>
            <div id="printable-area" className="max-w-3xl mx-auto bg-white text-slate-900 p-6 border border-slate-200 rounded-lg relative">
              <PrintHeader title="Profit & Loss" />
              <div className="space-y-3 text-sm">
                <div>
                  <h3 className="text-base font-bold text-slate-800 border-b border-slate-300 pb-1 mb-2">Revenue</h3>
                  <div className="flex justify-between py-1"><span className="text-slate-600">Total Revenue Collected</span><span className="font-semibold text-emerald-700">{formatCurrency(metrics.total_revenue)}</span></div>
                  <div className="flex justify-between py-1"><span className="text-slate-600">Pending Receivables</span><span className="font-medium text-slate-500">{formatCurrency(metrics.total_pending)}</span></div>
                </div>
                <div className="mt-4">
                  <h3 className="text-base font-bold text-slate-800 border-b border-slate-300 pb-1 mb-2">Operating Expenses</h3>
                  <div className="flex justify-between py-1"><span className="text-slate-600">Total Expenses</span><span className="font-semibold text-rose-700">({formatCurrency(metrics.total_expenses)})</span></div>
                </div>
                <div className="mt-6 border-t-2 border-slate-800 pt-3">
                  <div className="flex justify-between text-lg font-bold text-slate-900"><span>Net Profit / (Loss)</span><span className={metrics.net_profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}>{formatCurrency(metrics.net_profit)}</span></div>
                </div>
              </div>
              
              <div className="mt-16 pt-6 flex justify-between items-end border-t border-slate-200">
                <div className="text-center w-40 border-t border-slate-400 pt-1"><p className="text-xs font-medium text-slate-800">Prepared By</p></div>
                <div className="text-center w-40 border-t border-slate-400 pt-1"><p className="text-xs font-medium text-slate-800">Approved By</p></div>
              </div>

              <div className="print-footer mt-8 border-t border-slate-200 pt-3">
                <p className="text-[10px] text-slate-400 font-medium">This is a system generated report.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'invoices' && (
          <div>
            <div className="flex justify-between items-center mb-4 no-print">
              <h2 className="text-base font-bold text-slate-800">All Invoices</h2>
              <button onClick={handlePrint} className="bg-slate-800 text-white px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 hover:bg-slate-700 transition">🖨️ Print / PDF</button>
            </div>
            <div id="printable-area" className="bg-white text-slate-900 p-4 border border-slate-200 rounded-lg relative">
              <PrintHeader title="Invoices List" />
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-100 text-slate-600 uppercase border-b-2 border-slate-300"><tr><th className="p-2">Invoice #</th><th className="p-2">Client</th><th className="p-2 text-right">Total</th><th className="p-2 text-right">Received</th><th className="p-2 text-right">Balance</th><th className="p-2 text-center">Status</th><th className="p-2 text-center no-print">Action</th></tr></thead>
                <tbody className="divide-y divide-slate-200">
                  {invoices.map((inv: any) => {
                    const balance = inv.total_amount - inv.amount_paid;
                    return (
                      <tr key={inv.id} onClick={() => setSelectedInvoice(inv)} className="hover:bg-slate-50 cursor-pointer transition-colors">
                        <td className="p-2 font-mono">{inv.invoice_number}</td>
                        <td className="p-2">{inv.client_name}</td>
                        <td className="p-2 text-right font-medium">{formatCurrency(inv.total_amount)}</td>
                        <td className="p-2 text-right text-emerald-600">{formatCurrency(inv.amount_paid)}</td>
                        <td className={`p-2 text-right font-bold ${balance > 0 ? 'text-rose-600' : 'text-slate-400'}`}>{formatCurrency(balance)}</td>
                        <td className="p-2 text-center"><span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${inv.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : inv.status === 'overdue' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>{inv.status.replace('_', ' ')}</span></td>
                        <td className="p-2 text-center no-print"><button className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded font-medium">View</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="print-footer mt-8 border-t border-slate-200 pt-3">
                <p className="text-[10px] text-slate-400 font-medium">This is a system generated report.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'payments' && (
          <div>
            <div className="flex justify-between items-center mb-4 no-print">
              <h2 className="text-base font-bold text-slate-800">All Payments Received</h2>
              <button onClick={handlePrint} className="bg-slate-800 text-white px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 hover:bg-slate-700 transition">🖨️ Print / PDF</button>
            </div>
            <div id="printable-area" className="bg-white text-slate-900 p-4 border border-slate-200 rounded-lg relative">
              <PrintHeader title="Payments Received" />
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-100 text-slate-600 uppercase border-b-2 border-slate-300"><tr><th className="p-2">Date</th><th className="p-2">Invoice</th><th className="p-2">Client</th><th className="p-2">Method</th><th className="p-2 text-right">Amount</th></tr></thead>
                <tbody className="divide-y divide-slate-200">
                  {payments.map((p: any) => (
                    <tr key={p.id} onClick={() => setSelectedReceipt({ ...p, currency: 'PKR' })} className="hover:bg-slate-50 cursor-pointer transition-colors">
                      <td className="p-2">{p.payment_date}</td>
                      <td className="p-2 font-mono">{p.invoice_number}</td>
                      <td className="p-2">{p.client_name}</td>
                      <td className="p-2">{p.payment_method}</td>
                      <td className="p-2 text-right text-emerald-600 font-bold">{formatCurrency(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="print-footer mt-8 border-t border-slate-200 pt-3">
                <p className="text-[10px] text-slate-400 font-medium">This is a system generated report.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'expenses' && (
          <div>
            <div className="flex justify-between items-center mb-4 no-print">
              <h2 className="text-base font-bold text-slate-800">All Expenses</h2>
              <button onClick={handlePrint} className="bg-slate-800 text-white px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 hover:bg-slate-700 transition">🖨️ Print / PDF</button>
            </div>
            <div id="printable-area" className="bg-white text-slate-900 p-4 border border-slate-200 rounded-lg relative">
              <PrintHeader title="Expenses List" />
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-100 text-slate-600 uppercase border-b-2 border-slate-300"><tr><th className="p-2">Category</th><th className="p-2">Description</th><th className="p-2">Date</th><th className="p-2">Method</th><th className="p-2 text-right">Amount</th></tr></thead>
                <tbody className="divide-y divide-slate-200">
                  {expenses.map((e: any) => (
                    <tr key={e.id} onClick={() => setSelectedExpense(e)} className="hover:bg-slate-50 cursor-pointer transition-colors">
                      <td className="p-2 font-medium text-rose-600">{e.category}</td>
                      <td className="p-2 text-slate-500">{e.description || '-'}</td>
                      <td className="p-2">{e.expense_date}</td>
                      <td className="p-2">{e.payment_method}</td>
                      <td className="p-2 text-right text-rose-600 font-bold">{formatCurrency(e.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="print-footer mt-8 border-t border-slate-200 pt-3">
                <p className="text-[10px] text-slate-400 font-medium">This is a system generated report.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ledger' && (
          <div>
            <div className="flex justify-between items-center mb-4 no-print">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-700">Select Client:</label>
                <select 
                  className="border border-slate-300 rounded-md p-1.5 text-xs outline-none bg-white text-slate-900"
                  value={selectedClientId}
                  onChange={(e: any) => setSelectedClientId(e.target.value)}
                >
                  <option value="all">All Clients (General Ledger)</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <button onClick={handlePrint} className="bg-slate-800 text-white px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 hover:bg-slate-700 transition">
                🖨️ Print / PDF
              </button>
            </div>

            <div id="printable-area" className="bg-white text-slate-900 p-6 border border-slate-200 rounded-lg relative">
              <PrintHeader title="Account Ledger" />
              <p className="text-center font-bold text-sm mb-3 text-slate-800">Client: {currentClientName}</p>

              <table className="w-full text-left text-xs mb-12 border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 border-b-2 border-slate-300">
                    <th className="p-2">Date</th>
                    <th className="p-2">Description</th>
                    <th className="p-2">Type</th>
                    <th className="p-2 text-right">Debit (+)</th>
                    <th className="p-2 text-right">Credit (-)</th>
                    <th className="p-2 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerLoading ? (
                    <tr><td colSpan={6} className="text-center p-3">Loading ledger...</td></tr>
                  ) : ledgerWithBalance.length === 0 ? (
                    <tr><td colSpan={6} className="text-center p-3 text-slate-400">No transactions found.</td></tr>
                  ) : (
                    ledgerWithBalance.map((tx: any, index: number) => (
                      <tr key={index} className="border-b border-slate-100">
                        <td className="p-2 text-slate-600">{tx.date}</td>
                        <td className="p-2 font-medium">{tx.client_name} {tx.type === 'Expense' ? '' : `(${tx.reference})`}</td>
                        <td className="p-2">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${tx.type === 'Invoice' ? 'bg-blue-100 text-blue-700' : tx.type === 'Payment' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                            {tx.type}
                          </span>
                        </td>
                        <td className="p-2 text-right font-mono">{tx.entry_type === 'Debit' ? formatCurrency(tx.amount) : '-'}</td>
                        <td className="p-2 text-right font-mono text-emerald-600">{tx.entry_type === 'Credit' ? formatCurrency(tx.amount) : '-'}</td>
                        <td className="p-2 text-right font-mono font-bold">{formatCurrency(tx.balance)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 font-bold border-t-2 border-slate-300">
                    <td colSpan={3} className="p-2 text-right uppercase tracking-wider text-slate-600">Total:</td>
                    <td className="p-2 text-right font-mono">{formatCurrency(totalDebit)}</td>
                    <td className="p-2 text-right font-mono text-emerald-600">{formatCurrency(totalCredit)}</td>
                    <td className="p-2 text-right font-mono text-blue-600">{formatCurrency(runningBalance)}</td>
                  </tr>
                </tfoot>
              </table>

              <div className="flex justify-between items-end mt-12 pt-6 border-t border-slate-200">
                <div className="text-center w-40 border-t border-slate-400 pt-1">
                  <p className="text-xs font-medium text-slate-800">Prepared By</p>
                </div>
                <div className="text-center w-40 border-t border-slate-400 pt-1">
                  <p className="text-xs font-medium text-slate-800">Approved By</p>
                </div>
              </div>

              <div className="print-footer mt-8 border-t border-slate-200 pt-3">
                <p className="text-[10px] text-slate-400 font-medium">This is a system generated report.</p>
              </div>
            </div>
          </div>
        )}

      </div>

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
