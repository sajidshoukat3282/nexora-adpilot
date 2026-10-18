import React, { useState } from 'react';

export default function AddExpenseForm({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState<any>({
    category: 'Rent / Media Owner Payment',
    description: '',
    amount: 0,
    expense_date: new Date().toISOString().split('T')[0],
    payment_method: 'Bank Transfer',
    reference_no: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        alert('Expense Added Successfully!');
        onClose();
      } else {
        alert('Error adding expense.');
      }
    } catch (error) {
      console.error(error);
      alert('Network error.');
    }
  };

  return (
    <div className="bg-white text-slate-800 p-6 rounded-xl border border-slate-200 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
      <h2 className="text-xl font-bold mb-4 text-slate-900 border-b pb-2">Add New Expense</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        
        <div>
          <label className="text-sm font-medium text-slate-600">Category *</label>
          <select required className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 mt-1 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            onChange={(e: any) => setFormData({...formData, category: e.target.value})}>
            <option value="Rent / Media Owner Payment">Rent / Media Owner Payment</option>
            <option value="Government Tax & Municipal Fees">Government Tax & Municipal Fees</option>
            <option value="Utilities (Electricity, Water)">Utilities (Electricity, Water)</option>
            <option value="Maintenance & Repair">Maintenance & Repair</option>
            <option value="Printing & Production">Printing & Production</option>
            <option value="Salaries & Commissions">Salaries & Commissions</option>
            <option value="Marketing & Sales">Marketing & Sales</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-600">Description</label>
          <input type="text" className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 mt-1 outline-none focus:border-emerald-500" 
            onChange={(e: any) => setFormData({...formData, description: e.target.value})} placeholder="e.g. October Electricity Bill" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-600">Amount *</label>
            <input required type="number" className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 mt-1 outline-none focus:border-emerald-500"
              onChange={(e: any) => setFormData({...formData, amount: Number(e.target.value)})} placeholder="0" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-600">Date *</label>
            <input required type="date" className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 mt-1 outline-none focus:border-emerald-500"
              value={formData.expense_date}
              onChange={(e: any) => setFormData({...formData, expense_date: e.target.value})} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-600">Payment Method</label>
            <select className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 mt-1 outline-none focus:border-emerald-500"
              onChange={(e: any) => setFormData({...formData, payment_method: e.target.value})}>
              <option value="Cash">Cash</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="IBFT / Online Transfer">IBFT / Online Transfer</option>
              <option value="Cheque">Cheque</option>
              <option value="Credit Card">Credit Card</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-600">Reference No (Optional)</label>
            <input type="text" className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 mt-1 outline-none focus:border-emerald-500"
              onChange={(e: any) => setFormData({...formData, reference_no: e.target.value})} placeholder="e.g. TXN-12345" />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
          <button type="button" onClick={onClose} className="px-4 py-2 text-slate-500 hover:text-slate-800 font-medium">Cancel</button>
          <button type="submit" className="px-6 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-medium shadow-sm transition-colors">Save Expense</button>
        </div>
      </form>
    </div>
  );
}
