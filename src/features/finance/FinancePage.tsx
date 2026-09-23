import React, { useState, useEffect } from "react";
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

  return (
    <PermissionGate permission="finance.view" action="view Finance">
      <div>
        <PageHeader title="Finance" description="Invoices, payments and revenue across all clients and campaigns." />

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
          <StatCard label="Revenue Collected" value={totalRevenue / 100} format={(n) => formatMoney(money(n * 100))} tone="green" />
          <StatCard label="Outstanding" value={totalOutstanding / 100} format={(n) => formatMoney(money(n * 100))} tone="amber" />
          <StatCard label="Overdue Invoices" value={overdueCount} tone={overdueCount > 0 ? "red" : "default"} />
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
        return <span className={out > 0 ? "text-signal-amber font-medium" : "text-ink-500"}>{formatMoney(money(out))}</span>;
      },
    },
    {
      key: "status", header: "Status", sortValue: (i) => i.status,
      render: (i) => <StatusBadge label={INVOICE_STATUS_LABELS[i.status]} tone={invoiceStatusTone(i.status)} />,
    },
  ];
}
