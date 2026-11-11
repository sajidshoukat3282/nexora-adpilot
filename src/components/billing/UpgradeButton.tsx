import { useState } from "react";
import { createPortal } from "react-dom";
import { useSession } from "@/hooks/useSession";
import { usePaddle } from "@/hooks/usePaddle";
import { PLAN_OFFERS, PRICE_IDS, type Cycle, type PlanKey } from "@/lib/billing/plans";

const WHATSAPP = "https://wa.me/923324646394";

export function UpgradeButton() {
  const [open, setOpen] = useState(false);
  const [cycle, setCycle] = useState<Cycle>("monthly");
  const { ready, openCheckout } = usePaddle();
  const { session } = useSession();

  const choose = (key: PlanKey) => {
    const priceId = PRICE_IDS[key]?.[cycle];
    if (!priceId) return;
    setOpen(false);
    openCheckout({
      priceId,
      customData: session?.companyId ? { company_id: session.companyId } : undefined,
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="ml-3 rounded-lg bg-[#c99b3b] px-3 py-1 text-[12px] font-semibold text-black"
      >
        Upgrade
      </button>
      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-black/70 p-4"
            onClick={() => setOpen(false)}
          >
            <div
              className="w-full max-w-5xl rounded-2xl border border-white/10 bg-[#0d1117] p-5 text-white shadow-2xl"
              onClick={(e: { stopPropagation: () => void }) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Choose your plan</h2>
                  <p className="text-[12px] text-white/60">Secure checkout by Paddle. Cancel anytime.</p>
                </div>
                <button type="button" onClick={() => setOpen(false)} className="text-white/60 hover:text-white" aria-label="Close">
                  &#x2715;
                </button>
              </div>

              <div className="mt-4 inline-flex rounded-lg border border-white/10 p-1 text-[12px]">
                {(["monthly", "annual"] as Cycle[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCycle(c)}
                    className={"rounded-md px-3 py-1 font-medium " + (cycle === c ? "bg-[#c99b3b] text-black" : "text-white/70")}
                  >
                    {c === "monthly" ? "Monthly" : "Yearly (2 months free)"}
                  </button>
                ))}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {PLAN_OFFERS.map((p) => {
                  const hasPrice = !!PRICE_IDS[p.key]?.[cycle];
                  const price = cycle === "monthly" ? p.monthly : p.annual;
                  const featured = p.key === "professional";
                  return (
                    <div
                      key={p.key}
                      className={"flex flex-col rounded-xl border p-4 " + (featured ? "border-[#c99b3b]" : "border-white/10")}
                    >
                      <div className="text-[14px] font-semibold">{p.name}</div>
                      <div className="text-[11px] text-white/50">{p.tagline}</div>
                      <div className="mt-3 text-2xl font-bold">
                        ${price}
                        <span className="text-[12px] font-normal text-white/50">{cycle === "monthly" ? "/month" : "/year"}</span>
                      </div>
                      <ul className="mt-3 flex-1 space-y-1 text-[12px] text-white/75">
                        {p.highlights.map((h) => (
                          <li key={h}>&#10003; {h}</li>
                        ))}
                      </ul>
                      {hasPrice ? (
                        <button
                          type="button"
                          disabled={!ready}
                          onClick={() => choose(p.key)}
                          className="mt-4 rounded-lg bg-[#c99b3b] px-3 py-2 text-[12px] font-semibold text-black disabled:opacity-50"
                        >
                          Choose {p.name}
                        </button>
                      ) : (
                        <a
                          href={WHATSAPP}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-4 rounded-lg border border-[#c99b3b] px-3 py-2 text-center text-[12px] font-semibold text-[#c99b3b]"
                        >
                          Contact us
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
