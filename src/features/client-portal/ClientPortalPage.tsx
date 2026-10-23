import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@/lib/router";
import { useSession } from "@/hooks/useSession";
import { FIN, FDrawer, GOLD_CARD, SILVER_CARD, fit } from "../finance/financeUi";
import { CompanyMark } from "@/components/layout/CompanyMark";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { notificationsApi, severityTone, timeAgo, type AppNotification } from "@/lib/api/notifications";
import { requestPasswordReset } from "@/lib/api/auth";
import {
  portalApi, type PortalCampaign, type PortalCampaignDetail, type PortalInvoice, type PortalInvoiceDetail,
  type PortalOverview, type PortalPayment, type PortalProposal, type PortalProposalDetail, type PortalStatement,
} from "@/lib/api/portal";
import { buildProposalHtml } from "../proposals/proposalTools";
import { buildInvoiceHtml, buildStatementHtml, day, isImage, money, printHtml, statusText, statusTone } from "./portalTools";

type Tab = "overview" | "campaigns" | "proposals" | "invoices" | "payments" | "statement" | "messages";
const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" }, { id: "campaigns", label: "Campaigns" }, { id: "proposals", label: "Proposals" },
  { id: "invoices", label: "Invoices" }, { id: "payments", label: "Payments" }, { id: "statement", label: "Statement" }, { id: "messages", label: "Messages" },
];

const Pill: React.FC<{ s: string }> = ({ s }) => (
  <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${statusTone(s)}`}>{statusText(s)}</span>
);
const Note: React.FC<{ ok: boolean; text: string }> = ({ ok, text }) => (
  <div className={`mb-3 rounded-lg border px-3 py-2 text-[12px] ${ok ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300" : "border-rose-400/30 bg-rose-500/10 text-rose-300"}`}>{text}</div>
);
const H: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#d9b45a]">{children}</h4>
);
const Empty: React.FC<{ text: string }> = ({ text }) => <p className="p-8 text-center text-[12px] text-zinc-500">{text}</p>;
const errText = (e: any) => e?.message || "Something went wrong. Please try again.";

