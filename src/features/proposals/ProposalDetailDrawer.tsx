import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@/lib/router";
import { FDrawer, FIN } from "../finance/financeUi";
import { proposalsApi, type ProposalDetail } from "@/lib/api/proposals";
import { useCompanyProfile } from "@/hooks/useCompanyProfile";
import { buildProposalHtml, flagsFor, phoneDigits, printProposal, shareText, STATUS_ACTION, statusLabel, statusTone, type Letterhead } from "./proposalTools";

export const ProposalDetailDrawer: React.FC<{
  id: string | null;
  onClose: () => void;
  onChanged: () => void;
  onEdit: (id: string) => void;
}> = ({ id, onClose, onChanged, onEdit }) => {
  const navigate = useNavigate();
  const { profile } = useCompanyProfile();
  const [d, setD] = useState<ProposalDetail | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [conflict, setConflict] = useState("");

  const load = async (pid: string) => {
    try { setD(await proposalsApi.get(pid)); } catch (e: any) { setMsg({ ok: false, text: e?.message || "Could not load the proposal." }); }
  };
  useEffect(() => {
    setD(null); setMsg(null); setConflict("");
    if (id) load(id);
  }, [id]);

  const lh: Letterhead = useMemo(() => ({
    name: profile?.legalName || "Your Company",
    address: [profile?.address, profile?.city, profile?.country].filter(Boolean).join(", "),
    phone: profile?.phone, email: profile?.email, ntn: profile?.ntn,
    bankName: profile?.bankName, bankTitle: profile?.bankAccountTitle, bankIban: profile?.bankIban,
  }), [profile]);

  const run = async (fn: () => Promise<any>, ok: string) => {
    setBusy(true); setMsg(null);
    try { await fn(); setMsg({ ok: true, text: ok }); onChanged(); if (id) await load(id); }
    catch (e: any) { setMsg({ ok: false, text: e?.message || "Something went wrong." }); }
    finally { setBusy(false); }
  };

  const convert = async (force: boolean) => {
    if (!d) return;
    setBusy(true); setMsg(null);
    try {
      const r = await proposalsApi.convert(d.proposal.id, force);
      onChanged();
      navigate(`/campaigns/${r.campaign_id}`);
    } catch (e: any) {
      if (e?.code === "CONFLICT") setConflict(e.message || "Some screens do not have enough free slots.");
      else setMsg({ ok: false, text: e?.message || "Could not create the campaign." });
    } finally { setBusy(false); }
  };

  const p = d?.proposal;
  const html = useMemo(() => (d ? buildProposalHtml(d, lh) : ""), [d, lh]);
  const flags = p ? flagsFor({ ...p } as any) : [];
  const tone = p ? statusTone(p.status) : null;
  const waLink = d ? `https://wa.me/${phoneDigits(p?.client_phone)}?text=${encodeURIComponent(shareText(d, lh.name))}` : "#";
  const mailLink = d ? `mailto:${p?.client_email || ""}?subject=${encodeURIComponent(`Proposal ${p?.code} - ${p?.campaign_name}`)}&body=${encodeURIComponent(shareText(d, lh.name).replace(/\*/g, ""))}` : "#";

  return (
    <FDrawer open={!!id} onClose={onClose} title={p ? `${p.code} \u00b7 ${p.campaign_name}` : "Proposal"} subtitle={p?.client_name || undefined} width="max-w-[760px]">
      {!d && !msg && <p className="text-[12px] text-zinc-500">Loading...</p>}
      {msg && <div className={`mb-3 rounded-lg border px-3 py-2 text-[12px] ${msg.ok ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300" : "border-rose-400/30 bg-rose-500/10 text-rose-300"}`}>{msg.text}</div>}
      {d && p && tone && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${tone.cls}`}><span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />{statusLabel(p.status)}</span>
            {flags.map((f) => <span key={f.text} className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] text-amber-300">{f.text}</span>)}
            {d.campaign && <Link to={`/campaigns/${d.campaign.id}`} className="text-[11px] text-[#d9b45a] underline">Campaign: {d.campaign.name}</Link>}
          </div>

          <div className="flex flex-wrap gap-2">
            {d.nextStatuses.map((s) => (
              <button key={s} disabled={busy} className={s === "rejected" ? FIN.btnGhost : FIN.btnGold} onClick={() => run(() => proposalsApi.setStatus(p.id, s), `Status updated to ${statusLabel(s)}.`)}>{STATUS_ACTION[s] ?? statusLabel(s)}</button>
            ))}
            {p.status === "accepted" && !p.campaign_id && <button disabled={busy} className={FIN.btnGold} onClick={() => convert(false)}>Convert to Campaign</button>}
            {p.status === "draft" && <button className={FIN.btnGhost} onClick={() => onEdit(p.id)}>Edit</button>}
            <button disabled={busy} className={FIN.btnGhost} onClick={() => run(async () => { const r = await proposalsApi.revise(p.id); onChanged(); if (r.id) await load(r.id); }, "A revised copy was created as a new draft.")}>Revise</button>
            {p.status === "draft" && <button disabled={busy} className={FIN.btnGhost} onClick={() => { if (window.confirm("Delete this draft proposal?")) { setBusy(true); proposalsApi.remove(p.id).then(() => { onChanged(); onClose(); }).catch((e: any) => setMsg({ ok: false, text: e?.message || "Could not delete." })).finally(() => setBusy(false)); } }}>Delete</button>}
          </div>

          {conflict && (
            <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-[12px] text-amber-200">
              {conflict}
              <div className="mt-2 flex gap-2">
                <button className={FIN.btnGold} disabled={busy} onClick={() => convert(true)}>Convert anyway</button>
                <button className={FIN.btnText} onClick={() => setConflict("")}>Cancel</button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 border-y border-[#2a2f37] py-3">
            <button className={FIN.btnGhost} onClick={() => { if (!printProposal(d, lh)) setMsg({ ok: false, text: "Please allow pop-ups to print." }); }}>Print / PDF</button>
            <a className={FIN.btnGhost} href={waLink} target="_blank" rel="noreferrer">Share on WhatsApp</a>
            <a className={FIN.btnGhost} href={mailLink}>Share by email</a>
          </div>

          <iframe title="Proposal preview" srcDoc={html} className="h-[560px] w-full rounded-lg border border-[#c99b3b]/30 bg-[#fbf9f4]" />

          <div>
            <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#d9b45a]">Activity</h4>
            {d.activity.length === 0 && <p className="text-[12px] text-zinc-500">No activity yet.</p>}
            <ul className="space-y-1.5">
              {d.activity.map((a) => (
                <li key={a.id} className="text-[12px] text-zinc-300"><span className="text-zinc-100">{a.action}</span>{a.detail ? ` \u00b7 ${a.detail}` : ""}<span className="ml-2 text-[10px] text-zinc-500">{(a.actor_email || "")} {String(a.created_at).slice(0, 16).replace("T", " ")}</span></li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </FDrawer>
  );
};
