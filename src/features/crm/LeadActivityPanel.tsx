import React, { useState } from "react";
import { FDrawer, FIN } from "../finance/financeUi";
import { mailtoUrl, normalizePhone, smsUrl, whatsappUrl } from "../finance/financeTools";
import { getDefaultDialCode } from "@/lib/companyDefaults";  
import {
  TEMPLATE_LABELS,
  buildTemplate,
  followUpState,
  leadContact,
  leadName,
  leadValue,
  money,
  scoreLead,
  nextFollowUps,
  type CrmActivity,
  type LeadScore,
  type TemplateKey,
  type TemplateVars,
} from "./crmTools";

/* ------------------------------------------------------------------ */
/* small shared pieces (also used by ClientDetailDrawer)               */
/* ------------------------------------------------------------------ */

export const KIND_ICON: Record<string, string> = {
  note: "ðŸ“",
  call: "ðŸ“ž",
  meeting: "ðŸ¤",
  whatsapp: "ðŸ’¬",
  email: "âœ‰ï¸",
};

export const TIER_STYLE: Record<string, { label: string; cls: string }> = {
  hot: { label: "ðŸ”¥ Hot", cls: "border-rose-400/40 bg-rose-500/10 text-rose-300" },
  warm: { label: "Warm", cls: "border-amber-400/40 bg-amber-500/10 text-amber-300" },
  cold: { label: "Cold", cls: "border-sky-400/30 bg-sky-500/10 text-sky-300" },
  closed: { label: "Closed", cls: "border-zinc-500/30 bg-zinc-500/10 text-zinc-400" },
};

export const TierBadge: React.FC<{ score: LeadScore }> = ({ score }) => {
  const s = TIER_STYLE[score.tier];
  return (
    <span
      title={score.reasons.join(" Â· ") || undefined}
      className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${s.cls}`}
    >
      {s.label}
      {score.tier !== "closed" && <span className="ml-1 opacity-70">{score.score}</span>}
    </span>
  );
};

export const followChip = (state: string): string =>
  state === "overdue"
    ? "border-rose-400/40 bg-rose-500/10 text-rose-300"
    : state === "today"
      ? "border-amber-400/40 bg-amber-500/10 text-amber-300"
      : "border-emerald-400/30 bg-emerald-500/10 text-emerald-300";

/* ------------------------------------------------------------------ */
/* WhatsApp template sender                                            */
/* ------------------------------------------------------------------ */

export const TemplateSender: React.FC<{
  phone?: string | null;
  email?: string | null;
  vars: TemplateVars;
  defaultKey?: TemplateKey;
  subject?: string;
}> = ({ phone, email, vars, defaultKey = "followUp", subject = "Nexora AdPilot" }) => {
  const [key, setKey] = useState<TemplateKey>(defaultKey);
  const [text, setText] = useState<string>(() => buildTemplate(defaultKey, vars));
  const [copied, setCopied] = useState(false);

  const pick = (k: TemplateKey) => {
    setKey(k);
    setText(buildTemplate(k, vars));
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };

  const wa = normalizePhone(phone);

  return (
    <div className="rounded-lg border border-[#2a2f37] bg-[#0f1216] p-3">
      <div className="mb-2 flex flex-wrap gap-1.5">
        {(Object.keys(TEMPLATE_LABELS) as TemplateKey[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => pick(k)}
            className={`rounded-full border px-2.5 py-1 text-[10px] font-medium transition ${
              key === k
                ? "border-[#c99b3b]/60 bg-[#c99b3b]/15 text-[#f1d68a]"
                : "border-[#2b3038] text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {TEMPLATE_LABELS[k]}
          </button>
        ))}
      </div>
      <textarea
        value={text}
        rows={5}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setText(e.target.value)}
        className={`${FIN.input} resize-none leading-relaxed`}
      />
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => window.open(whatsappUrl(wa, text), "_blank", "noopener")}
          className={FIN.btnGold}
        >
          ðŸ’¬ Send on WhatsApp
        </button>
        {wa && getDefaultDialCode() === "1" && (
          <button
            type="button"
            onClick={() => {
              window.location.href = smsUrl(wa, text);
            }}
            className={FIN.btnGhost}
          >
            ðŸ“± SMS
          </button>
        )}
        {email && (
          <button
            type="button"
            onClick={() => {
              window.location.href = mailtoUrl(email, subject, text);
            }}
            className={FIN.btnGhost}
          >
            âœ‰ï¸ Email
          </button>
        )}
        <button type="button" onClick={copy} className={FIN.btnGhost}>
          {copied ? "âœ“ Copied" : "Copy"}
        </button>
      </div>
      {!wa && <p className="mt-1.5 text-[10px] text-zinc-500">No phone saved - WhatsApp will let you pick a contact.</p>}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* composer + timeline                                                 */
