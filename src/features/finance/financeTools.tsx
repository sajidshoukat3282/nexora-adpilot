import React from "react";
import { getDefaultDialCode } from "@/lib/companyDefaults";     

/**
 * Pure helpers for the Finance extras (no extra npm packages needed):
 *  - QR code generator (byte mode, error correction M, versions 1-10)
 *  - WhatsApp / e-mail share text
 *  - receivables ageing, 6-month cash flow, campaign profitability
 */

/* ================================================================== */
/* QR code                                                             */
/* ================================================================== */

const EC_M: Record<number, { ec: number; blocks: [number, number][] }> = {
  1: { ec: 10, blocks: [[1, 16]] },
  2: { ec: 16, blocks: [[1, 28]] },
  3: { ec: 26, blocks: [[1, 44]] },
  4: { ec: 18, blocks: [[2, 32]] },
  5: { ec: 24, blocks: [[2, 43]] },
  6: { ec: 16, blocks: [[4, 27]] },
  7: { ec: 18, blocks: [[4, 31]] },
  8: { ec: 22, blocks: [[2, 38], [2, 39]] },
  9: { ec: 22, blocks: [[3, 36], [2, 37]] },
  10: { ec: 26, blocks: [[4, 43], [1, 44]] },
};

const ALIGN: Record<number, number[]> = {
  1: [],
  2: [6, 18],
  3: [6, 22],
  4: [6, 26],
  5: [6, 30],
  6: [6, 34],
  7: [6, 22, 38],
  8: [6, 24, 42],
  9: [6, 26, 46],
  10: [6, 28, 50],
};

const GF_EXP: number[] = new Array(512).fill(0);
const GF_LOG: number[] = new Array(256).fill(0);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255];
})();

const gfMul = (a: number, b: number): number => (a && b ? GF_EXP[GF_LOG[a] + GF_LOG[b]] : 0);

const rsDivisor = (degree: number): number[] => {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    const next = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], GF_EXP[i]);
    }
    poly = next;
  }
  return poly.slice(1);
};

const rsRemainder = (data: number[], divisor: number[]): number[] => {
  const rem: number[] = new Array(divisor.length).fill(0);
  for (const b of data) {
    const factor = b ^ (rem.shift() as number);
    rem.push(0);
    for (let i = 0; i < divisor.length; i++) rem[i] ^= gfMul(divisor[i], factor);
  }
  return rem;
};

const dataCapacity = (version: number): number =>
  EC_M[version].blocks.reduce((n, [count, cw]) => n + count * cw, 0);

const utf8 = (text: string): number[] => {
  const out: number[] = [];
  for (const ch of text) {
    const cp = ch.codePointAt(0) as number;
    if (cp < 0x80) out.push(cp);
    else if (cp < 0x800) out.push(0xc0 | (cp >> 6), 0x80 | (cp & 63));
    else if (cp < 0x10000) out.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
    else out.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 63), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
  }
  return out;
};

