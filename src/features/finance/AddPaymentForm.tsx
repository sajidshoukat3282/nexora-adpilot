import React, { useState, useEffect } from 'react';

export default function AddPaymentForm({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  
  const [formData, setFormData] = useState<any>({
    invoice_id: '', amount: 0, payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'Bank Transfer', received_by: '', reference_no: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/invoices').then(r => r.json()).then(d => {
      if(d.ok) setInvoices(d.data.filter((inv:any) => inv.status !== 'paid' && inv.status !== 'cancelled'));
    });
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
        alert('Payment Recorded Successfully!'); 
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
    <div className="bg-white p-6 rounded-xl border border-slate-200 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto text-slate-900">
      <h2 className="text-xl font-bold mb-4 border-b border-slate-200 pb-2 text-slate-800">Receive Payment</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        
        <div>
          <label className="text-sm font-medium text-slate-600">Select Unpaid Invoice *</label>
          <select required className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg p-2 mt-1 outline-none focus:border-emerald-500" onChange={handleInvoiceSelect}>
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
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Total Invoice Amount:</span>
              <span className="font-semibold">{selectedInvoice.total_amount.toLocaleString()} {selectedInvoice.currency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Already Paid:</span>
              <span className="font-semibold text-emerald-600">{selectedInvoice.amount_paid.toLocaleString()} {selectedInvoice.currency}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-1 mt-1">
              <span className="text-slate-700 font-medium">Balance Due:</span>
              <span className="font-bold text-rose-600">{(selectedInvoice.total_amount - selectedInvoice.amount_paid).toLocaleString()} {selectedInvoice.currency}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-600">Amount Received *</label>
            <input required type="number" min="1" step="any" className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg p-2 mt-1 outline-none focus:border-emerald-500 font-bold" value={formData.amount} onChange={(e: any) => setFormData({...formData, amount: Number(e.target.value)})} />
            <p className="text-[11px] text-slate-400 mt-1">Aap yahan partial amount bhi daal sakte hain.</p>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-600">Date *</label>
            <input required type="date" className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg p-2 mt-1 outline-none focus:border-emerald-500" value={formData.payment_date} onChange={(e: any) => setFormData({...formData, payment_date: e.target.value})} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-600">Payment Method</label>
            <select className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg p-2 mt-1 outline-none focus:border-emerald-500" onChange={(e: any) => setFormData({...formData, payment_method: e.target.value})}>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cash">Cash</option>
              <option value="Cheque">Cheque</option>
              <option value="IBFT">IBFT / Online</option>
              <option value="Credit Card">Credit Card</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-600">Received By (Employee) *</label>
            <input required type="text" className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg p-2 mt-1 outline-none focus:border-emerald-500" onChange={(e: any) => setFormData({...formData, received_by: e.target.value})} placeholder="e.g. Ali" />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-600">Reference No (Optional)</label>
          <input type="text" className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg p-2 mt-1 outline-none focus:border-emerald-500" onChange={(e: any) => setFormData({...formData, reference_no: e.target.value})} placeholder="e.g. Cheque # 12345" />
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
          <button type="button" onClick={onClose} className="px-4 py-2 text-slate-500 hover:text-slate-800 font-medium">Cancel</button>
          <button type="submit" disabled={saving} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg font-medium shadow-sm transition-colors">
            {saving ? "Saving..." : "Save Payment"}
          </button>
        </div>
      </form>
    </div>
  );
}