export const ClientPortalPage: React.FC = () => {
  const { user, signOut } = useSession();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("overview");
  const [ov, setOv] = useState<PortalOverview | null>(null);
  const [recent, setRecent] = useState<AppNotification[]>([]);
  const [campaigns, setCampaigns] = useState<PortalCampaign[] | null>(null);
  const [proposals, setProposals] = useState<PortalProposal[] | null>(null);
  const [invoices, setInvoices] = useState<PortalInvoice[] | null>(null);
  const [payments, setPayments] = useState<PortalPayment[] | null>(null);
  const [statement, setStatement] = useState<PortalStatement | null>(null);
  const [messages, setMessages] = useState<{ id: string; subject: string | null; body: string; created_at: string }[] | null>(null);
  const [error, setError] = useState("");
  const [campId, setCampId] = useState<string | null>(null);
  const [propId, setPropId] = useState<string | null>(null);
  const [invId, setInvId] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ ok: boolean; text: string } | null>(null);

  const cur = ov?.company.currency || "PKR";
  const loadOverview = async () => {
    try { setOv(await portalApi.overview()); setError(""); } catch (e: any) { setError(errText(e)); }
    try { setRecent((await notificationsApi.list()).items.slice(0, 6)); } catch { /* ignore */ }
  };
  const loadCampaigns = async () => { try { setCampaigns((await portalApi.campaigns()).data); } catch (e: any) { setError(errText(e)); } };
  const loadProposals = async () => { try { setProposals((await portalApi.proposals()).data); } catch (e: any) { setError(errText(e)); } };
  const loadInvoices = async () => { try { setInvoices((await portalApi.invoices()).data); } catch (e: any) { setError(errText(e)); } };

  useEffect(() => { loadOverview(); }, []);
  useEffect(() => {
    if (tab === "campaigns" && !campaigns) loadCampaigns();
    if (tab === "proposals" && !proposals) loadProposals();
    if (tab === "invoices" && !invoices) loadInvoices();
    if (tab === "payments" && !payments) portalApi.payments().then((r) => setPayments(r.data)).catch((e) => setError(errText(e)));
    if (tab === "statement" && !statement) portalApi.statement().then(setStatement).catch((e) => setError(errText(e)));
    if (tab === "messages" && !messages) portalApi.messages().then((r) => setMessages(r.data)).catch((e) => setError(errText(e)));
  }, [tab]);

  const refreshAll = () => { loadOverview(); setCampaigns(null); setProposals(null); setInvoices(null); setPayments(null); setStatement(null); };
  const goLink = (link?: string | null) => { if (link && TABS.some((t) => t.id === link)) setTab(link as Tab); else setTab("overview"); };
  const k = ov?.kpis;

  const kpis = k
    ? [
        { label: "Live campaigns", value: String(k.active_campaigns), note: k.pending_creatives ? `${k.pending_creatives} creative${k.pending_creatives === 1 ? "" : "s"} to review` : "Up to date", card: GOLD_CARD, dark: true },
        { label: "Outstanding", value: money(k.outstanding, cur), note: k.next_due ? `Next due ${k.next_due.due_date}` : "Nothing due", card: SILVER_CARD, dark: true },
        { label: "Overdue", value: money(k.overdue, cur), note: k.overdue > 0 ? "Please arrange payment" : "None", card: {}, dark: false },
        { label: "Total paid", value: money(k.total_paid, cur), note: "Thank you", card: {}, dark: false },
      ]
    : [];

  const attention: { text: string; go: Tab }[] = [];
  if (k?.pending_creatives) attention.push({ text: `${k.pending_creatives} creative${k.pending_creatives === 1 ? " is" : "s are"} waiting for your approval`, go: "campaigns" });
  if (k?.open_proposals) attention.push({ text: `${k.open_proposals} proposal${k.open_proposals === 1 ? " is" : "s are"} waiting for your decision`, go: "proposals" });
  if (k && k.overdue > 0) attention.push({ text: `${money(k.overdue, cur)} is overdue`, go: "invoices" });
  else if (k?.next_due) attention.push({ text: `${k.next_due.invoice_number} (${money(k.next_due.balance, cur)}) is due on ${k.next_due.due_date}`, go: "invoices" });

  return (
    <div className="min-h-screen bg-[#07080a] p-3 md:p-6">
      <div className={`${FIN.page} mx-auto max-w-[1280px]`}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#c99b3b]/30 pb-3">
          <div className="flex items-center gap-3">
            <CompanyMark name={ov?.company.name || "C"} box="h-10 w-10" text="text-sm font-black" />
            <div>
            <h1 className="text-[18px] font-semibold uppercase tracking-[0.24em] text-zinc-50">Client Portal</h1>
            <p className="mt-1 text-[11px] font-medium text-[#d9b45a]">{ov?.company.name || ""}{ov?.client ? ` \u00b7 ${ov.client.name}` : ""}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell onViewAll={() => setTab("overview")} onOpen={(n) => goLink(n.link_path)} />
            <button className={FIN.btnGhost} onClick={async () => { try { await requestPasswordReset(user?.email || ov?.client?.email || ""); setFlash({ ok: true, text: "We sent a password reset link to your email." }); } catch (e: any) { setFlash({ ok: false, text: errText(e) }); } }}>Reset password</button>
            <button className={FIN.btnGhost} onClick={async () => { await signOut(); navigate("/client-login"); }}>Sign out</button>
          </div>
        </div>

        {flash && <Note ok={flash.ok} text={flash.text} />}
        {error && <Note ok={false} text={error} />}

        <div className="mb-4 flex gap-1 overflow-x-auto border-b border-[#2a2f37]">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`whitespace-nowrap border-b-2 px-3.5 py-2.5 text-[11px] font-semibold tracking-wide transition-colors ${tab === t.id ? "border-[#c99b3b] text-[#f1d68a]" : "border-transparent text-zinc-400 hover:text-zinc-100"}`}>
              {t.label}{t.id === "campaigns" && k?.pending_creatives ? <span className="ml-1.5 rounded-full bg-[#c99b3b] px-1.5 text-[9px] text-[#1a1204]">{k.pending_creatives}</span> : null}
              {t.id === "proposals" && k?.open_proposals ? <span className="ml-1.5 rounded-full bg-[#c99b3b] px-1.5 text-[9px] text-[#1a1204]">{k.open_proposals}</span> : null}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {kpis.map((c) => (
                <div key={c.label} className={`${c.dark ? "" : FIN.panel} rounded-xl p-3`} style={c.card}>
                  <p className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${c.dark ? "text-[#2b2108]" : "text-zinc-400"}`}>{c.label}</p>
                  <p className={`mt-1 font-semibold ${c.dark ? "text-[#1a1204]" : "text-zinc-50"}`} style={{ fontSize: fit(c.value, 22, 150) }}>{c.value}</p>
                  <p className={`text-[10px] ${c.dark ? "text-[#4a3a12]" : "text-zinc-500"}`}>{c.note}</p>
                </div>
              ))}
              {!ov && !error && <p className="col-span-4 p-6 text-center text-[12px] text-zinc-500">Loading...</p>}
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className={`${FIN.panel} p-4`}>
                <H>Needs your attention</H>
                {attention.length === 0 && <p className="text-[12px] text-zinc-500">Nothing needs your attention right now.</p>}
                <ul className="space-y-2">{attention.map((a) => (
                  <li key={a.text}><button className="w-full rounded-lg border border-[#2b3038] bg-[#0f1216] px-3 py-2 text-left text-[12px] text-zinc-200 hover:border-[#c99b3b]/50" onClick={() => setTab(a.go)}>{a.text}</button></li>
                ))}</ul>
              </div>
              <div className={`${FIN.panel} p-4`}>
                <H>Recent updates</H>
                {recent.length === 0 && <p className="text-[12px] text-zinc-500">No updates yet.</p>}
                <ul className="space-y-2">{recent.map((n) => (
                  <li key={n.id} className="flex items-start gap-2 text-[12px]"><span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${severityTone(n.severity).dot}`} /><span className="grow"><span className={n.read ? "text-zinc-400" : "font-semibold text-zinc-50"}>{n.title}</span><span className="block text-[11px] text-zinc-500">{n.detail}</span></span><span className="shrink-0 text-[10px] text-zinc-600">{timeAgo(n.created_at)}</span></li>
                ))}</ul>
              </div>
            </div>
          </div>
        )}

        {tab === "campaigns" && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {!campaigns && <p className="col-span-3 p-6 text-center text-[12px] text-zinc-500">Loading...</p>}
            {campaigns?.length === 0 && <div className={`${FIN.panel} col-span-3`}><Empty text="No campaigns yet." /></div>}
            {campaigns?.map((c) => (
              <button key={c.id} onClick={() => setCampId(c.id)} className={`${FIN.panel} p-4 text-left transition hover:border-[#c99b3b]/50`}>
                <div className="flex items-start justify-between gap-2"><h3 className="truncate text-[13px] font-semibold text-zinc-50">{c.name}</h3><Pill s={c.status} /></div>
                <p className="mt-2 text-[11px] text-zinc-400">{day(c.start_date)} to {day(c.end_date)}</p>
                <p className="mt-0.5 text-[11px] text-zinc-400">{c.screens} screen{c.screens === 1 ? "" : "s"} {"\u00b7"} Budget {money(c.total_budget, c.currency || cur)}</p>
                {c.pending_creatives > 0 && <p className="mt-2 text-[11px] font-semibold text-amber-300">{c.pending_creatives} creative{c.pending_creatives === 1 ? "" : "s"} waiting for your review</p>}
              </button>
            ))}
          </div>
        )}

        {tab === "proposals" && (
          <div className={`${FIN.panel} overflow-x-auto`}>
            <table className="w-full text-[12px]"><thead><tr className="border-b border-[#2a2f37] text-left text-[10px] uppercase tracking-wider text-zinc-500"><th className="p-3">Code</th><th className="p-3">Campaign</th><th className="p-3">Dates</th><th className="p-3 text-right">Total</th><th className="p-3">Valid until</th><th className="p-3">Status</th></tr></thead>
              <tbody>
                {!proposals && <tr><td colSpan={6}><Empty text="Loading..." /></td></tr>}
                {proposals?.length === 0 && <tr><td colSpan={6}><Empty text="No proposals yet." /></td></tr>}
                {proposals?.map((p) => (
                  <tr key={p.id} onClick={() => setPropId(p.id)} className="cursor-pointer border-b border-[#1d2128] hover:bg-white/5">
                    <td className="p-3 font-mono text-[#d9b45a]">{p.code}</td><td className="p-3 text-zinc-100">{p.campaign_name}</td>
                    <td className="p-3 text-zinc-400">{day(p.start_date)} to {day(p.end_date)}</td><td className="p-3 text-right font-semibold text-zinc-50">{money(p.total, p.currency)}</td>
                    <td className="p-3 text-zinc-400">{day(p.valid_until)}</td><td className="p-3"><Pill s={p.status} /></td>
                  </tr>))}
              </tbody></table>
          </div>
        )}

        {tab === "invoices" && (
          <div className={`${FIN.panel} overflow-x-auto`}>
            <table className="w-full text-[12px]"><thead><tr className="border-b border-[#2a2f37] text-left text-[10px] uppercase tracking-wider text-zinc-500"><th className="p-3">Invoice</th><th className="p-3">Issued</th><th className="p-3">Due</th><th className="p-3 text-right">Total</th><th className="p-3 text-right">Balance</th><th className="p-3">Status</th></tr></thead>
              <tbody>
                {!invoices && <tr><td colSpan={6}><Empty text="Loading..." /></td></tr>}
                {invoices?.length === 0 && <tr><td colSpan={6}><Empty text="No invoices yet." /></td></tr>}
                {invoices?.map((i) => (
                  <tr key={i.id} onClick={() => setInvId(i.id)} className="cursor-pointer border-b border-[#1d2128] hover:bg-white/5">
                    <td className="p-3 font-mono text-[#d9b45a]">{i.invoice_number}</td><td className="p-3 text-zinc-400">{day(i.issue_date)}</td><td className="p-3 text-zinc-400">{day(i.due_date)}</td>
                    <td className="p-3 text-right text-zinc-100">{money(i.total_amount, i.currency || cur)}</td><td className={`p-3 text-right font-semibold ${i.balance > 0 ? "text-zinc-50" : "text-zinc-500"}`}>{money(i.balance, i.currency || cur)}</td><td className="p-3"><Pill s={i.status} /></td>
                  </tr>))}
              </tbody></table>
          </div>
        )}

        {tab === "payments" && (
          <div className={`${FIN.panel} overflow-x-auto`}>
            <table className="w-full text-[12px]"><thead><tr className="border-b border-[#2a2f37] text-left text-[10px] uppercase tracking-wider text-zinc-500"><th className="p-3">Date</th><th className="p-3">Invoice</th><th className="p-3">Method</th><th className="p-3">Reference</th><th className="p-3 text-right">Amount</th></tr></thead>
              <tbody>
                {!payments && <tr><td colSpan={5}><Empty text="Loading..." /></td></tr>}
                {payments?.length === 0 && <tr><td colSpan={5}><Empty text="No payments yet." /></td></tr>}
                {payments?.map((p) => (
                  <tr key={p.id} className="border-b border-[#1d2128]"><td className="p-3 text-zinc-300">{day(p.payment_date)}</td><td className="p-3 font-mono text-zinc-400">{p.invoice_number}</td><td className="p-3 text-zinc-300">{p.payment_method || "-"}</td><td className="p-3 text-zinc-400">{p.reference_no || "-"}</td><td className="p-3 text-right font-semibold text-emerald-300">{money(p.amount, p.currency || cur)}</td></tr>))}
              </tbody></table>
          </div>
        )}

        {tab === "statement" && (
          <div className="space-y-3">
            {!statement && <p className="p-6 text-center text-[12px] text-zinc-500">Loading...</p>}
            {statement && (
              <>
                <div className="flex justify-end"><button className={FIN.btnGold} onClick={() => { if (!printHtml(buildStatementHtml(statement))) setFlash({ ok: false, text: "Please allow pop-ups to print." }); }}>Print / PDF</button></div>
                <iframe title="Statement" srcDoc={buildStatementHtml(statement)} className="h-[640px] w-full rounded-lg border border-[#c99b3b]/30 bg-[#fbf9f4]" />
              </>
            )}
          </div>
        )}

        {tab === "messages" && <Messages data={messages} onSent={() => portalApi.messages().then((r) => setMessages(r.data)).catch(() => {})} />}
      </div>

      <CampaignDrawer id={campId} onClose={() => setCampId(null)} onChanged={() => { loadCampaigns(); loadOverview(); }} />
      <ProposalDrawer id={propId} onClose={() => setPropId(null)} onChanged={() => { refreshAll(); }} />
      <InvoiceDrawer id={invId} onClose={() => setInvId(null)} onChanged={() => { loadInvoices(); }} />
    </div>
  );
};

