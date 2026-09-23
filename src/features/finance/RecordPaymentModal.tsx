import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { repo } from "@/repositories/demo";
import type { Invoice, PaymentMethod } from "@/domain";
import { formatMoney, money } from "@/domain";

export const RecordPaymentModal: React.FC<{
  invoice: Invoice | null;
  onClose: () => void;
  onRecorded: () => void;
}> = ({ invoice, onClose, onRecorded }) => {
  const outstanding = invoice ? invoice.total.amountCents - invoice.amountPaid.amountCents : 0;
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("bank_transfer");
  const [reference, setReference] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (invoice) setAmount((outstanding / 100).toString());
  }, [invoice?.id]);

  async function submit() {
    if (!invoice) return;
    const cents = Math.round(Number(amount) * 100);
    if (!cents || cents <= 0) {
      setError("Enter a valid payment amount.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await repo.finance.recordPayment(invoice.id, cents, method, reference || `Manual entry`);
      onRecorded();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={!!invoice}
      onClose={onClose}
      title={`Record Payment — ${invoice?.code ?? ""}`}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={submitting} onClick={submit}>
            {submitting ? "Recording..." : "Record Payment"}
          </button>
        </>
      }
    >
      {invoice && (
        <div className="space-y-3">
          {error && <div className="text-sm text-signal-red bg-signal-red/10 border border-signal-red/25 rounded-lg px-3 py-2">{error}</div>}
          <div className="text-sm text-ink-400">
            Outstanding: <span className="text-ink-100 font-semibold">{formatMoney(money(outstanding))}</span> of {formatMoney(invoice.total)}
          </div>
          <div>
            <label className="label">Amount (USD)</label>
            <input type="number" className="input" value={amount} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAmount(e.target.value)} />
          </div>
          <div>
            <label className="label">Method</label>
            <select className="input" value={method} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setMethod(e.target.value as PaymentMethod)}>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="card">Card</option>
              <option value="cheque">Cheque</option>
              <option value="cash">Cash</option>
            </select>
          </div>
          <div>
            <label className="label">Reference (optional)</label>
            <input className="input" value={reference} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReference(e.target.value)} placeholder="e.g. TXN-88931" />
          </div>
        </div>
      )}
    </Modal>
  );
};
