import React, { useState } from 'react';

export default function AddClientForm({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState({
    name: '', client_type: 'direct', industry: '', city: '', phone: '', email: '', credit_limit: 0, notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/crm/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        alert('Client Added Successfully!');
        onClose();
        window.location.reload();
      } else {
        alert('Error adding client.');
      }
    } catch (error) {
      console.error(error);
      alert('Network error.');
    }
  };

  return (
    <div className="bg-[#0f172a] text-white p-6 rounded-xl border border-gray-700 w-full max-w-md shadow-2xl">
      <h2 className="text-xl font-bold mb-4">Add New Client</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        
        <div>
          <label className="text-sm text-gray-400">Client / Company Name *</label>
          <input required type="text" className="w-full bg-[#1e293b] border border-gray-600 rounded p-2 mt-1 outline-none" 
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, name: e.target.value})} placeholder="e.g. Coca Cola" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-400">Client Type</label>
            <select className="w-full bg-[#1e293b] border border-gray-600 rounded p-2 mt-1 outline-none"
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({...formData, client_type: e.target.value})}>
              <option value="direct">Direct Brand</option>
              <option value="agency">Media Agency</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-400">City</label>
            <input type="text" className="w-full bg-[#1e293b] border border-gray-600 rounded p-2 mt-1 outline-none"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, city: e.target.value})} placeholder="e.g. Lahore" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-400">Email</label>
            <input type="email" className="w-full bg-[#1e293b] border border-gray-600 rounded p-2 mt-1 outline-none"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, email: e.target.value})} />
          </div>
          <div>
            <label className="text-sm text-gray-400">Phone</label>
            <input type="text" className="w-full bg-[#1e293b] border border-gray-600 rounded p-2 mt-1 outline-none"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, phone: e.target.value})} />
          </div>
        </div>

        <div>
          <label className="text-sm text-gray-400">Credit Limit (PKR)</label>
          <input type="number" className="w-full bg-[#1e293b] border border-gray-600 rounded p-2 mt-1 outline-none"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, credit_limit: Number(e.target.value)})} placeholder="0" />
        </div>

        <div>
          <label className="text-sm text-gray-400">Notes / Activity</label>
          <textarea className="w-full bg-[#1e293b] border border-gray-600 rounded p-2 mt-1 outline-none" rows={2}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({...formData, notes: e.target.value})} placeholder="Initial conversation details..."></textarea>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-700">
          <button type="button" onClick={onClose} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
          <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded font-medium">Save Client</button>
        </div>
      </form>
    </div>
  );
}
