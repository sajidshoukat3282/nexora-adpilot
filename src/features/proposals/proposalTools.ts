import type { ProposalDetail, ProposalRow } from "@/lib/api/proposals";

export const todayIso = (): string => new Date().toISOString().slice(0, 10);
const dayNum = (iso: string): number => Math.floor(new Date(String(iso).slice(0, 10) + "T00:00:00Z").getTime() / 86400000);
export const diffDays = (a: string, b: string): number => dayNum(b) - dayNum(a);
export const campaignDays = (s: string, e: string): number => Math.max(1, diffDays(s, e) + 1);
export const addDays = (iso: string, n: number): string => new Date((dayNum(iso) + n) * 86400000).toISOString().slice(0, 10);

export const STATUS_LABEL: Record<string, string> = { draft: "Draft", sent: "Sent", accepted: "Accepted", rejected: "Rejected", expired: "Expired" };
export const statusLabel = (s: string): string => STATUS_LABEL[s] ?? s;
export const STATUS_ACTION: Record<string, string> = { sent: "Mark as sent", accepted: "Client accepted", rejected: "Client rejected", draft: "Back to draft" };

export const statusTone = (s: string): { cls: string; dot: string } => {
  if (s === "accepted") return { cls: "text-emerald-300 bg-emerald-400/10 border-emerald-400/30", dot: "bg-emerald-400" };
  if (s === "sent") return { cls: "text-sky-300 bg-sky-400/10 border-sky-400/30", dot: "bg-sky-400" };
  if (s === "rejected") return { cls: "text-rose-300 bg-rose-400/10 border-rose-400/30", dot: "bg-rose-400" };
  if (s === "expired") return { cls: "text-zinc-300 bg-zinc-400/10 border-zinc-400/30", dot: "bg-zinc-400" };
  return { cls: "text-amber-300 bg-amber-400/10 border-amber-400/30", dot: "bg-amber-400" };
};

export function calcTotals(items: { rate: number; slots: number; days: number }[], discountPct: number, taxRate: number) {
  const subtotal = items.reduce((a, i) => a + (Number(i.rate) || 0) * (Number(i.slots) || 1) * (Number(i.days) || 1), 0);
  const discount = subtotal * (Math.min(100, Math.max(0, Number(discountPct) || 0)) / 100);
  const taxable = subtotal - discount;
  const tax = taxable * (Math.min(100, Math.max(0, Number(taxRate) || 0)) / 100);
  return { subtotal, discount, tax, total: taxable + tax };
}

export type Flag = { text: string; tone: "warn" | "bad" | "info" };

/** Small reminders shown on the list: follow up, expiring soon. */
export function flagsFor(p: ProposalRow, today = todayIso()): Flag[] {
  const out: Flag[] = [];
  if (p.status === "sent") {
    if (p.valid_until) {
      const left = diffDays(today, p.valid_until);
      if (left >= 0 && left <= 3) out.push({ text: `Expires in ${left} day${left === 1 ? "" : "s"}`, tone: "warn" });
    }
    if (p.sent_at) {
      const since = diffDays(p.sent_at.slice(0, 10), today);
      if (since >= 5) out.push({ text: `No reply for ${since} days`, tone: "bad" });
    }
  }
  if (p.status === "accepted" && !p.campaign_id) out.push({ text: "Ready to book", tone: "info" });
  return out;
}

const esc = (v: unknown): string =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

export const abs = (u: string): string => (/^https?:/i.test(u) ? u : `${typeof window !== "undefined" ? window.location.origin : ""}${u}`);
const money = (n: number, cur: string): string => `${cur} ${Math.round(Number(n) || 0).toLocaleString("en-US")}`;

export interface Letterhead {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  ntn?: string;
  bankName?: string;
  bankTitle?: string;
  bankIban?: string;
  logoUrl?: string;
}

export const DEFAULT_TERMS =
  "Prices are per advertiser slot per day. Booking is confirmed once this proposal is accepted and payment terms are agreed. Artwork must be supplied before the start date. Rates are valid until the date shown above.";

