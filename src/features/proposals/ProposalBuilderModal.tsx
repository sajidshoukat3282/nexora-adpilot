import React, { useEffect, useMemo, useState } from "react";
import { getDefaultCurrency } from "@/lib/companyDefaults";
import { FIN, ModalTitle } from "../finance/financeUi";
import { screenCapacity } from "../campaigns/campaignTools";
import { proposalsApi } from "@/lib/api/proposals";
import { addDays, calcTotals, campaignDays, DEFAULT_TERMS, todayIso } from "./proposalTools";

interface Line { inventory_id: string; slots: number; rate: number }

export const ProposalBuilderModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onSaved: (id: string) => void;
  editId?: string | null;
  presetClientId?: string | null;
}> = ({ open, onClose, onSaved, editId, presetClientId }) => {
  const [clients, setClients] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [f, setF] = useState<any>({});
  const [lines, setLines] = useState<Line[]>([]);
  const [avail, setAvail] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(""); setQuery(""); setAvail([]);
    (async () => {
      try {
        const [c, i] = await Promise.all([fetch("/api/crm/clients").then((r) => r.json()), fetch("/api/inventory").then((r) => r.json())]);
        if (c.ok) setClients(c.data || []);
        if (i.ok) setInventory(i.data || []);
      } catch { setError("Could not load clients and inventory."); }
      if (editId) {
        try {
          const d = await proposalsApi.get(editId);
          const p = d.proposal;
          setF({ client_id: p.client_id, campaign_name: p.campaign_name, start_date: p.start_date, end_date: p.end_date, discount_pct: p.discount_pct, tax_rate: p.tax_rate, valid_until: p.valid_until || "", currency: p.currency, terms: p.terms || "", notes: p.notes || "" });
          setLines(d.items.map((x) => ({ inventory_id: x.inventory_id, slots: x.slots, rate: x.rate })));
        } catch { setError("Could not load this proposal."); }
      } else {
        const s = todayIso();
        setF({ client_id: presetClientId || "", campaign_name: "", start_date: s, end_date: addDays(s, 29), discount_pct: 0, tax_rate: 0, valid_until: addDays(s, 14), currency: getDefaultCurrency(), terms: DEFAULT_TERMS, notes: "" });
        setLines([]);
      }
    })();
  }, [open, editId, presetClientId]);

  const set = (k: string) => (e: any) => setF((p: any) => ({ ...p, [k]: e.target.value }));
  const days = f.start_date && f.end_date ? campaignDays(f.start_date, f.end_date) : 0;
  const byId = useMemo(() => new Map(inventory.map((s) => [s.id, s])), [inventory]);
  const totals = calcTotals(lines.map((l) => ({ rate: l.rate, slots: l.slots, days })), f.discount_pct, f.tax_rate);
  const money = (n: number) => `${f.currency || ""} ${Math.round(n).toLocaleString("en-US")}`;

  useEffect(() => {
    if (!open || !f.start_date || !f.end_date || lines.length === 0 || f.end_date < f.start_date) { setAvail([]); return; }
    const t = setTimeout(async () => {
      try {
        const slots: Record<string, number> = {};
        lines.forEach((l) => (slots[l.inventory_id] = l.slots));
        const r = await fetch("/api/campaigns/check-availability", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ inventory_ids: lines.map((l) => l.inventory_id), start_date: f.start_date, end_date: f.end_date, slots }) }).then((x) => x.json());
        if (r.ok) setAvail(r.screens || []);
      } catch { /* warning only */ }
    }, 600);
    return () => clearTimeout(t);
  }, [open, f.start_date, f.end_date, lines]);

  if (!open) return null;

  const toggle = (s: any) =>
    setLines((p) => (p.some((l) => l.inventory_id === s.id) ? p.filter((l) => l.inventory_id !== s.id) : [...p, { inventory_id: s.id, slots: 1, rate: Number(s.rate) || 0 }]));
  const upd = (id: string, k: "slots" | "rate", v: number) => setLines((p) => p.map((l) => (l.inventory_id === id ? { ...l, [k]: v } : l)));
  const shown = inventory.filter((s) => `${s.name} ${s.city}`.toLowerCase().includes(query.toLowerCase()));
  const tight = avail.filter((a) => a.fits === false);

  const save = async (e: any) => {
    e.preventDefault();
    setError("");
    if (!f.client_id) return setError("Please choose a client.");
    if (!f.campaign_name.trim()) return setError("Please enter a campaign name.");
    if (!f.start_date || !f.end_date || f.end_date < f.start_date) return setError("Please check the campaign dates.");
    if (lines.length === 0) return setError("Please add at least one screen.");
    setSaving(true);
    try {
      const payload = { ...f, discount_pct: Number(f.discount_pct) || 0, tax_rate: Number(f.tax_rate) || 0, items: lines.map((l) => ({ ...l, days })) };
      if (editId) { await proposalsApi.edit(editId, payload); onSaved(editId); }
      else { const r = await proposalsApi.create(payload); onSaved(r.id); }
      onClose();
    } catch (err: any) {
      setError(err?.message || "Could not save the proposal.");
    } finally { setSaving(false); }
  };

  return (
    <div className={FIN.overlay}>
      <form onSubmit={save} className={`${FIN.modal} max-w-4xl`}>
        <ModalTitle>{editId ? "Edit Proposal" : "New Proposal"}</ModalTitle>
        {error && <div className="mb-3 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-300">{error}</div>}

        <div className="grid gap-3 md:grid-cols-2">
          <div><label className={FIN.label}>Client</label>
            <select className={FIN.input} value={f.client_id || ""} onChange={set("client_id")}>
              <option value="">Select a client</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select></div>
          <div><label className={FIN.label}>Campaign name</label>
            <input className={FIN.input} value={f.campaign_name || ""} onChange={set("campaign_name")} maxLength={120} placeholder="e.g. Eid Collection Launch" /></div>
          <div><label className={FIN.label}>Start date</label><input type="date" className={FIN.input} value={f.start_date || ""} onChange={set("start_date")} /></div>
          <div><label className={FIN.label}>End date</label><input type="date" className={FIN.input} value={f.end_date || ""} min={f.start_date} onChange={set("end_date")} /></div>
        </div>

        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between">
            <label className={FIN.label}>Screens ({lines.length} selected, {days} days)</label>
            <input className={`${FIN.input} !w-48`} placeholder="Search screens" value={query} onChange={(e: any) => setQuery(e.target.value)} />
          </div>
          <div className="max-h-44 overflow-y-auto rounded-lg border border-[#2b3038] bg-[#0f1216]">
            {shown.length === 0 && <p className="p-3 text-[12px] text-zinc-500">No screens found.</p>}
            {shown.map((s) => (
              <label key={s.id} className="flex cursor-pointer items-center gap-2 border-b border-[#1d2128] px-3 py-1.5 text-[12px] hover:bg-white/5">
                <input type="checkbox" checked={lines.some((l) => l.inventory_id === s.id)} onChange={() => toggle(s)} />
                <span className="grow text-zinc-100">{s.name}</span>
                <span className="text-zinc-500">{s.city}</span>
                <span className="text-[#d9b45a]">{s.screen_type === "static" ? "Static" : `Digital \u00b7 ${screenCapacity(s.screen_type, s.specs)} slots`}</span>
              </label>
            ))}
          </div>
        </div>

        {lines.length > 0 && (
          <div className="mt-3 overflow-x-auto rounded-lg border border-[#2b3038]">
            <table className="w-full text-[12px]">
              <thead><tr className="text-left text-[10px] uppercase tracking-wider text-zinc-500"><th className="p-2">Screen</th><th className="p-2 w-20">Slots</th><th className="p-2 w-28">Rate / slot / day</th><th className="p-2 text-right">Amount</th></tr></thead>
              <tbody>
                {lines.map((l) => {
                  const s = byId.get(l.inventory_id);
                  const cap = s ? screenCapacity(s.screen_type, s.specs) : 1;
                  const a = avail.find((x) => x.inventory_id === l.inventory_id);
                  return (
                    <tr key={l.inventory_id} className="border-t border-[#1d2128]">
                      <td className="p-2 text-zinc-100">{s?.name ?? "Screen"}{a && a.fits === false && <span className="ml-2 text-[10px] text-rose-300">Only {a.free} of {a.capacity} slots free</span>}</td>
                      <td className="p-1"><input type="number" min={1} max={cap} className={FIN.cellInput} value={l.slots} onChange={(e: any) => upd(l.inventory_id, "slots", Math.min(cap, Math.max(1, Number(e.target.value) || 1)))} /></td>
                      <td className="p-1"><input type="number" min={0} className={FIN.cellInput} value={l.rate} onChange={(e: any) => upd(l.inventory_id, "rate", Math.max(0, Number(e.target.value) || 0))} /></td>
                      <td className="p-2 text-right text-zinc-200">{money(l.rate * l.slots * days)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {tight.length > 0 && <p className="mt-2 text-[11px] text-amber-300">Some screens are short on free slots for these dates. You can still save, but converting to a campaign will warn you.</p>}

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <div><label className={FIN.label}>Discount %</label><input type="number" min={0} max={100} className={FIN.input} value={f.discount_pct ?? 0} onChange={set("discount_pct")} /></div>
          <div><label className={FIN.label}>Tax %</label><input type="number" min={0} max={100} className={FIN.input} value={f.tax_rate ?? 0} onChange={set("tax_rate")} /></div>
          <div><label className={FIN.label}>Valid until</label><input type="date" className={FIN.input} value={f.valid_until || ""} onChange={set("valid_until")} /></div>
          <div><label className={FIN.label}>Currency</label><input className={FIN.input} value={f.currency || ""} onChange={set("currency")} maxLength={6} /></div>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div><label className={FIN.label}>Terms</label><textarea rows={3} className={FIN.input} value={f.terms || ""} onChange={set("terms")} /></div>
          <div><label className={FIN.label}>Notes for client</label><textarea rows={3} className={FIN.input} value={f.notes || ""} onChange={set("notes")} /></div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#2a2f37] pt-3">
          <div className="text-[12px] text-zinc-400">
            Subtotal {money(totals.subtotal)}{totals.discount > 0 && ` \u00b7 Discount -${money(totals.discount)}`}{totals.tax > 0 && ` \u00b7 Tax ${money(totals.tax)}`}
            <div className="text-[16px] font-semibold text-[#f1d68a]">Total {money(totals.total)}</div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className={FIN.btnText}>Cancel</button>
            <button type="submit" disabled={saving} className={FIN.btnGold}>{saving ? "Saving..." : editId ? "Save Changes" : "Save Draft"}</button>
          </div>
        </div>
      </form>
    </div>
  );
};
