import React, { useState } from 'react';

export default function AddLeadForm({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState({
    company_name: '', contact_name: '', email: '', phone: '', estimated_value: 0, source: 'Referral', notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    // Yahan max-h aur overflow add kiya hai
    <div className="bg-[#0f172a] text-white p-6 rounded-xl border border-gray-700 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
      <h2 className="text-xl font-bold mb-4">Add New Lead</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        
        <div>
          <label className="text-sm text-gray-400">Company Name *</label>
          <input required type="text" className="w-full bg-[#1e293b] border border-gray-600 rounded p-2 mt-1 outline-none" 
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, company_name: e.target.value})} placeholder="e.g. Zenith Foods" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-400">Contact Person</label>
            <input type="text" className="w-full bg-[#1e293b] border border-gray-600 rounded p-2 mt-1 outline-none"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, contact_name: e.target.value})} placeholder="e.g. Ali Khan" />
          </div>
          <div>
            <label className="text-sm text-gray-400">Phone</label>
            <input type="text" className="w-full bg-[#1e293b] border border-gray-600 rounded p-2 mt-1 outline-none"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, phone: e.target.value})} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-400">Email</label>
            <input type="email" className="w-full bg-[#1e293b] border border-gray-600 rounded p-2 mt-1 outline-none"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, email: e.target.value})} />
          </div>
          <div>
            <label className="text-sm text-gray-400">Est. Value (PKR)</label>
            <input type="number" className="w-full bg-[#1e293b] border border-gray-600 rounded p-2 mt-1 outline-none"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, estimated_value: Number(e.target.value)})} placeholder="0" />
          </div>
        </div>

        <div>
          <label className="text-sm text-gray-400">Lead Source</label>
          <select className="w-full bg-[#1e293b] border border-gray-600 rounded p-2 mt-1 outline-none"
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({...formData, source: e.target.value})}>
            <option value="Referral">Referral</option>
            <option value="Website">Website</option>
            <option value="Cold Call">Cold Call</option>
            <option value="Event">Event / Trade Show</option>
          </select>
        </div>

        <div>
          <label className="text-sm text-gray-400">Notes</label>
          <textarea className="w-full bg-[#1e293b] border border-gray-600 rounded p-2 mt-1 outline-none" rows={2}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({...formData, notes: e.target.value})} placeholder="Initial conversation details..."></textarea>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-700">
          <button type="button" onClick={onClose} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
          <button type="submit" className="px-4 py-2 bg-teal-600 hover:bg-teal-500 rounded font-medium">Save Lead</button>
        </div>
      </form>
    </div>
  );
}