/** Returns the QR matrix (true = dark). Throws if the text does not fit version 10. */
export function makeQr(text: string): boolean[][] {
  const bytes = utf8(text);

  // pick smallest version that fits
  let version = 0;
  for (let v = 1; v <= 10; v++) {
    const countBits = v <= 9 ? 8 : 16;
    if (4 + countBits + bytes.length * 8 <= dataCapacity(v) * 8) {
      version = v;
      break;
    }
  }
  if (!version) throw new Error("QR_TOO_LONG");

  // ---- data bits ----
  const bits: number[] = [];
  const push = (value: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) bits.push((value >>> i) & 1);
  };
  push(0b0100, 4);
  push(bytes.length, version <= 9 ? 8 : 16);
  for (const b of bytes) push(b, 8);
  const capBits = dataCapacity(version) * 8;
  push(0, Math.min(4, capBits - bits.length));
  while (bits.length % 8) bits.push(0);
  for (let pad = 0xec; bits.length < capBits; pad ^= 0xec ^ 0x11) push(pad, 8);

  const data: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
    data.push(b);
  }

  // ---- split into blocks, add error correction, interleave ----
  const { ec, blocks } = EC_M[version];
  const divisor = rsDivisor(ec);
  const dataBlocks: number[][] = [];
  const ecBlocks: number[][] = [];
  let offset = 0;
  for (const [count, cw] of blocks) {
    for (let i = 0; i < count; i++) {
      const block = data.slice(offset, offset + cw);
      offset += cw;
      dataBlocks.push(block);
      ecBlocks.push(rsRemainder(block, divisor));
    }
  }
  const codewords: number[] = [];
  const maxData = Math.max(...dataBlocks.map((b) => b.length));
  for (let i = 0; i < maxData; i++) for (const b of dataBlocks) if (i < b.length) codewords.push(b[i]);
  for (let i = 0; i < ec; i++) for (const b of ecBlocks) codewords.push(b[i]);

  // ---- matrix ----
  const size = 17 + 4 * version;
  const mod: boolean[][] = Array.from({ length: size }, () => new Array(size).fill(false));
  const fn: boolean[][] = Array.from({ length: size }, () => new Array(size).fill(false));
  const setFn = (x: number, y: number, dark: boolean) => {
    mod[y][x] = dark;
    fn[y][x] = true;
  };

  const finder = (cx: number, cy: number) => {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        const x = cx + dx;
        const y = cy + dy;
        if (x >= 0 && x < size && y >= 0 && y < size) setFn(x, y, dist !== 2 && dist !== 4);
      }
    }
  };
  for (let i = 0; i < size; i++) {
    setFn(6, i, i % 2 === 0);
    setFn(i, 6, i % 2 === 0);
  }
  finder(3, 3);
  finder(size - 4, 3);
  finder(3, size - 4);

  const pos = ALIGN[version];
  for (let i = 0; i < pos.length; i++) {
    for (let j = 0; j < pos.length; j++) {
      if ((i === 0 && j === 0) || (i === 0 && j === pos.length - 1) || (i === pos.length - 1 && j === 0)) continue;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          setFn(pos[i] + dx, pos[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
        }
      }
    }
  }

  const drawFormat = (mask: number) => {
    const d = (0 << 3) | mask; // error-correction level M = 00
    let rem = d;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const fbits = ((d << 10) | rem) ^ 0x5412;
    const bit = (i: number) => ((fbits >>> i) & 1) !== 0;
    for (let i = 0; i <= 5; i++) setFn(8, i, bit(i));
    setFn(8, 7, bit(6));
    setFn(8, 8, bit(7));
    setFn(7, 8, bit(8));
    for (let i = 9; i < 15; i++) setFn(14 - i, 8, bit(i));
    for (let i = 0; i < 8; i++) setFn(size - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i++) setFn(8, size - 15 + i, bit(i));
    setFn(8, size - 8, true);
  };
  drawFormat(0);

  if (version >= 7) {
    let rem = version;
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    const vbits = (version << 12) | rem;
    for (let i = 0; i < 18; i++) {
      const dark = ((vbits >>> i) & 1) !== 0;
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      setFn(a, b, dark);
      setFn(b, a, dark);
    }
  }

  // ---- place codewords ----
  let k = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vert : vert;
        if (!fn[y][x] && k < codewords.length * 8) {
          mod[y][x] = ((codewords[k >>> 3] >>> (7 - (k & 7))) & 1) !== 0;
          k++;
        }
      }
    }
  }

  // ---- masking ----
  const applyMask = (mask: number) => {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        let invert = false;
        switch (mask) {
          case 0: invert = (x + y) % 2 === 0; break;
          case 1: invert = y % 2 === 0; break;
          case 2: invert = x % 3 === 0; break;
          case 3: invert = (x + y) % 3 === 0; break;
          case 4: invert = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break;
          case 5: invert = ((x * y) % 2) + ((x * y) % 3) === 0; break;
          case 6: invert = (((x * y) % 2) + ((x * y) % 3)) % 2 === 0; break;
          default: invert = (((x + y) % 2) + ((x * y) % 3)) % 2 === 0; break;
        }
        if (!fn[y][x] && invert) mod[y][x] = !mod[y][x];
      }
    }
  };

  const penalty = (): number => {
    let result = 0;
    const lines = (get: (a: number, b: number) => boolean) => {
      for (let a = 0; a < size; a++) {
        let run = 1;
        for (let b = 1; b < size; b++) {
          if (get(a, b) === get(a, b - 1)) {
            run++;
            if (run === 5) result += 3;
            else if (run > 5) result += 1;
          } else run = 1;
        }
        // finder-like pattern 1011101 with 4 light modules on a side
        for (let b = 0; b + 6 < size; b++) {
          if (
            get(a, b) && !get(a, b + 1) && get(a, b + 2) && get(a, b + 3) && get(a, b + 4) && !get(a, b + 5) && get(a, b + 6)
          ) {
            const before = [1, 2, 3, 4].every((d) => b - d < 0 || !get(a, b - d));
            const after = [7, 8, 9, 10].every((d) => b + d >= size || !get(a, b + d));
            if (before || after) result += 40;
          }
        }
      }
    };
    lines((y, x) => mod[y][x]);
    lines((x, y) => mod[y][x]);
    for (let y = 0; y < size - 1; y++) {
      for (let x = 0; x < size - 1; x++) {
        const c = mod[y][x];
        if (c === mod[y][x + 1] && c === mod[y + 1][x] && c === mod[y + 1][x + 1]) result += 3;
      }
    }
    let dark = 0;
    for (const row of mod) for (const c of row) if (c) dark++;
    const total = size * size;
    result += (Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1) * 10;
    return result;
  };

  let bestMask = 0;
  let bestPenalty = Infinity;
  for (let m = 0; m < 8; m++) {
    applyMask(m);
    drawFormat(m);
    const p = penalty();
    if (p < bestPenalty) {
      bestPenalty = p;
      bestMask = m;
    }
    applyMask(m); // undo
  }
  applyMask(bestMask);
  drawFormat(bestMask);
  return mod;
}