const Messages: React.FC<{ data: { id: string; subject: string | null; body: string; created_at: string }[] | null; onSent: () => void }> = ({ data, onSent }) => {
  const [subject, setSubject] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const send = async (e: any) => {
    e.preventDefault(); setBusy(true); setMsg(null);
    try { const r = await portalApi.sendMessage(subject, text); setMsg({ ok: true, text: r.message }); setSubject(""); setText(""); onSent(); }
    catch (err: any) { setMsg({ ok: false, text: errText(err) }); } finally { setBusy(false); }
  };
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <form onSubmit={send} className={`${FIN.panel} space-y-3 p-4`}>
        <H>Contact your account manager</H>
        {msg && <Note ok={msg.ok} text={msg.text} />}
        <div><label className={FIN.label}>Subject (optional)</label><input className={FIN.input} maxLength={100} value={subject} onChange={(e: any) => setSubject(e.target.value)} /></div>
        <div><label className={FIN.label}>Message</label><textarea rows={5} required className={FIN.input} maxLength={1000} value={text} onChange={(e: any) => setText(e.target.value)} /></div>
        <button disabled={busy} className={FIN.btnGold}>{busy ? "Sending..." : "Send message"}</button>
      </form>
      <div className={`${FIN.panel} p-4`}>
        <H>Your messages</H>
        {!data && <p className="text-[12px] text-zinc-500">Loading...</p>}
        {data?.length === 0 && <p className="text-[12px] text-zinc-500">You have not sent any messages yet.</p>}
        <ul className="space-y-3">{data?.map((m) => (<li key={m.id} className="rounded-lg border border-[#2b3038] bg-[#0f1216] p-3"><p className="text-[12px] font-semibold text-zinc-100">{m.subject || "Message"}</p><p className="mt-1 whitespace-pre-wrap text-[12px] text-zinc-400">{m.body}</p><p className="mt-1 text-[10px] text-zinc-600">{timeAgo(m.created_at)}</p></li>))}</ul>
      </div>
    </div>
  );
};

