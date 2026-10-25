import React, { useEffect, useRef, useState } from "react";
import { FiCalendar } from "react-icons/fi";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const monthStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);

/** Today's date in the top bar. Click it to open a calendar of the current month (arrows move to other months). */
export const DateCalendar: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<Date>(() => monthStart(new Date()));
  const box = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const today = new Date();
  const toggle = () => {
    if (!open) setView(monthStart(new Date()));
    setOpen((v) => !v);
  };
  const shift = (n: number) => setView((v) => new Date(v.getFullYear(), v.getMonth() + n, 1));

  const offset = (view.getDay() + 6) % 7; // week starts on Monday
  const days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);
  const isToday = (d: number) => d === today.getDate() && view.getMonth() === today.getMonth() && view.getFullYear() === today.getFullYear();
  const onCurrent = view.getMonth() === today.getMonth() && view.getFullYear() === today.getFullYear();

  return (
    <div className="relative hidden lg:block" ref={box}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Open calendar"
        title="Open calendar"
        className="flex items-center gap-1.5 rounded-md border border-[#2a2f37] bg-[#0f1216] px-2.5 py-1 text-[10.5px] text-zinc-400 transition-colors hover:border-[#c99b3b]/50 hover:text-zinc-100"
      >
        <FiCalendar size={12} className="text-[#d9b45a]" />
        {today.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Calendar"
          className="absolute right-0 top-full z-50 mt-2 w-[268px] rounded-xl border border-[#2a2f37] bg-gradient-to-b from-[#171a20] to-[#0f1216] p-3 shadow-[0_16px_40px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.03)]"
        >
          <div className="mb-2 flex items-center justify-between">
            <button type="button" onClick={() => shift(-1)} aria-label="Previous month" className="flex h-7 w-7 items-center justify-center rounded-md text-[16px] text-zinc-300 hover:bg-white/5 hover:text-[#f1d68a]">{"\u2039"}</button>
            <div className="text-[12px] font-semibold text-[#f1d68a]">{view.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</div>
            <button type="button" onClick={() => shift(1)} aria-label="Next month" className="flex h-7 w-7 items-center justify-center rounded-md text-[16px] text-zinc-300 hover:bg-white/5 hover:text-[#f1d68a]">{"\u203a"}</button>
          </div>
          <div className="grid grid-cols-7 gap-y-1 text-center">
            {WEEKDAYS.map((w) => (
              <div key={w} className="pb-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{w}</div>
            ))}
            {cells.map((d, i) =>
              d === null ? (
                <div key={i} />
              ) : (
                <div
                  key={i}
                  className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full text-[11px] ${
                    isToday(d)
                      ? "bg-gradient-to-b from-[#f1d68a] via-[#d4a93f] to-[#a97b22] font-bold text-[#1a1204]"
                      : "text-zinc-300"
                  }`}
                  aria-current={isToday(d) ? "date" : undefined}
                >
                  {d}
                </div>
              ),
            )}
          </div>
          {!onCurrent && (
            <button type="button" onClick={() => setView(monthStart(new Date()))} className="mt-2 w-full rounded-md border border-[#2b3038] bg-[#12151a] py-1 text-[11px] text-zinc-200 hover:border-[#c99b3b]/50">
              Back to this month
            </button>
          )}
        </div>
      )}
    </div>
  );
};
