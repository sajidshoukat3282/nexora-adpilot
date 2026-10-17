import React, { useState } from 'react';

export default function AddInventoryForm({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    screen_type: 'digital',
    city: '',
    location: '',
    latitude: '',
    longitude: '',
    size: '',
    rate: 0,
    currency: 'PKR',
    status: 'online'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          latitude: formData.latitude ? Number(formData.latitude) : null,
          longitude: formData.longitude ? Number(formData.longitude) : null,
          rate: Number(formData.rate)
        })
      });
      
      if (res.ok) {
        alert('Screen Added Successfully!');
        onClose();
      } else {
        const error = await res.json();
        alert(`Error: ${error.error || 'Failed to add screen'}`);
      }
    } catch (error) {
      console.error(error);
      alert('Network error.');
    }
  };

  return (
    <div className="bg-[#0f172a] text-white p-6 rounded-xl border border-gray-700 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
      <h2 className="text-xl font-bold mb-4">Add New Screen / Billboard</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* Row 1: Name and Type */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-400">Screen Name *</label>
            <input required type="text" className="w-full bg-[#1e293b] border border-gray-600 rounded p-2 mt-1 outline-none focus:border-blue-500" 
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, name: e.target.value})} placeholder="e.g. Gulberg Boulevard Screen" />
          </div>
          <div>
            <label className="text-sm text-gray-400">Screen Type</label>
            <select className="w-full bg-[#1e293b] border border-gray-600 rounded p-2 mt-1 outline-none focus:border-blue-500"
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({...formData, screen_type: e.target.value})}>
              <option value="digital">Digital Screen</option>
              <option value="static">Static Billboard</option>
            </select>
          </div>
        </div>

        {/* Row 2: City and Size */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-400">City *</label>
            <input required type="text" className="w-full bg-[#1e293b] border border-gray-600 rounded p-2 mt-1 outline-none focus:border-blue-500"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, city: e.target.value})} placeholder="e.g. Lahore" />
          </div>
          <div>
            <label className="text-sm text-gray-400">Dimensions / Size</label>
            <input type="text" className="w-full bg-[#1e293b] border border-gray-600 rounded p-2 mt-1 outline-none focus:border-blue-500"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, size: e.target.value})} placeholder="e.g. 20x10 ft" />
          </div>
        </div>

        {/* Row 3: Location Description */}
        <div>
          <label className="text-sm text-gray-400">Location Detail (Address / Landmark)</label>
          <input type="text" className="w-full bg-[#1e293b] border border-gray-600 rounded p-2 mt-1 outline-none focus:border-blue-500"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, location: e.target.value})} placeholder="e.g. Near Dolmen Mall, Main Boulevard" />
        </div>

        {/* Row 4: Lat/Lng (Optional for Map) */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-400">Latitude (Optional)</label>
            <input type="number" step="any" className="w-full bg-[#1e293b] border border-gray-600 rounded p-2 mt-1 outline-none focus:border-blue-500"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, latitude: e.target.value})} placeholder="e.g. 31.5204" />
          </div>
          <div>
            <label className="text-sm text-gray-400">Longitude (Optional)</label>
            <input type="number" step="any" className="w-full bg-[#1e293b] border border-gray-600 rounded p-2 mt-1 outline-none focus:border-blue-500"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, longitude: e.target.value})} placeholder="e.g. 74.3587" />
          </div>
        </div>

        {/* Row 5: Rate and Currency */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-400">Base Rate (Per Day/Month) *</label>
            <input required type="number" className="w-full bg-[#1e293b] border border-gray-600 rounded p-2 mt-1 outline-none focus:border-blue-500"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, rate: Number(e.target.value)})} placeholder="0" />
          </div>
          <div>
            <label className="text-sm text-gray-400">Currency</label>
            <select className="w-full bg-[#1e293b] border border-gray-600 rounded p-2 mt-1 outline-none focus:border-blue-500"
              value={formData.currency}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({...formData, currency: e.target.value})}>
              <option value="PKR">PKR</option>
              <option value="USD">USD</option>
              <option value="AED">AED</option>
              <option value="GBP">GBP</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
        </div>

        {/* Row 6: Status */}
        <div>
          <label className="text-sm text-gray-400">Status</label>
          <select className="w-full bg-[#1e293b] border border-gray-600 rounded p-2 mt-1 outline-none focus:border-blue-500"
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({...formData, status: e.target.value})}>
            <option value="online">Online (Active)</option>
            <option value="offline">Offline</option>
            <option value="maintenance">Under Maintenance</option>
          </select>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-700">
          <button type="button" onClick={onClose} className="px-4 py-2 text-gray-400 hover:text-white transition-colors">Cancel</button>
          <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded font-medium transition-colors">Save Screen</button>
        </div>
      </form>
    </div>
  );
}
