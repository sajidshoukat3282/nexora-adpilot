import React, { useEffect, useMemo, useState } from "react";
import { getDefaultCurrency } from "@/lib/companyDefaults";
import { getBills, type Bill } from "@/lib/api/accounting";
import { downloadCsv, toCsv } from "../crm/crmTools";
import { FIN, SectionTitle } from "./financeUi";
import { Field, TD, TH, fmt } from "./accountingUi";
import {
  billRows,
  expenseRows,
  paymentRows,
  periodRange,
  quickbooksInvoiceRows,
  taxRows,
  taxSummary,
  xeroInvoiceRows,
  type PeriodKey,
} from "./accountingTools";

export const TaxExportTab: React.FC<{ invoices: any[]; payments: any[]; expenses: any[]; clients: any[] }> = ({
  invoices,
  payments,
  expenses,
  clients,
}) => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [period, setPeriod] = useState<PeriodKey>("month");
  const [custom, setCustom] = useState(() => periodRange("year"));
  const cur = getDefaultCurrency();

  useEffect(() => {
    getBills().then(setBills).catch(() => setBills([]));
  }, []);

  const range = useMemo(() => periodRange(period, new Date(), custom), [period, custom]);
  const summary = useMemo(() => taxSummary(invoices, bills, range), [invoices, bills, range]);

  const file = (name: string) => `${name}_${range.from}_to_${range.to}.csv`;
  const out = (name: string, data: { rows: Record<string, unknown>[]; columns: { key: string; label: string }[] }) => {
    if (data.rows.length === 0) {
      window.alert("Nothing to export in this period.");
      return;
    }
    downloadCsv(file(name), toCsv(data.rows, data.columns));
  };

  const buttons: { label: string; hint: string; run: () => void }[] = [
    { label: "Invoices for Xero", hint: "Sales invoices in Xero import columns", run: () => out("xero-invoices", xeroInvoiceRows(invoices, clients, range)) },
    { label: "Invoices for QuickBooks", hint: "Sales invoices in QuickBooks import columns", run: () => out("quickbooks-invoices", quickbooksInvoiceRows(invoices, range)) },
    { label: "Payments received", hint: "Client payments (CSV)", run: () => out("payments", paymentRows(payments, range)) },
    { label: "Expenses", hint: "All expenses (CSV)", run: () => out("expenses", expenseRows(expenses, range)) },
    { label: "Bills (payables)", hint: "Supplier bills (CSV)", run: () => out("bills", billRows(bills, range)) },
    { label: "Tax summary", hint: "The table above (CSV)", run: () => out("tax-summary", taxRows(summary, range)) },
  ];

  return (
    <div>
      <div className="mb-3">
        <SectionTitle>Tax Summary & Accounting Export</SectionTitle>
        <p className="mt-1 text-[11px] text-zinc-500">Hand your numbers to your accountant, or import them into Xero or QuickBooks.</p>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Field label="Period" className="w-full sm:w-52">
          <select className={FIN.input} value={period} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPeriod(e.target.value as PeriodKey)}>
            <option value="month">This month</option>
            <option value="last-month">Last month</option>
            <option value="quarter">This quarter</option>
            <option value="year">This year</option>
            <option value="custom">Custom range</option>
          </select>
        </Field>
        {period === "custom" && (
          <>
            <Field label="From">
              <input type="date" className={FIN.input} value={custom.from} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustom({ ...custom, from: e.target.value })} />
            </Field>
            <Field label="To">
              <input type="date" className={FIN.input} value={custom.to} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustom({ ...custom, to: e.target.value })} />
            </Field>
          </>
        )}
        <p className="pb-2 text-[11px] text-zinc-500">
          {range.from} to {range.to}
        </p>
      </div>

      <div className="mb-2 overflow-x-auto rounded-xl border border-[#22262d] bg-[#0f1216]">
        <table className="w-full min-w-[620px] text-left text-[12px]">
          <thead>
            <tr className="border-b border-[#2a2f37]">
              <th className={TH}>Currency</th>
              <th className={`${TH} text-right`}>Sales</th>
              <th className={`${TH} text-right`}>Output tax</th>
              <th className={`${TH} text-right`}>Purchases</th>
              <th className={`${TH} text-right`}>Input tax</th>
              <th className={`${TH} text-right`}>Net tax payable</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1d2128]">
            {summary.length === 0 ? (
              <tr>
                <td className={`${TD} py-5 text-center text-zinc-500`} colSpan={6}>No invoices or bills in this period.</td>
              </tr>
            ) : (
              summary.map((r) => (
                <tr key={r.currency}>
                  <td className={`${TD} font-medium text-zinc-100`}>{r.currency}</td>
                  <td className={`${TD} text-right text-zinc-300`}>{fmt(r.sales, r.currency)}</td>
                  <td className={`${TD} text-right text-zinc-300`}>{fmt(r.outputTax, r.currency)}</td>
                  <td className={`${TD} text-right text-zinc-300`}>{fmt(r.purchases, r.currency)}</td>
                  <td className={`${TD} text-right text-zinc-300`}>{fmt(r.inputTax, r.currency)}</td>
                  <td className={`${TD} text-right font-semibold ${r.net > 0 ? "text-[#f1d68a]" : "text-emerald-300"}`}>
                    {r.net >= 0 ? fmt(r.net, r.currency) : `${fmt(-r.net, r.currency)} refundable`}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="mb-5 text-[10px] text-zinc-500">
        Output tax comes from issued invoices (by issue date). Input tax comes from bills you add under Payables (by bill date). Confirm tax rules and filing with your accountant. Default currency: {cur}.
      </p>

      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400">Export (period above)</p>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {buttons.map((b) => (
          <button
            key={b.label}
            type="button"
            onClick={b.run}
            className="rounded-xl border border-[#22262d] bg-[#0f1216] p-3 text-left transition hover:border-[#c99b3b]/50"
          >
            <p className="text-[12px] font-semibold text-[#f1d68a]">{b.label}</p>
            <p className="mt-0.5 text-[10px] text-zinc-500">{b.hint}</p>
          </button>
        ))}
      </div>
      <p className="mt-3 text-[10px] text-zinc-500">
        The Xero and QuickBooks files have one line per invoice and use their standard import column names. If your software asks, map the columns during import and check tax codes and account codes before posting.
      </p>
    </div>
  );
};
