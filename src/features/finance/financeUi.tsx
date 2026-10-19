import React, { useEffect } from "react";
import { FiX } from "react-icons/fi";

/**
 * Finance-only design tokens and small UI helpers.
 * (Kept local to /features/finance so the shared Drawer / Modal used by other
 * pages are not touched.)
 */

export const FIN = {
  /** outer wrapper of the Finance page */
  page: "w-full min-w-0 rounded-2xl bg-[#0b0d10] p-3 font-sans text-zinc-200 md:p-4",
  /** dark glass panel */
  panel:
    "rounded-xl border border-[#2a2f37] bg-gradient-to-b from-[#171a20] to-[#0f1216] shadow-[0_8px_24px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.03)]",
  /** form label */
  label: "mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400",
  /** text input / select */
  input:
    "w-full rounded-lg border border-[#2b3038] bg-[#0f1216] px-2.5 py-2 text-[12px] text-zinc-100 placeholder:text-zinc-600 outline-none transition [color-scheme:dark] focus:border-[#c99b3b]/70 focus:ring-1 focus:ring-[#c99b3b]/30",
  /** tiny input used inside tables */
  cellInput:
    "w-full rounded-md border border-transparent bg-transparent px-1.5 py-1 text-[12px] text-zinc-100 outline-none transition [color-scheme:dark] hover:border-[#2b3038] focus:border-[#c99b3b]/60 focus:bg-[#0f1216]",
  /** primary (gold) button */
  btnGold:
    "inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#f6e2a1]/40 bg-gradient-to-b from-[#f1d68a] via-[#d4a93f] to-[#a97b22] px-3.5 py-2 text-[12px] font-semibold text-[#1a1204] shadow-[0_4px_14px_rgba(201,155,59,0.25)] transition hover:brightness-110 disabled:opacity-50",
  /** destructive-ish primary (used by Save Expense) */
  btnRose:
    "inline-flex items-center justify-center gap-1.5 rounded-lg border border-rose-300/30 bg-gradient-to-b from-rose-500 to-rose-700 px-3.5 py-2 text-[12px] font-semibold text-white shadow-[0_4px_14px_rgba(244,63,94,0.25)] transition hover:brightness-110 disabled:opacity-50",
  /** quiet button */
  btnGhost:
    "inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#2b3038] bg-[#12151a] px-3 py-1.5 text-[11px] font-medium text-zinc-200 transition hover:border-[#c99b3b]/50 hover:text-white",
  /** quiet text button (Cancel) */
  btnText:
    "rounded-lg px-3 py-2 text-[12px] font-medium text-zinc-400 transition hover:text-zinc-100",
  /** modal card used by the three forms */
  modal:
    "relative max-h-[90vh] w-full overflow-y-auto rounded-2xl border border-[#c99b3b]/25 bg-gradient-to-b from-[#171a20] to-[#0e1115] p-5 text-zinc-200 shadow-[0_24px_60px_rgba(0,0,0,0.65)]",
  /** overlay behind a modal */
  overlay: "fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm",
  /** ivory paper used for printable documents */
  paper:
    "rounded-lg bg-[#fbf9f4] text-[#1b1d21] shadow-[0_10px_30px_rgba(0,0,0,0.45)] ring-1 ring-[#c99b3b]/30",
} as const;

/** Gold / silver metallic cards (same look as the dashboard). */
export const GOLD_CARD: React.CSSProperties = {
  background:
    "linear-gradient(135deg,#f1d68a 0%,#c99b3b 28%,#ecd07c 50%,#a97b22 76%,#d8b257 100%)",
  boxShadow: "0 8px 20px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.45)",
};

export const SILVER_CARD: React.CSSProperties = {
  background:
    "linear-gradient(135deg,#eceff2 0%,#a8aeb6 38%,#d9dde2 58%,#8b929b 100%)",
  boxShadow: "0 8px 20px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.5)",
};

/** Shrink the font so long values never overflow their card. */
export const fit = (text: string, maxPx: number, boxPx = 150): number =>
  Math.max(12, Math.min(maxPx, Math.floor(boxPx / (Math.max(1, text.length) * 0.58))));

/** Status pill used on invoice lists and the invoice drawer. */
export const statusPill = (status: string): { cls: string; dot: string } => {
  if (status === "paid") return { cls: "text-emerald-300 bg-emerald-400/10 border-emerald-400/30", dot: "bg-emerald-400" };
  if (status === "overdue") return { cls: "text-rose-300 bg-rose-400/10 border-rose-400/30", dot: "bg-rose-400" };
  return { cls: "text-amber-300 bg-amber-400/10 border-amber-400/30", dot: "bg-amber-400" };
};

/** Section heading with a gold marker. */
export const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="flex items-center gap-2 text-[12px] font-semibold tracking-wide text-zinc-100">
    <span className="h-3 w-[3px] rounded-full bg-gradient-to-b from-[#f1d68a] to-[#a97b22]" />
    {children}
  </h2>
);

/** Modal heading (gold hairline underneath). */
export const ModalTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="mb-4 border-b border-[#2a2f37] pb-3">
    <h2 className="text-[15px] font-semibold tracking-tight text-zinc-50">{children}</h2>
    <div className="mt-2 h-px w-14 bg-gradient-to-r from-[#f1d68a] to-transparent" />
  </div>
);

/**
 * Right-hand drawer with the Finance look. Same props / behaviour as the
 * shared <Drawer> (Escape closes it, click on the backdrop closes it).
 */
export const FDrawer: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  width?: string;
}> = ({ open, onClose, title, subtitle, children, width = "max-w-[560px]" }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <div className="fixed inset-0 z-40 pointer-events-none" aria-hidden={!open}>
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-[2px] transition-opacity duration-300 ${
          open ? "pointer-events-auto opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />
      <div
        className={`absolute right-0 top-0 flex h-full w-full ${width} flex-col border-l border-[#c99b3b]/20 bg-gradient-to-b from-[#14171c] to-[#0b0d10] shadow-2xl transition-transform duration-300 ease-out ${
          open ? "pointer-events-auto translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex shrink-0 items-start justify-between border-b border-[#2a2f37] px-5 py-4">
          <div className="min-w-0">
            <h3 className="truncate text-[15px] font-semibold tracking-tight text-zinc-50">{title}</h3>
            {subtitle && <p className="mt-0.5 truncate text-[11px] text-[#d9b45a]">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-md p-1.5 text-zinc-400 transition hover:bg-white/5 hover:text-zinc-100"
          >
            <FiX size={16} />
          </button>
        </div>
        <div className="grow overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
};
