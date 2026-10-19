import React, { useState, useEffect, useMemo } from 'react';
import { FIN, ModalTitle } from './financeUi';

export default function AddInvoiceForm({ onClose }: { onClose: () => void }) {
  const [clients, setClients] = useState<any[]>([]);
  const [formData, setFormData] = useState<any>({
    client_id: '', issue_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'draft', discount_amount: 0, tax_rate: 0, currency: 'PKR'
  });
  const [items, setItems] = useState<any[]>([{ description: 'Screen Advertising Services', quantity: 1, rate: 0 }]);

  useEffect(() => {
    fetch('/api/crm/clients').then(r => r.json()).then(d => { if(d.ok) setClients(d.data); });
  }, []);

  const { subtotal, taxAmount, totalAmount } = useMemo(() => {
    let sub = items.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.rate)), 0);
    let taxable = Math.max(0, sub - Number(formData.discount_amount));
    let tax = taxable * (Number(formData.tax_rate) / 100);
    return { subtotal: sub, taxAmount: tax, totalAmount: taxable + tax };
  }, [items, formData.discount_amount, formData.tax_rate]);

  const handleItemChange = (i: number, field: string, val: any) => {
    const newItems = [...items];
    newItems[i][field] = val;
    setItems(newItems);
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!formData.client_id) return alert("Select a client");
    const res = await fetch('/api/invoices', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formData, items })
    });
    if (res.ok) { alert('Invoice Created!'); onClose(); }
  };

  return (
    <div className={`${FIN.modal} max-w-3xl`}>
      <ModalTitle>Create Invoice</ModalTitle>
      <form onSubmit={handleSubmit} className="space-y-3.5">

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="col-span-1">
            <label className={FIN.label}>Client</label>
            <select required className={FIN.input} onChange={(e: any) => setFormData({...formData, client_id: e.target.value})}>
              <option value="">Select Client</option>
              {clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className={FIN.label}>Issue Date</label>
            <input required type="date" className={FIN.input} value={formData.issue_date} onChange={(e: any) => setFormData({...formData, issue_date: e.target.value})} />
          </div>
          <div>
            <label className={FIN.label}>Due Date</label>
            <input required type="date" className={FIN.input} value={formData.due_date} onChange={(e: any) => setFormData({...formData, due_date: e.target.value})} />
          </div>
        </div>

        <div className="mt-2 overflow-hidden rounded-xl border border-[#2a2f37] bg-[#0f1216]">
          <table className="w-full text-left">
            <thead className="border-b border-[#2a2f37] bg-[#14171c] text-[10px] uppercase tracking-[0.12em] text-zinc-400">
              <tr>
                <th className="p-2 font-semibold">Description</th>
                <th className="w-20 p-2 font-semibold">Qty</th>
                <th className="w-24 p-2 font-semibold">Rate</th>
                <th className="w-24 p-2 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: any, i: number) => (
                <tr key={i} className="border-t border-[#20242b]">
                  <td className="p-1.5">
                    <input type="text" className={FIN.cellInput} value={item.description} onChange={(e: any) => handleItemChange(i, 'description', e.target.value)} />
                  </td>
                  <td className="p-1.5">
                    <input type="number" className={`${FIN.cellInput} text-center`} value={item.quantity} onChange={(e: any) => handleItemChange(i, 'quantity', e.target.value)} />
                  </td>
                  <td className="p-1.5">
                    <input type="number" className={`${FIN.cellInput} text-right`} value={item.rate} onChange={(e: any) => handleItemChange(i, 'rate', e.target.value)} />
                  </td>
                  <td className="p-2 text-right text-[12px] text-zinc-200">{(Number(item.quantity) * Number(item.rate)).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-[#2a2f37] bg-[#14171c] p-2">
            <button type="button" onClick={() => setItems([...items, {description:'', quantity:1, rate:0}])} className="text-[11px] font-semibold text-[#d9b45a] transition hover:text-[#f1d68a]">+ Add Item</button>
          </div>
        </div>

        <div className="mt-3 flex justify-end">
          <div className="w-full space-y-2 rounded-xl border border-[#2a2f37] bg-[#0f1216] p-3.5 sm:w-1/2">
            <div className="flex justify-between text-[12px] text-zinc-400"><span>Subtotal:</span> <span className="font-medium text-zinc-100">{subtotal.toLocaleString()}</span></div>
            <div className="flex items-center justify-between text-[12px] text-zinc-400">
              <span>Discount:</span>
              <input type="number" className={`${FIN.input} !w-24 !py-1 text-right`} value={formData.discount_amount} onChange={(e:any)=>setFormData({...formData, discount_amount: e.target.value})} />
            </div>
            <div className="flex items-center justify-between text-[12px] text-zinc-400">
              <span>Tax (%):</span>
              <input type="number" className={`${FIN.input} !w-24 !py-1 text-right`} value={formData.tax_rate} onChange={(e:any)=>setFormData({...formData, tax_rate: e.target.value})} />
            </div>
            <div className="flex justify-between border-t border-[#2a2f37] pt-2 text-[12px] text-zinc-400">
              <span>Tax Amount:</span> <span className="font-medium text-zinc-100">{taxAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between border-t border-[#c99b3b]/30 pt-2 text-[14px] font-semibold text-[#f1d68a]"><span>Total:</span> <span>{totalAmount.toLocaleString()} {formData.currency}</span></div>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2 border-t border-[#2a2f37] pt-3.5">
          <button type="button" onClick={onClose} className={FIN.btnText}>Cancel</button>
          <button type="submit" className={FIN.btnGold}>Save Invoice</button>
        </div>
      </form>
    </div>
  );
}
