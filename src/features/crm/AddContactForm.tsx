import React, { useState } from 'react';

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
    <div className="bg-[#0f172a] text-white p-6 rounded-xl border border-gray-700 w-full max-w-md shadow-2xl">
      <h2 className="text-xl font-bold mb-4">Add New Contact</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        
        <div>
          <label className="text-sm text-gray-400">Contact Name *</label>
          <input required type="text" className="w-full bg-[#1e293b] border border-gray-600 rounded p-2 mt-1 outline-none" 
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, name: e.target.value})} placeholder="e.g. Ali Khan" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-400">Job Title</label>
            <input type="text" className="w-full bg-[#1e293b] border border-gray-600 rounded p-2 mt-1 outline-none"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, title: e.target.value})} placeholder="e.g. Marketing Head" />
          </div>
          <div>
            <label className="text-sm text-gray-400">Phone</label>
            <input type="text" className="w-full bg-[#1e293b] border border-gray-600 rounded p-2 mt-1 outline-none"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, phone: e.target.value})} />
          </div>
        </div>

        <div>
          <label className="text-sm text-gray-400">Email</label>
          <input type="email" className="w-full bg-[#1e293b] border border-gray-600 rounded p-2 mt-1 outline-none"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, email: e.target.value})} />
        </div>

        <div className="flex items-center gap-2 mt-2">
          <input type="checkbox" id="isPrimary" className="w-4 h-4 rounded border-gray-600 bg-[#1e293b]"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, is_primary: e.target.checked})} />
          <label htmlFor="isPrimary" className="text-sm text-gray-300">Is this the primary contact?</label>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-700">
          <button type="button" onClick={onClose} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
          <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded font-medium">Save Contact</button>
        </div>
      </form>
    </div>
  );
}
