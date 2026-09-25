import React, { useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { StatusBadge, invoiceStatusTone } from "@/components/ui/StatusBadge";
import { PermissionGate } from "@/components/ui/PermissionGate";
import { useAsync } from "@/hooks/useAsync";
import { repo } from "@/repositories/demo";
import type { Invoice, CurrencyCode } from "@/domain";
import { INVOICE_STATUS_LABELS, formatMoney, money } from "@/domain";

export const InvoiceDetailDrawer: React.FC<{
  invoice: Invoice | null;
  onClose: () => void;
  onRecordPayment: () => void;
}> = ({ invoice, onClose, onRecordPayment }) => {
  const [copied, setCopied] = useState(false);
  const client = useAsync(() => (invoice ? repo.crm.getClient(invoice.clientId) : Promise.resolve(null)), [invoice?.id]);
  const payments = useAsync(() => (invoice ? repo.finance.listPaymentsForInvoice(invoice.id) : Promise.resolve([])), [invoice?.id]);

  const curr = (invoice?.total.currency || "PKR") as CurrencyCode;
  const outstandingCents = invoice ? invoice.total.amountCents - invoice.amountPaid.amountCents : 0;

  // Financial & Tax Calculations
  const subtotalCents = invoice?.items.reduce((sum, item) => sum + item.totalCents, 0) ?? 0;
  const estimatedGstCents = Math.round(subtotalCents * 0.18);
  const estimatedWhtCents = Math.round(subtotalCents * 0.03);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPdf = () => {
    window.print();
  };

  return (
    <Drawer
      open={!!invoice}
      onClose={onClose}
      title={invoice?.code ?? ""}
      subtitle={client.data?.name}
      footer={
        invoice && outstandingCents > 0 ? (
          <PermissionGate permission="finance.manage" fallback={null}>
            <button className="btn-primary w-full" onClick={onRecordPayment}>
              Record Payment ({formatMoney(money(outstandingCents, curr))})
            </button>
          </PermissionGate>
        ) : undefined
      }
    >
      {invoice && (
        <div className="space-y-6">
          {/* Top Actions & Header Status */}
          <div className="flex items-center justify-between pb-3 border-b border-panel-border">
            <StatusBadge label={INVOICE_STATUS_LABELS[invoice.status]} tone={invoiceStatusTone(invoice.status)} />
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyLink}
                className="text-xs px-2.5 py-1 bg-surface-bg border border-surface-border rounded-md text-ink-300 hover:text-ink-100 transition"
              >
                {copied ? "✓ Copied" : "Share Link"}
              </button>
              <button
                onClick={handleDownloadPdf}
                className="text-xs px-2.5 py-1 bg-surface-bg border border-surface-border rounded-md text-ink-300 hover:text-ink-100 transition"
              >
                📄 PDF
              </button>
            </div>
          </div>

          {/* Tax Identification Details */}
          <div className="grid grid-cols-2 gap-3 text-xs p-3 bg-surface-bg/40 rounded-lg border border-surface-border">
            <div>
              <span className="text-ink-500 block">Billed To (Client):</span>
              <span className="font-semibold text-ink-200 block">{client.data?.name ?? "—"}</span>
              <span className="text-ink-400 font-mono">NTN: 7492018-3</span>
            </div>
            <div>
              <span className="text-ink-500 block">Issued By:</span>
              <span className="font-semibold text-ink-200 block">Nexora Media Pvt Ltd</span>
              <span className="text-ink-400 font-mono">STRN: 3277876112911</span>
            </div>
          </div>

          {/* Line Items Table */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-ink-400 mb-2">Itemized Breakdown</h4>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-panel-border text-xs text-ink-500 text-left">
                  <th className="py-1">Description</th>
                  <th className="py-1 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item) => (
                  <tr key={item.id} className="border-b border-ink-800/60">
                    <td className="py-2.5 text-ink-200">{item.description}</td>
                    <td className="py-2.5 text-right text-ink-100 font-medium">
                      {formatMoney(money(item.totalCents, curr))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Enterprise Tax & Net Payable Summary */}
          <div className="p-3.5 bg-surface-bg/60 rounded-xl border border-surface-border space-y-2 text-sm">
            <div className="flex justify-between text-xs text-ink-400">
              <span>Subtotal (Excl. Tax)</span>
              <span>{formatMoney(money(subtotalCents, curr))}</span>
            </div>
            <div className="flex justify-between text-xs text-ink-400">
              <span>Sales Tax / GST (18%)</span>
              <span>+{formatMoney(money(estimatedGstCents, curr))}</span>
            </div>
            <div className="flex justify-between text-xs text-signal-amber">
              <span>Withholding Tax / WHT (3% Deductible)</span>
              <span>-{formatMoney(money(estimatedWhtCents, curr))}</span>
            </div>
            <div className="border-t border-panel-border pt-2 flex justify-between font-bold text-base">
              <span className="text-ink-200">Total Net Payable</span>
              <span className="text-ink-50">{formatMoney(invoice.total)}</span>
            </div>
          </div>

          {/* Payment Status Summary */}
          <div className="space-y-2 text-sm border-t border-ink-800 pt-3">
            <div className="flex justify-between">
              <span className="text-ink-400">Amount Received</span>
              <span className="text-signal-green font-semibold">{formatMoney(invoice.amountPaid)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-400">Remaining Balance</span>
              <span className="text-signal-amber font-semibold">{formatMoney(money(outstandingCents, curr))}</span>
            </div>
          </div>

          {/* Wire Transfer Details */}
          <div className="p-3 bg-surface-bg/30 rounded-lg border border-surface-border text-xs space-y-1">
            <h5 className="font-semibold text-ink-300 uppercase tracking-wide mb-1">Bank Wire Transfer Info</h5>
            <div className="flex justify-between text-ink-400">
              <span>Bank Name:</span>
              <span className="text-ink-200 font-mono">Meezan Bank Ltd</span>
            </div>
            <div className="flex justify-between text-ink-400">
              <span>IBAN:</span>
              <span className="text-ink-200 font-mono">PK36MEZN000214010928</span>
            </div>
          </div>

          {/* Payment History */}
          <section className="border-t border-ink-800 pt-3">
            <h4 className="text-xs font-bold uppercase tracking-wide text-ink-400 mb-2">Payment History</h4>
            <div className="space-y-2">
              {payments.data?.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm panel p-3">
                  <div>
                    <div className="text-ink-100 font-semibold">{formatMoney(p.amount)}</div>
                    <div className="text-xs text-ink-500 capitalize">{p.method.replace("_", " ")} · Ref: {p.reference}</div>
                  </div>
                  <span className="text-xs text-ink-500">{new Date(p.paidAt).toLocaleDateString()}</span>
                </div>
              ))}
              {payments.data?.length === 0 && <p className="text-xs text-ink-500">No payment records found.</p>}
            </div>
          </section>

          {/* Terms & Conditions Disclaimer */}
          <div className="text-[10px] text-ink-500 border-t border-ink-800 pt-3 space-y-1">
            <p><strong>Payment Terms:</strong> Net 30 Days from issuance date ({invoice.issueDate}).</p>
            <p>Late payments are subject to a 1.5% monthly finance charge. Please quote invoice code <strong>{invoice.code}</strong> during bank transfers.</p>
          </div>
        </div>
      )}
    </Drawer>
  );
};
