import React, { useState, useEffect } from "react";
import { FiDollarSign, FiTrendingUp, FiArrowDown, FiCreditCard, FiPlus } from "react-icons/fi";
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
    return { ...
