import React, { useCallback, useEffect, useState } from "react";
import { Link } from "@/lib/router";
import { FIN, FDrawer, ModalTitle } from "@/features/finance/financeUi";
import { FilePicker } from "@/features/campaigns/WorkspaceTabs";
import {
  opsApi, type FieldTeam, type Incident, type MaintItem, type OpsScreen, type Proof, type ScreenDetail, type ScreenState,
} from "@/lib/api/operations";

export const STATE_LABEL: Record<ScreenState, string> = { online: "Online", maintenance: "Maintenance", offline: "Offline" };
export const stateDot = (s: ScreenState) => (s === "online" ? "bg-emerald-400" : s === "maintenance" ? "bg-amber-400" : "bg-rose-400");
export const statePill = (s: ScreenState) =>
  s === "online" ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
    : s === "maintenance" ? "border-amber-400/30 bg-amber-500/10 text-amber-300" : "border-rose-400/30 bg-rose-500/10 text-rose-300";
const sevPill = (s: string) => (s === "high" ? "border-rose-400/30 bg-rose-500/10 text-rose-300" : s === "medium" ? "border-amber-400/30 bg-amber-500/10 text-amber-300" : "border-zinc-500/30 bg-zinc-500/10 text-zinc-300");
const errText = (e: any) => (e?.message as string) || "Something went wrong.";
const day = (d: string | null) => (d ? String(d).slice(0, 10) : "-");
const ago = (iso: string | null): string => {
  if (!iso) return "never";
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  if (m < 1440) return `${Math.round(m / 60)} h ago`;
  return `${Math.round(m / 1440)} days ago`;
};

const Note: React.FC<{ n: { ok: boolean; text: string } | null }> = ({ n }) =>
  n ? <p className={`mb-3 rounded-lg px-3 py-2 text-[12px] ${n.ok ? "bg-emerald-500/10 text-emerald-300" : "bg-rose-500/10 text-rose-300"}`}>{n.text}</p> : null;

/* ---------------- screen drawer ---------------- */

