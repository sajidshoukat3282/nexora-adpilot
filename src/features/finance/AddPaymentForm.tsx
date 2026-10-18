import React, { useState, useEffect } from 'react';

export default function AddPaymentForm({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [formData, setFormData] = useState<any>({
    invoice_id: '', amount: 0, payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'Bank Transfer', received_by: '', reference_no: ''
  });

  useEffect(() => {
    fetch('/api/invoices').then(r => r.json()).then(d => {
      if(d.ok) setInvoices(d.data.filter((inv:any) => inv.status !== 'paid' && inv.status !== 'cancelled'));
    });
  }, []);

  const handleInvoiceSelect = (e: any) => {
    const inv = invoices.find(i => i.id === e.target.value);
    setFormData({ ...formData, invoice_id: e.target.value, amount: inv ? (inv.total_amount - inv.amount_paid) : 0 });
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const res = await fetch('/api/payments', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData)
    });
    if (res.ok) { alert('Payment Recorded!'); onSuccess(); onClose(); }
  };

  return (
    <div className="bg-white p-6 rounded-xl border w-full max-w-lg shadow-2xl">
      <h2 className="text-xl font-bold mb-4 border-b pb-2 text-slate-800">Receive Payment</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-600">Select Unpaid Invoice</label>
          <select required className="w-full border rounded-lg p-2 mt-1 outline-none" onChange={handleInvoiceSelect}>
            <option value="">-- Choose Invoice --</option>
            {invoices.map(inv => <option key={inv.id} value={inv.id}>{inv.invoice_number} - {inv.client_name} (Due: {inv.total_amount - inv.amount_paid})</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="text-sm font-medium text-slate-600">Amount Received</label><input required type="number" className="w-full border rounded-lg p-2 mt-1 outline-none" value={formData.amount} onChange={(e: any) => setFormData({...formData, amount: Number(e.target.value)})} /></div>
          <div><label className="text-sm font-medium text-slate-600">Date</label><input required type="date" className="w-full border rounded-lg p-2 mt-1 outline-none" value={formData.payment_date} onChange={(e: any) => setFormData({...formData, payment_date: e.target.value})} /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-600">Method</label>
            <select className="w-full border rounded-lg p-2 mt-1 outline-none" onChange={(e: any) => setFormData({...formData, payment_method: e.target.value})}>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cash">Cash</option>
              <option value="Cheque">Cheque</option>
              <option value="IBFT">IBFT / Online</option>
            </select>
          </div>
          <div><label className="text-sm font-medium text-slate-600">Received By (Employee)</label><input required type="text" className="w-full border rounded-lg p-2 mt-1 outline-none" onChange={(e: any) => setFormData({...formData, received_by: e.target.value})} placeholder="e.g. Ali" /></div>
        </div>
        <div className="flex justify-end gap-3 mt-4 border-t pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 text-slate-500">Cancel</button>
          <button type="submit" className="px-6 py-2 bg-emerald-600 text-white rounded-lg">Save Payment</button>
        </div>
      </form>
    </div>
  );
}
