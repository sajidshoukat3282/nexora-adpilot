import React, { useState, useEffect, useMemo } from "react";
import { useSession } from "@/hooks/useSession";
import { useCompanyProfile } from "@/hooks/useCompanyProfile";
import { FiPrinter, FiDownload, FiUsers, FiTarget, FiDollarSign, FiMap, FiMail, FiSave, FiCheckCircle } from "react-icons/fi";

const REPORT_TYPES = [
  { id: 'finance', title: 'Finance', icon: <FiDollarSign /> },
  { id: 'crm', title: 'CRM', icon: <FiUsers /> },
  { id: 'campaigns', title: 'Campaigns', icon: <FiTarget /> },
  { id: 'inventory', title: 'Inventory', icon: <FiMap /> },
];

export const ReportsPage: React.FC = () => {
  const { company } = useSession();
  const { profile } = useCompanyProfile();

  const [activeReport, setActiveReport] = useState<string>('finance');
  const [loading, setLoading] = useState(true);
  const [rawData, setRawData] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>({});

  // Date Filters
  const [startDate, setStartDate] = useState<string>(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Email Settings State
  const [emailDay, setEmailDay] = useState<string>('Monday');
  const [extraEmails, setExtraEmails] = useState<string>('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  useEffect(() => {
    if (company) {
      setEmailDay((company as any).report_email_day || 'Monday');
      setExtraEmails((company as any).report_extra_emails || '');
    }
  }, [company]);

  const saveEmailSettings = async () => {
    setSavingSettings(true);
    try {
      const res = await fetch('/api/company/email-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_email_day: emailDay, report_extra_emails: extraEmails })
      });
      if (res.ok) {
        setSettingsSaved(true);
        setTimeout(() => setSettingsSaved(false), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingSettings(false);
    }
  };

  useEffect(() => {
    const fetchReportData = async () => {
      setLoading(true);
      try {
        if (activeReport === 'finance') {
          const [mRes, iRes] = await Promise.all([fetch('/api/finance/metrics'), fetch('/api/invoices')]);
          const mData = await mRes.json();
          const iData = await iRes.json();
          if (mData.ok) setMetrics(mData.metrics);
          if (iData.ok) setRawData(iData.data || []);
        } 
        else if (activeReport === 'crm') {
          const [cRes, lRes] = await Promise.all([fetch('/api/crm/clients'), fetch('/api/crm/leads')]);
          const cData = await cRes.json();
          const lData = await lRes.json();
          if (cData.ok && lData.ok) setRawData([...(cData.data || []), ...(lData.data || [])]);
        }
        else if (activeReport === 'campaigns') {
          const cRes = await fetch('/api/campaigns');
          const cData = await cRes.json();
          if (cData.ok) setRawData(cData.data || []);
        }
        else if (activeReport === 'inventory') {
          const iRes = await fetch('/api/inventory');
          const iData = await iRes.json();
          if (iData.ok) setRawData(iData.data || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchReportData();
  }, [activeReport]);

  const filteredData = useMemo(() => {
    return rawData.filter(item => {
      const itemDate = item.issue_date || item.created_at || item.start_date || item.expense_date;
      if (!itemDate) return true;
      const d = new Date(itemDate).getTime();
      return d >= new Date(startDate).getTime() && d <= new Date(endDate).getTime();
    });
  }, [rawData, startDate, endDate]);

  const handlePrint = () => { window.print(); };

  const handleExportExcel = () => {
    if (filteredData.length === 0) return alert("No data to export");
    const headers = Object.keys(filteredData[0]).join(",");
    const csvRows = filteredData.map(row => Object.values(row).map(val => `"${val}"`).join(","));
    const csvString = [headers, ...csvRows].join("\n");
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeReport}_report_${startDate}_to_${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', minimumFractionDigits: 0 }).format(amount || 0);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 p-4 rounded-xl">
      
      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          body, html { margin: 0; padding: 0; background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body * { visibility: hidden; }
          #printable-report, #printable-report * { visibility: visible; }
          #printable-report {
            position: absolute; left: 0; top: 0; width: 100%;
            padding-top: 25mm !important; padding-left: 15mm !important; padding-right: 15mm !important;
            background: white !important; color: black !important;
          }
          .no-print { display: none !important; }
          table { width: 100% !important; border-collapse: collapse !important; }
          th, td { border: 1px solid #cbd5e1 !important; padding: 8px !important; color: black !important; font-size: 11px !important; }
          thead { background-color: #f1f5f9 !important; }
          .print-footer { position: absolute; bottom: 10mm; left: 15mm; right: 15mm; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 10px; }
        }
      `}</style>

      <div className="flex justify-between items-center mb-6 no-print">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Enterprise Report Center</h1>
          <p className="text-sm text-slate-500 mt-1">Generate, print, and export business data.</p>
        </div>
      </div>

      {/* Weekly Email Settings Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-6 no-print">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
              <FiMail size={24} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">Automated Weekly Report</h3>
              <p className="text-sm text-slate-500">Receive a business summary email automatically every week.</p>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Select Day</label>
            <select 
              value={emailDay} 
              onChange={(e) => setEmailDay(e.target.value)}
              className="w-full bg-white border border-slate-300 text-slate-700 text-sm rounded-lg p-2.5 outline-none"
            >
              <option value="Monday">Every Monday</option>
              <option value="Tuesday">Every Tuesday</option>
              <option value="Wednesday">Every Wednesday</option>
              <option value="Thursday">Every Thursday</option>
              <option value="Friday">Every Friday</option>
              <option value="Saturday">Every Saturday</option>
              <option value="Sunday">Every Sunday</option>
            </select>
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Additional Emails (Optional)</label>
            <input 
              type="text"
              placeholder="director@company.com, gm@company.com"
              value={extraEmails}
              onChange={(e) => setExtraEmails(e.target.value)}
              className="w-full bg-white border border-slate-300 text-slate-700 text-sm rounded-lg p-2.5 outline-none"
            />
            <p className="text-[10px] text-slate-400 mt-1">Separate multiple emails with a comma (,)</p>
          </div>

          <div className="flex items-end">
            <button 
              onClick={saveEmailSettings} 
              disabled={savingSettings}
              className={`w-full px-4 py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors ${
                settingsSaved ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              {settingsSaved ? <><FiCheckCircle /> Settings Saved</> : savingSettings ? 'Saving...' : <><FiSave /> Save Settings</>}
            </button>
          </div>
        </div>
      </div>

      {/* Controls & Tabs */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 no-print">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {REPORT_TYPES.map(type => (
            <button
              key={type.id}
              onClick={() => setActiveReport(type.id)}
              className={`px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-all whitespace-nowrap ${
                activeReport === type.id ? 'bg-slate-800 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {type.icon} {type.title}
            </button>
          ))}
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-300 shadow-sm">
            <span className="text-xs font-bold text-slate-500">FROM</span>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="text-sm outline-none bg-transparent" />
            <span className="text-xs font-bold text-slate-500 ml-2">TO</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="text-sm outline-none bg-transparent" />
          </div>
          
          <button onClick={handleExportExcel} className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 shadow-sm hover:bg-slate-50 transition">
            <FiDownload /> Excel
          </button>
          
          <button onClick={handlePrint} className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 shadow-sm hover:bg-emerald-700 transition">
            <FiPrinter /> Print / PDF
          </button>
        </div>
      </div>

      {/* ================= PRINTABLE REPORT ================= */}
      <div id="printable-report" className="bg-white text-slate-900 max-w-5xl mx-auto p-8 border border-slate-200 rounded-xl shadow-lg relative min-h-[800px]">
        
        <div className="flex justify-between items-start border-b-4 border-slate-800 pb-6 mb-6">
          <div>
            <h1 className="text-3xl font-extrabold uppercase tracking-widest text-slate-900">{activeReport} Report</h1>
            <p className="text-slate-500 mt-1 font-medium text-sm">Date Range: {startDate} to {endDate}</p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold text-slate-800">{profile?.legalName || company?.name || "Nexora Technologies"}</h2>
            {profile?.address && <p className="text-sm text-slate-500 mt-1">{[profile.address, profile.city, profile.country].filter(Boolean).join(", ")}</p>}
            {profile?.phone && <p className="text-sm text-slate-500">Tel: {profile.phone}</p>}
            {profile?.ntn && <p className="text-sm text-slate-500 font-mono">NTN: {profile.ntn}</p>}
          </div>
        </div>

        {activeReport === 'finance' && !loading && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg">
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Total Revenue</p>
              <p className="text-xl font-bold text-emerald-600">{formatCurrency(metrics.total_revenue)}</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg">
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Total Expenses</p>
              <p className="text-xl font-bold text-rose-600">{formatCurrency(metrics.total_expenses)}</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg">
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Pending Receivables</p>
              <p className="text-xl font-bold text-amber-600">{formatCurrency(metrics.total_pending)}</p>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          {loading ? (
            <div className="text-center py-10 text-slate-500">Generating report...</div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-10 text-slate-400 border-2 border-dashed border-slate-200 rounded-lg">No records found for this date range.</div>
          ) : (
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 border-b-2 border-slate-300">
                  {activeReport === 'finance' && <><th className="p-3">Invoice #</th><th className="p-3">Client</th><th className="p-3">Date</th><th className="p-3 text-right">Total Amount</th><th className="p-3 text-center">Status</th></>}
                  {activeReport === 'crm' && <><th className="p-3">Name</th><th className="p-3">Type</th><th className="p-3">City/Source</th><th className="p-3 text-center">Created At</th></>}
                  {activeReport === 'campaigns' && <><th className="p-3">Campaign Name</th><th className="p-3">Client</th><th className="p-3 text-right">Budget</th><th className="p-3 text-center">Status</th></>}
                  {activeReport === 'inventory' && <><th className="p-3">Screen Name</th><th className="p-3">Type</th><th className="p-3">City</th><th className="p-3 text-right">Rate/Day</th><th className="p-3 text-center">Status</th></>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredData.map((row: any, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    {activeReport === 'finance' && <><td className="p-3 font-mono">{row.invoice_number}</td><td className="p-3">{row.client_name}</td><td className="p-3">{row.issue_date}</td><td className="p-3 text-right font-medium">{formatCurrency(row.total_amount)}</td><td className="p-3 text-center uppercase text-[10px] font-bold">{row.status}</td></>}
                    {activeReport === 'crm' && <><td className="p-3 font-medium">{row.name || row.company_name}</td><td className="p-3 uppercase text-[10px] font-bold">{row.client_type ? 'Client' : 'Lead'}</td><td className="p-3">{row.city || row.source || '-'}</td><td className="p-3 text-center">{new Date(row.created_at).toLocaleDateString()}</td></>}
                    {activeReport === 'campaigns' && <><td className="p-3 font-medium">{row.name}</td><td className="p-3">{row.client_name}</td><td className="p-3 text-right font-medium">{formatCurrency(row.total_budget)}</td><td className="p-3 text-center uppercase text-[10px] font-bold">{row.status}</td></>}
                    {activeReport === 'inventory' && <><td className="p-3 font-medium">{row.name}</td><td className="p-3 uppercase text-[10px] font-bold">{row.screen_type}</td><td className="p-3">{row.city}</td><td className="p-3 text-right font-medium">{formatCurrency(row.rate)}</td><td className="p-3 text-center uppercase text-[10px] font-bold">{row.status}</td></>}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex justify-between items-end mt-24 pt-8 border-t border-slate-200">
          <div className="text-center w-48 border-t border-slate-400 pt-2"><p className="text-sm font-medium text-slate-800">Prepared By</p></div>
          <div className="text-center w-48 border-t border-slate-400 pt-2"><p className="text-sm font-medium text-slate-800">Approved By</p></div>
        </div>

        <div className="print-footer mt-8 border-t border-slate-200 pt-3 text-center">
          <p className="text-[10px] text-slate-400 font-medium">This is a system generated report.</p>
          <p className="text-[10px] text-slate-400">Generated on: {new Date().toLocaleString()}</p>
        </div>

      </div>
    </div>
  );
};

export default ReportsPage;
