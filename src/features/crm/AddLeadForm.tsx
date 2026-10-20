import React, { useState } from 'react';     
import { FIN, ModalTitle } from '../finance/financeUi';       
import { findDuplicates } from './crmTools';
import { getDefaultCurrency } from '@/lib/companyDefaults';

export type DupCandidate = { id: string; name: string; phone?: string | null; email?: string | null };

export default function AddLeadForm({ onClose, existing = [] }: { onClose: () => void; existing?: DupCandidate[] }) {
  const [formData, setFormData] = useState({
    company_name: '', contact_name: '', email: '', phone: '', estimated_value: 0, source: 'Referral', notes: ''
  });

  const dupes = findDuplicates({ name: formData.company_name, phone: formData.phone, email: formData.email }, existing);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (dupes.length > 0 && !window.confirm(`Possible duplicate: ${dupes.map((d) => d.name).join(', ')}. Save anyway?`)) return;
    try {
      const res = await fetch('/api/crm/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        alert('Lead Added Successfully!');
        onClose();
      } else {
        alert('Error adding lead.');
      }
    } catch (error) {
      console.error(error);
      alert('Network error.');
    }
  };

  return (
    <div className={`${FIN.modal} max-w-md`}>
      <ModalTitle>Add New Lead</ModalTitle>
      <form onSubmit={handleSubmit} className="space-y-3">

        <div>
          <label className={FIN.label}>Company Name *</label>
          <input required type="text" className={FIN.input}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, company_name: e.target.value})} placeholder="e.g. Zenith Foods" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={FIN.label}>Contact Person</label>
            <input type="text" className={FIN.input}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, contact_name: e.target.value})} placeholder="e.g. Ali Khan" />
          </div>
          <div>
            <label className={FIN.label}>Phone</label>
            <input type="text" className={FIN.input}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, phone: e.target.value})} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={FIN.label}>Email</label>
            <input type="email" className={FIN.input}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, email: e.target.value})} />
          </div>
          <div>
            <label className={FIN.label}>Est. Value ({getDefaultCurrency()})</label>
            <input type="number" className={FIN.input}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, estimated_value: Number(e.target.value)})} placeholder="0" />
          </div>
        </div>

        <div>
          <label className={FIN.label}>Lead Source</label>
          <select className={FIN.input}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({...formData, source: e.target.value})}>
            <option value="Referral">Referral</option>
            <option value="Website">Website</option>
            <option value="Cold Call">Cold Call</option>
            <option value="Event">Event / Trade Show</option>
          </select>
        </div>

        <div>
          <label className={FIN.label}>Notes</label>
          <textarea className={`${FIN.input} resize-none`} rows={2}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({...formData, notes: e.target.value})} placeholder="Initial conversation details..."></textarea>
        </div>

        {dupes.length > 0 && (
          <div className="rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
            Possible duplicate: {dupes.map((d) => `${d.name} (${d.reason})`).join(', ')}
          </div>
        )}

        <div className="mt-4 flex justify-end gap-2 border-t border-[#2a2f37] pt-3">
          <button type="button" onClick={onClose} className={FIN.btnText}>Cancel</button>
          <button type="submit" className={FIN.btnGold}>Save Lead</button>
        </div>
      </form>
    </div>
  );
}
