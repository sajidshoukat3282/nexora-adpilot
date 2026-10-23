import React, { useCallback, useEffect, useState } from "react";
import type { Permission } from "@/domain";
import { useSession } from "@/hooks/useSession";
import { setCompanyLogo, useCompanyLogo } from "@/hooks/useCompanyLogo";
import { adminExtrasApi, uploadLogo, LOGO_MAX_MB, type AuditRow, type PermissionTemplate } from "@/lib/api/adminExtras";
import { downloadCsv, toCsv } from "../crm/crmTools";
import { FIN, SectionTitle } from "../finance/financeUi";
import { fmtDateTime, timeAgo } from "./adminTools";

/* ---------- Permission templates (used inside the invite and edit forms) ---------- */
export const TemplatePicker: React.FC<{ value: Permission[]; onApply: (p: Permission[]) => void; disabled?: boolean }> = ({ value, onApply, disabled }) => {
  const [list, setList] = useState<PermissionTemplate[]>([]);
  const [msg, setMsg] = useState("");
  const load = useCallback(async () => {
    try { setList((await adminExtrasApi.templates()).templates); } catch { /* templates are optional */ }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const save = async () => {
    const name = window.prompt("Template name (for example Sales Executive):");
    if (!name || !name.trim()) return;
    setMsg("");
    try { await adminExtrasApi.saveTemplate(name.trim(), value as string[]); setMsg("Template saved."); await load(); }
    catch (e: any) { setMsg(e?.message || "Could not save the template."); }
  };
  const remove = async (t: PermissionTemplate) => {
    if (!window.confirm(`Delete the template "${t.name}"?`)) return;
    try { await adminExtrasApi.deleteTemplate(t.id); await load(); } catch (e: any) { setMsg(e?.message || "Could not delete."); }
  };

  return (
    <div className="rounded-lg border border-[#2b3038] bg-[#12151a] p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">Your templates</span>
        {list.length === 0 && <span className="text-[11px] text-zinc-500">None yet. Tick the permissions you want, then save them as a template.</span>}
        {list.map((t) => (
          <span key={t.id} className="inline-flex items-center overflow-hidden rounded-full border border-[#c99b3b]/40 text-[11px]">
            <button type="button" disabled={disabled} className="px-2.5 py-1 text-[#f1d68a] hover:bg-[#c99b3b]/10" onClick={() => onApply(t.permissions as Permission[])}>{t.name}</button>
            <button type="button" aria-label={`Delete ${t.name}`} className="border-l border-[#c99b3b]/30 px-1.5 py-1 text-zinc-500 hover:text-rose-300" onClick={() => remove(t)}>x</button>
          </span>
        ))}
        <button type="button" disabled={disabled || value.length === 0} className={`${FIN.btnGhost} !px-2 !py-1 !text-[11px] ml-auto`} onClick={save}>Save current as template</button>
      </div>
      {msg && <p className="mt-1 text-[11px] text-zinc-400">{msg}</p>}
    </div>
  );
};

/* ---------- Company logo ---------- */
export const LogoCard: React.FC = () => {
  const { session } = useSession();
  const logo = useCompanyLogo();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const pick = async (e: any) => {
    const file: File | undefined = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true); setMsg(null);
    try { const url = await uploadLogo(file); setCompanyLogo(session?.companyId ?? null, url); setMsg({ ok: true, text: "Logo updated." }); }
    catch (err: any) { setMsg({ ok: false, text: err?.message || "Upload failed." }); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    if (!window.confirm("Remove the company logo?")) return;
    setBusy(true); setMsg(null);
    try { await adminExtrasApi.removeLogo(); setCompanyLogo(session?.companyId ?? null, null); setMsg({ ok: true, text: "Logo removed." }); }
    catch (err: any) { setMsg({ ok: false, text: err?.message || "Could not remove the logo." }); }
    finally { setBusy(false); }
  };

  return (
    <div className={`${FIN.panel} mb-4 p-4`}>
      <SectionTitle>Company logo</SectionTitle>
      <p className="mb-3 mt-1 text-[11px] text-zinc-500">Shown in the sidebar and top bar, and printed on proposals and in the client portal documents.</p>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-[#c99b3b]/30 bg-[#fbf9f4]">
          {logo ? <img src={logo} alt="Company logo" className="h-full w-full object-contain" /> : <span className="text-[10px] text-zinc-500">No logo</span>}
        </div>
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <label className={`${FIN.btnGold} cursor-pointer ${busy ? "opacity-60" : ""}`}>
              {busy ? "Working..." : logo ? "Replace logo" : "Upload logo"}
              <input type="file" accept=".png,.jpg,.jpeg,.webp" className="hidden" disabled={busy} onChange={pick} />
            </label>
            {logo && <button className={FIN.btnGhost} disabled={busy} onClick={remove}>Remove</button>}
          </div>
          <p className="text-[10px] text-zinc-500">PNG, JPG or WEBP, up to {LOGO_MAX_MB} MB. A square image on a plain background works best.</p>
        </div>
      </div>
      {msg && <p className={`mt-3 text-[12px] ${msg.ok ? "text-emerald-300" : "text-rose-300"}`}>{msg.text}</p>}
    </div>
  );
};

/* ---------- Activity log ---------- */
export const AuditPanel: React.FC = () => {
  const [rows, setRows] = useState<AuditRow[] | null>(null);
  const [actions, setActions] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [action, setAction] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try { const r = await adminExtrasApi.audit(q, action); setRows(r.entries); setActions(r.actions); setError(""); }
    catch (e: any) { setError(e?.message || "Could not load the activity log."); }
  }, [q, action]);
  useEffect(() => {
    const t = window.setTimeout(() => { void load(); }, 300);
    return () => window.clearTimeout(t);
  }, [load]);

  const exportCsv = () =>
    downloadCsv("activity-log.csv", toCsv((rows ?? []).map((r) => ({ ...r, at: r.at.replace("T", " ").slice(0, 19), actor: r.actor ?? "System" })) as any, [
      { key: "at", label: "Date" }, { key: "actor", label: "Who" }, { key: "action", label: "Action" }, { key: "detail", label: "Detail" },
    ]));

  return (
    <div className={`${FIN.panel} p-4`}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SectionTitle>Activity log</SectionTitle>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <input className={`${FIN.input} !w-52`} placeholder="Search" value={q} onChange={(e: any) => setQ(e.target.value)} />
          <select className={`${FIN.input} !w-52`} value={action} onChange={(e: any) => setAction(e.target.value)}>
            <option value="">All actions</option>
            {actions.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <button className={FIN.btnGhost} onClick={load}>Refresh</button>
          <button className={FIN.btnGhost} disabled={!rows?.length} onClick={exportCsv}>Export CSV</button>
        </div>
      </div>
      {error && <p className="mb-2 text-[12px] text-rose-300">{error}</p>}
      {!rows ? <p className="py-4 text-[12px] text-zinc-500">Loading...</p> : rows.length === 0 ? (
        <p className="py-6 text-center text-[12px] text-zinc-500">No matching activity. Team, profile, credit, logo and currency changes appear here.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead><tr className="border-b border-[#2a2f37] text-left text-[10px] uppercase tracking-wider text-zinc-500"><th className="p-2">When</th><th className="p-2">Who</th><th className="p-2">Action</th><th className="p-2">Detail</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-[#1d2128]">
                  <td className="whitespace-nowrap p-2 text-zinc-400">{fmtDateTime(r.at)} <span className="text-zinc-600">({timeAgo(r.at)})</span></td>
                  <td className="p-2 text-zinc-300">{r.actor ?? "System"}</td>
                  <td className="p-2 font-medium text-zinc-100">{r.action}</td>
                  <td className="p-2 text-zinc-400">{r.detail || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
