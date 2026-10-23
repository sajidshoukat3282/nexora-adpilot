import { abs } from "../proposals/proposalTools";
import type { PortalCompany, PortalInvoiceDetail, PortalStatement } from "@/lib/api/portal";

const esc = (v: unknown): string =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

export const money = (n: number, cur: string): string => `${cur} ${Math.round(Number(n) || 0).toLocaleString("en-US")}`;
export const day = (iso?: string | null): string => (iso ? String(iso).slice(0, 10) : "-");

export const statusTone = (s: string): string => {
  if (s === "paid" || s === "live" || s === "accepted" || s === "approved" || s === "completed") return "text-emerald-300 bg-emerald-400/10 border-emerald-400/30";
  if (s === "overdue" || s === "rejected" || s === "cancelled" || s === "expired") return "text-rose-300 bg-rose-400/10 border-rose-400/30";
  if (s === "sent" || s === "booked" || s === "client_review") return "text-sky-300 bg-sky-400/10 border-sky-400/30";
  return "text-amber-300 bg-amber-400/10 border-amber-400/30";
};
export const statusText = (s: string): string => s.replace(/_/g, " ");

const STYLE = `
@page{size:A4;margin:16mm 14mm}*{box-sizing:border-box}
body{margin:0;background:#fbf9f4;color:#1b1d21;font-family:Arial,Helvetica,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{border-top:3px solid #c99b3b;padding:24px 26px 36px}
.hdr{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid #e4dccb;padding-bottom:16px;margin-bottom:18px}
.hdr h1{font-size:20px;font-weight:600;letter-spacing:.28em;margin:0}.hdr .no{font-family:monospace;font-size:11px;color:#8a7a52;margin-top:4px}
.logo{max-height:46px;max-width:140px;object-fit:contain;display:block;margin:0 0 6px auto}.co{text-align:right}.co h2{font-size:13px;font-weight:600;margin:0}.co p{font-size:11px;color:#64748b;margin:0;line-height:1.6}
.two{display:flex;justify-content:space-between;margin-bottom:22px}.lab{font-size:9px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:#a8914f;margin-bottom:4px}
.big{font-size:13px;font-weight:600}.sm{font-size:10px;color:#64748b}.line{font-size:11px;color:#64748b}.line b{color:#1b1d21;font-weight:500}
table{width:100%;border-collapse:collapse;margin-top:8px}
th{font-size:10px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;padding:8px 6px;border-bottom:2px solid #c99b3b;text-align:left}
td{font-size:12px;padding:9px 6px;border-bottom:1px solid #eee7d6;color:#334155;vertical-align:top}.r{text-align:right}th.r{text-align:right}.b{font-weight:600;color:#1b1d21}
.tot{display:flex;justify-content:flex-end;margin-top:14px}.tot div{width:260px;font-size:12px}.tot p{display:flex;justify-content:space-between;margin:0 0 5px;color:#475569}
.tot p.g{font-size:15px;font-weight:700;color:#1b1d21;border-top:2px solid #c99b3b;padding-top:7px;margin-top:6px}
.blk{margin-top:22px;page-break-inside:avoid}.blk p{font-size:11px;line-height:1.6;color:#475569;margin:0;white-space:pre-wrap}
.foot{margin-top:26px;border-top:1px solid #e4dccb;padding-top:8px;text-align:center;font-size:10px;color:#94a3b8}
@media screen{body{padding:12px}.page{max-width:820px;margin:0 auto;box-shadow:0 10px 30px rgba(0,0,0,.25)}}`;

const head = (title: string, no: string, c: PortalCompany) =>
  `<div class="hdr"><div><h1>${esc(title)}</h1><div class="no">${esc(no)}</div></div><div class="co">${c.logoUrl ? `<img class="logo" src="${esc(abs(c.logoUrl))}" alt="">` : ""}<h2>${esc(c.name)}</h2>${c.address ? `<p>${esc(c.address)}</p>` : ""}${c.phone ? `<p>Tel: ${esc(c.phone)}</p>` : ""}${c.email ? `<p>${esc(c.email)}</p>` : ""}${c.ntn ? `<p>NTN: ${esc(c.ntn)}</p>` : ""}</div></div>`;

const bank = (c: PortalCompany) =>
  c.bankName || c.bankTitle || c.bankIban
    ? `<div class="blk"><div class="lab">Payment details</div><p>${c.bankTitle ? `Account title: ${esc(c.bankTitle)}\n` : ""}${c.bankName ? `Bank: ${esc(c.bankName)}\n` : ""}${c.bankIban ? `IBAN: ${esc(c.bankIban)}` : ""}</p></div>`
    : "";

