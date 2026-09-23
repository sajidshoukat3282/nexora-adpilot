import React from "react";
import { Drawer } from "@/components/ui/Drawer";
import { StatusBadge, invoiceStatusTone } from "@/components/ui/StatusBadge";
import { PermissionGate } from "@/components/ui/PermissionGate";
import { useAsync } from "@/hooks/useAsync";
import { repo } from "@/repositories/demo";
import type { Invoice } from "@/domain";
import { INVOICE_STATUS_LABELS, formatMoney, money } from "@/domain";

export const InvoiceDetailDrawer: React.FC<{
  invoice: Invoice | null;
  onClose: () => void;
  onRecordPayment: () => void;
}> = ({ invoice, onClose, onRecordPayment }) => {
  const client = useAsync(() => (invoice ? repo.crm.getClient(invoice.clientId) : Promise.resolve(null)), [invoice?.id]);
  const payments = useAsync(() => (invoice ? repo.finance.listPaymentsForInvoice(invoice.id) : Promise.resolve([])), [invoice?.id]);

  const outstanding = invoice ? invoice.total.amountCents - invoice.amountPaid.amountCents : 0;

  return (
    <Drawer
      open={!!invoice}
      onClose={onClose}
      title={invoice?.code ?? ""}
      subtitle={client.data?.name}
      footer={
        invoice && outstanding > 0 ? (
          <PermissionGate permission="finance.manage" fallback={null}>
            <button className="btn-primary" onClick={onRecordPayment}>Record Payment</button>
          </PermissionGate>
        ) : undefined
      }
    >
      {invoice && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <StatusBadge label={INVOICE_STATUS_LABELS[invoice.status]} tone={invoiceStatusTone(invoice.status)} />
            <span className="text-xs text-ink-500">Due {invoice.dueDate}</span>
          </div>

          <table className="w-full text-sm">
            <tbody>
              {invoice.items.map((item) => (
                <tr key={item.id} className="border-b border-ink-800">
                  <td className="py-2 text-ink-200">{item.description}</td>
                  <td className="py-2 text-right text-ink-100 font-medium">{formatMoney(money(item.totalCents))}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-between text-sm">
            <span className="text-ink-500">Total</span>
            <span className="text-ink-50 font-bold">{formatMoney(invoice.total)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-ink-500">Paid</span>
            <span className="text-signal-green font-semibold">{formatMoney(invoice.amountPaid)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-ink-500">Outstanding</span>
            <span className="text-signal-amber font-semibold">{formatMoney(money(outstanding))}</span>
          </div>

          <section>
            <h4 className="text-xs font-bold uppercase tracking-wide text-ink-400 mb-2">Payment History</h4>
            <div className="space-y-2">
              {payments.data?.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm panel p-3">
                  <div>
                    <div className="text-ink-100">{formatMoney(p.amount)}</div>
                    <div className="text-xs text-ink-500">{p.method.replace("_", " ")} · {p.reference}</div>
                  </div>
                  <span className="text-xs text-ink-500">{new Date(p.paidAt).toLocaleDateString()}</span>
                </div>
              ))}
              {payments.data?.length === 0 && <p className="text-xs text-ink-500">No payments recorded yet.</p>}
            </div>
          </section>
        </div>
      )}
    </Drawer>
  );
};
