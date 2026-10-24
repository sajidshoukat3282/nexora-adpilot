import { ACCEPT, MAX_UPLOAD_MB, prettySize, uploadFile } from "@/lib/api/files";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { PermissionGate } from "@/components/ui/PermissionGate";
import { campaignsApi, type CampaignBundle, type Creative, type CreativeReview, type Proof } from "@/lib/api/campaigns";
import { money } from "../crm/crmTools";
import { FIN, ModalTitle, SectionTitle } from "../finance/financeUi";
import { campaignDays, screenSubtotal, statusLabel, timing, todayIso, type CampaignMoney } from "./campaignTools";

const CREATIVE_TONE: Record<string, string> = {
  draft: "text-zinc-300 bg-zinc-400/10 border-zinc-400/30",
  internal_review: "text-sky-300 bg-sky-400/10 border-sky-400/30",
  client_review: "text-violet-300 bg-violet-400/10 border-violet-400/30",
  approved: "text-emerald-300 bg-emerald-400/10 border-emerald-400/30",
  rejected: "text-rose-300 bg-rose-400/10 border-rose-400/30",
};
const CREATIVE_ACTION: Record<string, string> = {
  internal_review: "Send for internal review",
  client_review: "Approve internally, send to client",
  approved: "Client approved",
  rejected: "Reject",
  draft: "Back to draft",
};
const pretty = (s: string) => statusLabel(s);

