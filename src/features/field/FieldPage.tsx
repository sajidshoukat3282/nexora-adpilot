import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@/lib/router";
import { useSession } from "@/hooks/useSession";
import { uploadFile } from "@/lib/api/files";
import { opsApi, type FieldItem } from "@/lib/api/operations";

type Res = { busy?: string; ok?: boolean; text?: string };
const keyOf = (i: FieldItem) => `${i.campaign_id}|${i.screen_id}`;

function getPosition(): Promise<{ lat: number; lng: number; accuracy: number } | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  });
}

export const FieldPage: React.FC = () => {
  const { can } = useSession();
  const [items, setItems] = useState<FieldItem[]>([]);
  const [company, setCompany] = useState("");
  const [today, setToday] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [res, setRes] = useState<Record<string, Res>>({});

  const load = useCallback(async () => {
    try {
      const r = await opsApi.fieldToday();
      setItems(r.items); setCompany(r.company); setToday(r.today); setError("");
    } catch (e: any) { setError(e?.message || "Could not load today's screens."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const groups = useMemo(() => {
    const m = new Map<string, FieldItem[]>();
    for (const i of items) { const k = i.city || "Other"; m.set(k, [...(m.get(k) ?? []), i]); }
    return Array.from(m.entries());
  }, [items]);

  const pick = async (item: FieldItem, e: any) => {
    const file: File | undefined = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const k = keyOf(item);
    const set = (r: Res) => setRes((p) => ({ ...p, [k]: r }));
    try {
      set({ busy: "Getting your location..." });
      const pos = await getPosition();
      set({ busy: "Uploading photo..." });
      const up = await uploadFile(file, item.campaign_id);
      set({ busy: "Sending proof..." });
      const r = await opsApi.fieldProof({
        campaign_id: item.campaign_id, inventory_id: item.screen_id, photo_url: up.url, notes: note || undefined,
        lat: pos?.lat, lng: pos?.lng, accuracy: pos?.accuracy, proof_date: new Date().toLocaleDateString("en-CA"),
      });
      setNote("");
      const extra = r.geo === "verified" ? " Location verified." : r.geo === "none" ? (pos ? "" : " Sent without location.") : "";
      set({ ok: true, text: (r.message || "Proof sent.") + extra });
      load();
    } catch (ex: any) {
      set({ ok: false, text: ex?.message || "Could not send. Please try again." });
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0d10] pb-10 font-sans text-zinc-200">
      <header className="sticky top-0 z-10 border-b border-[#c99b3b]/30 bg-[#0b0d10]/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="truncate text-[15px] font-semibold uppercase tracking-[0.2em] text-zinc-50">Field Proof</h1>
            <p className="truncate text-[11px] text-[#d9b45a]">{company}{today ? ` \u00b7 ${today}` : ""}</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button className="rounded-lg border border-[#2b3038] px-3 py-1.5 text-[11px] text-zinc-300" onClick={load}>Refresh</button>
            {(can("operations.manage") || can("campaigns.manage")) && <Link to="/operations" className="rounded-lg border border-[#2b3038] px-3 py-1.5 text-[11px] text-zinc-300">Live Operations</Link>}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 pt-4">
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">Note for the next photo (optional)</label>
        <input className="mb-4 w-full rounded-lg border border-[#2b3038] bg-[#0f1216] px-3 py-2.5 text-[13px] text-zinc-100 outline-none" value={note} onChange={(e: any) => setNote(e.target.value)} placeholder="e.g. Evening, ad playing fine" />

        {loading && <p className="text-[12px] text-zinc-500">Loading...</p>}
        {error && <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-[12px] text-rose-300">{error}</p>}
        {!loading && !error && items.length === 0 && <p className="py-10 text-center text-[13px] text-zinc-500">No campaign is running on any screen today.</p>}

        {groups.map(([city, list]) => (
          <section key={city} className="mb-5">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400">{city}</p>
            <div className="space-y-3">
              {list.map((i) => {
                const r = res[keyOf(i)];
                return (
                  <div key={keyOf(i)} className="rounded-xl border border-[#2a2f37] bg-gradient-to-b from-[#171a20] to-[#0f1216] p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-semibold text-zinc-50">{i.screen_name}</p>
                        <p className="truncate text-[11px] text-zinc-500">{i.location || i.city}</p>
                        <p className="mt-1 truncate text-[12px] text-zinc-300">{i.campaign_name}{i.client_name ? <span className="text-zinc-500">{" \u00b7 "}{i.client_name}</span> : null}</p>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] ${i.proofs_today > 0 ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300" : "border-[#2b3038] text-zinc-500"}`}>{i.proofs_today > 0 ? `${i.proofs_today} today` : "No proof today"}</span>
                    </div>
                    <label className={`mt-3 flex w-full cursor-pointer items-center justify-center rounded-lg border border-[#f6e2a1]/40 bg-gradient-to-b from-[#f1d68a] via-[#d4a93f] to-[#a97b22] px-4 py-3 text-[14px] font-semibold text-[#1a1204] ${r?.busy ? "opacity-60" : ""}`}>
                      {r?.busy ? r.busy : "Take photo"}
                      <input type="file" accept="image/*" capture="environment" className="hidden" disabled={!!r?.busy} onChange={(e: any) => pick(i, e)} />
                    </label>
                    {r && !r.busy && r.text && <p className={`mt-2 text-[12px] ${r.ok ? "text-emerald-300" : "text-rose-300"}`}>{r.text}</p>}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
        <p className="mt-6 text-center text-[10px] text-zinc-600">Allow location when your phone asks. It helps the client trust the photo.</p>
      </main>
    </div>
  );
};
