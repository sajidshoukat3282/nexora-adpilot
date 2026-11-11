import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { UpgradeButton } from "@/components/billing/UpgradeButton";

const EVENT = "adpilot:plan-lock";
let installed = false;

/** Watches every fetch call: when the server says the plan blocks it, tell the popup. */
function installPlanLockWatcher() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  const original = window.fetch.bind(window);
  window.fetch = async (...args: Parameters<typeof fetch>) => {
    const res = await original(...args);
    if (res.status === 403) {
      res
        .clone()
        .json()
        .then((j) => {
          if (j && (j.error === "PLAN_LOCKED" || j.error === "PLAN_LIMIT")) {
            window.dispatchEvent(new CustomEvent(EVENT, { detail: { message: String(j.message || ""), kind: String(j.error) } }));
          }
        })
        .catch(() => undefined);
    }
    return res;
  };
}
installPlanLockWatcher();

export function PlanLockModal() {
  const [info, setInfo] = useState<{ message: string; kind: string } | null>(null);

  useEffect(() => {
    const handler = (e: Event) => setInfo((e as CustomEvent).detail);
    window.addEventListener(EVENT, handler);
    return () => window.removeEventListener(EVENT, handler);
  }, []);

  if (!info) return null;
  const limit = info.kind === "PLAN_LIMIT";

  return createPortal(
    <div className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/70 p-4" onClick={() => setInfo(null)}>
      <div
        className="w-full max-w-sm rounded-2xl border border-[#c99b3b]/40 bg-[#0d1117] p-5 text-white shadow-2xl"
        onClick={(e: { stopPropagation: () => void }) => e.stopPropagation()}
      >
        <div className="text-[11px] font-semibold uppercase tracking-wider text-[#c99b3b]">
          {limit ? "Plan limit reached" : "Not in your plan"}
        </div>
        <p className="mt-2 text-[14px] leading-relaxed text-white/90">
          {info.message || "This feature is not included in your current plan."}
        </p>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setInfo(null)}
            className="rounded-lg border border-white/15 px-3 py-1 text-[12px] text-white/70 hover:text-white"
          >
            Not now
          </button>
          <UpgradeButton />
        </div>
      </div>
    </div>,
    document.body,
  );
}
