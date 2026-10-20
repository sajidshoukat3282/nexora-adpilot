import React, { useState } from 'react';
import { FIN, ModalTitle } from '../finance/financeUi';

export default function EditClientForm({ client, onClose, onSuccess }: { client: any, onClose: () => void, onSuccess: () => void }) {
  const [formData, setFormData] = useState<any>({
    name: client.name || '',
    client_type: client.client_type || 'direct',
    industry: client.industry || '',
    city: client.city || '',
    phone: client.phone || '',
    email: client.email || '',
    address: client.address || '',
    credit_limit: client.credit_limit || 0,
    notes: client.notes || ''
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/crm/clients/${client.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        alert('Client Updated Successfully!');
        onSuccess();
        onClose();
      } else {
        alert('Error updating client.');
      }
    } catch (error) {
      console.error(error);
      alert('Network error.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`${FIN.modal} max-w-md`}>
      <ModalTitle>Edit Client: {client.name}</ModalTitle>
      <form onSubmit={handleSubmit} className="space-y-3">

        <div>
          <label className={FIN.label}>Client Name *</label>
          <input required type="text" className={FIN.input}
            value={formData.name} onChange={(e: any) => setFormData({...formData, name: e.target.value})} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={FIN.label}>Client Type</label>
            <select className={FIN.input}
              value={formData.client_type} onChange={(e: any) => setFormData({...formData, client_type: e.target.value})}>
              <option value="direct">Direct Brand</option>
              <option value="agency">Media Agency</option>
            </select>
          </div>
          <div>
            <label className={FIN.label}>City</label>
            <input type="text" className={FIN.input}
              value={formData.city} onChange={(e: any) => setFormData({...formData, city: e.target.value})} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={FIN.label}>Email</label>
            <input type="email" className={FIN.input}
              value={formData.email} onChange={(e: any) => setFormData({...formData, email: e.target.value})} />
          </div>
          <div>
            <label className={FIN.label}>Phone</label>
            <input type="text" className={FIN.input}
              value={formData.phone} onChange={(e: any) => setFormData({...formData, phone: e.target.value})} />
          </div>
        </div>

        <div>
          <label className={FIN.label}>Address</label>
          <input type="text" className={FIN.input}
            value={formData.address} onChange={(e: any) => setFormData({...formData, address: e.target.value})} />
        </div>

        <div>
          <label className={FIN.label}>Credit Limit</label>
          <input type="number" className={FIN.input}
            value={formData.credit_limit} onChange={(e: any) => setFormData({...formData, credit_limit: Number(e.target.value)})} />
        </div>

        <div className="mt-4 flex justify-end gap-2 border-t border-[#2a2f37] pt-3">
          <button type="button" onClick={onClose} className={FIN.btnText}>Cancel</button>
          <button type="submit" disabled={saving} className={FIN.btnGold}>
            {saving ? "Saving..." : "Update Client"}
          </button>
        </div>
      </form>
    </div>
  );
}
