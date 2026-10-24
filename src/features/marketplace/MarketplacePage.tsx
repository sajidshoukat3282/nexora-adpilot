import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "@/lib/router";
import { FIN, GOLD_CARD, SILVER_CARD, ModalTitle, fit } from "@/features/finance/financeUi";
import { FilePicker } from "@/features/campaigns/WorkspaceTabs";
import { marketApi, type MarketAdmin, type MarketListing, type MarketRequest } from "@/lib/api/marketplace";

type Tab = "listings" | "requests" | "settings";
const errText = (e: any) => (e?.message as string) || "Something went wrong.";
const day = (d: string | null) => (d ? String(d).slice(0, 10) : "-");
const money = (n: number, c: string) => `${c} ${Math.round(Number(n) || 0).toLocaleString("en-US")}`;
const STATUS_LABEL: Record<string, string> = { new: "New", contacted: "Contacted", quoted: "Quoted", won: "Won", lost: "Lost" };
const stCls = (s: string) =>
  s === "new" ? "border-sky-400/30 bg-sky-500/10 text-sky-300" : s === "won" ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
    : s === "lost" ? "border-zinc-500/30 bg-zinc-500/10 text-zinc-400" : "border-amber-400/30 bg-amber-500/10 text-amber-300";

const Note: React.FC<{ n: { ok: boolean; text: string } | null }> = ({ n }) =>
  n ? <p className={`mb-3 rounded-lg px-3 py-2 text-[12px] ${n.ok ? "bg-emerald-500/10 text-emerald-300" : "bg-rose-500/10 text-rose-300"}`}>{n.text}</p> : null;

