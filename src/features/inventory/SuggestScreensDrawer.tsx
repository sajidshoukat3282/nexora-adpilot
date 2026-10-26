import React, { useState } from "react";
import { FDrawer, FIN } from "../finance/financeUi";
import { inventorySuggestApi, type SuggestResult } from "@/lib/api/inventorySuggest";

const today = (): string => new Date().toISOString().slice(0, 10);
const plus = (iso: string, n: number): string => new Date(new Date(iso + "T00:00:00Z").getTime() + n * 86400000).toISOString().slice(0, 10);
const money = (n: number, cur: string): string => `${cur} ${Math.round(n).toLocaleString("en-US")}`;

export const SuggestScreensDrawer: React.FC<{ open: boolean; onClose: () => void; cities: string[] }> = ({ open, onClose, cities }) => {
  const [from, setFrom] = useState(plus(today(), 7));
  const [to, setTo] = useState(plus(today(), 36));
  const [city, setCity] = useState("");
  const [type, setType] = useState<"" | "digital" | "static">("");
  const [budget, setBudget] = useState("");
  const [screens, setScreens] = useState("5");
  const [slots, setSlots] = useState("1");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [res, setRes] = useState<SuggestResult | null>(null);

  const run = async () => {
    setBusy(true);
    setErr("");
    try {
      setRes(await inventorySuggestApi.suggest({ from, to, city, type, budget: Number(budget) || 0, screens: Number(screens) || 5, slots: Number(slots) || 1 }));
    } catch (e) {
      setRes(null);
      setErr(e instanceof Error ? e.message : "Could not find suggestions.");
    } finally {
      setBusy(false);
    }
  };

  const cur = res?.rows[0]?.currency ?? "PKR";
  const picked = res ? res.rows.filter((r) => res.pick.includes(r.id)) : [];
  const others = res ? res.rows.filter((r) => !res.pick.includes(r.id)) : [];

  const Row: React.FC<{ r: SuggestResult["rows"][number]; best?: boolean }> = ({ r, best }) => (
    <div className={`rounded-lg border p-3 ${best ? "border-[#c99b3b]/60 bg-[#c99b3b]/5" : "border-[#2a2f37] bg-[#0f1216]"}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[13px] font-semibold text-zinc-100">{r.name}</p>
          <p className="text-[11px] text-zinc-500">{r.type} &middot; {r.city}{r.location ? ` \u00b7 ${r.location}` : ""}</p>
        </div>
        <div className="text-right">
          <p className="text-[13px] font-bold text-[#f1d68a]">{r.score}<span className="text-[10px] font-normal text-zinc-500"> / 100</span></p>
          <p className="text-[11px] text-zinc-400">{r.rate > 0 ? money(r.cost, r.currency) : "no rate"}</p>
        </div>
      </div>
      <ul className="mt-2 space-y-0.5 text-[11px] text-zinc-400">
        {r.reasons.map((t, i) => <li key={i}>- {t}</li>)}
      </ul>
    </div>
  );

  return (
    <FDrawer open={open} onClose={onClose} title="Suggest screens" subtitle="Find the best free screens for a campaign" width="max-w-[640px]">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div><label className={FIN.label}>From</label><input type="date" className={FIN.input} value={from} onChange={(e: any) => setFrom(e.target.value)} /></div>
          <div><label className={FIN.label}>To</label><input type="date" className={FIN.input} value={to} onChange={(e: any) => setTo(e.target.value)} /></div>
          <div>
            <label className={FIN.label}>City</label>
            <select className={FIN.input} value={city} onChange={(e: any) => setCity(e.target.value)}>
              <option value="">Any city</option>
              {cities.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className={FIN.label}>Screen type</label>
            <select className={FIN.input} value={type} onChange={(e: any) => setType(e.target.value)}>
              <option value="">Digital and static</option>
              <option value="digital">Digital only</option>
              <option value="static">Static only</option>
            </select>
          </div>
          <div><label className={FIN.label}>Total budget (optional)</label><input type="number" min="0" className={FIN.input} value={budget} onChange={(e: any) => setBudget(e.target.value)} placeholder="e.g. 500000" /></div>
          <div><label className={FIN.label}>How many screens</label><input type="number" min="1" max="30" className={FIN.input} value={screens} onChange={(e: any) => setScreens(e.target.value)} /></div>
          <div><label className={FIN.label}>Slots per screen</label><input type="number" min="1" max="50" className={FIN.input} value={slots} onChange={(e: any) => setSlots(e.target.value)} /></div>
        </div>
        <button className={FIN.btnGold} onClick={run} disabled={busy}>{busy ? "Searching..." : "Find screens"}</button>
        {err && <p className="text-[12px] text-rose-300">{err}</p>}

        {res && (
          <div className="space-y-3">
            {picked.length > 0 ? (
              <>
                <p className="text-[12px] text-zinc-300">
                  Best {picked.length} screen(s) that are free for the whole period{budget ? " and inside your budget" : ""}. Estimated cost at your rates: <span className="font-bold text-[#f1d68a]">{money(res.pick_total, cur)}</span>.
                </p>
                {picked.map((r) => <Row key={r.id} r={r} best />)}
              </>
            ) : (
              <p className="text-[12px] text-amber-300">No screen is free for the whole period{budget ? " within this budget" : ""}. The closest options are below.</p>
            )}
            {others.length > 0 && <p className="pt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">Other options</p>}
            {others.slice(0, 10).map((r) => <Row key={r.id} r={r} />)}
            <p className="text-[10px] text-zinc-500">
              Score = how free the screen is for your dates, city match, how busy it was in the last 90 days, and budget fit. Checked {res.screens_checked} online screen(s). Rates are treated as per slot per day. This is a guide, so check each screen before you book.
            </p>
          </div>
        )}
      </div>
    </FDrawer>
  );
};