const CampaignDrawer: React.FC<{ id: string | null; onClose: () => void; onChanged: () => void }> = ({ id, onClose, onChanged }) => {
  const [d, setD] = useState<PortalCampaignDetail | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const load = async (cid: string) => { try { setD(await portalApi.campaign(cid)); } catch (e: any) { setMsg({ ok: false, text: errText(e) }); } };
  useEffect(() => { setD(null); setMsg(null); setRejecting(null); setComment(""); if (id) load(id); }, [id]);
  const decide = async (creativeId: string, decision: "approved" | "rejected") => {
    if (!id) return; setBusy(true); setMsg(null);
    try { await portalApi.decideCreative(id, creativeId, decision, comment); setMsg({ ok: true, text: decision === "approved" ? "Thank you. The creative is approved." : "Thank you. We will update the creative." }); setRejecting(null); setComment(""); onChanged(); await load(id); }
    catch (e: any) { setMsg({ ok: false, text: errText(e) }); } finally { setBusy(false); }
  };
  const c = d?.campaign;
  return (
    <FDrawer open={!!id} onClose={onClose} title={c?.name ?? "Campaign"} subtitle={c ? `${day(c.start_date)} to ${day(c.end_date)}` : undefined} width="max-w-[680px]">
      {!d && !msg && <p className="text-[12px] text-zinc-500">Loading...</p>}
      {msg && <Note ok={msg.ok} text={msg.text} />}
      {d && c && (
        <div className="space-y-5">
          <div className="flex items-center gap-3"><Pill s={c.status} /><span className="text-[12px] text-zinc-400">Budget {money(c.total_budget, c.currency)}</span></div>
          <div><H>Screens</H>
            {d.screens.length === 0 && <p className="text-[12px] text-zinc-500">No screens listed.</p>}
            <ul className="space-y-1">{d.screens.map((s, i) => (<li key={i} className="flex justify-between text-[12px] text-zinc-300"><span>{s.name ?? "Screen"} <span className="text-zinc-500">{s.city}</span></span><span className="text-zinc-400">{s.slots} slot{s.slots === 1 ? "" : "s"}</span></li>))}</ul>
          </div>
          <div><H>Creatives</H>
            {d.creatives.length === 0 && <p className="text-[12px] text-zinc-500">No creatives yet.</p>}
            <div className="space-y-3">{d.creatives.map((cr) => (
              <div key={cr.id} className="rounded-lg border border-[#2b3038] bg-[#0f1216] p-3">
                <div className="flex items-center justify-between gap-2"><span className="text-[12px] font-semibold text-zinc-100">{cr.name} <span className="font-normal text-zinc-500">v{cr.version}</span></span><Pill s={cr.status} /></div>
                {cr.url && (isImage(cr.url) ? <a href={cr.url} target="_blank" rel="noreferrer"><img src={cr.url} alt={cr.name} className="mt-2 max-h-48 rounded-md border border-[#2b3038]" /></a> : <a className="mt-2 inline-block text-[12px] text-[#d9b45a] underline" href={cr.url} target="_blank" rel="noreferrer">Open creative</a>)}
                {cr.status === "client_review" && (rejecting === cr.id ? (
                  <div className="mt-3 space-y-2"><label className={FIN.label}>What should we change?</label><textarea rows={3} className={FIN.input} maxLength={300} value={comment} onChange={(e: any) => setComment(e.target.value)} />
                    <div className="flex gap-2"><button disabled={busy || !comment.trim()} className={FIN.btnRose} onClick={() => decide(cr.id, "rejected")}>Send feedback</button><button className={FIN.btnText} onClick={() => setRejecting(null)}>Cancel</button></div></div>
                ) : (
                  <div className="mt-3 flex gap-2"><button disabled={busy} className={FIN.btnGold} onClick={() => decide(cr.id, "approved")}>Approve</button><button disabled={busy} className={FIN.btnGhost} onClick={() => { setRejecting(cr.id); setComment(""); }}>Request changes</button></div>
                ))}
              </div>))}</div>
          </div>
          <div><H>Proof of play</H>
            {d.proofs.length === 0 && <p className="text-[12px] text-zinc-500">Proof photos will appear here once your campaign is running.</p>}
            <div className="grid grid-cols-2 gap-3">{d.proofs.map((p) => (
              <div key={p.id} className="overflow-hidden rounded-lg border border-[#2b3038] bg-[#0f1216]">
                {p.photo_url && (isImage(p.photo_url) ? <a href={p.photo_url} target="_blank" rel="noreferrer"><img src={p.photo_url} alt="Proof" className="h-32 w-full object-cover" /></a> : <a href={p.photo_url} target="_blank" rel="noreferrer" className="block p-3 text-[12px] text-[#d9b45a] underline">Open photo</a>)}
                <div className="p-2"><p className="text-[11px] font-medium text-zinc-200">{p.screen_name ?? "Screen"}{p.city ? `, ${p.city}` : ""}</p><p className="text-[10px] text-zinc-500">{day(p.proof_date)}</p>{p.notes && <p className="mt-0.5 text-[10px] text-zinc-500">{p.notes}</p>}</div>
              </div>))}</div>
          </div>
        </div>
      )}
    </FDrawer>
  );
};

