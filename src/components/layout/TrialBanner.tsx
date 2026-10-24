import React, { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api/client";

interface TrialStatus {
  ok: boolean; trial: boolean; days_left?: number; expired?: boolean; days_total?: number;
  limits?: { screens: number; campaigns: number; clients: number; proposals: number; invoices: number; storage_mb: number };
}

/** Slim bar at the top of the app for companies on the free trial. Nothing is shown for paid and older companies. */
export const TrialBanner: React.FC = () => {
  const [t, setT] = useState<TrialStatus | null>(null);
  useEffect(() => {
    let live = true;
    apiRequest<TrialStatus>("/api/trial/status").then((r) => { if (live) setT(r); }).catch(() => undefined);
    return () => { live = false; };
  }, []);
  if (!t || !t.trial) return null;
  const l = t.limits;
  if (t.expired) {
    return (
      <div className="mb-4 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-[12px] text-rose-200">
        <b>Your free trial has ended.</b> Your data is safe and you can still view everything. New work is paused until you subscribe.
        You can download all your data any time from Admin, Export all my data.
      </div>
    );
  }
  return (
    <div className="mb-4 rounded-xl border border-[#c99b3b]/30 bg-[#c99b3b]/10 px-4 py-2.5 text-[12px] text-[#f1d68a]">
      <b>Free trial: {t.days_left} {t.days_left === 1 ? "day" : "days"} left.</b>
      {l && (
        <span className="ml-2 text-[#e7cf93]/80">
          Includes up to {l.screens} screens, {l.campaigns} campaigns, {l.clients} clients, {l.proposals} proposals, {l.invoices} invoices and {l.storage_mb} MB of files.
        </span>
      )}
    </div>
  );
};