export const ScreenDrawer: React.FC<{ screen: OpsScreen | null; onClose: () => void; onChanged: () => void; onIncident: (s: OpsScreen) => void }> = ({ screen, onClose, onChanged, onIncident }) => {
  const [d, setD] = useState<ScreenDetail | null>(null);
  const [state, setState] = useState<ScreenState>("online");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [link, setLink] = useState("");

  const load = useCallback(async () => {
    if (!screen) return;
    try { setD(await opsApi.screen(screen.id)); } catch (e) { setNote({ ok: false, text: errText(e) }); }
  }, [screen]);
  useEffect(() => { setD(null); setNote(null); setLink(""); if (screen) { setState(screen.status); setReason(screen.reason ?? ""); load(); } }, [screen?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = async (fn: () => Promise<any>, ok: string) => {
    setBusy(true); setNote(null);
    try { const r = await fn(); setNote({ ok: true, text: r?.message || ok }); await load(); onChanged(); return r; }
    catch (e) { setNote({ ok: false, text: errText(e) }); }
    finally { setBusy(false); }
  };

  return (
    <FDrawer open={!!screen} onClose={onClose} title={screen?.name ?? ""} subtitle={screen ? [screen.city, screen.location].filter(Boolean).join(" \u00b7 ") : ""}>
      {screen && (
        <div className="space-y-5 text-[12px]">
          <Note n={note} />
          <section>
            <p className={FIN.label}>Status {screen.has_player && <span className="ml-1 normal-case text-zinc-500">(set by the player link; Maintenance stays manual)</span>}</p>
            <div className="flex flex-wrap gap-2">
              {(["online", "maintenance", "offline"] as ScreenState[]).map((k) => (
                <button key={k} onClick={() => setState(k)} className={`rounded-full border px-3 py-1 text-[11px] font-medium ${state === k ? statePill(k) : "border-[#2b3038] text-zinc-400"}`}>{STATE_LABEL[k]}</button>
              ))}
            </div>
            {state !== "online" && <input className={`${FIN.input} mt-2`} placeholder="Reason (required)" value={reason} onChange={(e: any) => setReason(e.target.value)} />}
            <div className="mt-2 flex gap-2">
              <button className={FIN.btnGold} disabled={busy} onClick={() => run(() => opsApi.setStatus(screen.id, state, reason), "Status saved.")}>Save status</button>
              <button className={FIN.btnGhost} onClick={() => onIncident(screen)}>Report an issue</button>
            </div>
            {d?.ops?.updated_by && <p className="mt-1 text-[10px] text-zinc-500">Last changed by {d.ops.updated_by}{d.ops.status_since ? ` on ${day(d.ops.status_since)}` : ""}</p>}
          </section>

          <section className={`${FIN.panel} p-3`}>
            <p className={FIN.label}>Player link (automatic online / offline)</p>
            {d?.ops?.has_player ? (
              <>
                <p className="text-zinc-300">Linked. Last heartbeat: <b>{ago(d.ops.last_heartbeat)}</b>{d.ops.info?.version ? ` \u00b7 version ${d.ops.info.version}` : ""}</p>
                <button className={`${FIN.btnGhost} mt-2`} disabled={busy} onClick={() => { if (window.confirm("Remove the player link? Status becomes manual again.")) run(() => opsApi.removePlayer(screen.id), "Player link removed."); }}>Remove link</button>
                <button className={`${FIN.btnGhost} ml-2 mt-2`} disabled={busy} onClick={async () => { if (window.confirm("Create a new link? The old one stops working.")) { const r = await run(() => opsApi.createPlayer(screen.id), "New link created."); if (r?.player_url) setLink(r.player_url); } }}>New link</button>
              </>
            ) : (
              <>
                <p className="text-zinc-400">Create a link, then open it in the browser of the screen's TV box or PC. The page plays this screen's approved creatives in a loop and keeps the status Online.</p>
                <button className={`${FIN.btnGold} mt-2`} disabled={busy} onClick={async () => { const r = await run(() => opsApi.createPlayer(screen.id), "Player link created."); if (r?.player_url) setLink(r.player_url); }}>Create player link</button>
              </>
            )}
            {link && (
              <div className="mt-2">
                <p className="text-[10px] text-amber-300">This is the player page link. Copy it now, it is shown only once.</p>
                <input readOnly className={FIN.input} value={link} onFocus={(e: any) => e.target.select()} />
                <div className="mt-1 flex gap-2"><button className={FIN.btnGhost} onClick={() => { try { navigator.clipboard.writeText(link); setNote({ ok: true, text: "Link copied." }); } catch { /* ignore */ } }}>Copy link</button><button className={FIN.btnGhost} onClick={() => window.open(link, "_blank")}>Open player</button></div>
              </div>
            )}
          </section>

          <section>
            <p className={FIN.label}>Booked campaigns</p>
            {d?.campaigns.length ? d.campaigns.map((c) => (
              <Link key={c.id} to={`/campaigns/${c.id}`} className="mb-1 flex justify-between rounded-lg border border-[#2a2f37] px-3 py-2 hover:bg-white/[0.04]">
                <span className="text-zinc-100">{c.name}<span className="ml-2 text-zinc-500">{c.client_name ?? ""}</span></span>
                <span className="text-zinc-500">{day(c.start_date)} to {day(c.end_date)}</span>
              </Link>
            )) : <p className="text-zinc-500">No upcoming booking on this screen.</p>}
          </section>

          <section>
            <p className={FIN.label}>Issues</p>
            {d?.incidents.length ? d.incidents.slice(0, 6).map((i) => (
              <p key={i.id} className="mb-1 flex justify-between"><span className="text-zinc-200">{i.title}</span><span className={i.status === "resolved" ? "text-emerald-300" : "text-amber-300"}>{i.status.replace("_", " ")}</span></p>
            )) : <p className="text-zinc-500">No issues recorded.</p>}
          </section>

          <section>
            <p className={FIN.label}>Maintenance</p>
            {d?.maintenance.length ? d.maintenance.slice(0, 6).map((m) => (
              <p key={m.id} className="mb-1 flex justify-between"><span className="text-zinc-200">{m.title}</span><span className="text-zinc-500">{day(m.planned_date)}{m.done ? " \u00b7 done" : ""}</span></p>
            )) : <p className="text-zinc-500">Nothing scheduled.</p>}
          </section>

          <section>
            <p className={FIN.label}>Recent proof of play</p>
            {d?.proofs.length ? (
              <div className="grid grid-cols-3 gap-2">
                {d.proofs.map((p) => (
                  <a key={p.id} href={p.photo_url ?? undefined} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-[#2a2f37] bg-[#0f1216]">
                    {p.photo_url && /\.(mp4|webm)$/i.test(p.photo_url) === false ? <img src={p.photo_url} alt="" className="h-20 w-full object-cover" /> : <div className="flex h-20 items-center justify-center text-zinc-500">Open</div>}
                    <p className="px-1.5 py-1 text-[10px] text-zinc-400">{day(p.proof_date)}</p>
                  </a>
                ))}
              </div>
            ) : <p className="text-zinc-500">No proof yet.</p>}
          </section>
        </div>
      )}
    </FDrawer>
  );
};

/* ---------------- incidents ---------------- */

export const IncidentModal: React.FC<{ open: boolean; onClose: () => void; onSaved: () => void; screens: OpsScreen[]; presetScreen?: string; campaigns: { id: string; name: string }[] }> = ({ open, onClose, onSaved, screens, presetScreen, campaigns }) => {
  const [f, setF] = useState({ title: "", detail: "", severity: "medium", inventory_id: "", campaign_id: "", owner: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => { if (open) { setF({ title: "", detail: "", severity: "medium", inventory_id: presetScreen ?? "", campaign_id: "", owner: "" }); setErr(""); } }, [open, presetScreen]);
  if (!open) return null;
  const save = async (e: any) => {
    e.preventDefault(); setBusy(true); setErr("");
    try { await opsApi.addIncident({ ...f, inventory_id: f.inventory_id || undefined, campaign_id: f.campaign_id || undefined }); onSaved(); onClose(); }
    catch (ex) { setErr(errText(ex)); } finally { setBusy(false); }
  };
  return (
    <div className={FIN.overlay} onClick={onClose}>
      <form className={`${FIN.modal} max-w-[480px]`} onClick={(e: any) => e.stopPropagation()} onSubmit={save}>
        <ModalTitle>Report an issue</ModalTitle>
        <div className="space-y-3">
          <div><label className={FIN.label}>Title</label><input className={FIN.input} value={f.title} onChange={(e: any) => setF({ ...f, title: e.target.value })} placeholder="e.g. Screen flickering" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={FIN.label}>Priority</label><select className={FIN.input} value={f.severity} onChange={(e: any) => setF({ ...f, severity: e.target.value })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></div>
            <div><label className={FIN.label}>Owner (optional)</label><input className={FIN.input} value={f.owner} onChange={(e: any) => setF({ ...f, owner: e.target.value })} placeholder="Who will handle it" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={FIN.label}>Screen</label><select className={FIN.input} value={f.inventory_id} onChange={(e: any) => setF({ ...f, inventory_id: e.target.value })}><option value="">No screen</option>{screens.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
            <div><label className={FIN.label}>Campaign</label><select className={FIN.input} value={f.campaign_id} onChange={(e: any) => setF({ ...f, campaign_id: e.target.value })}><option value="">No campaign</option>{campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          </div>
          <div><label className={FIN.label}>Details</label><textarea className={FIN.input} rows={3} value={f.detail} onChange={(e: any) => setF({ ...f, detail: e.target.value })} /></div>
          {err && <p className="text-[12px] text-rose-300">{err}</p>}
          <div className="flex justify-end gap-2"><button type="button" className={FIN.btnText} onClick={onClose}>Cancel</button><button className={FIN.btnGold} disabled={busy}>Report issue</button></div>
        </div>
      </form>
    </div>
  );
};

export const IncidentsPanel: React.FC<{ reloadKey: number; onAdd: () => void; onChanged: () => void }> = ({ reloadKey, onAdd, onChanged }) => {
  const [filter, setFilter] = useState("");
  const [list, setList] = useState<Incident[]>([]);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [resolving, setResolving] = useState<Incident | null>(null);
  const [text, setText] = useState("");
  const load = useCallback(async () => { try { setList((await opsApi.incidents(filter)).incidents); } catch (e) { setNote({ ok: false, text: errText(e) }); } }, [filter]);
  useEffect(() => { load(); }, [load, reloadKey]);
  const act = async (fn: () => Promise<any>) => { setNote(null); try { const r = await fn(); setNote({ ok: true, text: r?.message || "Done." }); await load(); onChanged(); } catch (e) { setNote({ ok: false, text: errText(e) }); } };
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {[["", "All"], ["open", "Open"], ["in_progress", "In progress"], ["resolved", "Resolved"]].map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} className={`rounded-full border px-3 py-1 text-[11px] font-medium ${filter === k ? "border-[#c99b3b] bg-[#c99b3b]/15 text-[#f1d68a]" : "border-[#2b3038] text-zinc-400"}`}>{l}</button>
        ))}
        <button className={`${FIN.btnGold} ml-auto`} onClick={onAdd}>Report an issue</button>
      </div>
      <Note n={note} />
      <div className="space-y-2">
        {list.map((i) => (
          <div key={i.id} className={`${FIN.panel} p-3`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-zinc-100">{i.title}</p>
                <p className="text-[11px] text-zinc-500">{[i.screen_name, i.campaign_name].filter(Boolean).join(" \u00b7 ") || "General"} {"\u00b7"} {day(i.created_at)}{i.owner ? ` \u00b7 ${i.owner}` : ""}</p>
              </div>
              <div className="flex gap-1.5">
                <span className={`rounded-full border px-2 py-0.5 text-[10px] ${sevPill(i.severity)}`}>{i.severity}</span>
                <span className="rounded-full border border-[#2b3038] px-2 py-0.5 text-[10px] text-zinc-300">{i.status.replace("_", " ")}</span>
              </div>
            </div>
            {i.detail && <p className="mt-1 text-[12px] text-zinc-300">{i.detail}</p>}
            {i.resolution && <p className="mt-1 text-[12px] text-emerald-300">Resolved: {i.resolution}</p>}
            <div className="mt-2 flex flex-wrap gap-2">
              {i.status === "open" && <button className={FIN.btnGhost} onClick={() => act(() => opsApi.updateIncident(i.id, { status: "in_progress" }))}>Start work</button>}
              {i.status !== "resolved" && <button className={FIN.btnGhost} onClick={() => { setResolving(i); setText(""); }}>Resolve</button>}
              {i.status === "resolved" && <button className={FIN.btnGhost} onClick={() => act(() => opsApi.updateIncident(i.id, { status: "open" }))}>Reopen</button>}
              <button className={FIN.btnText} onClick={() => { if (window.confirm("Delete this incident?")) act(() => opsApi.deleteIncident(i.id)); }}>Delete</button>
            </div>
          </div>
        ))}
        {list.length === 0 && <p className="py-8 text-center text-[12px] text-zinc-500">No incidents here.</p>}
      </div>
      {resolving && (
        <div className={FIN.overlay} onClick={() => setResolving(null)}>
          <div className={`${FIN.modal} max-w-[420px]`} onClick={(e: any) => e.stopPropagation()}>
            <ModalTitle>Resolve issue</ModalTitle>
            <label className={FIN.label}>How was it resolved?</label>
            <textarea className={FIN.input} rows={3} value={text} onChange={(e: any) => setText(e.target.value)} />
            <div className="mt-3 flex justify-end gap-2">
              <button className={FIN.btnText} onClick={() => setResolving(null)}>Cancel</button>
              <button className={FIN.btnGold} onClick={async () => { const id = resolving.id; await act(() => opsApi.updateIncident(id, { status: "resolved", resolution: text })); setResolving(null); }}>Mark resolved</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ---------------- maintenance ---------------- */

export const MaintenancePanel: React.FC<{ screens: OpsScreen[]; onChanged: () => void }> = ({ screens, onChanged }) => {
  const [items, setItems] = useState<MaintItem[]>([]);
  const [today, setToday] = useState("");
  const [f, setF] = useState({ inventory_id: "", title: "", planned_date: "", notes: "" });
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const load = useCallback(async () => { try { const r = await opsApi.maintenance(); setItems(r.items); setToday(r.today); } catch (e) { setNote({ ok: false, text: errText(e) }); } }, []);
  useEffect(() => { load(); }, [load]);
  const act = async (fn: () => Promise<any>) => { setNote(null); try { const r = await fn(); setNote({ ok: true, text: r?.message || "Done." }); await load(); onChanged(); } catch (e) { setNote({ ok: false, text: errText(e) }); } };
  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <form className={`${FIN.panel} h-fit space-y-3 p-3`} onSubmit={async (e: any) => { e.preventDefault(); await act(() => opsApi.addMaintenance(f)); setF({ inventory_id: "", title: "", planned_date: "", notes: "" }); }}>
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#d9b45a]">Schedule maintenance</p>
        <div><label className={FIN.label}>Screen</label><select className={FIN.input} value={f.inventory_id} onChange={(e: any) => setF({ ...f, inventory_id: e.target.value })}><option value="">Choose a screen</option>{screens.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
        <div><label className={FIN.label}>Work to do</label><input className={FIN.input} value={f.title} onChange={(e: any) => setF({ ...f, title: e.target.value })} placeholder="e.g. Clean and check power" /></div>
        <div><label className={FIN.label}>Date</label><input type="date" className={FIN.input} value={f.planned_date} onChange={(e: any) => setF({ ...f, planned_date: e.target.value })} /></div>
        <div><label className={FIN.label}>Notes</label><input className={FIN.input} value={f.notes} onChange={(e: any) => setF({ ...f, notes: e.target.value })} /></div>
        <button className={FIN.btnGold}>Schedule</button>
      </form>
      <div>
        <Note n={note} />
        <div className="space-y-2">
          {items.map((m) => {
            const late = !m.done && today && m.planned_date < today;
            return (
              <div key={m.id} className={`${FIN.panel} flex flex-wrap items-center justify-between gap-2 p-3`}>
                <div>
                  <p className={`text-[13px] font-semibold ${m.done ? "text-zinc-500 line-through" : "text-zinc-100"}`}>{m.title}</p>
                  <p className="text-[11px] text-zinc-500">{m.screen_name} {"\u00b7"} {day(m.planned_date)}{late ? " \u00b7 overdue" : ""}{m.notes ? ` \u00b7 ${m.notes}` : ""}</p>
                </div>
                <div className="flex gap-2">
                  <button className={FIN.btnGhost} onClick={() => act(() => opsApi.doneMaintenance(m.id, !m.done))}>{m.done ? "Mark pending" : "Mark done"}</button>
                  <button className={FIN.btnText} onClick={() => { if (window.confirm("Remove this item?")) act(() => opsApi.deleteMaintenance(m.id)); }}>Remove</button>
                </div>
              </div>
            );
          })}
          {items.length === 0 && <p className="py-8 text-center text-[12px] text-zinc-500">No maintenance scheduled.</p>}
        </div>
      </div>
    </div>
  );
};

/* ---------------- proof of play ---------------- */

export const ProofPanel: React.FC<{ screens: OpsScreen[]; onChanged: () => void }> = ({ screens, onChanged }) => {
  const [camp, setCamp] = useState("");
  const [proofs, setProofs] = useState<Proof[]>([]);
  const [camps, setCamps] = useState<{ id: string; name: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ campaign_id: "", inventory_id: "", proof_date: new Date().toISOString().slice(0, 10), photo_url: "", notes: "" });
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => { try { const r = await opsApi.proofs(camp); setProofs(r.proofs); setCamps(r.campaigns); } catch (e) { setNote({ ok: false, text: errText(e) }); } }, [camp]);
  useEffect(() => { load(); }, [load]);
  const options = screens.filter((s) => s.running.some((r) => r.campaign_id === f.campaign_id));
  const save = async (e: any) => {
    e.preventDefault(); setBusy(true); setNote(null);
    try { await opsApi.addProof(f.campaign_id, { inventory_id: f.inventory_id || undefined, proof_date: f.proof_date, photo_url: f.photo_url || undefined, notes: f.notes || undefined }); setOpen(false); setNote({ ok: true, text: "Proof added." }); await load(); onChanged(); }
    catch (ex) { setNote({ ok: false, text: errText(ex) }); } finally { setBusy(false); }
  };
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select className={`${FIN.input} max-w-[260px]`} value={camp} onChange={(e: any) => setCamp(e.target.value)}><option value="">All campaigns</option>{camps.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <button className={`${FIN.btnGold} ml-auto`} onClick={() => { setF({ ...f, campaign_id: camp || camps[0]?.id || "", inventory_id: "", photo_url: "", notes: "" }); setOpen(true); }}>Add proof</button>
      </div>
      <Note n={note} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {proofs.map((p) => {
          const vid = p.photo_url && /\.(mp4|webm)(\?|$)/i.test(p.photo_url);
          return (
            <div key={p.id} className={`${FIN.panel} overflow-hidden`}>
              <a href={p.photo_url ?? undefined} target="_blank" rel="noreferrer" className="block bg-[#0f1216]">
                {p.photo_url && !vid ? <img src={p.photo_url} alt="" className="h-32 w-full object-cover" /> : <div className="flex h-32 items-center justify-center text-[11px] text-zinc-500">{p.photo_url ? "Open video / file" : "Note only"}</div>}
              </a>
              <div className="p-2">
                <p className="truncate text-[12px] font-semibold text-zinc-100">{p.campaign_name}</p>
                <p className="truncate text-[10px] text-zinc-500">{p.geo_ok === 1 ? "\u2713 " : ""}{p.screen_name ?? "Whole campaign"} {"\u00b7"} {day(p.proof_date)}</p>{p.actor_email && <p className="truncate text-[10px] text-zinc-600">By {p.actor_email}</p>}
                {p.notes && <p className="mt-1 text-[11px] text-zinc-300">{p.notes}</p>}
                <button className="mt-1 text-[10px] text-zinc-500 underline" onClick={async () => { if (window.confirm("Delete this proof?")) { try { await opsApi.deleteProof(p.campaign_id, p.id); await load(); onChanged(); } catch (e) { setNote({ ok: false, text: errText(e) }); } } }}>Delete</button>
              </div>
            </div>
          );
        })}
      </div>
      {proofs.length === 0 && <p className="py-8 text-center text-[12px] text-zinc-500">No proof of play yet.</p>}
      {open && (
        <div className={FIN.overlay} onClick={() => setOpen(false)}>
          <form className={`${FIN.modal} max-w-[460px]`} onClick={(e: any) => e.stopPropagation()} onSubmit={save}>
            <ModalTitle>Add proof of play</ModalTitle>
            <div className="space-y-3">
              <div><label className={FIN.label}>Campaign</label><select className={FIN.input} value={f.campaign_id} onChange={(e: any) => setF({ ...f, campaign_id: e.target.value, inventory_id: "" })}>{camps.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={FIN.label}>Screen</label><select className={FIN.input} value={f.inventory_id} onChange={(e: any) => setF({ ...f, inventory_id: e.target.value })}><option value="">Whole campaign</option>{options.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                <div><label className={FIN.label}>Date</label><input type="date" className={FIN.input} value={f.proof_date} onChange={(e: any) => setF({ ...f, proof_date: e.target.value })} /></div>
              </div>
              <div>
                <label className={FIN.label}>Photo or video</label>
                <input className={FIN.input} value={f.photo_url.startsWith("/api/files/") ? "" : f.photo_url} onChange={(e: any) => setF({ ...f, photo_url: e.target.value })} placeholder="Paste a link or upload below" />
                {f.campaign_id && <FilePicker campaignId={f.campaign_id} value={f.photo_url} onChange={(url) => setF({ ...f, photo_url: url })} />}
              </div>
              <div><label className={FIN.label}>Notes</label><input className={FIN.input} value={f.notes} onChange={(e: any) => setF({ ...f, notes: e.target.value })} /></div>
              <div className="flex justify-end gap-2"><button type="button" className={FIN.btnText} onClick={() => setOpen(false)}>Cancel</button><button className={FIN.btnGold} disabled={busy || !f.campaign_id}>Save proof</button></div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

/* ---------------- field team ---------------- */

export const FieldTeamPanel: React.FC<{ onChanged: () => void }> = ({ onChanged }) => {
  const [t, setT] = useState<FieldTeam | null>(null);
  const [edit, setEdit] = useState<string | null>(null);
  const [cities, setCities] = useState<string[]>([]);
  const [screenIds, setScreenIds] = useState<string[]>([]);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => { try { setT(await opsApi.fieldTeam()); } catch (e) { setNote({ ok: false, text: errText(e) }); } }, []);
  useEffect(() => { load(); }, [load]);
  const toggle = (list: string[], v: string): string[] => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const run = async (fn: () => Promise<any>) => {
    setBusy(true); setNote(null);
    try { const r = await fn(); setNote({ ok: true, text: r?.message || "Saved." }); await load(); onChanged(); return true; }
    catch (e) { setNote({ ok: false, text: errText(e) }); return false; }
    finally { setBusy(false); }
  };
  if (!t) return <p className="text-[12px] text-zinc-500">Loading...</p>;
  const editing = t.operators.find((o) => o.account_id === edit) ?? null;
  return (
    <div className="space-y-5">
      <Note n={note} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <div className={`${FIN.panel} p-3`}><p className={FIN.label}>Covered today</p><p className="text-[20px] font-semibold text-zinc-50">{t.covered} / {t.total}</p><p className="text-[10px] text-zinc-500">Screen and campaign pairs with a proof today</p></div>
        <div className={`${FIN.panel} p-3`}><p className={FIN.label}>Still pending</p><p className="text-[20px] font-semibold text-zinc-50">{t.pending.length}</p><p className="text-[10px] text-zinc-500">No proof yet today</p></div>
        <div className={`${FIN.panel} col-span-2 p-3 lg:col-span-1`}>
          <p className={FIN.label}>Daily reminder</p>
          <div className="flex items-center gap-2">
            <select className={`${FIN.input} max-w-[150px]`} value={t.remind_hour === null ? "off" : String(t.remind_hour)} disabled={busy} onChange={(e: any) => run(() => opsApi.saveFieldSettings(e.target.value === "off" ? null : Number(e.target.value)))}>
              <option value="off">Off</option>
              {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{`${h % 12 === 0 ? 12 : h % 12}:00 ${h < 12 ? "AM" : "PM"}`}</option>)}
            </select>
          </div>
          <p className="mt-1 text-[10px] text-zinc-500">You get a notification if screens still have no proof after this time (Pakistan time). It appears when someone opens Live Operations or the Field page.</p>
        </div>
      </div>

      <section>
        <p className={FIN.label}>Field people</p>
        <div className="space-y-2">
          {t.operators.map((o) => (
            <div key={o.account_id} className={`${FIN.panel} p-3`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-zinc-100">{o.email}</p>
                  <p className="text-[11px] text-zinc-500">{o.proofs_today} proof{o.proofs_today === 1 ? "" : "s"} today{o.last_proof ? ` \u00b7 last ${ago(o.last_proof)}` : ""}</p>
                </div>
                <button className={FIN.btnGhost} onClick={() => { setEdit(o.account_id); setCities(o.cities); setScreenIds(o.screen_ids); }}>Assign screens</button>
              </div>
              <p className="mt-1 text-[11px] text-zinc-400">{o.cities.length + o.screen_ids.length === 0 ? "Sees all screens" : `${o.cities.length ? `Cities: ${o.cities.join(", ")}` : ""}${o.cities.length && o.screen_ids.length ? " \u00b7 " : ""}${o.screen_ids.length ? `${o.screen_ids.length} screen${o.screen_ids.length === 1 ? "" : "s"}` : ""}`}</p>
            </div>
          ))}
          {t.operators.length === 0 && <p className="py-4 text-center text-[12px] text-zinc-500">No field people yet. Invite someone with the Field Operator role in Admin & Roles.</p>}
        </div>
      </section>

      <section>
        <p className={FIN.label}>No proof yet today</p>
        <div className="space-y-2">
          {t.pending.map((p) => (
            <div key={p.campaign_id + p.screen_id} className={`${FIN.panel} flex flex-wrap items-center justify-between gap-2 p-3`}>
              <div><p className="text-[13px] font-semibold text-zinc-100">{p.screen_name}<span className="font-normal text-zinc-500">{p.city ? ` \u00b7 ${p.city}` : ""}</span></p><p className="text-[11px] text-zinc-500">{p.campaign_name}{p.client_name ? ` \u00b7 ${p.client_name}` : ""}</p></div>
              <p className={`text-[11px] ${p.assigned_to.length ? "text-zinc-300" : "text-amber-300"}`}>{p.assigned_to.length ? p.assigned_to.join(", ") : "No one is assigned"}</p>
            </div>
          ))}
          {t.pending.length === 0 && <p className="py-4 text-center text-[12px] text-emerald-300">All screens have proof today.</p>}
        </div>
      </section>

      {editing && (
        <div className={FIN.overlay} onClick={() => setEdit(null)}>
          <div className={`${FIN.modal} max-w-[520px]`} onClick={(e: any) => e.stopPropagation()}>
            <ModalTitle>{editing.email}</ModalTitle>
            <p className="mb-3 text-[11px] text-zinc-500">Choose cities and/or single screens. If nothing is chosen, this person sees all screens.</p>
            <p className={FIN.label}>Cities</p>
            <div className="mb-3 flex flex-wrap gap-2">
              {t.cities.map((c) => <button key={c} onClick={() => setCities(toggle(cities, c))} className={`rounded-full border px-3 py-1 text-[11px] ${cities.includes(c) ? "border-[#c99b3b] bg-[#c99b3b]/15 text-[#f1d68a]" : "border-[#2b3038] text-zinc-400"}`}>{c}</button>)}
              {t.cities.length === 0 && <span className="text-[11px] text-zinc-500">No cities set in Inventory.</span>}
            </div>
            <p className={FIN.label}>Single screens</p>
            <div className="mb-3 max-h-48 space-y-1 overflow-y-auto rounded-lg border border-[#2a2f37] p-2">
              {t.screens.map((x) => <label key={x.id} className="flex items-center gap-2 text-[12px] text-zinc-200"><input type="checkbox" checked={screenIds.includes(x.id)} onChange={() => setScreenIds(toggle(screenIds, x.id))} />{x.name}<span className="text-zinc-500">{x.city ?? ""}</span></label>)}
            </div>
            <div className="flex justify-end gap-2">
              <button className={FIN.btnText} onClick={() => setEdit(null)}>Cancel</button>
              <button className={FIN.btnGold} disabled={busy} onClick={async () => { if (await run(() => opsApi.saveAssignments(editing.account_id, { cities, screen_ids: screenIds }))) setEdit(null); }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
