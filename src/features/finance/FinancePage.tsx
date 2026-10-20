import React, { useState, useEffect, useMemo } from "react";
import { getDefaultCurrency } from "@/lib/companyDefaults";
import { FiDollarSign, FiTrendingUp, FiArrowDown, FiCreditCard, FiPlus, FiFileText } from "react-icons/fi";
import AddExpenseForm from "./AddExpenseForm";
import AddInvoiceForm from "./AddInvoiceForm";
import AddPaymentForm from "./AddPaymentForm";
import { PaymentReceiptDrawer } from "./PaymentReceiptDrawer"; 
import { InvoiceDetailDrawer } from "./InvoiceDetailDrawer";
import { ExpenseDetailDrawer } from "./ExpenseDetailDrawer";
import FinanceInsights from "./FinanceInsights";
import { useSession } from "@/hooks/useSession";
import { useCompanyProfile } from "@/hooks/useCompanyProfile";  
import { FIN, GOLD_CARD, SILVER_CARD, SectionTitle, fit, statusPill } from "./financeUi";

export const FinancePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'invoices' | 'payments' | 'expenses' | 'ledger' | 'insights'>('overview');

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

  const formatCurrency = (amount: number, currency = getDefaultCurrency()) => {
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
    <div className="mb-4 flex items-start justify-between border-b border-[#c99b3b]/40 pb-4">
      <div>
        <h1 className="text-[16px] font-semibold uppercase tracking-[0.24em] text-zinc-50">{title}</h1>
        <p className="mt-1 text-[11px] font-medium text-[#d9b45a]">Financial Document</p>
      </div>
      <div className="text-right">
        <h2 className="text-[13px] font-semibold text-zinc-100">{profile?.legalName || company?.name || "Nexora Technologies"}</h2>
        {profile?.address && <p className="text-[11px] text-zinc-400">{[profile.address, profile.city, profile.country].filter(Boolean).join(", ")}</p>}
        {profile?.phone && <p className="text-[11px] text-zinc-400">Tel: {profile.phone}</p>}
        {profile?.ntn && <p className="font-mono text-[11px] text-zinc-400">NTN: {profile.ntn}</p>}
        <p className="mt-1 text-[11px] text-zinc-500">Generated on: {new Date().toLocaleDateString()}</p>
      </div>
    </div>
  );

  const tabClass = (t: string) =>
    `whitespace-nowrap border-b-2 px-3.5 py-2.5 text-[11px] font-semibold tracking-wide transition-colors ${
      activeTab === t
        ? 'border-[#d9b45a] text-[#f1d68a]'
        : 'border-transparent text-zinc-500 hover:text-zinc-300'
    }`;

  const th = "px-2.5 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400";
  const td = "px-2.5 py-2.5";

  const revenueText = formatCurrency(metrics.total_revenue);
  const expensesText = formatCurrency(metrics.total_expenses);
  const profitText = formatCurrency(metrics.net_profit);
  const pendingText = formatCurrency(metrics.total_pending);

  return (
    <div className={FIN.page}>

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

    /* On screen the statement is dark; on paper it is always black on white */
    #printable-area * { color: #111 !important; background: transparent !important; border-color: #d4d4d8 !important; box-shadow: none !important; }
    #printable-area { background: white !important; border: 0 !important; }

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

      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[18px] font-normal tracking-tight text-zinc-100">Finance &amp; Accounts</h1>
          <p className="mt-0.5 text-[11px] text-zinc-500">Manage invoices, payments, expenses, and ledgers.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setActiveTab('ledger')} className={FIN.btnGhost}>
            <FiFileText className="text-sky-400" size={13} /> Client Ledger
          </button>
          <button onClick={() => setShowPaymentForm(true)} className={FIN.btnGhost}>
            <FiPlus className="text-emerald-400" size={13} /> Receive Payment
          </button>
          <button onClick={() => setShowExpenseForm(true)} className={FIN.btnGhost}>
            <FiPlus className="text-rose-400" size={13} /> Add Expense
          </button>
          <button onClick={() => setShowInvoiceForm(true)} className={FIN.btnGold}>
            <FiPlus size={13} /> Create Invoice
          </button>
        </div>
      </div>

      <div className="no-print mb-4 grid grid-cols-2 gap-2.5 xl:grid-cols-4">
        {/* Revenue - gold */}
        <div style={GOLD_CARD} className="flex min-h-[78px] min-w-0 flex-col justify-between rounded-xl border border-[#f6e2a1]/50 p-3">
          <div className="flex items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black/15 text-[#3d2a05]"><FiTrendingUp size={12} /></span>
            <p className="text-[11px] font-medium text-[#6b4a0c]">Revenue Collected</p>
          </div>
          <h3 className="max-w-full whitespace-nowrap font-semibold leading-none text-[#1a1204]" style={{ fontSize: fit(revenueText, 24) }}>{revenueText}</h3>
        </div>

        {/* Expenses - dark */}
        <div className={`${FIN.panel} flex min-h-[78px] min-w-0 flex-col justify-between p-3`}>
          <div className="flex items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500/15 text-rose-400"><FiArrowDown size={12} /></span>
            <p className="text-[11px] font-medium text-zinc-300">Total Expenses</p>
          </div>
          <h3 className="max-w-full whitespace-nowrap font-semibold leading-none text-white" style={{ fontSize: fit(expensesText, 24) }}>{expensesText}</h3>
        </div>

        {/* Net profit - dark */}
        <div className={`${FIN.panel} flex min-h-[78px] min-w-0 flex-col justify-between p-3`}>
          <div className="flex items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#c99b3b]/15 text-[#e5c36a]"><FiDollarSign size={12} /></span>
            <p className="text-[11px] font-medium text-zinc-300">Net Profit / Loss</p>
          </div>
          <h3 className={`max-w-full whitespace-nowrap font-semibold leading-none ${metrics.net_profit >= 0 ? 'text-[#f1d68a]' : 'text-rose-400'}`} style={{ fontSize: fit(profitText, 24) }}>{profitText}</h3>
        </div>

        {/* Pending - silver */}
        <div style={SILVER_CARD} className="flex min-h-[78px] min-w-0 flex-col justify-between rounded-xl border border-white/40 p-3">
          <div className="flex items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black/10 text-[#3a3f46]"><FiCreditCard size={12} /></span>
            <p className="text-[11px] font-medium text-[#3a3f46]">Pending Receivables</p>
          </div>
          <h3 className="max-w-full whitespace-nowrap font-semibold leading-none text-[#22262b]" style={{ fontSize: fit(pendingText, 24) }}>{pendingText}</h3>
        </div>
      </div>

      <div className="no-print mb-3 flex overflow-x-auto border-b border-[#2a2f37]">
        <button onClick={() => setActiveTab('overview')} className={tabClass('overview')}>Profit & Loss</button>
        <button onClick={() => setActiveTab('invoices')} className={tabClass('invoices')}>Invoices ({invoices.length})</button>
        <button onClick={() => setActiveTab('payments')} className={tabClass('payments')}>Payments ({payments.length})</button>
        <button onClick={() => setActiveTab('expenses')} className={tabClass('expenses')}>Expenses ({expenses.length})</button>
        <button onClick={() => setActiveTab('ledger')} className={tabClass('ledger')}>Client Ledger</button>
        <button onClick={() => setActiveTab('insights')} className={tabClass('insights')}>Insights</button>
      </div>

      <div className={`${FIN.panel} min-w-0 overflow-hidden p-3`}>

        {activeTab === 'insights' && (
          <FinanceInsights invoices={invoices} payments={payments} expenses={expenses} />
        )}

        {activeTab === 'overview' && (
          <div>
            <div className="no-print mb-3 flex items-center justify-between">
              <SectionTitle>Financial Statement</SectionTitle>
              <button onClick={handlePrint} className={FIN.btnGhost}>ðŸ–¨ï¸ Print / PDF</button>
            </div>
            <div id="printable-area" className="relative mx-auto max-w-3xl rounded-xl border border-[#2a2f37] bg-[#0f1216] p-5 text-zinc-100">
              <PrintHeader title="Profit & Loss" />
              <div className="space-y-3 text-[12px]">
                <div>
                  <h3 className="mb-2 border-b border-[#2a2f37] pb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#d9b45a]">Revenue</h3>
                  <div className="flex justify-between py-1"><span className="text-zinc-400">Total Revenue Collected</span><span className="font-semibold text-emerald-400">{formatCurrency(metrics.total_revenue)}</span></div>
                  <div className="flex justify-between py-1"><span className="text-zinc-400">Pending Receivables</span><span className="font-medium text-zinc-300">{formatCurrency(metrics.total_pending)}</span></div>
                </div>
                <div className="mt-4">
                  <h3 className="mb-2 border-b border-[#2a2f37] pb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#d9b45a]">Operating Expenses</h3>
                  <div className="flex justify-between py-1"><span className="text-zinc-400">Total Expenses</span><span className="font-semibold text-rose-400">({formatCurrency(metrics.total_expenses)})</span></div>
                </div>
                <div className="mt-5 border-t border-[#c99b3b]/40 pt-3">
                  <div className="flex justify-between text-[15px] font-semibold text-zinc-50"><span>Net Profit / (Loss)</span><span className={metrics.net_profit >= 0 ? 'text-[#f1d68a]' : 'text-rose-400'}>{formatCurrency(metrics.net_profit)}</span></div>
                </div>
              </div>

              <div className="mt-12 flex items-end justify-between border-t border-[#2a2f37] pt-5">
                <div className="w-36 border-t border-zinc-600 pt-1 text-center"><p className="text-[11px] font-medium text-zinc-300">Prepared By</p></div>
                <div className="w-36 border-t border-zinc-600 pt-1 text-center"><p className="text-[11px] font-medium text-zinc-300">Approved By</p></div>
              </div>

              <div className="print-footer mt-6 border-t border-[#2a2f37] pt-3">
                <p className="text-center text-[10px] font-medium text-zinc-500">This is a system generated report.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'invoices' && (
          <div>
            <div className="no-print mb-3 flex items-center justify-between">
              <SectionTitle>All Invoices</SectionTitle>
              <button onClick={handlePrint} className={FIN.btnGhost}>ðŸ–¨ï¸ Print / PDF</button>
            </div>
            <div id="printable-area" className="relative overflow-x-auto rounded-xl border border-[#2a2f37] bg-[#0f1216] p-4 text-zinc-100">
              <PrintHeader title="Invoices List" />
              <table className="w-full border-collapse text-left text-[11px]">
                <thead className="border-b border-[#2a2f37] bg-[#14171c]"><tr><th className={th}>Invoice #</th><th className={th}>Client</th><th className={`${th} text-right`}>Total</th><th className={`${th} text-right`}>Received</th><th className={`${th} text-right`}>Balance</th><th className={`${th} text-center`}>Status</th><th className={`${th} no-print text-center`}>Action</th></tr></thead>
                <tbody className="divide-y divide-[#20242b]">
                  {invoices.map((inv: any) => {
                    const balance = inv.total_amount - inv.amount_paid;
                    const pill = statusPill(inv.status);
                    return (
                      <tr key={inv.id} onClick={() => setSelectedInvoice(inv)} className="cursor-pointer transition-colors hover:bg-white/[0.03]">
                        <td className={`${td} font-mono text-[#e5c36a]`}>{inv.invoice_number}</td>
                        <td className={`${td} text-zinc-200`}>{inv.client_name}</td>
                        <td className={`${td} text-right font-medium text-zinc-100`}>{formatCurrency(inv.total_amount)}</td>
                        <td className={`${td} text-right text-emerald-400`}>{formatCurrency(inv.amount_paid)}</td>
                        <td className={`${td} text-right font-semibold ${balance > 0 ? 'text-rose-400' : 'text-zinc-500'}`}>{formatCurrency(balance)}</td>
                        <td className={`${td} text-center`}><span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${pill.cls}`}><span className={`h-1.5 w-1.5 rounded-full ${pill.dot}`} />{inv.status.replace('_', ' ')}</span></td>
                        <td className={`${td} no-print text-center`}><button className="rounded-md border border-[#c99b3b]/40 bg-[#c99b3b]/10 px-2 py-1 text-[10px] font-medium text-[#e5c36a] transition hover:bg-[#c99b3b]/20">View</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="print-footer mt-6 border-t border-[#2a2f37] pt-3">
                <p className="text-center text-[10px] font-medium text-zinc-500">This is a system generated report.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'payments' && (
          <div>
            <div className="no-print mb-3 flex items-center justify-between">
              <SectionTitle>All Payments Received</SectionTitle>
              <button onClick={handlePrint} className={FIN.btnGhost}>ðŸ–¨ï¸ Print / PDF</button>
            </div>
            <div id="printable-area" className="relative overflow-x-auto rounded-xl border border-[#2a2f37] bg-[#0f1216] p-4 text-zinc-100">
              <PrintHeader title="Payments Received" />
              <table className="w-full border-collapse text-left text-[11px]">
                <thead className="border-b border-[#2a2f37] bg-[#14171c]"><tr><th className={th}>Date</th><th className={th}>Invoice</th><th className={th}>Client</th><th className={th}>Method</th><th className={`${th} text-right`}>Amount</th></tr></thead>
                <tbody className="divide-y divide-[#20242b]">
                  {payments.map((p: any) => (
                    <tr key={p.id} onClick={() => setSelectedReceipt({ ...p, currency: getDefaultCurrency() })} className="cursor-pointer transition-colors hover:bg-white/[0.03]">
                      <td className={`${td} text-zinc-300`}>{p.payment_date}</td>
                      <td className={`${td} font-mono text-[#e5c36a]`}>{p.invoice_number}</td>
                      <td className={`${td} text-zinc-200`}>{p.client_name}</td>
                      <td className={`${td} text-zinc-400`}>{p.payment_method}</td>
                      <td className={`${td} text-right font-semibold text-emerald-400`}>{formatCurrency(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="print-footer mt-6 border-t border-[#2a2f37] pt-3">
                <p className="text-center text-[10px] font-medium text-zinc-500">This is a system generated report.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'expenses' && (
          <div>
            <div className="no-print mb-3 flex items-center justify-between">
              <SectionTitle>All Expenses</SectionTitle>
              <button onClick={handlePrint} className={FIN.btnGhost}>ðŸ–¨ï¸ Print / PDF</button>
            </div>
            <div id="printable-area" className="relative overflow-x-auto rounded-xl border border-[#2a2f37] bg-[#0f1216] p-4 text-zinc-100">
              <PrintHeader title="Expenses List" />
              <table className="w-full border-collapse text-left text-[11px]">
                <thead className="border-b border-[#2a2f37] bg-[#14171c]"><tr><th className={th}>Category</th><th className={th}>Description</th><th className={th}>Date</th><th className={th}>Method</th><th className={`${th} text-right`}>Amount</th></tr></thead>
                <tbody className="divide-y divide-[#20242b]">
                  {expenses.map((e: any) => (
                    <tr key={e.id} onClick={() => setSelectedExpense(e)} className="cursor-pointer transition-colors hover:bg-white/[0.03]">
                      <td className={`${td} font-medium text-rose-300`}>{e.category}</td>
                      <td className={`${td} text-zinc-400`}>{e.description || '-'}</td>
                      <td className={`${td} text-zinc-300`}>{e.expense_date}</td>
                      <td className={`${td} text-zinc-400`}>{e.payment_method}</td>
                      <td className={`${td} text-right font-semibold text-rose-400`}>{formatCurrency(e.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="print-footer mt-6 border-t border-[#2a2f37] pt-3">
                <p className="text-center text-[10px] font-medium text-zinc-500">This is a system generated report.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ledger' && (
          <div>
            <div className="no-print mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">Select Client:</label>
                <select
                  className={`${FIN.input} !w-auto !py-1.5`}
                  value={selectedClientId}
                  onChange={(e: any) => setSelectedClientId(e.target.value)}
                >
                  <option value="all">All Clients (General Ledger)</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <button onClick={handlePrint} className={FIN.btnGhost}>
                ðŸ–¨ï¸ Print / PDF
              </button>
            </div>

            <div id="printable-area" className="relative overflow-x-auto rounded-xl border border-[#2a2f37] bg-[#0f1216] p-5 text-zinc-100">
              <PrintHeader title="Account Ledger" />
              <p className="mb-3 text-center text-[12px] font-semibold text-[#f1d68a]">Client: {currentClientName}</p>

              <table className="mb-10 w-full border-collapse text-left text-[11px]">
                <thead>
                  <tr className="border-b border-[#2a2f37] bg-[#14171c]">
                    <th className={th}>Date</th>
                    <th className={th}>Description</th>
                    <th className={th}>Type</th>
                    <th className={`${th} text-right`}>Debit (+)</th>
                    <th className={`${th} text-right`}>Credit (-)</th>
                    <th className={`${th} text-right`}>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerLoading ? (
                    <tr><td colSpan={6} className="p-3 text-center text-zinc-400">Loading ledger...</td></tr>
                  ) : ledgerWithBalance.length === 0 ? (
                    <tr><td colSpan={6} className="p-3 text-center text-zinc-500">No transactions found.</td></tr>
                  ) : (
                    ledgerWithBalance.map((tx: any, index: number) => (
                      <tr key={index} className="border-b border-[#20242b]">
                        <td className={`${td} text-zinc-400`}>{tx.date}</td>
                        <td className={`${td} font-medium text-zinc-200`}>{tx.client_name} {tx.type === 'Expense' ? '' : `(${tx.reference})`}</td>
                        <td className={td}>
                          <span className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${tx.type === 'Invoice' ? 'border-sky-400/30 bg-sky-400/10 text-sky-300' : tx.type === 'Payment' ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' : 'border-rose-400/30 bg-rose-400/10 text-rose-300'}`}>
                            {tx.type}
                          </span>
                        </td>
                        <td className={`${td} text-right font-mono text-zinc-200`}>{tx.entry_type === 'Debit' ? formatCurrency(tx.amount) : '-'}</td>
                        <td className={`${td} text-right font-mono text-emerald-400`}>{tx.entry_type === 'Credit' ? formatCurrency(tx.amount) : '-'}</td>
                        <td className={`${td} text-right font-mono font-semibold text-zinc-100`}>{formatCurrency(tx.balance)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t border-[#c99b3b]/40 bg-[#14171c] font-semibold">
                    <td colSpan={3} className={`${td} text-right text-[10px] uppercase tracking-[0.14em] text-zinc-400`}>Total:</td>
                    <td className={`${td} text-right font-mono text-zinc-100`}>{formatCurrency(totalDebit)}</td>
                    <td className={`${td} text-right font-mono text-emerald-400`}>{formatCurrency(totalCredit)}</td>
                    <td className={`${td} text-right font-mono text-[#f1d68a]`}>{formatCurrency(runningBalance)}</td>
                  </tr>
                </tfoot>
              </table>

              <div className="mt-10 flex items-end justify-between border-t border-[#2a2f37] pt-5">
                <div className="w-36 border-t border-zinc-600 pt-1 text-center">
                  <p className="text-[11px] font-medium text-zinc-300">Prepared By</p>
                </div>
                <div className="w-36 border-t border-zinc-600 pt-1 text-center">
                  <p className="text-[11px] font-medium text-zinc-300">Approved By</p>
                </div>
              </div>

              <div className="print-footer mt-6 border-t border-[#2a2f37] pt-3">
                <p className="text-center text-[10px] font-medium text-zinc-500">This is a system generated report.</p>
              </div>
            </div>
          </div>
        )}

      </div>

      {showExpenseForm && <div className={FIN.overlay}><AddExpenseForm onClose={() => { setShowExpenseForm(false); fetchFinanceData(); }} /></div>}
      {showInvoiceForm && <div className={FIN.overlay}><AddInvoiceForm onClose={() => { setShowInvoiceForm(false); fetchFinanceData(); }} /></div>}
      {showPaymentForm && <div className={FIN.overlay}><AddPaymentForm onClose={() => setShowPaymentForm(false)} onSuccess={fetchFinanceData} /></div>}

      <InvoiceDetailDrawer invoice={selectedInvoice} client={clients.find((c: any) => c.id === selectedInvoice?.client_id) || null} onClose={() => setSelectedInvoice(null)} onRecordPayment={() => { setSelectedInvoice(null); setShowPaymentForm(true); }} />
      <PaymentReceiptDrawer payment={selectedReceipt} onClose={() => setSelectedReceipt(null)} />
      <ExpenseDetailDrawer expense={selectedExpense} onClose={() => setSelectedExpense(null)} />
    </div>
  );
};

export default FinancePage;
