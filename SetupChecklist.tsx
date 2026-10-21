import React from "react";
import { useNavigate } from "@/lib/router";
import { FIN } from "../finance/financeUi";
import type { SetupStatus } from "@/lib/api/admin";
import { SETUP_STEPS, setupProgress } from "./setupSteps";

export const SetupChecklist: React.FC<{
  status: SetupStatus | null;
  compact?: boolean;
  onNavigate?: () => void;
}> = ({ status, compact, onNavigate }) => {
  const navigate = useNavigate();
  const p = setupProgress(status);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-[11px]">
        <span className="text-zinc-400">
          {p.done} of {p.total} steps done
        </span>
        <span className="font-semibold text-[#f1d68a]">{p.pct}%</span>
      </div>
      <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-[#0f1216]">
        <div className="h-full rounded-full bg-gradient-to-r from-[#f1d68a] to-[#a97b22] transition-all" style={{ width: `${p.pct}%` }} />
      </div>
      <ul className="space-y-1.5">
        {SETUP_STEPS.map((step, i) => {
          const done = status ? step.done(status) : false;
          return (
            <li key={step.id} className="flex items-center gap-2.5 rounded-lg border border-[#22262d] bg-[#0f1216] px-2.5 py-2">
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${
                  done ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-300" : "border-[#2b3038] text-zinc-500"
                }`}
              >
                {done ? "\u{2713}" : i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className={`truncate text-[12px] font-medium ${done ? "text-zinc-500 line-through" : "text-zinc-100"}`}>
                  {step.title}
                  {step.optional && <span className="ml-1.5 text-[9px] uppercase tracking-wider text-zinc-500">optional</span>}
                </p>
                {!compact && <p className="truncate text-[11px] text-zinc-500">{step.desc}</p>}
              </div>
              {!done && (
                <button
                  type="button"
                  className={`${FIN.btnGhost} !px-2 !py-1 shrink-0`}
                  onClick={() => {
                    navigate(step.to);
                    onNavigate?.();
                  }}
                >
                  {step.cta}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