/** Branded proposal document. Same type scale and colours as the invoice. */
export function buildProposalHtml(d: ProposalDetail, lh: Letterhead): string {
  const p = d.proposal;
  const cur = p.currency;
  const rows = d.items
    .map(
      (i) =>
        `<tr><td>${esc(i.name ?? i.description ?? "Screen")}<div class="sm">${esc(i.city ?? "")}${i.screen_type ? ` &middot; ${esc(i.screen_type)}` : ""}</div></td><td class="r">${i.slots}</td><td class="r">${esc(money(i.rate, cur))}</td><td class="r">${i.days}</td><td class="r b">${esc(money(i.rate * i.slots * i.days, cur))}</td></tr>`,
    )
    .join("");
  const addr = [lh.address].filter(Boolean).join(", ");
  const bank = lh.bankName || lh.bankTitle || lh.bankIban;
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(p.code)}</title><style>
@page{size:A4;margin:16mm 14mm 18mm 14mm;@bottom-right{content:"Page " counter(page) " of " counter(pages);font-size:9px;color:#8a7a52}}
*{box-sizing:border-box}body{margin:0;background:#fbf9f4;color:#1b1d21;font-family:Arial,Helvetica,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{border-top:3px solid #c99b3b;padding:24px 26px 36px}
.hdr{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid #e4dccb;padding-bottom:16px;margin-bottom:18px}
.hdr h1{font-size:20px;font-weight:600;letter-spacing:.28em;margin:0}.hdr .no{font-family:monospace;font-size:11px;color:#8a7a52;margin-top:4px}
.logo{max-height:46px;max-width:140px;object-fit:contain;display:block;margin-bottom:6px}.co{text-align:right}.co h2{font-size:13px;font-weight:600;margin:0}.co p{font-size:11px;color:#64748b;margin:0;line-height:1.6}
.two{display:flex;justify-content:space-between;margin-bottom:22px}.lab{font-size:9px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:#a8914f;margin-bottom:4px}
.big{font-size:13px;font-weight:600}.sm{font-size:10px;color:#64748b}.line{font-size:11px;color:#64748b}.line b{color:#1b1d21;font-weight:500}
.camp{font-size:15px;font-weight:600;margin:0 0 4px}
table{width:100%;border-collapse:collapse;margin-top:8px}
th{font-size:10px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;padding:8px 6px;border-bottom:2px solid #c99b3b;text-align:left}
td{font-size:12px;padding:9px 6px;border-bottom:1px solid #eee7d6;color:#334155;vertical-align:top}.r{text-align:right}th.r{text-align:right}.b{font-weight:600;color:#1b1d21}
.tot{display:flex;justify-content:flex-end;margin-top:14px}.tot div{width:260px;font-size:12px}.tot p{display:flex;justify-content:space-between;margin:0 0 5px;color:#475569}
.tot p.g{font-size:15px;font-weight:700;color:#1b1d21;border-top:2px solid #c99b3b;padding-top:7px;margin-top:6px}
.blk{margin-top:22px;page-break-inside:avoid;break-inside:avoid}.blk p{font-size:11px;line-height:1.6;color:#475569;margin:0;white-space:pre-wrap}
.sign{display:flex;justify-content:space-between;margin-top:54px;page-break-inside:avoid}.sign div{width:210px;border-top:1px solid #94a3b8;padding-top:5px;font-size:11px;font-weight:500;text-align:center}.sign small{display:block;font-weight:400;color:#94a3b8;font-size:10px}
.foot{margin-top:26px;border-top:1px solid #e4dccb;padding-top:8px;text-align:center;font-size:10px;color:#94a3b8}
@media screen{body{padding:12px}.page{max-width:820px;margin:0 auto;box-shadow:0 10px 30px rgba(0,0,0,.25)}}
</style></head><body><div class="page">
<div class="hdr"><div><h1>PROPOSAL</h1><div class="no">${esc(p.code)}</div></div><div class="co">${lh.logoUrl ? `<img class="logo" style="margin-left:auto" src="${esc(abs(lh.logoUrl))}" alt="">` : ""}<h2>${esc(lh.name)}</h2>${addr ? `<p>${esc(addr)}</p>` : ""}${lh.phone ? `<p>Tel: ${esc(lh.phone)}</p>` : ""}${lh.email ? `<p>${esc(lh.email)}</p>` : ""}${lh.ntn ? `<p>NTN: ${esc(lh.ntn)}</p>` : ""}</div></div>
<div class="two"><div><div class="lab">Prepared for</div><div class="big">${esc(p.client_name ?? "-")}</div>${p.client_email ? `<div class="sm">${esc(p.client_email)}</div>` : ""}${p.client_phone ? `<div class="sm">${esc(p.client_phone)}</div>` : ""}</div>
<div style="text-align:right"><div class="line">Date: <b>${esc((p.created_at || "").slice(0, 10))}</b></div><div class="line">Campaign: <b>${esc(p.start_date)} to ${esc(p.end_date)}</b></div>${p.valid_until ? `<div class="line">Valid until: <b>${esc(p.valid_until)}</b></div>` : ""}</div></div>
<p class="camp">${esc(p.campaign_name)}</p><div class="sm">${campaignDays(p.start_date, p.end_date)} days &middot; ${d.items.length} screen${d.items.length === 1 ? "" : "s"}</div>
<table><thead><tr><th>Screen</th><th class="r">Slots</th><th class="r">Rate / slot / day</th><th class="r">Days</th><th class="r">Amount</th></tr></thead><tbody>${rows}</tbody></table>
<div class="tot"><div><p><span>Subtotal</span><span>${esc(money(d.subtotal, cur))}</span></p>${d.discount > 0 ? `<p><span>Discount (${p.discount_pct}%)</span><span>-${esc(money(d.discount, cur))}</span></p>` : ""}${d.tax > 0 ? `<p><span>Tax (${p.tax_rate}%)</span><span>${esc(money(d.tax, cur))}</span></p>` : ""}<p class="g"><span>Total</span><span>${esc(money(d.total, cur))}</span></p></div></div>
${p.notes ? `<div class="blk"><div class="lab">Notes</div><p>${esc(p.notes)}</p></div>` : ""}
<div class="blk"><div class="lab">Terms</div><p>${esc(p.terms || DEFAULT_TERMS)}</p></div>
${bank ? `<div class="blk"><div class="lab">Payment details</div><p>${lh.bankTitle ? `Account title: ${esc(lh.bankTitle)}\n` : ""}${lh.bankName ? `Bank: ${esc(lh.bankName)}\n` : ""}${lh.bankIban ? `IBAN: ${esc(lh.bankIban)}` : ""}</p></div>` : ""}
<div class="sign"><div>Authorized signature<small>${esc(lh.name)}</small></div><div>Accepted by<small>${esc(p.client_name ?? "Client")} &middot; Date</small></div></div>
<div class="foot">Thank you for considering ${esc(lh.name)}. This proposal was generated on ${esc(new Date().toLocaleDateString("en-GB"))}.</div>
</div></body></html>`;
}

export function printProposal(d: ProposalDetail, lh: Letterhead): boolean {
  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.write(buildProposalHtml(d, lh));
  w.document.close();
  w.focus();
  window.setTimeout(() => w.print(), 400);
  return true;
}

export function shareText(d: ProposalDetail, company: string): string {
  const p = d.proposal;
  return [
    `*${company}*`,
    `Proposal ${p.code}: ${p.campaign_name}`,
    `Period: ${p.start_date} to ${p.end_date}`,
    `Screens: ${d.items.map((i) => i.name ?? "Screen").join(", ")}`,
    `Total: ${money(d.total, p.currency)}${p.valid_until ? ` (valid until ${p.valid_until})` : ""}`,
    "Please reply to confirm and we will book it for you.",
  ].join("\n");
}

export const phoneDigits = (p?: string | null): string => String(p ?? "").replace(/[^0-9]/g, "");
