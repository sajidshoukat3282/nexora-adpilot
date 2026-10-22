/**
 * Shared report helpers: period presets, formatting, the branded report document
 * (HTML for preview / print / PDF) and a small .xlsx writer. No external libraries.
 */

export const isoToday = (): string => new Date().toISOString().slice(0, 10);

const dayNum = (iso: string): number => Math.floor(new Date(iso + "T00:00:00Z").getTime() / 86400000);
export const addDays = (iso: string, n: number): string => new Date((dayNum(iso) + n) * 86400000).toISOString().slice(0, 10);

export type PresetKey = "month" | "last_month" | "quarter" | "year" | "last_year" | "30d" | "custom";

export const PRESETS: { key: PresetKey; label: string }[] = [
  { key: "month", label: "This month" },
  { key: "last_month", label: "Last month" },
  { key: "quarter", label: "This quarter" },
  { key: "year", label: "This year" },
  { key: "last_year", label: "Last year" },
  { key: "30d", label: "Last 30 days" },
];

export function presetRange(key: PresetKey, today = isoToday()): { from: string; to: string } {
  const y = Number(today.slice(0, 4));
  const m = Number(today.slice(5, 7));
  const iso = (yy: number, mm: number, dd: number) => new Date(Date.UTC(yy, mm - 1, dd)).toISOString().slice(0, 10);
  if (key === "last_month") return { from: iso(y, m - 1, 1), to: iso(y, m, 0) };
  if (key === "quarter") {
    const qs = Math.floor((m - 1) / 3) * 3 + 1;
    return { from: iso(y, qs, 1), to: today };
  }
  if (key === "year") return { from: iso(y, 1, 1), to: today };
  if (key === "last_year") return { from: iso(y - 1, 1, 1), to: iso(y - 1, 12, 31) };
  if (key === "30d") return { from: addDays(today, -29), to: today };
  return { from: iso(y, m, 1), to: today };
}

export const fmtMoney = (n: number, cur: string): string => `${cur} ${Math.round(Number(n) || 0).toLocaleString("en-US")}`;
export const fmtNum = (n: number): string => Math.round(Number(n) || 0).toLocaleString("en-US");

export function shortMoney(n: number): string {
  const a = Math.abs(Number(n) || 0);
  const s = a >= 1e7 ? `${(a / 1e7).toFixed(1)}Cr` : a >= 1e5 ? `${(a / 1e5).toFixed(1)}L` : a >= 1e3 ? `${(a / 1e3).toFixed(0)}k` : `${Math.round(a)}`;
  return n < 0 ? `-${s}` : s;
}

/** Change versus the previous period. null when there is nothing to compare with. */
export function delta(cur: number, prev: number): { pct: number; up: boolean } | null {
  if (!prev) return null;
  const pct = Math.round(((cur - prev) / Math.abs(prev)) * 100);
  return { pct, up: cur >= prev };
}

export const monthLabel = (ym: string): string =>
  new Date(ym + "-01T00:00:00Z").toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" });

/* ------------------------------------------------------------------ */
/* Report document                                                     */
/* ------------------------------------------------------------------ */

export interface DocCol {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  /** number columns keep a numeric value in Excel */
  num?: boolean;
}

export type DocSection =
  | { type: "table"; title: string; note?: string; cols: DocCol[]; rows: Record<string, string | number>[]; totals?: Record<string, string | number> }
  | { type: "bars"; title: string; note?: string; labels: string[]; a: { label: string; values: number[] }; b?: { label: string; values: number[] } }
  | { type: "hbars"; title: string; note?: string; items: { label: string; value: number; text: string }[] };

export interface ReportDoc {
  title: string;
  subtitle?: string;
  period?: string;
  company: { name: string; address?: string; phone?: string; ntn?: string; email?: string };
  kpis?: { label: string; value: string; sub?: string }[];
  sections: DocSection[];
  footnote?: string;
}

const esc = (v: unknown): string =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

