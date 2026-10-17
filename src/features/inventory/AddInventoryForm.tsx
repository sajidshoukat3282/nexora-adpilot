import React, { useState } from 'react';

export default function AddInventoryForm({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState({
    name: '', screen_type: 'digital', city: '', location: '', latitude: '', longitude: '',
    size: '', rate: 0, currency: 'PKR', status: 'online'
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const handleLocationSearch = async () => {
    if (!searchQuery) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/geography/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data.ok) {
        setSearchResults(data.results || []);
      }
    } catch (error) {
      console.error("Location search failed", error);
    } finally {
      setSearching(false);
    }
  };

  const selectLocation = (loc: any) => {
    setFormData({
      ...formData,
      location: loc.displayName || loc.name || searchQuery,
      city: loc.city || loc.address?.city || loc.address?.town || "",
      latitude: (loc.coordinates?.lat || loc.lat || "").toString(),
      longitude: (loc.coordinates?.lng || loc.lng || "").toString()
    });
    setSearchResults([]); 
  };

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
        alert('Error adding screen');
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
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-400">Screen Name *</label>
            <input required type="text" className="w-full bg-[#1e293b] border border-gray-600 rounded p-2 mt-1 outline-none" 
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, name: e.target.value})} placeholder="e.g. Gulberg Boulevard Screen" />
          </div>
          <div>
            <label className="text-sm text-gray-400">Screen Type</label>
            <select className="w-full bg-[#1e293b] border border-gray-600 rounded p-2 mt-1 outline-none"
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({...formData, screen_type: e.target.value})}>
              <option value="digital">Digital Screen</option>
              <option value="static">Static Billboard</option>
            </select>
          </div>
        </div>

        {/* Location Search Integration */}
        <div className="border border-gray-600 p-3 rounded-lg bg-[#1e293b]/50">
          <label className="text-sm text-blue-400 font-semibold mb-2 block">Search Location (Google/Nominatim)</label>
          <div className="flex gap-2 mb-2">
            <input type="text" className="flex-1 bg-[#1e293b] border border-gray-600 rounded p-2 outline-none" 
              placeholder="e.g. Dolmen Mall Karachi" value={searchQuery} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)} />
            <button type="button" onClick={handleLocationSearch} disabled={searching} className="bg-blue-600 px-4 rounded text-sm hover:bg-blue-500">
              {searching ? "..." : "Search"}
            </button>
          </div>
          
          {searchResults.length > 0 && (
            <div className="bg-[#0f172a] border border-gray-600 rounded max-h-32 overflow-y-auto mt-1">
              {searchResults.map((loc: any, i: number) => (
                <div key={i} onClick={() => selectLocation(loc)} className="p-2 text-sm border-b border-gray-700 hover:bg-[#1e293b] cursor-pointer">
                  {loc.displayName || loc.name}
                </div>
              ))}
            </div>
          )}
          
          <div className="grid grid-cols-3 gap-2 mt-2">
             <div>
               <label className="text-xs text-gray-500">City</label>
               <input type="text" className="w-full bg-[#1e293b] border border-gray-600 rounded p-1.5 text-sm" value={formData.city} readOnly />
             </div>
             <div>
               <label className="text-xs text-gray-500">Latitude</label>
               <input type="text" className="w-full bg-[#1e293b] border border-gray-600 rounded p-1.5 text-sm" value={formData.latitude} readOnly />
             </div>
             <div>
               <label className="text-xs text-gray-500">Longitude</label>
               <input type="text" className="w-full bg-[#1e293b] border border-gray-600 rounded p-1.5 text-sm" value={formData.longitude} readOnly />
             </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-400">Dimensions / Size</label>
            <input type="text" className="w-full bg-[#1e293b] border border-gray-600 rounded p-2 mt-1 outline-none"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, size: e.target.value})} placeholder="e.g. 20x10 ft" />
          </div>
          <div>
            <label className="text-sm text-gray-400">Status</label>
            <select className="w-full bg-[#1e293b] border border-gray-600 rounded p-2 mt-1 outline-none"
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({...formData, status: e.target.value})}>
              <option value="online">Online</option>
              <option value="offline">Offline</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-400">Base Rate *</label>
            <input required type="number" className="w-full bg-[#1e293b] border border-gray-600 rounded p-2 mt-1 outline-none"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, rate: Number(e.target.value)})} placeholder="0" />
          </div>
          <div>
            <label className="text-sm text-gray-400">Currency</label>
            <select className="w-full bg-[#1e293b] border border-gray-600 rounded p-2 mt-1 outline-none"
              value={formData.currency} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({...formData, currency: e.target.value})}>
              <option value="PKR">PKR</option>
              <option value="USD">USD</option>
              <option value="AED">AED</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-700">
          <button type="button" onClick={onClose} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
          <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded font-medium">Save Screen</button>
        </div>
      </form>
    </div>
  );
}
