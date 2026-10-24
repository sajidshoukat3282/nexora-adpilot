import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "@/lib/router";
import { marketApi, type PublicPage } from "@/lib/api/marketplace";

const inp = "w-full rounded-lg border border-[#2b3038] bg-[#0f1216] px-3 py-2.5 text-[13px] text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-[#c99b3b]/60 [color-scheme:dark]";
const lab = "mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400";
const today = () => new Date().toISOString().slice(0, 10);

export const PublicMarketPage: React.FC = () => {
  const { slug } = useParams();
  const [page, setPage] = useState<PublicPage | null>(null);
  const [error, setError] = useState("");
  const [city, setCity] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [f, setF] = useState({ name: "", company_name: "", phone: "", email: "", start_date: "", end_date: "", budget: "", message: "", website: "" });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState("");
  const [formErr, setFormErr] = useState("");
  const [busyIds, setBusyIds] = useState<string[]>([]);

  useEffect(() => {
    let live = true;
    marketApi.publicPage(slug).then((p) => { if (live) setPage(p); }).catch(() => { if (live) setError("This page is not available."); });
    return () => { live = false; };
  }, [slug]);

  useEffect(() => {
    if (!f.start_date || !f.end_date || f.end_date < f.start_date) { setBusyIds([]); return; }
    marketApi.availability(slug, f.start_date, f.end_date).then((r) => { setBusyIds(r.unavailable); setPicked((p) => p.filter((x) => !r.unavailable.includes(x))); }).catch(() => undefined);
  }, [slug, f.start_date, f.end_date]);

  const cities = useMemo(() => Array.from(new Set((page?.listings ?? []).map((l) => l.city).filter(Boolean) as string[])).sort(), [page]);
  const shown = (page?.listings ?? []).filter((l) => !city || l.city === city);
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const send = async (e: any) => {
    e.preventDefault(); setFormErr(""); setBusy(true);
    try {
      const r = await marketApi.sendRequest(slug, { ...f, inventory_ids: picked });
      setDone(r.message || "Thank you. We will contact you soon.");
    } catch (ex: any) { setFormErr(ex?.message || "Could not send your request."); }
    finally { setBusy(false); }
  };

  if (error) return <div className="flex min-h-screen items-center justify-center bg-[#0b0d10] p-6 text-center text-[14px] text-zinc-400">{error}</div>;
  if (!page) return <div className="flex min-h-screen items-center justify-center bg-[#0b0d10] text-[13px] text-zinc-500">Loading...</div>;

  return (
    <div className="min-h-screen bg-[#0b0d10] font-sans text-zinc-200">
      <header className="border-b border-[#c99b3b]/30 px-4 py-5 md:px-8">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          {page.logo ? <img src={page.logo} alt="" className="h-11 w-11 rounded-lg object-contain" /> : <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-b from-[#f1d68a] to-[#a97b22] text-[16px] font-black text-[#1a1204]">{(page.name || "A").slice(0, 1).toUpperCase()}</div>}
          <div>
            <h1 className="text-[16px] font-semibold uppercase tracking-[0.2em] text-zinc-50">{page.name}</h1>
            {page.headline && <p className="text-[12px] text-[#d9b45a]">{page.headline}</p>}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 md:px-8">
        {page.about && <p className="mb-6 max-w-2xl text-[13px] leading-relaxed text-zinc-300">{page.about}</p>}

        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.18em] text-zinc-100">Available screens</h2>
          {cities.length > 1 && <select className={`${inp} max-w-[180px]`} value={city} onChange={(e: any) => setCity(e.target.value)}><option value="">All cities</option>{cities.map((c) => <option key={c} value={c}>{c}</option>)}</select>}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((l) => {
            const busyNow = busyIds.includes(l.id);
            const on = picked.includes(l.id);
            return (
              <div key={l.id} className={`overflow-hidden rounded-xl border bg-gradient-to-b from-[#171a20] to-[#0f1216] ${on ? "border-[#c99b3b]" : "border-[#2a2f37]"} ${busyNow ? "opacity-60" : ""}`}>
                {l.photo ? <img src={l.photo} alt="" className="h-40 w-full object-cover" /> : <div className="flex h-40 items-center justify-center bg-[#12151a] text-[11px] text-zinc-600">No photo</div>}
                <div className="p-3">
                  <p className="text-[14px] font-semibold text-zinc-50">{l.title}</p>
                  <p className="text-[11px] text-[#d9b45a]">{[l.city, l.screen_type, l.size].filter(Boolean).join(" \u00b7 ")}</p>
                  {l.location && <p className="mt-1 text-[11px] text-zinc-500">{l.location}</p>}
                  {l.description && <p className="mt-2 text-[12px] text-zinc-300">{l.description}</p>}
                  {l.min_days ? <p className="mt-1 text-[10px] text-zinc-500">Minimum booking: {l.min_days} days</p> : null}
                  <button type="button" disabled={busyNow} onClick={() => toggle(l.id)} className={`mt-3 w-full rounded-lg border px-3 py-2 text-[12px] font-semibold transition ${busyNow ? "border-[#2b3038] text-zinc-500" : on ? "border-[#c99b3b] bg-[#c99b3b]/15 text-[#f1d68a]" : "border-[#2b3038] text-zinc-200 hover:border-[#c99b3b]/50"}`}>
                    {busyNow ? "Not available for these dates" : on ? "Selected" : "Select for quote"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        {shown.length === 0 && <p className="py-10 text-center text-[13px] text-zinc-500">No screens are listed right now.</p>}

        <section className="mt-8 rounded-2xl border border-[#c99b3b]/25 bg-gradient-to-b from-[#171a20] to-[#0e1115] p-4 md:p-6">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.18em] text-zinc-100">Request a quote</h2>
          <p className="mb-4 mt-1 text-[12px] text-zinc-400">{picked.length ? `${picked.length} screen${picked.length === 1 ? "" : "s"} selected.` : "Select one or more screens above."} Rates are shared by our team after your request.</p>
          {done ? <p className="rounded-lg bg-emerald-500/10 px-3 py-3 text-[13px] text-emerald-300">{done}</p> : (
            <form onSubmit={send} className="grid gap-3 md:grid-cols-2">
              <div><label className={lab}>Your name</label><input className={inp} value={f.name} onChange={(e: any) => setF({ ...f, name: e.target.value })} /></div>
              <div><label className={lab}>Company</label><input className={inp} value={f.company_name} onChange={(e: any) => setF({ ...f, company_name: e.target.value })} /></div>
              <div><label className={lab}>Phone</label><input className={inp} inputMode="tel" value={f.phone} onChange={(e: any) => setF({ ...f, phone: e.target.value })} /></div>
              <div><label className={lab}>Email</label><input className={inp} type="email" value={f.email} onChange={(e: any) => setF({ ...f, email: e.target.value })} /></div>
              <div><label className={lab}>Start date</label><input className={inp} type="date" min={today()} value={f.start_date} onChange={(e: any) => setF({ ...f, start_date: e.target.value })} /></div>
              <div><label className={lab}>End date</label><input className={inp} type="date" min={f.start_date || today()} value={f.end_date} onChange={(e: any) => setF({ ...f, end_date: e.target.value })} /></div>
              <div className="md:col-span-2"><label className={lab}>Budget (optional)</label><input className={inp} value={f.budget} onChange={(e: any) => setF({ ...f, budget: e.target.value })} /></div>
              <div className="md:col-span-2"><label className={lab}>Message</label><textarea className={inp} rows={3} value={f.message} onChange={(e: any) => setF({ ...f, message: e.target.value })} /></div>
              <input type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" value={f.website} onChange={(e: any) => setF({ ...f, website: e.target.value })} />
              {formErr && <p className="text-[12px] text-rose-300 md:col-span-2">{formErr}</p>}
              <div className="md:col-span-2">
                <button disabled={busy || picked.length === 0} className="rounded-lg border border-[#f6e2a1]/40 bg-gradient-to-b from-[#f1d68a] via-[#d4a93f] to-[#a97b22] px-5 py-2.5 text-[13px] font-semibold text-[#1a1204] disabled:opacity-50">{busy ? "Sending..." : "Send request"}</button>
              </div>
            </form>
          )}
        </section>

        {(page.phone || page.email) && <p className="mt-6 text-center text-[12px] text-zinc-500">Contact: {[page.phone, page.email].filter(Boolean).join(" \u00b7 ")}</p>}
      </main>
    </div>
  );
};
