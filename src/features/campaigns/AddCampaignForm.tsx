import React, { useState, useEffect, useMemo } from 'react';

export default function AddCampaignForm({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState<any>({
    name: '',
    client_id: '',
    start_date: '',
    end_date: '',
    status: 'draft',
    currency: 'PKR'
  });

  const [clients, setClients] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [selectedScreens, setSelectedScreens] = useState<string[]>([]);
  
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);

  // 1. Fetch Clients and Inventory on load
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [clientsRes, invRes] = await Promise.all([
          fetch('/api/crm/clients'),
          fetch('/api/inventory')
        ]);
        const cData = await clientsRes.json();
        const iData = await invRes.json();
        
        if (cData.ok) setClients(cData.data);
        if (iData.ok) setInventory(iData.data);
      } catch (err) {
        console.error("Failed to fetch data", err);
      }
    };
    fetchData();
  }, []);

  // 2. Auto-Calculate Total Budget (WOW Feature)
  const totalBudget = useMemo(() => {
    if (!formData.start_date || !formData.end_date || selectedScreens.length === 0) return 0;
    
    const start = new Date(formData.start_date).getTime();
    const end = new Date(formData.end_date).getTime();
    const days = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1); // Include both days

    let total = 0;
    selectedScreens.forEach(id => {
      const screen = inventory.find(s => s.id === id);
      if (screen) total += (screen.rate || 0) * days;
    });
    return total;
  }, [formData.start_date, formData.end_date, selectedScreens, inventory]);

  // 3. Check Availability (Double Booking Warning)
  useEffect(() => {
    const checkAvail = async () => {
      if (!formData.start_date || !formData.end_date || selectedScreens.length === 0) {
        setConflicts([]);
        return;
      }
      
      setChecking(true);
      try {
        const res = await fetch('/api/campaigns/check-availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            inventory_ids: selectedScreens,
            start_date: formData.start_date,
            end_date: formData.end_date
          })
        });
        const data = await res.json();
        if (data.ok) {
          setConflicts(data.conflicts || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setChecking(false);
      }
    };
    
    // Thora delay lagaya hai taake har click par API na chale (Debounce)
    const timer = setTimeout(checkAvail, 600); 
    return () => clearTimeout(timer);
  }, [formData.start_date, formData.end_date, selectedScreens]);

  const handleScreenToggle = (id: string) => {
    setSelectedScreens(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (conflicts.length > 0) {
      alert("Cannot save! Some screens are already booked for these dates.");
      return;
    }

    setSaving(true);
    try {
      // Screens data tayyar karein
      const screensData = selectedScreens.map(id => {
        const screen = inventory.find(s => s.id === id);
        return { inventory_id: id, rate_applied: screen?.rate || 0 };
      });

      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          total_budget: totalBudget,
          screens: screensData
        })
      });

      if (res.ok) {
        alert('Campaign Created Successfully!');
        onClose();
      } else {
        alert('Error creating campaign.');
      }
    } catch (err) {
      console.error(err);
      alert('Network error.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-[#0f172a] text-white p-6 rounded-xl border border-gray-700 w-full max-w-4xl shadow-2xl max-h-[90vh] overflow-y-auto">
      <h2 className="text-xl font-bold mb-4">Create New Campaign</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-400">Campaign Name *</label>
            <input required type="text" className="w-full bg-[#1e293b] border border-gray-600 rounded p-2 mt-1 outline-none" 
              onChange={(e: any) => setFormData({...formData, name: e.target.value})} placeholder="e.g. Summer Sale Launch" />
          </div>
          <div>
            <label className="text-sm text-gray-400">Select Client *</label>
            <select required className="w-full bg-[#1e293b] border border-gray-600 rounded p-2 mt-1 outline-none"
              onChange={(e: any) => setFormData({...formData, client_id: e.target.value})}>
              <option value="">-- Choose Client --</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-sm text-gray-400">Start Date *</label>
            <input required type="date" className="w-full bg-[#1e293b] border border-gray-600 rounded p-2 mt-1 outline-none"
              onChange={(e: any) => setFormData({...formData, start_date: e.target.value})} />
          </div>
          <div>
            <label className="text-sm text-gray-400">End Date *</label>
            <input required type="date" className="w-full bg-[#1e293b] border border-gray-600 rounded p-2 mt-1 outline-none"
              onChange={(e: any) => setFormData({...formData, end_date: e.target.value})} />
          </div>
          <div>
            <label className="text-sm text-gray-400">Status</label>
            <select className="w-full bg-[#1e293b] border border-gray-600 rounded p-2 mt-1 outline-none"
              onChange={(e: any) => setFormData({...formData, status: e.target.value})}>
              <option value="draft">Draft</option>
              <option value="booked">Booked</option>
              <option value="live">Live</option>
            </select>
          </div>
        </div>

        {/* Multi-Screen Selection (WOW Feature) */}
        <div className="border border-gray-600 p-3 rounded-lg bg-[#1e293b]/50">
          <label className="text-sm text-blue-400 font-semibold mb-2 block">Select Screens / Billboards *</label>
          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-2">
            {inventory.map(screen => (
              <label key={screen.id} className="flex items-center gap-3 p-2 rounded hover:bg-[#1e293b] cursor-pointer border border-gray-700">
                <input type="checkbox" className="w-4 h-4 rounded bg-[#0f172a] border-gray-600"
                  checked={selectedScreens.includes(screen.id)}
                  onChange={() => handleScreenToggle(screen.id)} />
                <div>
                  <div className="text-sm font-medium">{screen.name}</div>
                  <div className="text-xs text-gray-400">{screen.city} • {screen.rate} {screen.currency}/day</div>
                </div>
              </label>
            ))}
            {inventory.length === 0 && <div className="text-sm text-gray-500 col-span-2">No screens in inventory. Add screens first.</div>}
          </div>
        </div>

        {/* Booking Conflicts Warning */}
        {checking && <div className="text-sm text-yellow-400">Checking availability...</div>}
        {conflicts.length > 0 && (
          <div className="bg-red-900/30 border border-red-700 p-3 rounded-lg">
            <p className="text-red-400 font-bold text-sm mb-1">⚠️ Double Booking Warning!</p>
            <ul className="text-xs text-red-300 list-disc pl-4">
              {conflicts.map((c, i) => (
                <li key={i}>Screen is already booked for campaign: <b>{c.campaign_name}</b> ({c.start_date} to {c.end_date})</li>
              ))}
            </ul>
          </div>
        )}

        {/* Auto Price Calculation (WOW Feature) */}
        <div className="bg-[#1e293b] p-4 rounded-lg flex justify-between items-center border border-gray-600">
          <div>
            <div className="text-sm text-gray-400">Total Estimated Budget</div>
            <div className="text-xs text-gray-500">Auto-calculated based on days & screens</div>
          </div>
          <div className="text-2xl font-bold text-emerald-400">
            {totalBudget.toLocaleString()} <span className="text-sm text-gray-400">PKR</span>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-700">
          <button type="button" onClick={onClose} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
          <button type="submit" disabled={saving || conflicts.length > 0} 
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed">
            {saving ? "Saving..." : "Save Campaign"}
          </button>
        </div>
      </form>
    </div>
  );
}