/** Inline SVG QR code. Renders nothing if the text cannot be encoded. */
export const QrSvg: React.FC<{ text: string; size?: number; dark?: string; light?: string }> = ({
  text,
  size = 88,
  dark = "#1b1d21",
  light = "#ffffff",
}) => {
  let matrix: boolean[][];
  try {
    matrix = makeQr(text);
  } catch {
    return null;
  }
  const n = matrix.length;
  const quiet = 2;
  let d = "";
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (matrix[y][x]) d += `M${x + quiet},${y + quiet}h1v1h-1z`;
    }
  }
  return (
    <svg
      viewBox={`0 0 ${n + quiet * 2} ${n + quiet * 2}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      role="img"
      aria-label="Payment details QR code"
    >
      <rect width={n + quiet * 2} height={n + quiet * 2} fill={light} />
      <path d={d} fill={dark} />
    </svg>
  );
};

/* ================================================================== */
/* share (WhatsApp / e-mail) + payment text                            */
/* ================================================================== */

export interface BankProfile {
  legalName?: string;
  bankName?: string;
  bankAccountTitle?: string;
  bankIban?: string;
  invoiceFooter?: string;
}

export const hasBankDetails = (p?: BankProfile | null): boolean =>
  !!p && !!(p.bankName || p.bankAccountTitle || p.bankIban);

/**
 * Digits only, ready for wa.me. Numbers starting with + or 00 are taken as
 * international; a leading 0 or a short national number gets the company's
 * country dial code (Pakistan 92, UK 44, US/Canada 1 ...). Returns "" if unusable.
 */
export function normalizePhone(raw: unknown, dial: string = getDefaultDialCode()): string {
  const text = String(raw ?? "").trim();
  let digits = text.replace(/[^\d]/g, "");
  if (!digits) return "";
  if (text.startsWith("+")) {
    // already international
  } else if (digits.startsWith("00")) {
    digits = digits.slice(2);
  } else if (digits.startsWith("0")) {
    if (!dial) return "";
    digits = dial + digits.slice(1);
  } else if (dial && !digits.startsWith(dial) && digits.length <= 10) {
    digits = dial + digits;
  }
  return digits.length >= 8 ? digits : "";
}

/** sms: link (used for clients in countries where SMS beats WhatsApp) */
export const smsUrl = (phone: string, message: string): string =>
  `sms:${phone ? "+" + phone : ""}?body=${encodeURIComponent(message)}`;

const cut = (s: unknown, n: number): string => String(s ?? "").trim().slice(0, n);

/** Text encoded in the invoice QR: bank details + reference + amount due. */
export function buildPaymentQrText(
  p: BankProfile,
  invoiceNumber: string,
  currency: string,
  balance: number,
): string {
  const lines = [
    p.bankAccountTitle ? `Account Title: ${cut(p.bankAccountTitle, 40)}` : "",
    p.bankName ? `Bank: ${cut(p.bankName, 30)}` : "",
    p.bankIban ? `IBAN: ${cut(p.bankIban, 34)}` : "",
    `Reference: ${cut(invoiceNumber, 20)}`,
    `Amount: ${currency} ${Math.round(balance * 100) / 100}`,
  ].filter(Boolean);
  return lines.join("\n");
}

export interface InvoiceShareInput {
  clientName: string;
  companyName: string;
  invoiceNumber: string;
  dueDate: string;
  total: string;
  paid: string;
  balance: string;
  profile?: BankProfile | null;
}

export function buildInvoiceMessage(i: InvoiceShareInput): string {
  const lines = [
    `Hello ${i.clientName},`,
    "",
    `Invoice ${i.invoiceNumber} from ${i.companyName}`,
    `Total: ${i.total}`,
    `Paid: ${i.paid}`,
    `Balance due: ${i.balance}`,
    `Due date: ${i.dueDate}`,
  ];
  if (hasBankDetails(i.profile)) {
    const p = i.profile as BankProfile;
    lines.push("", "Payment details:");
    if (p.bankAccountTitle) lines.push(`Account title: ${p.bankAccountTitle}`);
    if (p.bankName) lines.push(`Bank: ${p.bankName}`);
    if (p.bankIban) lines.push(`IBAN: ${p.bankIban}`);
  }
  lines.push("", `Please use ${i.invoiceNumber} as the payment reference.`, "Thank you!");
  return lines.join("\n");
}

export const whatsappUrl = (phone: string, message: string): string =>
  `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

export const mailtoUrl = (email: string, subject: string, body: string): string =>
  `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

/* ================================================================== */
/* ageing                                                              */
/* ================================================================== */

export type AgeBucket = "current" | "d1_30" | "d31_60" | "d61_90" | "d90p";

export const AGE_BUCKETS: { key: AgeBucket; label: string; color: string }[] = [
  { key: "current", label: "Not yet due", color: "#34d399" },
  { key: "d1_30", label: "1-30 days", color: "#fbbf24" },
  { key: "d31_60", label: "31-60 days", color: "#fb923c" },
  { key: "d61_90", label: "61-90 days", color: "#fb7185" },
  { key: "d90p", label: "90+ days", color: "#e11d48" },
];

export interface AgeingRow {
  client: string;
  buckets: Record<AgeBucket, number>;
  total: number;
  invoices: number;
}

export interface AgeingReport {
  totals: Record<AgeBucket, number>;
  counts: Record<AgeBucket, number>;
  total: number;
  invoices: number;
  rows: AgeingRow[];
}

const emptyBuckets = (): Record<AgeBucket, number> => ({ current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90p: 0 });

const dayNumber = (iso: string): number => {
  const [y, m, d] = String(iso).slice(0, 10).split("-").map(Number);
  return Math.floor(Date.UTC(y, (m || 1) - 1, d || 1) / 86400000);
};

export const bucketFor = (daysPastDue: number): AgeBucket =>
  daysPastDue <= 0 ? "current" : daysPastDue <= 30 ? "d1_30" : daysPastDue <= 60 ? "d31_60" : daysPastDue <= 90 ? "d61_90" : "d90p";

export function ageingReport(invoices: any[], todayIso: string): AgeingReport {
  const today = dayNumber(todayIso);
  const totals = emptyBuckets();
  const counts = emptyBuckets();
  const byClient = new Map<string, AgeingRow>();
  let total = 0;
  let count = 0;

  for (const inv of invoices) {
    if (["paid", "cancelled", "draft"].includes(inv.status)) continue;
    const balance = (Number(inv.total_amount) || 0) - (Number(inv.amount_paid) || 0);
    if (!(balance > 0)) continue;
    const bucket = bucketFor(inv.due_date ? today - dayNumber(inv.due_date) : 0);
    totals[bucket] += balance;
    counts[bucket] += 1;
    total += balance;
    count += 1;
    const name = String(inv.client_name || "Unknown client");
    const row = byClient.get(name) ?? { client: name, buckets: emptyBuckets(), total: 0, invoices: 0 };
    row.buckets[bucket] += balance;
    row.total += balance;
    row.invoices += 1;
    byClient.set(name, row);
  }
  const rows = [...byClient.values()].sort((a, b) => b.total - a.total);
  return { totals, counts, total, invoices: count, rows };
}

/* ================================================================== */
/* cash flow (last N months)                                           */
/* ================================================================== */

export interface MonthFlow {
  key: string;
  label: string;
  income: number;
  expense: number;
  net: number;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function monthlyCashFlow(payments: any[], expenses: any[], months: number, todayIso: string): MonthFlow[] {
  const [ty, tm] = todayIso.split("-").map(Number);
  const out: MonthFlow[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const idx = ty * 12 + (tm - 1) - i;
    const y = Math.floor(idx / 12);
    const m = idx % 12;
    out.push({ key: `${y}-${String(m + 1).padStart(2, "0")}`, label: MONTHS[m], income: 0, expense: 0, net: 0 });
  }
  const byKey = new Map(out.map((o) => [o.key, o]));
  for (const p of payments) {
    const row = byKey.get(String(p.payment_date || "").slice(0, 7));
    if (row) row.income += Number(p.amount) || 0;
  }
  for (const e of expenses) {
    const row = byKey.get(String(e.expense_date || "").slice(0, 7));
    if (row) row.expense += Number(e.amount) || 0;
  }
  for (const row of out) row.net = row.income - row.expense;
  return out;
}

/* ================================================================== */
/* campaign profitability                                              */
/* ================================================================== */

export interface CampaignProfitRow {
  id: string;
  name: string;
  client: string;
  status: string;
  invoiced: number;
  collected: number;
  expenses: number;
  profit: number;
  margin: number | null;
}

export function campaignProfit(
  campaigns: any[],
  invoices: any[],
  expenses: any[],
): { rows: CampaignProfitRow[]; unlinked: CampaignProfitRow | null } {
  const rows: CampaignProfitRow[] = campaigns.map((c) => {
    const inv = invoices.filter((i) => i.campaign_id === c.id && i.status !== "cancelled");
    const invoiced = inv.reduce((n, i) => n + (Number(i.total_amount) || 0), 0);
    const collected = inv.reduce((n, i) => n + (Number(i.amount_paid) || 0), 0);
    const spent = expenses.filter((e) => e.campaign_id === c.id).reduce((n, e) => n + (Number(e.amount) || 0), 0);
    const profit = collected - spent;
    return {
      id: String(c.id),
      name: String(c.name ?? "Campaign"),
      client: String(c.client_name ?? ""),
      status: String(c.status ?? ""),
      invoiced,
      collected,
      expenses: spent,
      profit,
      margin: collected > 0 ? (profit / collected) * 100 : null,
    };
  });

  const known = new Set(campaigns.map((c) => c.id));
  const looseInv = invoices.filter((i) => (!i.campaign_id || !known.has(i.campaign_id)) && i.status !== "cancelled");
  const looseExp = expenses.filter((e) => !e.campaign_id || !known.has(e.campaign_id));
  const invoiced = looseInv.reduce((n, i) => n + (Number(i.total_amount) || 0), 0);
  const collected = looseInv.reduce((n, i) => n + (Number(i.amount_paid) || 0), 0);
  const spent = looseExp.reduce((n, e) => n + (Number(e.amount) || 0), 0);
  const unlinked: CampaignProfitRow | null =
    invoiced || collected || spent
      ? {
          id: "unlinked",
          name: "Not linked to a campaign",
          client: "",
          status: "",
          invoiced,
          collected,
          expenses: spent,
          profit: collected - spent,
          margin: collected > 0 ? ((collected - spent) / collected) * 100 : null,
        }
      : null;

  return {
    rows: rows.filter((r) => r.invoiced || r.collected || r.expenses).sort((a, b) => b.profit - a.profit),
    unlinked,
  };
}
