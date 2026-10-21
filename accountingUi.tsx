import React from "react";
import { FIN, ModalTitle } from "./financeUi";

export const fmt = (n: number, currency: string): string =>
  `${currency} ${(Number(n) || 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

/** "PKR 1,000 / USD 20", or a dash when empty. */
export const fmtMap = (m: Record<string, number>, fallbackCurrency: string): string => {
  const parts = Object.entries(m).filter(([, v]) => v > 0).map(([c, v]) => fmt(v, c));
  return parts.length ? parts.join(" / ") : fmt(0, fallbackCurrency);
};

export const AccModal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }> = ({
  title,
  onClose,
  children,
  wide,
}) => (
  <div className={FIN.overlay} onClick={onClose}>
    <div className={`${FIN.modal} ${wide ? "max-w-2xl" : "max-w-lg"}`} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
      <ModalTitle>{title}</ModalTitle>
      {children}
    </div>
  </div>
);

export const Field: React.FC<{ label: string; children: React.ReactNode; className?: string }> = ({ label, children, className }) => (
  <div className={className}>
    <label className={FIN.label}>{label}</label>
    {children}
  </div>
);

export const ModalActions: React.FC<{ onClose: () => void; busy?: boolean; submitLabel: string; extra?: React.ReactNode }> = ({
  onClose,
  busy,
  submitLabel,
  extra,
}) => (
  <div className="mt-5 flex items-center justify-between gap-2 border-t border-[#2a2f37] pt-3.5">
    <div>{extra}</div>
    <div className="flex gap-2">
      <button type="button" onClick={onClose} className={FIN.btnText}>Cancel</button>
      <button type="submit" disabled={busy} className={FIN.btnGold}>{busy ? "Saving..." : submitLabel}</button>
    </div>
  </div>
);

export const Notice: React.FC<{ tone: "ok" | "error"; children: React.ReactNode }> = ({ tone, children }) => (
  <div
    role="status"
    className={`mb-3 rounded-lg border px-3 py-2 text-[12px] ${
      tone === "ok" ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" : "border-rose-400/30 bg-rose-400/10 text-rose-300"
    }`}
  >
    {children}
  </div>
);

export const Kpi: React.FC<{ label: string; value: string; tone?: "gold" | "rose" | "amber" | "emerald" | "zinc"; hint?: string }> = ({
  label,
  value,
  tone = "zinc",
  hint,
}) => {
  const color = { gold: "text-[#f1d68a]", rose: "text-rose-300", amber: "text-amber-300", emerald: "text-emerald-300", zinc: "text-zinc-100" }[tone];
  return (
    <div className="rounded-xl border border-[#22262d] bg-[#0f1216] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">{label}</p>
      <p className={`mt-1 break-words text-[15px] font-semibold leading-tight ${color}`}>{value}</p>
      {hint && <p className="mt-0.5 text-[10px] text-zinc-500">{hint}</p>}
    </div>
  );
};

export const errText = (e: unknown): string => (e instanceof Error ? e.message : "Something went wrong.");

export const TH = "px-2.5 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400";
export const TD = "px-2.5 py-2.5";
