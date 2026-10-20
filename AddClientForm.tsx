import React, { useState } from 'react';
import { FIN, ModalTitle } from '../finance/financeUi';
import { findDuplicates } from './crmTools';
import { getDefaultCurrency } from '@/lib/companyDefaults';
import { CURRENCY_CODES } from '@/domain';
import type { DupCandidate } from './AddLeadForm';

export default function AddClientForm({ onClose, existing = [] }: { onClose: () => void; existing?: DupCandidate[] }) {
  const [formData, setFormData] = useState({
    name: '', client_type: 'direct', industry: '', city: '', phone: '', email: '',
    credit_limit: 0,
    currency: getDefaultCurrency(), // company default currency
    notes: ''
  });

  const dupes = findDuplicates({ name: formData.name, phone: formData.phone, email: formData.email }, existing);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (dupes.length > 0 && !window.confirm(`Possible duplicate: ${dupes.map((d) => d.name).join(', ')}. Save anyway?`)) return;
    try {
      const res = await fetch('/api/crm/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        alert('Client Added Successfully!');
        onClose();
      } else {
        alert('Error adding client.');
      }
    } catch (error) {
      console.error(error);
      alert('Network error.');
    }
  };

  return (
    <div className={`${FIN.modal} max-w-md`}>
      <ModalTitle>Add New Client</ModalTitle>
      <form onSubmit={handleSubmit} className="space-y-3">

        <div>
          <label className={FIN.label}>Client / Company Name *</label>
          <input required type="text" className={FIN.input}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, name: e.target.value})} placeholder="e.g. Coca Cola" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={FIN.label}>Client Type</label>
            <select className={FIN.input}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({...formData, client_type: e.target.value})}>
              <option value="direct">Direct Brand</option>
              <option value="agency">Media Agency</option>
            </select>
          </div>
          <div>
            <label className={FIN.label}>City</label>
            <input type="text" className={FIN.input}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, city: e.target.value})} placeholder="e.g. Lahore" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={FIN.label}>Email</label>
            <input type="email" className={FIN.input}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, email: e.target.value})} />
          </div>
          <div>
            <label className={FIN.label}>Phone</label>
            <input type="text" className={FIN.input}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, phone: e.target.value})} />
          </div>
        </div>

        {/* Naya Currency aur Credit Limit Section */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={FIN.label}>Credit Limit</label>
            <input type="number" className={FIN.input}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, credit_limit: Number(e.target.value)})} placeholder="0" />
          </div>
          <div>
            <label className={FIN.label}>Currency</label>
            <select className={FIN.input}
              value={formData.currency}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({...formData, currency: e.target.value})}>
              {CURRENCY_CODES.map((code) => (
                <option key={code} value={code}>{code}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={FIN.label}>Notes / Activity</label>
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
          <button type="submit" className={FIN.btnGold}>Save Client</button>
        </div>
      </form>
    </div>
  );
}