const ProposalDrawer: React.FC<{ id: string | null; onClose: () => void; onChanged: () => void }> = ({ id, onClose, onChanged }) => {
  const [d, setD] = useState<PortalProposalDetail | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [mode, setMode] = useState<"" | "accept" | "decline">("");
  const [name, setName] = useState("");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const load = async (pid: string) => { try { setD(await portalApi.proposal(pid)); } catch (e: any) { setMsg({ ok: false, text: errText(e) }); } };
  useEffect(() => { setD(null); setMsg(null); setMode(""); setName(""); setComment(""); if (id) load(id); }, [id]);
  const html = useMemo(() => (d ? buildProposalHtml(d, d.company) : ""), [d]);
  const decide = async (decision: "accepted" | "rejected") => {
    if (!id) return; setBusy(true); setMsg(null);
    try { await portalApi.decideProposal(id, decision, name, comment); setMsg({ ok: true, text: decision === "accepted" ? "Thank you. Your acceptance has been recorded and we will be in touch to confirm your booking." : "Your response has been sent." }); setMode(""); onChanged(); await load(id); }
    catch (e: any) { setMsg({ ok: false, text: errText(e) }); } finally { setBusy(false); }
  };
  const p = d?.proposal;
  const expired = !!p?.valid_until && String(p.valid_until).slice(0, 10) < new Date().toISOString().slice(0, 10);
  return (
    <FDrawer open={!!id} onClose={onClose} title={p ? `${p.code} \u00b7 ${p.campaign_name}` : "Proposal"} width="max-w-[760px]">
      {!d && !msg && <p className="text-[12px] text-zinc-500">Loading...</p>}
      {msg && <Note ok={msg.ok} text={msg.text} />}
      {d && p && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2"><Pill s={p.status} />{p.status === "sent" && p.valid_until && <span className="text-[11px] text-zinc-400">Valid until {day(p.valid_until)}</span>}
            <button className={`${FIN.btnGhost} ml-auto`} onClick={() => printHtml(html)}>Print / PDF</button></div>
          {p.status === "sent" && !expired && mode === "" && (
            <div className="flex gap-2"><button className={FIN.btnGold} onClick={() => setMode("accept")}>Accept proposal</button><button className={FIN.btnGhost} onClick={() => setMode("decline")}>Decline</button></div>
          )}
          {p.status === "sent" && expired && <Note ok={false} text="This proposal has expired. Please contact us for a new one." />}
          {mode === "accept" && (
            <div className="space-y-2 rounded-lg border border-[#c99b3b]/30 bg-[#c99b3b]/5 p-3">
              <p className="text-[12px] text-zinc-200">Type your full name to accept this proposal. This is recorded as your electronic acceptance.</p>
              <input className={FIN.input} placeholder="Your full name" maxLength={80} value={name} onChange={(e: any) => setName(e.target.value)} />
              <div className="flex gap-2"><button disabled={busy || name.trim().length < 2} className={FIN.btnGold} onClick={() => decide("accepted")}>Confirm acceptance</button><button className={FIN.btnText} onClick={() => setMode("")}>Cancel</button></div>
            </div>)}
          {mode === "decline" && (
            <div className="space-y-2 rounded-lg border border-[#2b3038] p-3">
              <label className={FIN.label}>Reason (optional)</label><textarea rows={3} className={FIN.input} maxLength={300} value={comment} onChange={(e: any) => setComment(e.target.value)} />
              <div className="flex gap-2"><button disabled={busy} className={FIN.btnRose} onClick={() => decide("rejected")}>Decline proposal</button><button className={FIN.btnText} onClick={() => setMode("")}>Cancel</button></div>
            </div>)}
          <iframe title="Proposal" srcDoc={html} className="h-[560px] w-full rounded-lg border border-[#c99b3b]/30 bg-[#fbf9f4]" />
        </div>
      )}
    </FDrawer>
  );
};

