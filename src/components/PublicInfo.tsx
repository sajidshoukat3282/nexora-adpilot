import { LegalLinks } from "@/components/LegalLinks";

const PLANS = [
  { name: "Starter", monthly: "$29", yearly: "$290", text: "Up to 25 screens, 3 team members, 1 GB storage" },
  { name: "Professional", monthly: "$79", yearly: "$790", text: "Up to 100 screens, 10 team members, 10 GB storage, client portal, finance and field operations" },
  { name: "Business", monthly: "$199", yearly: "$1,990", text: "Up to 350 screens, 30 team members, 30 GB storage, public marketplace page" },
  { name: "Enterprise", monthly: "$599", yearly: "$5,990", text: "Unlimited screens and team members, 100 GB storage, API access" },
];

const FEATURES = [
  "Screen and inventory management with availability and booking tracking",
  "Campaigns, proposals and invoices for your clients",
  "CRM and lead tracking",
  "Live operations, proof of play and field photos with GPS check",
  "Client portal, expenses and finance reports",
];

export function PublicInfo() {
  return (
    <section aria-label="About Nexora AdPilot" className="mt-10 border-t border-ink-700 pt-8 text-left">
      <h2 className="text-lg font-semibold text-ink-50">About Nexora AdPilot</h2>
      <p className="mt-2 text-sm leading-6 text-ink-400">
        Nexora AdPilot is a subscription web application (SaaS) for out-of-home (OOH) and digital signage (DOOH)
        advertising companies. It brings screens, campaigns, proposals, invoices, client reporting and field
        operations into one place. Start with a free trial, then choose a monthly or yearly plan.
      </p>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink-400">
        {FEATURES.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>

      <h3 className="mt-6 text-base font-semibold text-ink-50">Pricing (USD)</h3>
      <div className="mt-3 space-y-2">
        {PLANS.map((p) => (
          <div key={p.name} className="rounded-lg border border-ink-700 p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span className="text-sm font-semibold text-ink-50">{p.name}</span>
              <span className="text-sm text-ink-50">{p.monthly}/month or {p.yearly}/year</span>
            </div>
            <div className="mt-1 text-xs text-ink-400">{p.text}</div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs leading-5 text-ink-500">
        Payments, invoices and taxes are handled by Paddle, our Merchant of Record. Refunds are covered in our
        Refund Policy. Full details are on our{" "}
        <a className="underline" href="https://nexoratechnologies.pk/pricing.html" target="_blank" rel="noopener noreferrer">pricing page</a>.
      </p>
      <LegalLinks />
    </section>
  );
}
