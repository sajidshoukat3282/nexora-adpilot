import React, { useState, useEffect } from 'react';
import { FIN, ModalTitle } from './financeUi';
import { depositPayment, getAccounts, type CashAccount } from '@/lib/api/accounting';

export default function AddPaymentForm({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  const [formData, setFormData] = useState<any>({
    invoice_id: '', amount: 0, payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'Bank Transfer', received_by: '', reference_no: ''
  });
  const [saving, setSaving] = useState(false);
  const [accounts, setAccounts] = useState<CashAccount[]>([]);
  const [accountId, setAccountId] = useState('');

  useEffect(() => {
    fetch('/api/invoices').then(r => r.json()).then(d => {
      if(d.ok) setInvoices(d.data.filter((inv:any) => inv.status !== 'paid' && inv.status !== 'cancelled'));
    });
  }, []);

  useEffect(() => {
    getAccounts().then((a) => { setAccounts(a); if (a.length === 1) setAccountId(a[0].id); }).catch(() => setAccounts([]));
  }, []);

  const handleInvoiceSelect = (e: any) => {
    const inv = invoices.find(i => i.id === e.target.value);
    setSelectedInvoice(inv);

    // Default amount balance due set karein, lekin user isko kam kar sakta hai
    setFormData({
      ...formData,
      invoice_id: e.target.value,
      amount: inv ? (inv.total_amount - inv.amount_paid) : 0
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.invoice_id) return alert("Please select an invoice.");
    if (formData.amount <= 0) return alert("Amount must be greater than 0.");
    if (!formData.received_by) return alert("Please enter who received the payment.");

    setSaving(true);
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (res.ok && data.ok) {
        let linkNote = '';
        if (accountId && data.id) {
          try {
            await depositPayment(data.id, accountId);
          } catch (linkErr: any) {
            linkNote = ' (It could not be added to the account. You can link it from Finance > Accounts.)';
          }
        }
        alert('Payment Recorded Successfully!' + linkNote);
        onSuccess();
        onClose();
      } else {
        alert(`Error: ${data.message || data.error || 'Failed to save payment'}`);
      }
    } catch (error: any) {
      console.error(error);
      alert('Network error. Check console for details.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`${FIN.modal} max-w-lg`}>
      <ModalTitle>Receive Payment</ModalTitle>

      <form onSubmit={handleSubmit} className="space-y-3.5">

        <div>
          <label className={FIN.label}>Select Unpaid Invoice *</label>
          <select required className={FIN.input} onChange={handleInvoiceSelect}>
            <option value="">-- Choose Invoice --</option>
            {invoices.map((inv: any) => (
              <option key={inv.id} value={inv.id}>
                {inv.invoice_number} - {inv.client_name} (Due: {inv.total_amount - inv.amount_paid} {inv.currency})
              </option>
            ))}
          </select>
        </div>

        {/* Invoice Summary Box (Jab invoice select ho) */}
        {selectedInvoice && (
          <div className="space-y-1.5 rounded-xl border border-[#2a2f37] bg-[#0f1216] p-3 text-[12px]">
            <div className="flex justify-between">
              <span className="text-zinc-400">Total Invoice Amount:</span>
              <span className="font-semibold text-zinc-100">{selectedInvoice.total_amount.toLocaleString()} {selectedInvoice.currency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Already Paid:</span>
              <span className="font-semibold text-emerald-400">{selectedInvoice.amount_paid.toLocaleString()} {selectedInvoice.currency}</span>
            </div>
            <div className="mt-1 flex justify-between border-t border-[#2a2f37] pt-1.5">
              <span className="font-medium text-zinc-200">Balance Due:</span>
              <span className="font-bold text-rose-400">{(selectedInvoice.total_amount - selectedInvoice.amount_paid).toLocaleString()} {selectedInvoice.currency}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={FIN.label}>Amount Received *</label>
            <input required type="number" min="1" step="any" className={`${FIN.input} font-semibold`} value={formData.amount} onChange={(e: any) => setFormData({...formData, amount: Number(e.target.value)})} />
            <p className="mt-1 text-[10px] text-zinc-500">You can enter a partial amount.</p>
          </div>
          <div>
            <label className={FIN.label}>Date *</label>
            <input required type="date" className={FIN.input} value={formData.payment_date} onChange={(e: any) => setFormData({...formData, payment_date: e.target.value})} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={FIN.label}>Payment Method</label>
            <select className={FIN.input} onChange={(e: any) => setFormData({...formData, payment_method: e.target.value})}>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cash">Cash</option>
              <option value="Cheque">Cheque</option>
              <option value="IBFT">IBFT / Online</option>
              <option value="Credit Card">Credit Card</option>
            </select>
          </div>
          <div>
            <label className={FIN.label}>Received By (Employee) *</label>
            <input required type="text" className={FIN.input} onChange={(e: any) => setFormData({...formData, received_by: e.target.value})} placeholder="e.g. Ali" />
          </div>
        </div>

        {accounts.length > 0 && (
          <div>
            <label className={FIN.label}>Deposit to account (optional)</label>
            <select className={FIN.input} value={accountId} onChange={(e: any) => setAccountId(e.target.value)}>
              <option value="">Do not track</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className={FIN.label}>Reference No (Optional)</label>
          <input type="text" className={FIN.input} onChange={(e: any) => setFormData({...formData, reference_no: e.target.value})} placeholder="e.g. Cheque # 12345" />
        </div>

        <div className="mt-5 flex justify-end gap-2 border-t border-[#2a2f37] pt-3.5">
          <button type="button" onClick={onClose} className={FIN.btnText}>Cancel</button>
          <button type="submit" disabled={saving} className={FIN.btnGold}>
            {saving ? "Saving..." : "Save Payment"}
          </button>
        </div>
      </form>
    </div>
  );
}