const InvoiceDrawer: React.FC<{ id: string | null; onClose: () => void; onChanged: () => void }> = ({ id, onClose, onChanged }) => {
  const [d, setD] = useState<PortalInvoiceDetail | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [form, setForm] = useState({ reference: "", amount: "", method: "", note: "" });
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const load = async (iid: string) => { try { setD(await portalApi.invoice(iid)); } catch (e: any) { setMsg({ ok: false, text: errText(e) }); } };
  useEffect(() => { setD(null); setMsg(null); setShowForm(false); setForm({ reference: "", amount: "", method: "", note: "" }); if (id) load(id); }, [id]);
  const html = useMemo(() => (d ? buildInvoiceHtml(d) : ""), [d]);
  const submit = async (e: any) => {
    e.preventDefault(); if (!id) return; setBusy(true); setMsg(null);
    try { const r = await portalApi.paidNotice(id, { reference: form.reference, amount: Number(form.amount) || 0, method: form.method, note: form.note }); setMsg({ ok: true, text: r.message }); setShowForm(false); onChanged(); await load(id); }
    catch (err: any) { setMsg({ ok: false, text: errText(err) }); } finally { setBusy(false); }
  };
  const i = d?.invoice;
  const cur = i?.currency || d?.company.currency || "PKR";
  return (
    <FDrawer open={!!id} onClose={onClose} title={i ? i.invoice_number : "Invoice"} subtitle={i ? `Due ${day(i.due_date)}` : undefined} width="max-w-[760px]">
      {!d && !msg && <p className="text-[12px] text-zinc-500">Loading...</p>}
      {msg && <Note ok={msg.ok} text={msg.text} />}
      {d && i && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2"><Pill s={i.status} /><span className="text-[12px] text-zinc-400">Balance {money(i.balance, cur)}</span>
            <button className={`${FIN.btnGhost} ml-auto`} onClick={() => printHtml(html)}>Print / PDF</button>
            {i.balance > 0 && !showForm && <button className={FIN.btnGold} onClick={() => setShowForm(true)}>I have paid</button>}</div>
          {showForm && (
            <form onSubmit={submit} className="space-y-2 rounded-lg border border-[#c99b3b]/30 bg-[#c99b3b]/5 p-3">
              <p className="text-[12px] text-zinc-200">Tell us about your payment. Our team will check it and update your account.</p>
              <div className="grid gap-2 md:grid-cols-2">
                <div><label className={FIN.label}>Reference / transaction ID *</label><input required className={FIN.input} maxLength={80} value={form.reference} onChange={(e: any) => setForm({ ...form, reference: e.target.value })} /></div>
                <div><label className={FIN.label}>Amount paid ({cur})</label><input type="number" min={0} className={FIN.input} value={form.amount} onChange={(e: any) => setForm({ ...form, amount: e.target.value })} /></div>
                <div><label className={FIN.label}>Method</label><input className={FIN.input} maxLength={40} placeholder="Bank transfer, cheque, cash" value={form.method} onChange={(e: any) => setForm({ ...form, method: e.target.value })} /></div>
                <div><label className={FIN.label}>Note</label><input className={FIN.input} maxLength={200} value={form.note} onChange={(e: any) => setForm({ ...form, note: e.target.value })} /></div>
              </div>
              <div className="flex gap-2"><button disabled={busy} className={FIN.btnGold}>{busy ? "Sending..." : "Send payment note"}</button><button type="button" className={FIN.btnText} onClick={() => setShowForm(false)}>Cancel</button></div>
            </form>)}
          <iframe title="Invoice" srcDoc={html} className="h-[560px] w-full rounded-lg border border-[#c99b3b]/30 bg-[#fbf9f4]" />
          {d.notices.length > 0 && (<div><H>Your payment notes</H><ul className="space-y-1">{d.notices.map((n) => (<li key={n.id} className="flex justify-between text-[12px] text-zinc-300"><span>{n.reference}{n.amount ? ` \u00b7 ${money(n.amount, cur)}` : ""} <span className="text-zinc-500">{timeAgo(n.created_at)}</span></span><Pill s={n.status === "pending" ? "sent" : n.status} /></li>))}</ul></div>)}
          {d.payments.length > 0 && (<div><H>Payments received</H><ul className="space-y-1">{d.payments.map((p) => (<li key={p.id} className="flex justify-between text-[12px] text-zinc-300"><span>{day(p.payment_date)} <span className="text-zinc-500">{p.payment_method}</span></span><span className="text-emerald-300">{money(p.amount, cur)}</span></li>))}</ul></div>)}
        </div>
      )}
    </FDrawer>
  );
};

export default ClientPortalPage;
