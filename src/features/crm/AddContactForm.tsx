import React, { useState } from 'react';
import { FIN, ModalTitle } from '../finance/financeUi';

export default function AddContactForm({ clientId, onClose }: { clientId: string, onClose: () => void }) {
  const [formData, setFormData] = useState({
    name: '', title: '', email: '', phone: '', is_primary: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/crm/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, client_id: clientId })
      });

      if (res.ok) {
        alert('Contact Added Successfully!');
        onClose();
      } else {
        alert('Error adding contact.');
      }
    } catch (error) {
      console.error(error);
      alert('Network error.');
    }
  };

  return (
    <div className={`${FIN.modal} max-w-md`}>
      <ModalTitle>Add New Contact</ModalTitle>
      <form onSubmit={handleSubmit} className="space-y-3">

        <div>
          <label className={FIN.label}>Contact Name *</label>
          <input required type="text" className={FIN.input}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, name: e.target.value})} placeholder="e.g. Ali Khan" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={FIN.label}>Job Title</label>
            <input type="text" className={FIN.input}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, title: e.target.value})} placeholder="e.g. Marketing Head" />
          </div>
          <div>
            <label className={FIN.label}>Phone</label>
            <input type="text" className={FIN.input}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, phone: e.target.value})} />
          </div>
        </div>

        <div>
          <label className={FIN.label}>Email</label>
          <input type="email" className={FIN.input}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, email: e.target.value})} />
        </div>

        <div className="mt-2 flex items-center gap-2">
          <input type="checkbox" id="isPrimary" className="h-4 w-4 rounded border-[#2b3038] bg-[#0f1216] accent-[#c99b3b]"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, is_primary: e.target.checked})} />
          <label htmlFor="isPrimary" className="text-[12px] text-zinc-300">Is this the primary contact?</label>
        </div>

        <div className="mt-4 flex justify-end gap-2 border-t border-[#2a2f37] pt-3">
          <button type="button" onClick={onClose} className={FIN.btnText}>Cancel</button>
          <button type="submit" className={FIN.btnGold}>Save Contact</button>
        </div>
      </form>
    </div>
  );
}
