import React, { useState } from 'react';
import { FIN, ModalTitle } from './financeUi';

export default function AddExpenseForm({ onClose, campaignId, campaignName }: { onClose: () => void; campaignId?: string; campaignName?: string }) {
  const [formData, setFormData] = useState<any>({
    category: campaignId ? 'Printing & Production' : 'Rent / Media Owner Payment',
    description: '',
    amount: 0,
    expense_date: new Date().toISOString().split('T')[0],
    payment_method: 'Bank Transfer',
    reference_no: '',
    campaign_id: campaignId || null
  });

  const handleSubmit = async (e: any) => {
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
    <div className={`${FIN.modal} max-w-lg`}>
      <ModalTitle>{campaignId ? 'Add Campaign Expense' : 'Add New Expense'}</ModalTitle>
      {campaignId && (
        <p className="-mt-2 mb-3 rounded-lg border border-[#c99b3b]/25 bg-[#c99b3b]/5 px-3 py-2 text-[11px] text-[#d9b45a]">
          This expense will be linked to the campaign{campaignName ? `: ${campaignName}` : ''}.
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5">

        <div>
          <label className={FIN.label}>Category *</label>
          <select required className={FIN.input} value={formData.category}
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
          <label className={FIN.label}>Description</label>
          <input type="text" className={FIN.input}
            onChange={(e: any) => setFormData({...formData, description: e.target.value})} placeholder="e.g. October Electricity Bill" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={FIN.label}>Amount *</label>
            <input required type="number" className={FIN.input}
              onChange={(e: any) => setFormData({...formData, amount: Number(e.target.value)})} placeholder="0" />
          </div>
          <div>
            <label className={FIN.label}>Date *</label>
            <input required type="date" className={FIN.input}
              value={formData.expense_date}
              onChange={(e: any) => setFormData({...formData, expense_date: e.target.value})} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={FIN.label}>Payment Method</label>
            <select className={FIN.input}
              onChange={(e: any) => setFormData({...formData, payment_method: e.target.value})}>
              <option value="Cash">Cash</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="IBFT / Online Transfer">IBFT / Online Transfer</option>
              <option value="Cheque">Cheque</option>
              <option value="Credit Card">Credit Card</option>
            </select>
          </div>
          <div>
            <label className={FIN.label}>Reference No (Optional)</label>
            <input type="text" className={FIN.input}
              onChange={(e: any) => setFormData({...formData, reference_no: e.target.value})} placeholder="e.g. TXN-12345" />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2 border-t border-[#2a2f37] pt-3.5">
          <button type="button" onClick={onClose} className={FIN.btnText}>Cancel</button>
          <button type="submit" className={FIN.btnRose}>Save Expense</button>
        </div>
      </form>
    </div>
  );
}