/* ------------------------------------------------------------------ */

export const ActivityComposer: React.FC<{
  entityType: "lead" | "client";
  entityId: string;
  onSaved: () => void;
}> = ({ entityType, entityId, onSaved }) => {
  const [kind, setKind] = useState("note");
  const [note, setNote] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    if (saving) return;
    if (!note.trim() && !followUp) {
      setError("Write a note or pick a follow-up date.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/crm-activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity_type: entityType, entity_id: entityId, kind, note, follow_up_date: followUp || null }),
      });
      const data = await res.json();
      if (data.ok) {
        setNote("");
        setFollowUp("");
        setKind("note");
        onSaved();
      } else {
        setError("Could not save. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-[#2a2f37] bg-[#0f1216] p-3">
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className={FIN.label}>Type</label>
          <select
            value={kind}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setKind(e.target.value)}
            className={FIN.input}
          >
            <option value="note">Note</option>
            <option value="call">Call</option>
            <option value="meeting">Meeting</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="email">Email</option>
          </select>
        </div>
        <div className="col-span-2">
          <label className={FIN.label}>Next follow-up (optional)</label>
          <input
            type="date"
            value={followUp}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFollowUp(e.target.value)}
            className={FIN.input}
          />
        </div>
      </div>
      <label className={`${FIN.label} mt-2`}>What happened / what is next</label>
      <textarea
        value={note}
        rows={2}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNote(e.target.value)}
        placeholder="e.g. Asked for 3 billboards in Lahore, send rates by Friday"
        className={`${FIN.input} resize-none`}
      />
      {error && <p className="mt-1 text-[11px] text-rose-400">{error}</p>}
      <div className="mt-2 flex justify-end">
        <button type="button" onClick={save} disabled={saving} className={FIN.btnGold}>
          {saving ? "Saving..." : "Save Activity"}
        </button>
      </div>
    </div>
  );
};

