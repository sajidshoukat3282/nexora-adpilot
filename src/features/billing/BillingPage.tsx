import { useCallback, useEffect, useState } from "react";
import { useSession } from "@/hooks/useSession";
import { apiRequest } from "@/lib/api/client";
import { UpgradeButton } from "@/components/billing/UpgradeButton";
import { PLAN_OFFERS, type Cycle, type PlanKey } from "@/lib/billing/plans";

interface Usage {
  ok: boolean;
  subscription: { plan: string; status: string; cycle: string; renewsAt: string | null; paid: boolean } | null;
  limits: { screens: number | null; seats: number | null; storageMb: number } | null;
  usage: { screens: number; seats: number; storageMb: number };
}

const fmtMb = (mb: number) => (mb >= 1024 ? (mb / 1024).toFixed(mb % 1024 === 0 ? 0 : 1) + " GB" : mb + " MB");

function Meter({ label, used, limit, fmt }: { label: string; used: number; limit: number | null; fmt?: (n: number) => string }) {
  const f = fmt || ((n: number) => String(n));
  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  return (
    <div>
      <div className="flex justify-between text-[12px] text-white/80">
        <span>{label}</span>
        <span>{f(used)} / {limit === null ? "Unlimited" : f(limit)}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded bg-white/10">
        <div className={"h-full rounded " + (pct >= 90 ? "bg-red-500" : "bg-[#c99b3b]")} style={{ width: (limit === null ? 4 : Math.max(pct, 2)) + "%" }} />
      </div>
    </div>
  );
}

export function BillingPage() {
  const { session } = useSession();
  const [data, setData] = useState<Usage | null>(null);
  const [cycle, setCycle] = useState<Cycle>("monthly");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const canManage = !!(session as any)?.permissions?.includes("company.manage");

  const load = useCallback(() => {
    apiRequest<Usage>("/api/billing/usage").then(setData).catch(() => setData(null));
  }, []);
  useEffect(() => { load(); }, [load]);

  const sub = data?.subscription || null;
  const paid = !!sub?.paid;
  const current = PLAN_OFFERS.find((p) => p.key === sub?.plan);

  const changePlan = async (plan: PlanKey, name: string) => {
    if (!window.confirm("Switch to " + name + " (" + cycle + ")? Paddle charges or credits the difference for the rest of this billing period.")) return;
    setBusy(true); setMsg(null);
    try {
      const r = await apiRequest<{ message?: string }>("/api/billing/change-plan", { method: "POST", body: JSON.stringify({ plan, cycle }) });
      setMsg({ ok: true, text: r.message || "Plan change requested." });
      setTimeout(() => window.location.reload(), 5000);
    } catch (e: any) {
      setMsg({ ok: false, text: e?.message || "Could not change the plan." });
    } finally { setBusy(false); }
  };

  const openPortal = async () => {
    setBusy(true); setMsg(null);
    try {
      const r = await apiRequest<{ url: string }>("/api/billing/portal", { method: "POST", body: "{}" });
      window.open(r.url, "_blank", "noopener");
    } catch (e: any) {
      setMsg({ ok: false, text: e?.message || "Could not open the billing portal." });
    } finally { setBusy(false); }
  };

  const card = "rounded-xl border border-white/10 bg-white/[0.03] p-5";

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 text-white">
      <div>
        <h1 className="text-xl font-semibold">Billing and plan</h1>
        <p className="text-[12px] text-white/60">Your subscription, usage and payment details.</p>
      </div>

      {msg && (
        <div className={"rounded-lg border px-3 py-2 text-[13px] " + (msg.ok ? "border-emerald-500/40 text-emerald-300" : "border-red-500/40 text-red-300")}>{msg.text}</div>
      )}

      <div className={card}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-white/50">Current plan</div>
            <div className="mt-1 text-2xl font-bold">{paid ? current?.name || sub?.plan : "Free trial"}</div>
            {paid && sub && (
              <div className="mt-1 text-[12px] text-white/60">
                {sub.cycle === "annual" ? "Billed yearly" : "Billed monthly"} &middot; Status: {sub.status}
                {sub.renewsAt ? " · Renews " + new Date(sub.renewsAt).toLocaleDateString() : ""}
              </div>
            )}
            {!paid && <div className="mt-1 text-[12px] text-white/60">Choose a plan to keep using AdPilot after your trial.</div>}
          </div>
          <div className="flex items-center gap-2">
            {paid && canManage && (
              <button type="button" disabled={busy} onClick={openPortal} className="rounded-lg border border-[#c99b3b] px-3 py-1.5 text-[12px] font-semibold text-[#c99b3b] disabled:opacity-50">
                Payment method, invoices and cancel
              </button>
            )}
            {!paid && <UpgradeButton />}
          </div>
        </div>
      </div>

      {data && (
        <div className={card + " space-y-4"}>
          <div className="text-[11px] uppercase tracking-wider text-white/50">Usage</div>
          <Meter label="Screens" used={data.usage.screens} limit={data.limits ? data.limits.screens : null} />
          <Meter label="Team members" used={data.usage.seats} limit={data.limits ? data.limits.seats : null} />
          <Meter label="File storage" used={data.usage.storageMb} limit={data.limits ? data.limits.storageMb : null} fmt={fmtMb} />
          {!data.limits && <div className="text-[11px] text-white/50">Limits apply once you subscribe to a plan.</div>}
        </div>
      )}

      {paid && canManage && (
        <div className={card}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-[11px] uppercase tracking-wider text-white/50">Change plan</div>
            <div className="inline-flex rounded-lg border border-white/10 p-1 text-[12px]">
              {(["monthly", "annual"] as Cycle[]).map((c) => (
                <button key={c} type="button" onClick={() => setCycle(c)} className={"rounded-md px-3 py-1 font-medium " + (cycle === c ? "bg-[#c99b3b] text-black" : "text-white/70")}>
                  {c === "monthly" ? "Monthly" : "Yearly (2 months free)"}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {PLAN_OFFERS.map((p) => {
              const isCurrent = p.key === sub?.plan && cycle === (sub?.cycle === "annual" ? "annual" : "monthly");
              return (
                <div key={p.key} className={"flex flex-col rounded-xl border p-4 " + (isCurrent ? "border-[#c99b3b]" : "border-white/10")}>
                  <div className="text-[14px] font-semibold">{p.name}</div>
                  <div className="mt-2 text-xl font-bold">${cycle === "monthly" ? p.monthly : p.annual}<span className="text-[12px] font-normal text-white/50">{cycle === "monthly" ? "/month" : "/year"}</span></div>
                  <ul className="mt-2 flex-1 space-y-1 text-[12px] text-white/70">
                    {p.highlights.map((h) => (<li key={h}>&#10003; {h}</li>))}
                  </ul>
                  <button type="button" disabled={busy || isCurrent} onClick={() => changePlan(p.key, p.name)} className="mt-3 rounded-lg bg-[#c99b3b] px-3 py-1.5 text-[12px] font-semibold text-black disabled:opacity-40">
                    {isCurrent ? "Current plan" : "Switch to " + p.name}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default BillingPage;