function svgBars(s: Extract<DocSection, { type: "bars" }>): string {
  const W = 680;
  const H = 190;
  const padL = 8;
  const padB = 22;
  const n = s.labels.length;
  const max = Math.max(1, ...s.a.values, ...(s.b?.values ?? []));
  const slot = (W - padL * 2) / Math.max(1, n);
  const bw = Math.min(18, slot / 2.6);
  let g = "";
  s.labels.forEach((lab, i) => {
    const cx = padL + slot * i + slot / 2;
    const ha = ((s.a.values[i] ?? 0) / max) * (H - padB - 14);
    const hb = (((s.b?.values[i]) ?? 0) / max) * (H - padB - 14);
    g += `<rect x="${(cx - bw - 1).toFixed(1)}" y="${(H - padB - ha).toFixed(1)}" width="${bw}" height="${ha.toFixed(1)}" rx="2" fill="#c99b3b"/>`;
    if (s.b) g += `<rect x="${(cx + 1).toFixed(1)}" y="${(H - padB - hb).toFixed(1)}" width="${bw}" height="${hb.toFixed(1)}" rx="2" fill="#8b929b"/>`;
    g += `<text x="${cx.toFixed(1)}" y="${H - 7}" text-anchor="middle" font-size="9" fill="#6b6657">${esc(lab)}</text>`;
  });
  const legend = `<span style="display:inline-block;width:9px;height:9px;background:#c99b3b;border-radius:2px;margin-right:4px"></span>${esc(s.a.label)}${s.b ? `<span style="display:inline-block;width:9px;height:9px;background:#8b929b;border-radius:2px;margin:0 4px 0 14px"></span>${esc(s.b.label)}` : ""}`;
  return `<div style="font-size:10px;color:#6b6657;margin-bottom:4px">${legend}</div><svg viewBox="0 0 ${W} ${H}" width="100%" style="display:block"><line x1="${padL}" y1="${H - padB}" x2="${W - padL}" y2="${H - padB}" stroke="#d9cfb8"/>${g}</svg>`;
}

/** Full branded HTML document: cover, content pages, running footer. Uses the same type scale as the invoice. */
export function buildReportHtml(doc: ReportDoc): string {
  const c = doc.company;
  const kpis = (doc.kpis ?? [])
    .map(
      (k) =>
        `<div class="kpi"><div class="lab">${esc(k.label)}</div><div class="val">${esc(k.value)}</div>${k.sub ? `<div class="sub">${esc(k.sub)}</div>` : ""}</div>`,
    )
    .join("");
  const sections = doc.sections
    .map((s, idx) => {
      const head = `<h3 class="sec">${esc(s.title)}</h3>${s.note ? `<p class="note">${esc(s.note)}</p>` : ""}`;
      if (s.type === "bars") return `<section class="blk">${head}${svgBars(s)}</section>`;
      if (s.type === "hbars") {
        const max = Math.max(1, ...s.items.map((i) => Math.abs(i.value)));
        return `<section class="blk">${head}${s.items
          .map(
            (i) =>
              `<div class="hb"><div class="hl"><span>${esc(i.label)}</span><b>${esc(i.text)}</b></div><div class="ht"><div class="hf" style="width:${Math.max(1, (Math.abs(i.value) / max) * 100).toFixed(1)}%"></div></div></div>`,
          )
          .join("")}${s.items.length === 0 ? '<p class="note">No data for this period.</p>' : ""}</section>`;
      }
      const th = s.cols.map((k) => `<th style="text-align:${k.align ?? "left"}">${esc(k.label)}</th>`).join("");
      const body = s.rows
        .map((r) => `<tr>${s.cols.map((k) => `<td style="text-align:${k.align ?? "left"}">${esc(r[k.key] ?? "")}</td>`).join("")}</tr>`)
        .join("");
      const tot = s.totals
        ? `<tr class="tot">${s.cols.map((k) => `<td style="text-align:${k.align ?? "left"}">${esc(s.totals?.[k.key] ?? "")}</td>`).join("")}</tr>`
        : "";
      const empty = s.rows.length === 0 ? `<tr><td colspan="${s.cols.length}" class="empty">No records for this period.</td></tr>` : "";
      return `<section class="blk" data-i="${idx}">${head}<table><thead><tr>${th}</tr></thead><tbody>${body}${empty}${tot}</tbody></table></section>`;
    })
    .join("");
  const addr = [c.address].filter(Boolean).join(", ");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(doc.title)}</title><style>