export const ActivityList: React.FC<{
  activities: CrmActivity[];
  today: string;
  onChanged: () => void;
}> = ({ activities, today, onChanged }) => {
  const [busy, setBusy] = useState<string | null>(null);

  const markDone = async (id: string) => {
    setBusy(id);
    try {
      await fetch(`/api/crm-activities/${id}/done`, { method: "PUT" });
      onChanged();
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(null);
    }
  };

  if (activities.length === 0) {
    return <p className="text-[12px] text-zinc-500">No activity logged yet.</p>;
  }

  return (
    <ol className="space-y-2">
      {activities.map((a) => {
        const state = a.done ? "none" : followUpState(a.follow_up_date ? String(a.follow_up_date).slice(0, 10) : undefined, today);
        return (
          <li key={a.id} className="flex gap-2.5 rounded-lg border border-[#22262d] bg-[#0f1216] p-2.5">
            <span className="mt-0.5 text-[14px]">{KIND_ICON[a.kind] ?? "ðŸ“"}</span>
            <div className="min-w-0 flex-1">
              {a.note && <p className="whitespace-pre-wrap break-words text-[12px] text-zinc-200">{a.note}</p>}
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-zinc-500">
                <span>{String(a.created_at).slice(0, 16)}</span>
                {a.follow_up_date && (
                  <span
                    className={`rounded-full border px-1.5 py-0.5 ${
                      a.done ? "border-zinc-600/40 text-zinc-500 line-through" : followChip(state)
                    }`}
                  >
                    Follow-up {String(a.follow_up_date).slice(0, 10)}
                    {a.done ? " (done)" : ""}
                  </span>
                )}
                {a.follow_up_date && !a.done && (
                  <button
                    type="button"
                    disabled={busy === a.id}
                    onClick={() => markDone(a.id)}
                    className="text-[#e5c36a] hover:text-[#f1d68a] disabled:opacity-50"
                  >
                    Mark done
                  </button>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
};

/* ------------------------------------------------------------------ */
/* lead drawer                                                         */
/* ------------------------------------------------------------------ */

export const LeadActivityPanel: React.FC<{
  lead: any | null;
  activities: CrmActivity[];
  today: string;
  onClose: () => void;
  onChanged: () => void;
}> = ({ lead, activities, today, onClose, onChanged }) => {
  const mine = lead ? activities.filter((a) => a.entity_type === "lead" && a.entity_id === String(lead.id)) : [];
  const follow = nextFollowUps(mine);
  const score = lead ? scoreLead(lead, follow[String(lead.id)], today) : null;
  const phone = lead?.phone ?? "";
  const email = lead?.email ?? "";

  return (
    <FDrawer open={!!lead} onClose={onClose} title={lead ? leadName(lead) : ""} subtitle={lead ? leadContact(lead) : undefined}>
      {lead && score && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <TierBadge score={score} />
            <span className="rounded-full border border-[#2b3038] px-2 py-0.5 text-[10px] uppercase tracking-wider text-zinc-300">{lead.stage}</span>
            <span className="text-[12px] font-semibold text-[#f1d68a]">{money(leadValue(lead))}</span>
            {lead.source && <span className="text-[11px] text-zinc-500">via {lead.source}</span>}
          </div>

          {score.reasons.length > 0 && (
            <p className="text-[11px] text-zinc-500">Why this score: {score.reasons.join(" Â· ")}</p>
          )}

          <div className="grid grid-cols-2 gap-2 text-[12px]">
            <div className="rounded-lg border border-[#2a2f37] bg-[#0f1216] p-2.5">
              <p className="text-[9px] uppercase tracking-[0.14em] text-zinc-500">Phone</p>
              <p className="truncate text-zinc-200">{phone || "-"}</p>
            </div>
            <div className="rounded-lg border border-[#2a2f37] bg-[#0f1216] p-2.5">
              <p className="text-[9px] uppercase tracking-[0.14em] text-zinc-500">Email</p>
              <p className="truncate text-zinc-200">{email || "-"}</p>
            </div>
          </div>

          {lead.notes && (
            <div className="rounded-lg border border-[#2a2f37] bg-[#0f1216] p-2.5">
              <p className="text-[9px] uppercase tracking-[0.14em] text-zinc-500">Notes</p>
              <p className="whitespace-pre-wrap text-[12px] text-zinc-300">{lead.notes}</p>
            </div>
          )}

          <section>
            <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">Message</h4>
            <TemplateSender
              phone={phone}
              email={email}
              vars={{ name: leadContact(lead) || leadName(lead), company: leadName(lead) }}
              subject={`Regarding ${leadName(lead)}`}
            />
          </section>

          <section>
            <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">Log activity / schedule follow-up</h4>
            <ActivityComposer entityType="lead" entityId={String(lead.id)} onSaved={onChanged} />
          </section>

          <section>
            <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">Timeline</h4>
            <ActivityList activities={mine} today={today} onChanged={onChanged} />
          </section>
        </div>
      )}
    </FDrawer>
  );
};
