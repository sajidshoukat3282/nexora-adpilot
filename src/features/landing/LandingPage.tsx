import { useNavigate } from "@/lib/router";
import { PLAN_OFFERS } from "@/lib/billing/plans";
import { LegalLinks } from "@/components/LegalLinks";

const FEATURES = [
  { title: "Screens and inventory", text: "Keep every billboard and digital screen in one place, with availability, rates and booking status." },
  { title: "Campaigns and proposals", text: "Plan campaigns, build proposals and track bookings from the first quote to final delivery." },
  { title: "Invoices and finance", text: "Send invoices, record expenses and follow payments from your clients." },
  { title: "Live operations", text: "Track proof of play and field photos with a GPS check, so clients can trust your reports." },
  { title: "CRM and client portal", text: "Manage leads and follow-ups, and give clients a portal for approvals and campaign reports." },
  { title: "Team and roles", text: "Invite your team with permissions that match each person's job." },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const primary = "rounded-lg bg-[#c99b3b] px-5 py-2.5 text-sm font-semibold text-black hover:brightness-110";
  const secondary = "rounded-lg border border-[#c99b3b] px-5 py-2.5 text-sm font-semibold text-[#c99b3b] hover:bg-[#c99b3b]/10";

  return (
    <div className="min-h-screen bg-ink-950 text-ink-50">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
        <span className="text-lg font-bold">Nexora AdPilot</span>
        <button type="button" onClick={() => navigate("/login")} className="text-sm text-[#c99b3b] hover:underline">
          Sign in
        </button>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-10">
        <section className="py-12 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#c99b3b]">For OOH and digital signage companies</p>
          <h1 className="mt-3 text-3xl font-bold leading-tight sm:text-5xl">Run your advertising screens and campaigns in one place</h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-ink-400">
            Nexora AdPilot is a subscription web application (SaaS) for out-of-home (OOH) and digital out-of-home (DOOH)
            advertising companies. Manage screens, campaigns, proposals, invoices, client reporting and field operations together.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <button type="button" onClick={() => navigate("/signup")} className={primary}>Start free trial</button>
            <button type="button" onClick={() => navigate("/login")} className={secondary}>Sign in</button>
          </div>
        </section>

        <section aria-label="Features" className="py-8">
          <h2 className="text-2xl font-semibold">What you get</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-xl border border-ink-700 p-4">
                <h3 className="text-base font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm leading-6 text-ink-400">{f.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section aria-label="Pricing" className="py-8">
          <h2 className="text-2xl font-semibold">Pricing (USD)</h2>
          <p className="mt-1 text-sm text-ink-400">Start with a free trial, then choose a monthly or yearly plan. Yearly plans include two months free.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PLAN_OFFERS.map((p) => (
              <div key={p.key} className="flex flex-col rounded-xl border border-ink-700 p-4">
                <h3 className="text-base font-semibold">{p.name}</h3>
                <p className="text-xs text-ink-500">{p.tagline}</p>
                <p className="mt-3 text-2xl font-bold">${p.monthly}<span className="text-sm font-normal text-ink-500"> / month</span></p>
                <p className="text-xs text-ink-400">or ${p.annual.toLocaleString("en-US")} / year</p>
                <ul className="mt-3 flex-1 space-y-1 text-sm text-ink-400">
                  {p.highlights.map((h) => (<li key={h}>&#10003; {h}</li>))}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs leading-5 text-ink-500">
            Payments, invoices and taxes are handled by Paddle, our Merchant of Record. Refunds are covered in our{" "}
            <a className="underline" href="/refund.html">Refund Policy</a>. Full details on the{" "}
            <a className="underline" href="/pricing.html">pricing page</a>.
          </p>
        </section>

        <LegalLinks />
      </main>
    </div>
  );
}
