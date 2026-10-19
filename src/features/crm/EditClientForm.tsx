import React, { useState } from 'react';

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
    <div className="bg-[#0f172a] text-white p-6 rounded-xl border border-gray-700 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
      <h2 className="text-xl font-bold mb-4 border-b border-gray-700 pb-2">Edit Client: {client.name}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        
        <div>
          <label className="text-xs text-gray-400">Client Name *</label>
          <input required type="text" className="w-full bg-[#1e293b] border border-gray-600 rounded p-2 mt-1 outline-none focus:border-blue-500" 
            value={formData.name} onChange={(e: any) => setFormData({...formData, name: e.target.value})} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-400">Client Type</label>
            <select className="w-full bg-[#1e293b] border border-gray-600 rounded p-2 mt-1 outline-none"
              value={formData.client_type} onChange={(e: any) => setFormData({...formData, client_type: e.target.value})}>
              <option value="direct">Direct Brand</option>
              <option value="agency">Media Agency</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400">City</label>
            <input type="text" className="w-full bg-[#1e293b] border border-gray-600 rounded p-2 mt-1 outline-none"
              value={formData.city} onChange={(e: any) => setFormData({...formData, city: e.target.value})} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-400">Email</label>
            <input type="email" className="w-full bg-[#1e293b] border border-gray-600 rounded p-2 mt-1 outline-none"
              value={formData.email} onChange={(e: any) => setFormData({...formData, email: e.target.value})} />
          </div>
          <div>
            <label className="text-xs text-gray-400">Phone</label>
            <input type="text" className="w-full bg-[#1e293b] border border-gray-600 rounded p-2 mt-1 outline-none"
              value={formData.phone} onChange={(e: any) => setFormData({...formData, phone: e.target.value})} />
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-400">Address</label>
          <input type="text" className="w-full bg-[#1e293b] border border-gray-600 rounded p-2 mt-1 outline-none"
            value={formData.address} onChange={(e: any) => setFormData({...formData, address: e.target.value})} />
        </div>

        <div>
          <label className="text-xs text-gray-400">Credit Limit</label>
          <input type="number" className="w-full bg-[#1e293b] border border-gray-600 rounded p-2 mt-1 outline-none"
            value={formData.credit_limit} onChange={(e: any) => setFormData({...formData, credit_limit: Number(e.target.value)})} />
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-700">
          <button type="button" onClick={onClose} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
          <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded font-medium disabled:opacity-50">
            {saving ? "Saving..." : "Update Client"}
          </button>
        </div>
      </form>
    </div>
  );
}
