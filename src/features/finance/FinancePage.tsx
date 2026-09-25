import React, { useState, useEffect, useMemo } from "react";
import { PageHeader } from "@/components/layout/AppShell";
import { DataTable, ColumnDef } from "@/components/ui/DataTable";
import { StatusBadge, invoiceStatusTone } from "@/components/ui/StatusBadge";
import { PermissionGate } from "@/components/ui/PermissionGate";
import { StatCard } from "@/components/ui/StatCard";
import { InvoiceDetailDrawer } from "./InvoiceDetailDrawer";
import { RecordPaymentModal } from "./RecordPaymentModal";
import { useAsync } from "@/hooks/useAsync";
import { repo } from "@/repositories/demo";
import { useSearchParams } from "@/lib/router";
import type { Invoice } from "@/domain";
import { INVOICE_STATUS_LABELS, formatMoney } from "@/domain";

export const FinancePage: React.FC = () => {
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);
  const [params, setParams] = useSearchParams();

  const invoices = useAsync(() => repo.finance.listInvoices(), []);
  const clients = useAsync(() => repo.crm.listClients(), []);

  // Completes the Notifications -> Finance deep link.
  useEffect(() => {
    const invoiceId = params.get("invoice");
    if (invoiceId && invoices.data) {
      const match = invoices.data.find((i) => i.id === invoiceId);
      if (match) setSelected(match);
      setParams({ invoice: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, invoices.data]);

  function clientName(id: string): string {
    return clients.data?.find((c) => c.id === id)?.name ?? "—";
  }

  // Multi-Currency & AR Aging Analytics
  const analytics = useMemo(() => {
    const data = invoices.data ?? [];
    const today = new Date();

    const revenueByCurr: Record<string, number> = {};
    const outstandingByCurr: Record<string, number> = {};
    
    let overdueCount = 0;
    let aging0to30 = 0;
    let aging31to60 = 0;
    let aging60Plus = 0;

    data.forEach((inv) => {
      const curr = inv.total.currency || "PKR";
      const paidCents = inv.amountPaid.amountCents;
      const totalCents = inv.total.amountCents;
      const outCents = totalCents - paidCents;

      // Group totals by currency
      revenueByCurr[curr] = (revenueByCurr[curr] || 0) + paidCents;
      outstandingByCurr[curr] = (outstandingByCurr[curr] || 0) + outCents;

      if (inv.status === "overdue" || (outCents > 0 && new Date(inv.dueDate) < today)) {
        overdueCount++;
        const dueDate = new Date(inv.dueDate);
        const diffDays = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 3600 * 24));

        if (diffDays <= 30) aging0to30 += outCents;
        else if (diffDays <= 60) aging31to60 += outCents;
        else aging60Plus += outCents;
      }
    });

    const formatMultiCurr = (record: Record<string, number>) => {
      const keys = Object.keys(record);
      if (keys.length === 0) return "0.00";
      return keys
        .map((k) => formatMoney({ amountCents: record[k], currency: k }))
        .join(" | ");
    };

    return {
      revenueText: formatMultiCurr(revenueByCurr),
      outstandingText: formatMultiCurr(outstandingByCurr),
      overdueCount,
      aging0to30Text: formatMoney({ amountCents: aging0to30, currency: "PKR" }),
      aging31to60Text: formatMoney({ amountCents: aging31to60, currency: "PKR" }),
      aging60PlusText: formatMoney({ amountCents: aging60Plus, currency: "PKR" }),
    };
  }, [invoices.data]);

  return (
    <PermissionGate permission="finance.view" action="view Finance">
      <div>
        <PageHeader title="Finance & Accounting" description="Invoices, AR Aging, Tax breakdowns, and revenue across clients." />

        {/* Top Summary Cards with Multi-Currency Support */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
          <StatCard label="Revenue Collected" value={analytics.revenueText} tone="green" />
          <StatCard label="Total Outstanding" value={analytics.outstandingText} tone="amber" />
          <StatCard label="Overdue Invoices" value={analytics.overdueCount} tone={analytics.overdueCount > 0 ? "red" : "default"} />
        </div>

        {/* AR Aging Breakdown Widget */}
        <div className="bg-panel-bg border border-panel-border rounded-xl p-4 mb-5 shadow-sm">
          <h3 className="text-xs uppercase tracking-wider text-ink-400 font-semibold mb-3">
            Accounts Receivable (AR) Aging Summary
          </h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-surface-bg/50 rounded-lg border border-surface-border">
              <span className="text-xs text-ink-400 block mb-1">0–30 Days Overdue</span>
              <span className="text-sm font-semibold text-signal-amber">{analytics.aging0to30Text}</span>
            </div>
            <div className="p-3 bg-surface-bg/50 rounded-lg border border-surface-border">
              <span className="text-xs text-ink-400 block mb-1">31–60 Days Overdue</span>
              <span className="text-sm font-semibold text-signal-orange">{analytics.aging31to60Text}</span>
            </div>
            <div className="p-3 bg-surface-bg/50 rounded-lg border border-surface-border">
              <span className="text-xs text-ink-400 block mb-1">60+ Days Overdue</span>
              <span className="text-sm font-semibold text-signal-red">{analytics.aging60PlusText}</span>
            </div>
          </div>
        </div>

        <div className="panel">
          <DataTable<Invoice>
            columns={invoiceColumns(clientName)}
            rows={invoices.data ?? []}
            keyOf={(i) => i.id}
            onRowClick={(i) => setSelected(i)}
            emptyTitle="No invoices yet"
          />
        </div>

        <InvoiceDetailDrawer
          invoice={selected}
          onClose={() => setSelected(null)}
          onRecordPayment={() => setPayingInvoice(selected)}
        />
        <RecordPaymentModal
          invoice={payingInvoice}
          onClose={() => setPayingInvoice(null)}
          onRecorded={() => {
            invoices.reload();
            setPayingInvoice(null);
            setSelected(null);
          }}
        />
      </div>
    </PermissionGate>
  );
};

function invoiceColumns(clientName: (id: string) => string): ColumnDef<Invoice>[] {
  return [
    { key: "code", header: "Invoice", sortValue: (i) => i.code, render: (i) => <span className="font-mono text-xs text-ink-400">{i.code}</span> },
    { key: "client", header: "Client", render: (i) => <span className="text-ink-100 font-medium">{clientName(i.clientId)}</span> },
    { key: "issued", header: "Issued", sortValue: (i) => i.issueDate, render: (i) => <span className="text-ink-400 text-xs">{i.issueDate}</span> },
    { key: "due", header: "Due", sortValue: (i) => i.dueDate, render: (i) => <span className="text-ink-400 text-xs">{i.dueDate}</span> },
    { 
      key: "total", 
      header: "Total Amount", 
      sortValue: (i) => i.total.amountCents, 
      render: (i) => <span className="text-ink-100 font-semibold">{formatMoney(i.total)}</span> 
    },
    {
      key: "outstanding", header: "Outstanding",
      sortValue: (i) => i.total.amountCents - i.amountPaid.amountCents,
      render: (i) => {
        const outCents = i.total.amountCents - i.amountPaid.amountCents;
        const curr = i.total.currency || "PKR";
        return (
          <span className={outCents > 0 ? "text-signal-amber font-medium" : "text-ink-500"}>
            {formatMoney({ amountCents: outCents, currency: curr })}
          </span>
        );
      },
    },
    {
      key: "status", header: "Status", sortValue: (i) => i.status,
      render: (i) => <StatusBadge label={INVOICE_STATUS_LABELS[i.status]} tone={invoiceStatusTone(i.status)} />,
    },
  ];
}