export function buildInvoiceHtml(d: PortalInvoiceDetail): string {
  const i = d.invoice;
  const cur = i.currency || d.company.currency;
  const rows = d.items.map((x) => `<tr><td>${esc(x.description)}</td><td class="r">${x.quantity}</td><td class="r">${esc(money(x.rate, cur))}</td><td class="r b">${esc(money(x.amount, cur))}</td></tr>`).join("");
  const tax = Number(i.tax_amount) || 0, disc = Number(i.discount_amount) || 0;
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(i.invoice_number)}</title><style>${STYLE}</style></head><body><div class="page">
${head("INVOICE", i.invoice_number, d.company)}
<div class="two"><div><div class="lab">Billed to</div><div class="big">${esc(d.client?.name ?? "-")}</div>${d.client?.address ? `<div class="sm">${esc(d.client.address)}</div>` : ""}${d.client?.email ? `<div class="sm">${esc(d.client.email)}</div>` : ""}</div>
<div style="text-align:right"><div class="line">Issued: <b>${esc(day(i.issue_date))}</b></div><div class="line">Due: <b>${esc(day(i.due_date))}</b></div><div class="line">Status: <b>${esc(i.status)}</b></div></div></div>
<table><thead><tr><th>Description</th><th class="r">Qty</th><th class="r">Rate</th><th class="r">Amount</th></tr></thead><tbody>${rows}</tbody></table>
<div class="tot"><div>${disc > 0 ? `<p><span>Discount</span><span>-${esc(money(disc, cur))}</span></p>` : ""}${tax > 0 ? `<p><span>Tax (${esc(i.tax_rate ?? 0)}%)</span><span>${esc(money(tax, cur))}</span></p>` : ""}<p><span>Total</span><span>${esc(money(i.total_amount, cur))}</span></p><p><span>Paid</span><span>${esc(money(i.amount_paid, cur))}</span></p><p class="g"><span>Balance due</span><span>${esc(money(i.balance, cur))}</span></p></div></div>
${i.notes ? `<div class="blk"><div class="lab">Notes</div><p>${esc(i.notes)}</p></div>` : ""}
${bank(d.company)}
<div class="foot">${esc(d.company.footer || `Thank you for your business. Please use ${i.invoice_number} as the payment reference.`)}</div></div></body></html>`;
}

export function buildStatementHtml(d: PortalStatement): string {
  const cur = d.company.currency;
  type Row = { date: string; ref: string; desc: string; debit: number; credit: number };
  const lines: Row[] = [
    ...d.invoices.map((i) => ({ date: day(i.issue_date), ref: i.invoice_number, desc: "Invoice", debit: Number(i.total_amount) || 0, credit: 0 })),
    ...d.payments.map((p) => ({ date: day(p.payment_date), ref: p.invoice_number, desc: `Payment${p.payment_method ? ` (${p.payment_method})` : ""}`, debit: 0, credit: Number(p.amount) || 0 })),
  ].sort((a, b) => a.date.localeCompare(b.date));
  let bal = 0;
  const rows = lines.map((l) => { bal += l.debit - l.credit; return `<tr><td>${esc(l.date)}</td><td>${esc(l.ref)}</td><td>${esc(l.desc)}</td><td class="r">${l.debit ? esc(money(l.debit, cur)) : ""}</td><td class="r">${l.credit ? esc(money(l.credit, cur)) : ""}</td><td class="r b">${esc(money(bal, cur))}</td></tr>`; }).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>Statement</title><style>${STYLE}</style></head><body><div class="page">
${head("STATEMENT", `As of ${d.as_of}`, d.company)}
<div class="two"><div><div class="lab">Account</div><div class="big">${esc(d.client?.name ?? "-")}</div></div><div style="text-align:right"><div class="line">Balance due: <b>${esc(money(bal, cur))}</b></div></div></div>
<table><thead><tr><th>Date</th><th>Reference</th><th>Description</th><th class="r">Charges</th><th class="r">Payments</th><th class="r">Balance</th></tr></thead><tbody>${rows}</tbody></table>
${bank(d.company)}<div class="foot">Statement generated on ${esc(new Date().toLocaleDateString("en-GB"))}</div></div></body></html>`;
}

export function printHtml(html: string): boolean {
  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.write(html);
  w.document.close();
  w.focus();
  window.setTimeout(() => w.print(), 400);
  return true;
}

export const isImage = (u?: string | null): boolean => !!u && /\.(png|jpe?g|gif|webp|avif)(\?|#|$)/i.test(u);
