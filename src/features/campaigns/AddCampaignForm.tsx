import React, { useState, useEffect, useMemo } from 'react';
import { getDefaultCurrency } from '@/lib/companyDefaults';
import { FIN, ModalTitle } from '../finance/financeUi';
import { screenCapacity } from './campaignTools';

export default function AddCampaignForm({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState<any>({
    name: '',
    client_id: '',
    start_date: '',
    end_date: '',
    status: 'draft',
    currency: getDefaultCurrency()
  });
  const [error, setError] = useState('');

  const [clients, setClients] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [selectedScreens, setSelectedScreens] = useState<string[]>([]);
  const [slotsFor, setSlotsFor] = useState<Record<string, number>>({});
  const [avail, setAvail] = useState<any[]>([]);
  
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
      if (screen) total += (screen.rate || 0) * (slotsFor[id] || 1) * days;
    });
    return total;
  }, [formData.start_date, formData.end_date, selectedScreens, inventory, slotsFor]);

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
            end_date: formData.end_date,
            slots: slotsFor
          })
        });
        const data = await res.json();
        if (data.ok) {
          setConflicts(data.conflicts || []);
          setAvail(data.screens || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setChecking(false);
      }
    };
    
    // Debounce so the API is not called on every click
    const timer = setTimeout(checkAvail, 600); 
    return () => clearTimeout(timer);
  }, [formData.start_date, formData.end_date, selectedScreens, slotsFor]);

  const handleScreenToggle = (id: string) => {
    setSelectedScreens(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (conflicts.length > 0) {
      setError("Some screens are already booked for these dates.");
      return;
    }

    setSaving(true);
    setError('');
    try {
      // Prepare the screens data
      const screensData = selectedScreens.map(id => {
        const screen = inventory.find(s => s.id === id);
        return { inventory_id: id, rate_applied: screen?.rate || 0, slots: slotsFor[id] || 1 };
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
        onClose();
      } else {
        const d = await res.json().catch(() => null);
        setError(d?.message || d?.error || 'Could not create the campaign.');
      }
    } catch (err) {
      console.error(err);
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`${FIN.modal} max-w-4xl`}>
      <ModalTitle>Create New Campaign</ModalTitle>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={FIN.label}>Campaign Name *</label>
            <input required type="text" className={FIN.input}
              onChange={(e: any) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Summer Sale Launch" />
          </div>
          <div>
            <label className={FIN.label}>Client *</label>
            <select required className={FIN.input}
              onChange={(e: any) => setFormData({ ...formData, client_id: e.target.value })}>
              <option value="">Choose client</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className={FIN.label}>Start Date *</label>
            <input required type="date" className={FIN.input}
              onChange={(e: any) => setFormData({ ...formData, start_date: e.target.value })} />
          </div>
          <div>
            <label className={FIN.label}>End Date *</label>
            <input required type="date" className={FIN.input}
              onChange={(e: any) => setFormData({ ...formData, end_date: e.target.value })} />
          </div>
          <div>
            <label className={FIN.label}>Status</label>
            <select className={FIN.input}
              onChange={(e: any) => setFormData({ ...formData, status: e.target.value })}>
              <option value="draft">Draft</option>
              <option value="booked">Booked</option>
              <option value="live">Live</option>
            </select>
          </div>
        </div>

        <div className="rounded-xl border border-[#2a2f37] bg-[#0f1216] p-3">
          <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#d9b45a]">Select Screens / Billboards *</label>
          <div className="grid max-h-48 grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
            {inventory.map(screen => (
              <label key={screen.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-[#2a2f37] p-2 transition hover:border-[#c99b3b]/50">
                <input type="checkbox" className="h-4 w-4"
                  checked={selectedScreens.includes(screen.id)}
                  onChange={() => handleScreenToggle(screen.id)} />
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-medium text-zinc-100">{screen.name}</div>
                  <div className="text-[10px] text-zinc-500">
                    {screen.city} &middot; {screen.rate} {screen.currency}/{screenCapacity(screen.screen_type, screen.specs) > 1 ? 'slot/day' : 'day'}
                    {screenCapacity(screen.screen_type, screen.specs) > 1 ? ` \u{00B7} ${screenCapacity(screen.screen_type, screen.specs)} slots` : ''}
                  </div>
                </div>
                {selectedScreens.includes(screen.id) && screenCapacity(screen.screen_type, screen.specs) > 1 && (
                  <select
                    title="Advertiser slots"
                    className="rounded border border-[#2b3038] bg-[#0f1216] px-1 py-1 text-[11px] text-zinc-100"
                    value={slotsFor[screen.id] || 1}
                    onClick={(e: any) => e.stopPropagation()}
                    onChange={(e: any) => setSlotsFor({ ...slotsFor, [screen.id]: Number(e.target.value) })}
                  >
                    {Array.from({ length: screenCapacity(screen.screen_type, screen.specs) }, (_, k) => k + 1).map((n) => (
                      <option key={n} value={n}>{n} slot{n === 1 ? '' : 's'}</option>
                    ))}
                  </select>
                )}
              </label>
            ))}
            {inventory.length === 0 && <div className="col-span-2 text-[12px] text-zinc-500">No screens in inventory. Add screens first.</div>}
          </div>
        </div>

        {checking && <div className="text-[12px] text-amber-300">Checking availability...</div>}
        {conflicts.length > 0 && (
          <div className="rounded-lg border border-rose-400/30 bg-rose-400/10 p-3">
            <p className="mb-1 text-[12px] font-bold text-rose-300">Double booking warning</p>
            <ul className="list-disc pl-4 text-[11px] text-rose-200">
              {avail.filter((a) => !a.fits).map((a) => (
                <li key={a.inventory_id}>
                  <b>{a.name}</b>: only {a.free} of {a.capacity} slot{a.capacity === 1 ? '' : 's'} free (you need {a.requested}).
                  {a.bookings.map((b: any, i: number) => (
                    <span key={i} className="block pl-1 text-rose-300/80">{b.campaign_name} ({b.start_date} to {b.end_date}), {b.slots} slot{b.slots === 1 ? '' : 's'}</span>
                  ))}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center justify-between rounded-xl border border-[#c99b3b]/30 bg-[#0f1216] p-4">
          <div>
            <div className="text-[12px] text-zinc-300">Total Estimated Budget</div>
            <div className="text-[10px] text-zinc-500">Auto-calculated from days and screens</div>
          </div>
          <div className="text-xl font-bold text-[#f1d68a]">
            {totalBudget.toLocaleString()} <span className="text-[11px] text-zinc-400">{formData.currency}</span>
          </div>
        </div>

        {error && <p className="text-[12px] text-rose-300">{error}</p>}

        <div className="mt-2 flex justify-end gap-2 border-t border-[#2a2f37] pt-4">
          <button type="button" onClick={onClose} className={FIN.btnText}>Cancel</button>
          <button type="submit" disabled={saving || conflicts.length > 0} className={FIN.btnGold}>
            {saving ? "Saving..." : "Save Campaign"}
          </button>
        </div>
      </form>
    </div>
  );
}
