import React, { useEffect, useState } from "react";
import { FIN, SectionTitle } from "../finance/financeUi";
import { exportApi, type ExportFile } from "@/lib/api/export";
import { buildZip, type ZipEntry } from "@/lib/zipWriter";
import { prettySize } from "@/lib/api/files";
import { useCompanyName } from "@/hooks/useCompanyProfile";

const enc = new TextEncoder();

/** A cell as text. Text that starts with = + @ gets a leading quote so spreadsheets never run it as a formula. */
function cell(v: unknown): string {
  if (v === null || v === undefined) return "";
  let t = typeof v === "object" ? JSON.stringify(v) : String(v);
  if (typeof v === "string" && /^[=+@]/.test(t)) t = `'${t}`;
  return /[",\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}
function toCsv(columns: string[], rows: Record<string, unknown>[]): string {
  return [columns.join(","), ...rows.map((r) => columns.map((c) => cell(r[c])).join(","))].join("\r\n") + "\r\n";
}
const safe = (n: string) => n.replace(/[^A-Za-z0-9._-]+/g, "_").slice(0, 80) || "file";

/** Owner tool: download all company data (CSV and JSON per table) and, if wanted, the uploaded files, in one ZIP file. */
export const ExportCard: React.FC = () => {
  const company = useCompanyName();
  const [files, setFiles] = useState<{ list: ExportFile[]; bytes: number } | null>(null);
  const [withFiles, setWithFiles] = useState(true);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    exportApi.files().then((r) => setFiles({ list: r.files, bytes: r.total_bytes })).catch(() => setFiles(null));
  }, []);

  const run = async () => {
    setBusy(true); setMsg(null);
    const entries: ZipEntry[] = [];
    const notes: string[] = [];
    try {
      setStep("Preparing...");
      const { tables } = await exportApi.tables();
      let n = 0;
      for (const t of tables) {
        n++;
        setStep(`Reading data ${n} of ${tables.length}: ${t.name}`);
        let columns: string[] = [];
        let rows: Record<string, unknown>[] = [];
        let offset = 0;
        for (let guard = 0; guard < 400; guard++) {
          const p = await exportApi.page(t.name, offset);
          columns = p.columns;
          rows = rows.concat(p.rows);
          if (!p.has_more) break;
          offset = p.next_offset;
        }
        entries.push({ name: `data/${t.name}.csv`, data: enc.encode("\ufeff" + toCsv(columns, rows)) });
        entries.push({ name: `data/${t.name}.json`, data: enc.encode(JSON.stringify(rows, null, 1)) });
      }
      let fileCount = 0;
      if (withFiles && files && files.list.length > 0) {
        const idx = ["id,name,type,size_bytes,campaign_id,uploaded_at"];
        let i = 0;
        for (const f of files.list) {
          i++;
          setStep(`Downloading files ${i} of ${files.list.length}`);
          try {
            const res = await fetch(`/api/files/${encodeURIComponent(f.id)}`, { credentials: "same-origin" });
            if (!res.ok) throw new Error(String(res.status));
            entries.push({ name: `files/${f.id.slice(0, 8)}_${safe(f.name)}`, data: new Uint8Array(await res.arrayBuffer()) });
            idx.push([f.id, f.name, f.ext, f.size, f.campaign_id ?? "", f.created_at].map(cell).join(","));
            fileCount++;
          } catch {
            notes.push(`File could not be downloaded: ${f.name}`);
          }
        }
        entries.push({ name: "files/index.csv", data: enc.encode("\ufeff" + idx.join("\r\n") + "\r\n") });
      }
      const today = new Date().toISOString().slice(0, 10);
      const readme = [
        `Nexora AdPilot - data export for ${company}`,
        `Created: ${new Date().toISOString()}`,
        "",
        "data/   one CSV file (opens in Excel) and one JSON file per kind of data: clients, campaigns, invoices, screens and more.",
        withFiles ? "files/  your uploaded files (artwork, proof photos) and files/index.csv that lists them." : "Uploaded files were not included in this export.",
        "",
        "Passwords, sign-in tokens and secret keys are never part of an export.",
        ...(notes.length ? ["", "Notes:", ...notes] : []),
      ].join("\r\n");
      entries.unshift({ name: "README.txt", data: enc.encode(readme) });
      setStep("Creating the ZIP file...");
      const blob = buildZip(entries);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `adpilot-export-${safe(company)}-${today}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 60000);
      setMsg({ ok: true, text: `Done. ${tables.length} data sets${withFiles ? ` and ${fileCount} files` : ""} saved in the ZIP file.${notes.length ? ` ${notes.length} file(s) were skipped.` : ""}` });
    } catch (err: any) {
      setMsg({ ok: false, text: err?.message || "The export could not be completed. Please try again." });
    } finally {
      setBusy(false); setStep("");
    }
  };

  return (
    <div className={`${FIN.panel} p-4`}>
      <SectionTitle>Export all my data</SectionTitle>
      <p className="mt-1 text-[11px] text-zinc-500">
        Download everything in your workspace (clients, campaigns, invoices, screens and more) as one ZIP file. Keep a copy before you cancel your subscription.
      </p>
      {files && files.list.length > 0 && (
        <label className="mt-3 flex items-center gap-2 text-[12px] text-zinc-300">
          <input type="checkbox" checked={withFiles} onChange={(e: any) => setWithFiles(e.target.checked)} disabled={busy} />
          Include uploaded files ({files.list.length} files, {prettySize(files.bytes)})
        </label>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" className={FIN.btnGold} onClick={run} disabled={busy}>{busy ? "Exporting..." : "Export all my data (ZIP)"}</button>
        {busy && <span className="text-[11px] text-zinc-400">{step}</span>}
      </div>
      {msg && <p className={`mt-2 text-[11px] ${msg.ok ? "text-emerald-300" : "text-rose-300"}`}>{msg.text}</p>}
      <p className="mt-2 text-[10px] text-zinc-600">Passwords and secret keys are never included. Large file sets can take a few minutes, please keep this page open.</p>
    </div>
  );
};
