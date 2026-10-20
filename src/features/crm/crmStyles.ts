import type { ClientHealth } from "./crmTools";

/** Badge look for the client health levels (shared by the table, drawer and insights). */
export const HEALTH_STYLE: Record<ClientHealth, { label: string; cls: string }> = {
  good: { label: "Good", cls: "border-emerald-400/40 bg-emerald-500/10 text-emerald-300" },
  watch: { label: "Watch", cls: "border-amber-400/40 bg-amber-500/10 text-amber-300" },
  at_risk: { label: "At risk", cls: "border-rose-400/40 bg-rose-500/10 text-rose-300" },
};