const Pill: React.FC<{ status: string }> = ({ status }) => (
  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${CREATIVE_TONE[status] ?? CREATIVE_TONE.draft}`}>{pretty(status)}</span>
);

function useCreatives(id: string) {
  const [items, setItems] = useState<Creative[]>([]);
  const [reviews, setReviews] = useState<CreativeReview[]>([]);
  const [next, setNext] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      const r = await campaignsApi.creatives(id);
      setItems(r.creatives);
      setReviews(r.reviews);
      setNext(r.next);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load creatives.");
    } finally {
      setLoading(false);
    }
  }, [id]);
  useEffect(() => {
    load();
  }, [load]);
  return { items, reviews, next, loading, error, load };
}

/* ---------------- Creatives ---------------- */

export const FilePicker: React.FC<{ campaignId: string; value: string; onChange: (url: string) => void }> = ({ campaignId, value, onChange }) => {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [label, setLabel] = useState("");
  const pick = async (e: any) => {
    const file: File | undefined = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setErr("");
    try {
      const up = await uploadFile(file, campaignId);
      onChange(up.url);
      setLabel(`${up.name} (${prettySize(up.size)})`);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  };
  const mine = value.startsWith("/api/files/");
  return (
    <div className="mt-2">
      <label className={`${FIN.btnGhost} cursor-pointer ${busy ? "opacity-60" : ""}`}>
        {busy ? "Uploading..." : "Upload from computer"}
        <input type="file" accept={ACCEPT} className="hidden" disabled={busy} onChange={pick} />
      </label>
      <span className="ml-2 text-[10px] text-zinc-500">PNG, JPG, GIF, WEBP, PDF, MP4 or WEBM, up to {MAX_UPLOAD_MB} MB</span>
      {mine && <p className="mt-1 text-[11px] text-emerald-300">File attached{label ? `: ${label}` : ""}. <button type="button" className="text-zinc-400 underline" onClick={() => { onChange(""); setLabel(""); }}>Remove</button></p>}
      {err && <p className="mt-1 text-[11px] text-rose-300">{err}</p>}
    </div>
  );
};

const CreativeForm: React.FC<{ campaignId: string; creative?: Creative; onClose: () => void; onSaved: () => void }> = ({ campaignId, creative, onClose, onSaved }) => {
  const [f, setF] = useState({ name: creative?.name ?? "", url: creative?.url ?? "", notes: creative?.notes ?? "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: any) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (creative) await campaignsApi.editCreative(campaignId, creative.id, f);
      else await campaignsApi.addCreative(campaignId, f);
      onSaved();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Could not save.");
      setBusy(false);
    }
  };
  return (
    <div className={FIN.overlay}>
      <form onSubmit={submit} className={`${FIN.modal} max-w-md`}>
        <ModalTitle>{creative ? "Edit creative" : "Add creative"}</ModalTitle>
        <div className="space-y-3">
          <div><label className={FIN.label}>Name</label><input required className={FIN.input} value={f.name} onChange={(e: any) => setF({ ...f, name: e.target.value })} placeholder="e.g. Eid billboard design" /></div>
          <div>
            <label className={FIN.label}>File</label>
            <input className={FIN.input} value={f.url.startsWith("/api/files/") ? "" : f.url} onChange={(e: any) => setF({ ...f, url: e.target.value })} placeholder="Paste a link (Google Drive, Dropbox...) or upload below" />
            <FilePicker campaignId={campaignId} value={f.url} onChange={(url) => setF({ ...f, url })} />
            <p className="mt-1 text-[10px] text-zinc-500">Changing the file or link creates a new version.</p>
          </div>
          <div><label className={FIN.label}>Notes</label><input className={FIN.input} value={f.notes} onChange={(e: any) => setF({ ...f, notes: e.target.value })} /></div>
        </div>
        {err && <p className="mt-3 text-[11px] text-rose-300">{err}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className={FIN.btnText} onClick={onClose}>Cancel</button>
          <button type="submit" className={FIN.btnGold} disabled={busy}>{busy ? "Saving..." : "Save"}</button>
        </div>
      </form>
    </div>
  );
};

export const CreativesPanel: React.FC<{ campaignId: string }> = ({ campaignId }) => {
  const { items, loading, error, load } = useCreatives(campaignId);
  const [form, setForm] = useState<Creative | "new" | null>(null);
  const [msg, setMsg] = useState("");

  const del = async (c: Creative) => {
    if (!window.confirm(`Delete creative "${c.name}"?`)) return;
    try {
      await campaignsApi.deleteCreative(campaignId, c.id);
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not delete.");
    }
  };

  return (
    <div className={`${FIN.panel} p-4`}>
      <div className="mb-3 flex items-center justify-between">
        <SectionTitle>Creatives</SectionTitle>
        <PermissionGate permission="campaigns.manage" fallback={null}>
          <button className={FIN.btnGold} onClick={() => setForm("new")}>+ Add creative</button>
        </PermissionGate>
      </div>
      {(error || msg) && <p className="mb-2 text-[12px] text-rose-300">{error || msg}</p>}
      {loading ? (
        <p className="text-[12px] text-zinc-500">Loading...</p>
      ) : items.length === 0 ? (
        <p className="py-8 text-center text-[12px] text-zinc-500">No creatives yet. Add the artwork for this campaign.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {items.map((c) => (
            <div key={c.id} className="rounded-xl border border-[#2a2f37] bg-[#0f1216] p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-zinc-100">{c.name}</p>
                  <p className="text-[10px] text-zinc-500">Version {c.version} &middot; updated {c.updated_at.slice(0, 10)}</p>
                </div>
                <Pill status={c.status} />
              </div>
              {c.notes && <p className="mt-2 text-[11px] text-zinc-400">{c.notes}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                {c.url ? (
                  <a href={c.url} target="_blank" rel="noreferrer" className={FIN.btnGhost}>Open file</a>
                ) : (
                  <span className="text-[10px] text-zinc-600">No file</span>
                )}
                <PermissionGate permission="campaigns.manage" fallback={null}>
                  <button className={FIN.btnGhost} onClick={() => setForm(c)}>Edit</button>
                  <button className={FIN.btnGhost} onClick={() => del(c)}>Delete</button>
                </PermissionGate>
              </div>
            </div>
          ))}
        </div>
      )}
      {form && (
        <CreativeForm
          campaignId={campaignId}
          creative={form === "new" ? undefined : form}
          onClose={() => setForm(null)}
          onSaved={() => {
            setForm(null);
            load();
          }}
        />
      )}
    </div>
  );
};

/* ---------------- Approvals ---------------- */

export const ApprovalsPanel: React.FC<{ campaignId: string }> = ({ campaignId }) => {
  const { items, reviews, next, loading, error, load } = useCreatives(campaignId);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  const move = async (c: Creative, to: string) => {
    let comment: string | undefined;
    if (to === "rejected") {
      const r = window.prompt("Reason for rejecting:");
      if (!r || !r.trim()) return;
      comment = r.trim();
    }
    setBusy(c.id);
    setMsg("");
    try {
      await campaignsApi.creativeStatus(campaignId, c.id, to, comment);
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not update.");
    } finally {
      setBusy(null);
    }
  };

  const pending = items.filter((c) => c.status === "internal_review" || c.status === "client_review");
  return (
    <div className="space-y-4">
      <div className={`${FIN.panel} p-4`}>
        <SectionTitle>Waiting for a decision ({pending.length})</SectionTitle>
        {(error || msg) && <p className="mt-2 text-[12px] text-rose-300">{error || msg}</p>}
        {loading ? <p className="mt-3 text-[12px] text-zinc-500">Loading...</p> : null}
        {!loading && items.length === 0 && <p className="py-6 text-center text-[12px] text-zinc-500">No creatives to review. Add one in the Creatives tab.</p>}
        <div className="mt-3 space-y-2">
          {items.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#2a2f37] bg-[#0f1216] p-3">
              <div className="min-w-0">
                <p className="truncate text-[12px] text-zinc-100">{c.name} <span className="text-zinc-500">v{c.version}</span></p>
                <div className="mt-1"><Pill status={c.status} /></div>
              </div>
              <PermissionGate permission="campaigns.manage" fallback={null}>
                <div className="flex flex-wrap gap-1.5">
                  {(next[c.status] ?? []).map((to) => (
                    <button key={to} disabled={busy === c.id} className={to === "rejected" ? FIN.btnGhost : FIN.btnGold} onClick={() => move(c, to)}>
                      {CREATIVE_ACTION[to] ?? pretty(to)}
                    </button>
                  ))}
                </div>
              </PermissionGate>
            </div>
          ))}
        </div>
      </div>
      <div className={`${FIN.panel} p-4`}>
        <SectionTitle>Approval history</SectionTitle>
        <ul className="mt-3 space-y-2">
          {reviews.length === 0 && <li className="text-[12px] text-zinc-500">No decisions recorded yet.</li>}
          {reviews.map((r) => {
            const name = items.find((c) => c.id === r.creative_id)?.name ?? "Creative";
            return (
              <li key={r.id} className="flex items-start gap-3 border-b border-[#1b1f25] pb-2 text-[12px]">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#d9b45a]" />
                <div>
                  <p className="text-zinc-100">{name}: {r.from_status ? pretty(r.from_status) : "New"} to {pretty(r.to_status)}</p>
                  {r.comment && <p className="text-zinc-400">"{r.comment}"</p>}
                  <p className="text-[10px] text-zinc-500">{r.actor_email ?? "System"} &middot; {r.created_at.replace("T", " ").slice(0, 16)}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

/* ---------------- Delivery ---------------- */

export const DeliveryPanel: React.FC<{ data: CampaignBundle }> = ({ data }) => {
  const c = data.campaign;
  const [proofs, setProofs] = useState<Proof[]>([]);
  useEffect(() => {
    campaignsApi.proofs(c.id).then((r) => setProofs(r.proofs)).catch(() => undefined);
  }, [c.id]);
  const stat = (s: string | null) =>
    s === "online" ? "text-emerald-300 border-emerald-400/30 bg-emerald-400/10" : s === "maintenance" ? "text-amber-300 border-amber-400/30 bg-amber-400/10" : "text-rose-300 border-rose-400/30 bg-rose-400/10";
  const t = timing(c.start_date, c.end_date);
  return (
    <div className={`${FIN.panel} p-4`}>
      <SectionTitle>Delivery by screen</SectionTitle>
      <p className="mb-3 mt-1 text-[11px] text-zinc-500">
        Screen condition comes from Inventory. Proof count is the number of proof entries added for each screen.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-[12px]">
          <thead className="border-b border-[#2a2f37] text-[10px] uppercase tracking-[0.12em] text-zinc-400">
            <tr>
              <th className="p-2 font-semibold">Screen</th>
              <th className="p-2 font-semibold">City</th>
              <th className="p-2 font-semibold">Condition</th>
              <th className="p-2 text-right font-semibold">Proofs</th>
              <th className="p-2 font-semibold">Last proof</th>
            </tr>
          </thead>
          <tbody>
            {data.screens.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-zinc-500">No screens in this campaign.</td></tr>}
            {data.screens.map((s) => {
              const mine = proofs.filter((p) => p.inventory_id === s.inventory_id);
              return (
                <tr key={s.id} className="border-t border-[#20242b]">
                  <td className="p-2 text-zinc-100">{s.name ?? "Removed screen"}</td>
                  <td className="p-2 text-zinc-400">{s.city ?? "-"}</td>
                  <td className="p-2"><span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${stat(s.status)}`}>{s.status ?? "unknown"}</span></td>
                  <td className="p-2 text-right text-zinc-300">{mine.length}</td>
                  <td className="p-2 text-zinc-400">{mine[0]?.proof_date ?? (t.phase === "upcoming" ? "Not started" : "None yet")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ---------------- Proof of play ---------------- */

export const ProofPanel: React.FC<{ data: CampaignBundle }> = ({ data }) => {
  const c = data.campaign;
  const [proofs, setProofs] = useState<Proof[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ proof_date: todayIso(), inventory_id: "", photo_url: "", notes: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setProofs((await campaignsApi.proofs(c.id)).proofs);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not load proofs.");
    } finally {
      setLoading(false);
    }
  }, [c.id]);
  useEffect(() => {
    load();
  }, [load]);

  const save = async (e: any) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await campaignsApi.addProof(c.id, { ...f, inventory_id: f.inventory_id || undefined });
      setAdding(false);
      setF({ proof_date: todayIso(), inventory_id: "", photo_url: "", notes: "" });
      await load();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  };
  const del = async (p: Proof) => {
    if (!window.confirm("Delete this proof entry?")) return;
    await campaignsApi.deleteProof(c.id, p.id).catch(() => undefined);
    load();
  };

  return (
    <div className={`${FIN.panel} p-4`}>
      <div className="mb-3 flex items-center justify-between">
        <SectionTitle>Proof of play</SectionTitle>
        <PermissionGate permission="campaigns.manage" fallback={null}>
          <button className={FIN.btnGold} onClick={() => setAdding(true)}>+ Add proof</button>
        </PermissionGate>
      </div>
      <p className="mb-3 text-[11px] text-zinc-500">Add a site photo (upload or link) or a note for each screen and date, to show the client the ad was running.</p>
      {err && !adding && <p className="mb-2 text-[12px] text-rose-300">{err}</p>}
      {loading ? (
        <p className="text-[12px] text-zinc-500">Loading...</p>
      ) : proofs.length === 0 ? (
        <p className="py-8 text-center text-[12px] text-zinc-500">No proof added yet.</p>
      ) : (
        <ul className="space-y-2">
          {proofs.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#2a2f37] bg-[#0f1216] p-3 text-[12px]">
              <div className="min-w-0">
                <p className="text-zinc-100">{p.screen_name ?? "General"}{p.city ? `, ${p.city}` : ""} <span className="text-zinc-500">&middot; {p.proof_date}</span></p>
                {p.notes && <p className="text-zinc-400">{p.notes}</p>}
              </div>
              <div className="flex gap-2">
                {p.photo_url && <a href={p.photo_url} target="_blank" rel="noreferrer" className={FIN.btnGhost}>View photo</a>}
                <PermissionGate permission="campaigns.manage" fallback={null}>
                  <button className={FIN.btnGhost} onClick={() => del(p)}>Delete</button>
                </PermissionGate>
              </div>
            </li>
          ))}
        </ul>
      )}
      {adding && (
        <div className={FIN.overlay}>
          <form onSubmit={save} className={`${FIN.modal} max-w-md`}>
            <ModalTitle>Add proof of play</ModalTitle>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className={FIN.label}>Date</label><input required type="date" className={FIN.input} value={f.proof_date} onChange={(e: any) => setF({ ...f, proof_date: e.target.value })} /></div>
                <div>
                  <label className={FIN.label}>Screen</label>
                  <select className={FIN.input} value={f.inventory_id} onChange={(e: any) => setF({ ...f, inventory_id: e.target.value })}>
                    <option value="">Whole campaign</option>
                    {data.screens.map((s) => <option key={s.id} value={s.inventory_id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div><label className={FIN.label}>Photo</label><input className={FIN.input} value={f.photo_url.startsWith("/api/files/") ? "" : f.photo_url} onChange={(e: any) => setF({ ...f, photo_url: e.target.value })} placeholder="Paste a link or upload below" /><FilePicker campaignId={c.id} value={f.photo_url} onChange={(url) => setF({ ...f, photo_url: url })} /></div>
              <div><label className={FIN.label}>Note</label><input className={FIN.input} value={f.notes} onChange={(e: any) => setF({ ...f, notes: e.target.value })} /></div>
            </div>
            {err && <p className="mt-3 text-[11px] text-rose-300">{err}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className={FIN.btnText} onClick={() => { setAdding(false); setErr(""); }}>Cancel</button>
              <button type="submit" className={FIN.btnGold} disabled={busy}>{busy ? "Saving..." : "Save"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

/* ---------------- Analytics ---------------- */

const Bar: React.FC<{ label: string; value: number; max: number; text: string }> = ({ label, value, max, text }) => (
  <div className="mb-2.5">
    <div className="mb-1 flex justify-between text-[11px]"><span className="text-zinc-400">{label}</span><span className="text-zinc-100">{text}</span></div>
    <div className="h-2 overflow-hidden rounded-full bg-[#1b1f25]">
      <div className="h-full rounded-full bg-gradient-to-r from-[#f1d68a] to-[#a97b22]" style={{ width: `${max > 0 ? Math.min(100, (value / max) * 100) : 0}%` }} />
    </div>
  </div>
);

export const AnalyticsPanel: React.FC<{ data: CampaignBundle; m: CampaignMoney }> = ({ data, m }) => {
  const c = data.campaign;
  const cur = c.currency || "PKR";
  const fmt = (n: number) => money(n, cur);
  const days = campaignDays(c.start_date, c.end_date);
  const screens = data.screens.length;
  const screenDays = Math.max(1, data.screens.reduce((a, s) => a + (Number(s.slots) || 1), 0) * days);
  const collected = m.invoiced > 0 ? Math.round((m.received / m.invoiced) * 100) : 0;
  const margin = m.contract > 0 ? Math.round((m.expectedProfit / m.contract) * 100) : 0;
  const perScreen = useMemo(
    () => data.screens.map((s) => ({ name: s.name ?? "Screen", value: screenSubtotal(s.rate_applied, c.start_date, c.end_date, s.slots) })).sort((a, b) => b.value - a.value),
    [data.screens, c.start_date, c.end_date],
  );
  const topValue = perScreen[0]?.value ?? 0;
  const tiles = [
    { l: "Revenue per day", v: fmt(m.contract / days) },
    { l: "Revenue per slot-day", v: fmt(m.contract / screenDays) },
    { l: "Collected", v: `${collected}%` },
    { l: "Expected margin", v: `${margin}%` },
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((x) => (
          <div key={x.l} className={`${FIN.panel} p-3`}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">{x.l}</p>
            <p className="mt-1 text-[16px] font-bold text-zinc-100">{x.v}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className={`${FIN.panel} p-4`}>
          <SectionTitle>Money flow</SectionTitle>
          <div className="mt-3">
            <Bar label="Contract value" value={m.contract} max={m.contract} text={fmt(m.contract)} />
            <Bar label="Invoiced" value={m.invoiced} max={m.contract} text={fmt(m.invoiced)} />
            <Bar label="Received" value={m.received} max={m.contract} text={fmt(m.received)} />
            <Bar label="Expenses" value={m.expenses} max={m.contract} text={fmt(m.expenses)} />
          </div>
        </div>
        <div className={`${FIN.panel} p-4`}>
          <SectionTitle>Value by screen</SectionTitle>
          <div className="mt-3">
            {perScreen.length === 0 && <p className="text-[12px] text-zinc-500">No screens in this campaign.</p>}
            {perScreen.map((s) => <Bar key={s.name} label={s.name} value={s.value} max={topValue} text={fmt(s.value)} />)}
          </div>
        </div>
      </div>
      <p className="text-[11px] text-zinc-500">
        These figures come from your own bookings, invoices and expenses. Audience impressions are not tracked in this version.
      </p>
    </div>
  );
};
