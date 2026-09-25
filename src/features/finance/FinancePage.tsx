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
import { INVOICE_STATUS_LABELS, formatMoney, money } from "@/domain";

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

  const totalRevenue = invoices.data?.reduce((s, i) => s + i.amountPaid.amountCents, 0) ?? 0;
  const totalOutstanding = invoices.data?.reduce((s, i) => s + (i.total.amountCents - i.amountPaid.amountCents), 0) ?? 0;
  const overdueCount = invoices.data?.filter((i) => i.status === "overdue").length ?? 0;

  // AR Aging Calculation
  const aging = useMemo(() => {
    const data = invoices.data ?? [];
    const today = new Date();
    let days0to30 = 0;
    let days31to60 = 0;
    let days60Plus = 0;

    data.forEach((inv) => {
      const outCents = inv.total.amountCents - inv.amountPaid.amountCents;
      if (outCents > 0) {
        const dueDate = new Date(inv.dueDate);
        const diffDays = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 3600 * 24));
        if (diffDays <= 30) days0to30 += outCents;
        else if (diffDays <= 60) days31to60 += outCents;
        else days60Plus += outCents;
      }
    });

    return { days0to30, days31to60, days60Plus };
  }, [invoices.data]);

  return (
    <PermissionGate permission="finance.view" action="view Finance">
      <div>
        <PageHeader title="Finance & Accounting" description="Invoices, AR Aging, Tax breakdowns, and revenue across clients." />

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
          <StatCard label="Revenue Collected" value={totalRevenue / 100} format={(n) => formatMoney(money(n * 100))} tone="green" />
          <StatCard label="Outstanding" value={totalOutstanding / 100} format={(n) => formatMoney(money(n * 100))} tone="amber" />
          <StatCard label="Overdue Invoices" value={overdueCount} tone={overdueCount > 0 ? "red" : "default"} />
        </div>

        {/* Accounts Receivable (AR) Aging Breakdown Widget */}
        <div className="panel mb-5 p-4">
          <h3 className="text-xs uppercase tracking-wider text-ink-400 font-semibold mb-3">
            Accounts Receivable (AR) Aging Breakdown
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
            <div className="p-3 bg-surface-bg/50 rounded-lg border border-surface-border">
              <span className="text-xs text-ink-400 block mb-1">0–30 Days Overdue</span>
              <span className="text-sm font-semibold text-signal-amber">{formatMoney(money(aging.days0to30))}</span>
            </div>
            <div className="p-3 bg-surface-bg/50 rounded-lg border border-surface-border">
              <span className="text-xs text-ink-400 block mb-1">31–60 Days Overdue</span>
              <span className="text-sm font-semibold text-signal-amber">{formatMoney(money(aging.days31to60))}</span>
            </div>
            <div className="p-3 bg-surface-bg/50 rounded-lg border border-surface-border">
              <span className="text-xs text-ink-400 block mb-1">60+ Days Overdue</span>
              <span className="text-sm font-semibold text-signal-red">{formatMoney(money(aging.days60Plus))}</span>
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
    { key: "total", header: "Total", sortValue: (i) => i.total.amountCents, render: (i) => <span className="text-ink-100 font-semibold">{formatMoney(i.total)}</span> },
    {
      key: "outstanding", header: "Outstanding",
      sortValue: (i) => i.total.amountCents - i.amountPaid.amountCents,
      render: (i) => {
        const out = i.total.amountCents - i.amountPaid.amountCents;
        return (
          <span className={out > 0 ? "text-signal-amber font-medium" : "text-ink-500"}>
            {formatMoney({ ...i.total, amountCents: out })}
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