@page{size:A4;margin:16mm 14mm 18mm 14mm;@bottom-right{content:"Page " counter(page) " of " counter(pages);font-size:9px;color:#8a7a52}}
*{box-sizing:border-box}
body{margin:0;background:#fbf9f4;color:#1b1d21;font-family:Arial,Helvetica,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{border-top:3px solid #c99b3b;padding:22px 24px 40px}
.cover{min-height:250mm;display:flex;flex-direction:column;justify-content:space-between;padding:40px 10px 20px;page-break-after:always;break-after:page}
.cover .brand{font-size:13px;font-weight:600}.cover .brand small{display:block;font-size:11px;font-weight:400;color:#64748b;line-height:1.6;margin-top:2px}
.cover h1{font-size:30px;font-weight:600;letter-spacing:.28em;margin:0 0 10px}
.cover .rule{height:2px;width:90px;background:linear-gradient(90deg,#f1d68a,#c99b3b,transparent);margin:10px 0 14px}
.cover .per{font-size:13px;color:#8a7a52}
.cover .conf{font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:#a8914f;font-weight:600}
.hdr{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid #e4dccb;padding-bottom:14px;margin-bottom:16px}
.hdr h1{font-size:20px;font-weight:600;letter-spacing:.28em;margin:0}.hdr .per{font-size:11px;color:#8a7a52;margin-top:4px;font-family:monospace}
.hdr .co{text-align:right}.hdr .co h2{font-size:13px;font-weight:600;margin:0}.hdr .co p{font-size:11px;color:#64748b;margin:0;line-height:1.6}
.kpis{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:18px}
.kpi{flex:1 1 150px;border:1px solid #e4dccb;border-top:2px solid #c99b3b;border-radius:6px;padding:10px 12px;background:#fff}
.kpi .lab{font-size:9px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:#a8914f}
.kpi .val{font-size:15px;font-weight:700;margin-top:3px}.kpi .sub{font-size:10px;color:#64748b;margin-top:1px}
.blk{margin-bottom:20px;page-break-inside:avoid;break-inside:avoid}
h3.sec{font-size:9px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:#a8914f;margin:0 0 6px;border-bottom:1px solid #e4dccb;padding-bottom:4px}
p.note{font-size:10px;color:#64748b;margin:0 0 6px}
table{width:100%;border-collapse:collapse}
th{font-size:10px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;padding:7px 6px;border-bottom:2px solid #c99b3b;color:#1b1d21}
td{font-size:11px;padding:6px;border-bottom:1px solid #eee7d6;color:#334155}
tr.tot td{font-weight:700;color:#1b1d21;border-top:2px solid #c99b3b;border-bottom:none;font-size:12px}
td.empty{text-align:center;color:#94a3b8;padding:14px}
tr{page-break-inside:avoid;break-inside:avoid}
.hb{margin-bottom:7px}.hl{display:flex;justify-content:space-between;font-size:11px;color:#334155;margin-bottom:3px}.hl b{color:#1b1d21}
.ht{height:7px;background:#eee7d6;border-radius:4px;overflow:hidden}.hf{height:100%;background:linear-gradient(90deg,#f1d68a,#a97b22)}
.sign{display:flex;justify-content:space-between;margin-top:60px}.sign div{width:170px;border-top:1px solid #94a3b8;padding-top:4px;text-align:center;font-size:11px;font-weight:500}
.foot{margin-top:26px;border-top:1px solid #e4dccb;padding-top:8px;text-align:center;font-size:10px;color:#94a3b8}
@media screen{body{padding:12px}.page{max-width:820px;margin:0 auto 16px;box-shadow:0 10px 30px rgba(0,0,0,.25)}.cover{min-height:0;height:420px;background:#fbf9f4;margin:0 auto 16px;max-width:820px;border-top:3px solid #c99b3b;box-shadow:0 10px 30px rgba(0,0,0,.25)}}
</style></head><body>
<div class="cover"><div class="brand">${esc(c.name)}<small>${esc(addr)}${c.phone ? `<br>Tel: ${esc(c.phone)}` : ""}${c.email ? `<br>${esc(c.email)}` : ""}${c.ntn ? `<br>NTN: ${esc(c.ntn)}` : ""}</small></div>
<div><h1>${esc(doc.title.toUpperCase())}</h1><div class="rule"></div>${doc.subtitle ? `<div class="per">${esc(doc.subtitle)}</div>` : ""}${doc.period ? `<div class="per" style="margin-top:4px">${esc(doc.period)}</div>` : ""}</div>
<div class="conf">Confidential &middot; Prepared for management &middot; ${esc(new Date().toISOString().slice(0, 10))}</div></div>
<div class="page"><div class="hdr"><div><h1>${esc(doc.title.toUpperCase())}</h1><div class="per">${esc(doc.period ?? "")}</div></div><div class="co"><h2>${esc(c.name)}</h2>${addr ? `<p>${esc(addr)}</p>` : ""}${c.ntn ? `<p>NTN: ${esc(c.ntn)}</p>` : ""}${c.email ? `<p>${esc(c.email)}</p>` : ""}</div></div>
${kpis ? `<div class="kpis">${kpis}</div>` : ""}${sections}
${doc.footnote ? `<p class="note">${esc(doc.footnote)}</p>` : ""}
<div class="sign"><div>Prepared By</div><div>Approved By</div></div>
<div class="foot">This is a system generated report. Generated on ${esc(new Date().toLocaleString("en-GB"))}</div></div>
</body></html>`;
}

/** Open the document in a new window and print it (the user can save it as PDF). */
export function printReport(doc: ReportDoc): boolean {
  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.write(buildReportHtml(doc));
  w.document.close();
  w.focus();
  window.setTimeout(() => w.print(), 400);
  return true;
}

/* ------------------------------------------------------------------ */
/* Minimal .xlsx writer (stored zip, inline strings)                   */
/* ------------------------------------------------------------------ */

let crcTable: number[] | null = null;
function crc32(bytes: Uint8Array): number {
  if (!crcTable) {
    crcTable = [];
    for (let n = 0; n < 256; n += 1) {
      let c = n;
      for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable.push(c >>> 0);
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) crc = (crcTable[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8)) >>> 0;
  return (crc ^ 0xffffffff) >>> 0;
}

const utf8 = (s: string): Uint8Array => new TextEncoder().encode(s);

function zipStore(files: { name: string; data: Uint8Array }[]): Uint8Array {
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  const u16 = (n: number) => [n & 0xff, (n >>> 8) & 0xff];
  const u32 = (n: number) => [n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff];
  for (const f of files) {
    const name = utf8(f.name);
    const crc = crc32(f.data);
    const local = new Uint8Array([0x50, 0x4b, 0x03, 0x04, ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(f.data.length), ...u32(f.data.length), ...u16(name.length), ...u16(0)]);
    parts.push(local, name, f.data);
    central.push(new Uint8Array([0x50, 0x4b, 0x01, 0x02, ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(f.data.length), ...u32(f.data.length), ...u16(name.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(offset)]), name);
    offset += local.length + name.length + f.data.length;
  }
  const cdSize = central.reduce((a, b) => a + b.length, 0);
  const end = new Uint8Array([0x50, 0x4b, 0x05, 0x06, ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length), ...u32(cdSize), ...u32(offset), ...u16(0)]);
  const all = [...parts, ...central, end];
  const out = new Uint8Array(all.reduce((a, b) => a + b.length, 0));
  let p = 0;
  for (const a of all) {
    out.set(a, p);
    p += a.length;
  }
  return out;
}

const xesc = (s: unknown): string =>
  String(s ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const colName = (i: number): string => {
  let s = "";
  let n = i + 1;
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
};

export interface XSheet {
  name: string;
  /** first row is written as a bold gold header */
  rows: (string | number)[][];
  widths?: number[];
}

export function makeXlsx(sheets: XSheet[]): Uint8Array {
  const used = new Set<string>();
  const safe = sheets.map((s, i) => {
    let n = s.name.replace(/[\[\]:*?\/\\]/g, " ").trim().slice(0, 31) || `Sheet${i + 1}`;
    let k = 2;
    while (used.has(n.toLowerCase())) n = `${n.slice(0, 28)} ${k++}`;
    used.add(n.toLowerCase());
    return { ...s, name: n };
  });
  const sheetXml = (s: XSheet): string => {
    const widths = (s.widths ?? []).length
      ? `<cols>${(s.widths ?? []).map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("")}</cols>`
      : "";
    const rowsXml = s.rows
      .map((r, ri) => {
        const cells = r
          .map((v, ci) => {
            const ref = `${colName(ci)}${ri + 1}`;
            if (ri === 0) return `<c r="${ref}" s="1" t="inlineStr"><is><t>${xesc(v)}</t></is></c>`;
            if (typeof v === "number" && Number.isFinite(v)) return `<c r="${ref}" s="2"><v>${v}</v></c>`;
            return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xesc(v)}</t></is></c>`;
          })
          .join("");
        return `<row r="${ri + 1}">${cells}</row>`;
      })
      .join("");
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>${widths}<sheetData>${rowsXml}</sheetData></worksheet>`;
  };
  const files = [
    {
      name: "[Content_Types].xml",
      data: utf8(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${safe.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`,
      ),
    },
    { name: "_rels/.rels", data: utf8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`) },
    { name: "xl/workbook.xml", data: utf8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${safe.map((s, i) => `<sheet name="${xesc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets></workbook>`) },
    { name: "xl/_rels/workbook.xml.rels", data: utf8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${safe.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}<Relationship Id="rId${safe.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`) },
    {
      name: "xl/styles.xml",
      data: utf8(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.00"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF1D68A"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`,
      ),
    },
    ...safe.map((s, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: utf8(sheetXml(s)) })),
  ];
  return zipStore(files);
}

/** Excel workbook from a report document: a Summary sheet plus one sheet per table. */
export function docToSheets(doc: ReportDoc): XSheet[] {
  const sheets: XSheet[] = [];
  const sum: (string | number)[][] = [["Item", "Value"], ["Report", doc.title], ["Company", doc.company.name]];
  if (doc.period) sum.push(["Period", doc.period]);
  for (const k of doc.kpis ?? []) sum.push([k.label, k.value]);
  sheets.push({ name: "Summary", rows: sum, widths: [26, 34] });
  for (const s of doc.sections) {
    if (s.type === "table") {
      const rows: (string | number)[][] = [s.cols.map((c) => c.label)];
      for (const r of s.rows) rows.push(s.cols.map((c) => (c.num && typeof r[c.key] === "number" ? (r[c.key] as number) : String(r[c.key] ?? ""))));
      if (s.totals) rows.push(s.cols.map((c) => (c.num && typeof s.totals?.[c.key] === "number" ? (s.totals[c.key] as number) : String(s.totals?.[c.key] ?? ""))));
      sheets.push({ name: s.title, rows, widths: s.cols.map((c) => (c.num ? 16 : 26)) });
    } else if (s.type === "bars") {
      const rows: (string | number)[][] = [["Month", s.a.label, ...(s.b ? [s.b.label] : [])]];
      s.labels.forEach((l, i) => rows.push([l, s.a.values[i] ?? 0, ...(s.b ? [s.b.values[i] ?? 0] : [])]));
      sheets.push({ name: s.title, rows, widths: [14, 16, 16] });
    } else {
      sheets.push({ name: s.title, rows: [["Item", "Value"], ...s.items.map((i) => [i.label, i.value] as (string | number)[])], widths: [30, 16] });
    }
  }
  return sheets;
}

export function downloadXlsx(filename: string, doc: ReportDoc): void {
  const bytes = makeXlsx(docToSheets(doc));
  const blob = new Blob([bytes as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}
