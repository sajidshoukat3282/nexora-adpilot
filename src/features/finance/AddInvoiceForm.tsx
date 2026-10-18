import React, { useState, useEffect, useMemo } from 'react';

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
    <div className="bg-white p-6 rounded-xl border w-full max-w-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
      <h2 className="text-xl font-bold mb-4 border-b pb-2 text-slate-800">Create Invoice</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-1">
            <label className="text-sm text-slate-600">Client</label>
            <select required className="w-full border rounded p-2 mt-1 outline-none" onChange={(e: any) => setFormData({...formData, client_id: e.target.value})}>
              <option value="">Select Client</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm text-slate-600">Issue Date</label>
            <input required type="date" className="w-full border rounded p-2 mt-1 outline-none" value={formData.issue_date} onChange={(e: any) => setFormData({...formData, issue_date: e.target.value})} />
          </div>
          <div>
            <label className="text-sm text-slate-600">Due Date</label>
            <input required type="date" className="w-full border rounded p-2 mt-1 outline-none" value={formData.due_date} onChange={(e: any) => setFormData({...formData, due_date: e.target.value})} />
          </div>
        </div>
        
        <div className="border rounded-lg overflow-hidden mt-4">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="p-2">Description</th>
                <th className="p-2 w-20">Qty</th>
                <th className="p-2 w-24">Rate</th>
                <th className="p-2 w-24">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i} className="border-t">
                  <td className="p-2">
                    <input type="text" className="w-full bg-transparent outline-none" value={item.description} onChange={(e: any) => handleItemChange(i, 'description', e.target.value)} />
                  </td>
                  <td className="p-2">
                    <input type="number" className="w-full bg-transparent outline-none text-center" value={item.quantity} onChange={(e: any) => handleItemChange(i, 'quantity', e.target.value)} />
                  </td>
                  <td className="p-2">
                    <input type="number" className="w-full bg-transparent outline-none text-right" value={item.rate} onChange={(e: any) => handleItemChange(i, 'rate', e.target.value)} />
                  </td>
                  <td className="p-2 text-right">{(Number(item.quantity) * Number(item.rate)).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-2 bg-slate-50 border-t">
            <button type="button" onClick={() => setItems([...items, {description:'', quantity:1, rate:0}])} className="text-sm text-emerald-600 font-bold hover:text-emerald-700">+ Add Item</button>
          </div>
        </div>

        <div className="flex justify-end mt-4">
          <div className="w-1/2 bg-slate-50 p-4 rounded-lg border space-y-2">
            <div className="flex justify-between text-sm text-slate-600"><span>Subtotal:</span> <span>{subtotal.toLocaleString()}</span></div>
            <div className="flex justify-between text-sm items-center text-slate-600"><span>Discount:</span> <input type="number" className="w-20 border rounded p-1 text-right outline-none" value={formData.discount_amount} onChange={(e:any)=>setFormData({...formData, discount_amount: e.target.value})} /></div>
            <div className="flex justify-between text-sm items-center text-slate-600"><span>Tax (%):</span> <input type="number" className="w-20 border rounded p-1 text-right outline-none" value={formData.tax_rate} onChange={(e:any)=>setFormData({...formData, tax_rate: e.target.value})} /></div>
            <div className="flex justify-between font-bold text-lg border-t pt-2 text-slate-800"><span>Total:</span> <span>{totalAmount.toLocaleString()} PKR</span></div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-4 border-t pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 text-slate-500 hover:text-slate-800">Cancel</button>
          <button type="submit" className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg">Save Invoice</button>
        </div>
      </form>
    </div>
  );
}