export const MarketplacePage: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const tab = ((params.get("tab") as Tab) || "listings") as Tab;
  const navigate = useNavigate();
  const [data, setData] = useState<MarketAdmin | null>(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [edit, setEdit] = useState<MarketListing | null>(null);
  const [form, setForm] = useState({ listed: false, title: "", description: "", photo_url: "", min_days: "" });
  const [busy, setBusy] = useState(false);
  const [reqs, setReqs] = useState<MarketRequest[]>([]);
  const [reqFilter, setReqFilter] = useState("");
  const [set, setSet] = useState({ enabled: false, headline: "", about: "", contact_phone: "", contact_email: "" });

  const load = useCallback(async () => {
    try {
      const d = await marketApi.admin();
      setData(d);
      setSet({ enabled: d.settings.enabled, headline: d.settings.headline, about: d.settings.about, contact_phone: d.settings.contact_phone, contact_email: d.settings.contact_email });
      setError("");
    } catch (e) { setError(errText(e)); }
  }, []);
  const loadReqs = useCallback(async () => { try { setReqs((await marketApi.requests(reqFilter)).requests); } catch (e) { setNote({ ok: false, text: errText(e) }); } }, [reqFilter]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (tab === "requests") loadReqs(); }, [tab, loadReqs]);

  const run = async (fn: () => Promise<any>, after?: () => Promise<void>) => {
    setBusy(true); setNote(null);
    try { const r = await fn(); setNote({ ok: true, text: r?.message || "Saved." }); await load(); if (after) await after(); return r; }
    catch (e) { setNote({ ok: false, text: errText(e) }); }
    finally { setBusy(false); }
  };

  const openEdit = (l: MarketListing) => { setEdit(l); setForm({ listed: l.listed, title: l.title ?? "", description: l.description ?? "", photo_url: l.photo_url ?? "", min_days: l.min_days ? String(l.min_days) : "" }); };
  const listedCount = data?.listings.filter((l) => l.listed).length ?? 0;
  const rc = data?.request_counts ?? {};
  const kpis = [
    { label: "Public page", value: data?.settings.enabled ? "On" : "Off", note: data?.settings.slug ? "Share the link below" : "Not set up yet", card: GOLD_CARD, dark: true },
    { label: "Listed screens", value: `${listedCount} / ${data?.listings.length ?? 0}`, note: "Visible on the public page", card: SILVER_CARD, dark: true },
    { label: "New requests", value: String(rc.new ?? 0), note: "Waiting for your reply", card: {}, dark: false },
    { label: "Won", value: String(rc.won ?? 0), note: `${(rc.quoted ?? 0)} quoted`, card: {}, dark: false },
  ];
  const tabs: { key: Tab; label: string; badge?: number }[] = [{ key: "listings", label: "Listings" }, { key: "requests", label: "Requests", badge: rc.new }, { key: "settings", label: "Page & Sharing" }];
  const copy = (t: string) => { try { navigator.clipboard.writeText(t); setNote({ ok: true, text: "Link copied." }); } catch { setNote({ ok: false, text: "Could not copy. Select the link and copy it." }); } };

  return (
    <div className={FIN.page}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#c99b3b]/30 pb-3">
        <div>
          <h1 className="text-[18px] font-semibold uppercase tracking-[0.24em] text-zinc-50">Marketplace</h1>
          <p className="mt-1 text-[11px] font-medium text-[#d9b45a]">List your screens and receive booking requests</p>
        </div>
        {data?.public_url && data.settings.enabled && <button className={FIN.btnGhost} onClick={() => window.open(data.public_url!, "_blank")}>View public page</button>}
      </div>
      {error && <p className="mb-3 rounded-lg bg-rose-500/10 px-3 py-2 text-[12px] text-rose-300">{error}</p>}

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className={`${k.dark ? "" : FIN.panel} rounded-xl p-3`} style={k.card}>
            <p className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${k.dark ? "text-[#2b2108]" : "text-zinc-400"}`}>{k.label}</p>
            <p className={`mt-1 font-semibold ${k.dark ? "text-[#1a1204]" : "text-zinc-50"}`} style={{ fontSize: fit(k.value, 22, 150) }}>{k.value}</p>
            <p className={`text-[10px] ${k.dark ? "text-[#4a3a12]" : "text-zinc-500"}`}>{k.note}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-1 border-b border-[#2a2f37]">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setParams({ tab: t.key === "listings" ? null : t.key })} className={`-mb-px border-b-2 px-3 py-2 text-[12px] font-medium transition ${tab === t.key ? "border-[#d9b45a] text-[#f1d68a]" : "border-transparent text-zinc-400 hover:text-zinc-100"}`}>
            {t.label}{t.badge ? <span className="ml-1.5 rounded-full bg-[#c99b3b]/20 px-1.5 text-[10px] text-[#f1d68a]">{t.badge}</span> : null}
          </button>
        ))}
      </div>
      <Note n={note} />

      {tab === "listings" && data && (
        <>
          <p className="mb-3 text-[11px] text-zinc-500">Rates are shown here for you only. They are never shown on the public page.</p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data.listings.map((l) => (
              <div key={l.id} className={`${FIN.panel} overflow-hidden`}>
                {l.photo_url && <img src={l.photo_url} alt="" className="h-28 w-full object-cover" />}
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-zinc-100">{l.title || l.name}</p>
                      <p className="truncate text-[10px] text-zinc-500">{[l.city, l.screen_type, l.size].filter(Boolean).join(" \u00b7 ")}</p>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] ${l.listed ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300" : "border-[#2b3038] text-zinc-500"}`}>{l.listed ? "Listed" : "Not listed"}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-zinc-400">Your rate: {money(l.rate, l.currency)}</p>
                  <div className="mt-2 flex gap-2">
                    <button className={FIN.btnGhost} onClick={() => openEdit(l)}>Edit listing</button>
                    <button className={FIN.btnGhost} disabled={busy} onClick={() => run(() => marketApi.saveListing(l.id, { listed: !l.listed, title: l.title ?? "", description: l.description ?? "", photo_url: l.photo_url ?? "", min_days: l.min_days ?? 0 }))}>{l.listed ? "Unlist" : "List now"}</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {data.listings.length === 0 && <p className="py-10 text-center text-[12px] text-zinc-500">No screens yet. Add your screens in Inventory first.</p>}
        </>
      )}

      {tab === "requests" && (
        <>
          <div className="mb-3 flex flex-wrap gap-2">
            {["", "new", "contacted", "quoted", "won", "lost"].map((k) => (
              <button key={k || "all"} onClick={() => setReqFilter(k)} className={`rounded-full border px-3 py-1 text-[11px] font-medium ${reqFilter === k ? "border-[#c99b3b] bg-[#c99b3b]/15 text-[#f1d68a]" : "border-[#2b3038] text-zinc-400"}`}>{k ? STATUS_LABEL[k] : "All"}</button>
            ))}
          </div>
          <div className="space-y-3">
            {reqs.map((r) => (
              <div key={r.id} className={`${FIN.panel} p-3`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-[13px] font-semibold text-zinc-100">{r.name}{r.company_name ? <span className="font-normal text-zinc-400"> {"\u00b7"} {r.company_name}</span> : null}</p>
                    <p className="text-[11px] text-zinc-500">{[r.phone, r.email].filter(Boolean).join(" \u00b7 ")} {"\u00b7"} {day(r.created_at)}</p>
                  </div>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] ${stCls(r.status)}`}>{STATUS_LABEL[r.status]}</span>
                </div>
                <p className="mt-2 text-[12px] text-zinc-300">{r.start_date ? `${day(r.start_date)} to ${day(r.end_date)}` : "No dates given"}{r.budget ? ` \u00b7 Budget: ${r.budget}` : ""}</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {r.screens.map((s) => (
                    <span key={s.id} className={`rounded-full border px-2 py-0.5 text-[10px] ${s.busy_with ? "border-rose-400/30 bg-rose-500/10 text-rose-300" : "border-[#2b3038] text-zinc-300"}`}>{s.name}{s.busy_with ? ` \u00b7 busy (${s.busy_with})` : ""}</span>
                  ))}
                </div>
                {r.message && <p className="mt-2 text-[12px] text-zinc-300">{r.message}</p>}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <select className={`${FIN.input} max-w-[150px]`} value={r.status} onChange={(e: any) => run(() => marketApi.updateRequest(r.id, { status: e.target.value }), loadReqs)}>
                    {Object.keys(STATUS_LABEL).map((k) => <option key={k} value={k}>{STATUS_LABEL[k]}</option>)}
                  </select>
                  {r.lead_id ? <button className={FIN.btnGhost} onClick={() => navigate("/crm")}>Open CRM</button> : <button className={FIN.btnGold} disabled={busy} onClick={() => run(() => marketApi.toLead(r.id), loadReqs)}>Convert to Lead</button>}
                  <button className={FIN.btnText} onClick={() => { if (window.confirm("Delete this request?")) run(() => marketApi.deleteRequest(r.id), loadReqs); }}>Delete</button>
                </div>
              </div>
            ))}
            {reqs.length === 0 && <p className="py-10 text-center text-[12px] text-zinc-500">No requests yet. Share your public page link to receive them.</p>}
          </div>
        </>
      )}

      {tab === "settings" && data && (
        <div className="grid gap-4 lg:grid-cols-2">
          <form className={`${FIN.panel} space-y-3 p-4`} onSubmit={(e: any) => { e.preventDefault(); run(() => marketApi.saveSettings(set)); }}>
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#d9b45a]">Public page</p>
            <label className="flex items-center gap-2 text-[12px] text-zinc-200"><input type="checkbox" checked={set.enabled} onChange={(e: any) => setSet({ ...set, enabled: e.target.checked })} /> Turn the public page on</label>
            <div><label className={FIN.label}>Headline</label><input className={FIN.input} value={set.headline} onChange={(e: any) => setSet({ ...set, headline: e.target.value })} placeholder="e.g. Premium outdoor screens in Lahore" /></div>
            <div><label className={FIN.label}>About</label><textarea className={FIN.input} rows={3} value={set.about} onChange={(e: any) => setSet({ ...set, about: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={FIN.label}>Contact phone</label><input className={FIN.input} value={set.contact_phone} onChange={(e: any) => setSet({ ...set, contact_phone: e.target.value })} /></div>
              <div><label className={FIN.label}>Contact email</label><input className={FIN.input} value={set.contact_email} onChange={(e: any) => setSet({ ...set, contact_email: e.target.value })} /></div>
            </div>
            <button className={FIN.btnGold} disabled={busy}>Save</button>
          </form>
          <div className={`${FIN.panel} h-fit space-y-2 p-4`}>
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#d9b45a]">Share link</p>
            {data.public_url ? (
              <>
                <input readOnly className={FIN.input} value={data.public_url} onFocus={(e: any) => e.target.select()} />
                <div className="flex gap-2">
                  <button className={FIN.btnGhost} onClick={() => copy(data.public_url!)}>Copy link</button>
                  <button className={FIN.btnGhost} onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(data.public_url!)}`, "_blank")}>Share on WhatsApp</button>
                </div>
                {!data.settings.enabled && <p className="text-[11px] text-amber-300">The page is off. Visitors will see "not available" until you turn it on.</p>}
              </>
            ) : <p className="text-[12px] text-zinc-400">Save the settings once to get your link.</p>}
            <p className="pt-2 text-[11px] text-zinc-500">The public page shows only the screens you list, with photo, city, size and description. Rates are never shown.</p>
          </div>
        </div>
      )}

      {edit && (
        <div className={FIN.overlay} onClick={() => setEdit(null)}>
          <form className={`${FIN.modal} max-w-[480px]`} onClick={(e: any) => e.stopPropagation()} onSubmit={async (e: any) => { e.preventDefault(); const r = await run(() => marketApi.saveListing(edit.id, { listed: form.listed, title: form.title, description: form.description, photo_url: form.photo_url, min_days: Number(form.min_days) || 0 })); if (r) setEdit(null); }}>
            <ModalTitle>{edit.name}</ModalTitle>
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-[12px] text-zinc-200"><input type="checkbox" checked={form.listed} onChange={(e: any) => setForm({ ...form, listed: e.target.checked })} /> Show this screen on the public page</label>
              <div><label className={FIN.label}>Public title</label><input className={FIN.input} value={form.title} onChange={(e: any) => setForm({ ...form, title: e.target.value })} placeholder={edit.name} /></div>
              <div><label className={FIN.label}>Description</label><textarea className={FIN.input} rows={3} value={form.description} onChange={(e: any) => setForm({ ...form, description: e.target.value })} placeholder="Traffic, audience, position..." /></div>
              <div><label className={FIN.label}>Minimum booking (days)</label><input type="number" min={0} className={FIN.input} value={form.min_days} onChange={(e: any) => setForm({ ...form, min_days: e.target.value })} /></div>
              <div>
                <label className={FIN.label}>Photo</label>
                {form.photo_url && <img src={form.photo_url} alt="" className="mb-2 h-24 rounded-lg object-cover" />}
                <input className={FIN.input} value={form.photo_url.startsWith("/api/files/") ? "" : form.photo_url} onChange={(e: any) => setForm({ ...form, photo_url: e.target.value })} placeholder="Paste a link or upload below" />
                <FilePicker campaignId="" value={form.photo_url} onChange={(url) => setForm({ ...form, photo_url: url })} />
              </div>
              <div className="flex justify-end gap-2"><button type="button" className={FIN.btnText} onClick={() => setEdit(null)}>Cancel</button><button className={FIN.btnGold} disabled={busy}>Save listing</button></div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
