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

const CSS = `
.ap-root{position:relative;overflow:hidden}
.ap-bg{position:absolute;inset:0;pointer-events:none;background:radial-gradient(60% 45% at 50% -5%,rgba(201,155,59,.20),transparent 70%),radial-gradient(40% 40% at 92% 38%,rgba(201,155,59,.08),transparent 70%)}
.ap-grid{position:absolute;inset:0;pointer-events:none;opacity:.5;background-image:linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px);background-size:56px 56px;-webkit-mask-image:radial-gradient(70% 60% at 50% 25%,#000,transparent 80%);mask-image:radial-gradient(70% 60% at 50% 25%,#000,transparent 80%)}
.ap-shimmer{color:#e2bd68;background:linear-gradient(100deg,#b88a2e 0%,#f3dc9a 30%,#c99b3b 50%,#f3dc9a 70%,#b88a2e 100%);background-size:220% 100%;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;animation:ap-shimmer 6s linear infinite}
@keyframes ap-shimmer{0%{background-position:120% 0}100%{background-position:-120% 0}}
.ap-board{position:relative;width:100%;max-width:470px;margin:0 auto;aspect-ratio:16/11}
.ap-frame{position:absolute;left:0;right:0;top:6%;height:76%;border-radius:14px;padding:10px;background:linear-gradient(145deg,#2c313d,#11141b);box-shadow:0 30px 80px -20px rgba(0,0,0,.85),0 0 0 1px rgba(255,255,255,.08),0 0 70px -12px rgba(201,155,59,.38);animation:ap-float 8s ease-in-out infinite}
@keyframes ap-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
.ap-screen{position:relative;width:100%;height:100%;border-radius:8px;overflow:hidden;background:#090c13;animation:ap-on 1.8s ease-out both}
@keyframes ap-on{0%{opacity:.1;filter:brightness(.3)}12%{opacity:.9}18%{opacity:.3}30%{opacity:1;filter:brightness(1.7)}100%{opacity:1;filter:brightness(1)}}
.ap-pixels{position:absolute;inset:0;pointer-events:none;z-index:3;background:repeating-linear-gradient(0deg,rgba(0,0,0,.18) 0,rgba(0,0,0,.18) 1px,transparent 1px,transparent 3px)}
.ap-scan{position:absolute;left:0;right:0;top:0;height:28%;z-index:2;pointer-events:none;background:linear-gradient(180deg,transparent,rgba(201,155,59,.16),transparent);animation:ap-scan 5.5s linear infinite}
@keyframes ap-scan{0%{transform:translateY(-110%)}100%{transform:translateY(430%)}}
.ap-slide{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;gap:8px;padding:8%;opacity:0;animation:ap-slide 12s infinite}
.ap-slide:nth-of-type(2){animation-delay:4s}
.ap-slide:nth-of-type(3){animation-delay:8s}
@keyframes ap-slide{0%{opacity:0;transform:translateY(10px)}6%,30%{opacity:1;transform:none}36%,100%{opacity:0;transform:translateY(-10px)}}
.ap-tag{font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:#c99b3b}
.ap-big{font-size:clamp(18px,4.2vw,26px);font-weight:700;line-height:1.15;color:#f4f1e8}
.ap-sub{font-size:11px;color:#8d96a8}
.ap-bar{height:6px;border-radius:3px;background:rgba(255,255,255,.08);overflow:hidden;margin-top:4px}
.ap-bar i{display:block;height:100%;width:0;background:linear-gradient(90deg,#b88a2e,#f0d48a);animation:ap-fill 12s infinite}
@keyframes ap-fill{0%,3%{width:0}14%,30%{width:78%}36%,100%{width:0}}
.ap-lamps{position:absolute;left:12%;right:12%;top:0;display:flex;justify-content:space-between}
.ap-lamps i{width:7px;height:7px;border-radius:50%;background:#f0d48a;box-shadow:0 0 10px 3px rgba(240,212,138,.55);animation:ap-blink 3.2s ease-in-out infinite}
.ap-lamps i:nth-child(2){animation-delay:.5s}.ap-lamps i:nth-child(3){animation-delay:1s}.ap-lamps i:nth-child(4){animation-delay:1.5s}.ap-lamps i:nth-child(5){animation-delay:2s}
@keyframes ap-blink{0%,100%{opacity:.35}50%{opacity:1}}
.ap-post{position:absolute;bottom:0;height:20%;width:3.4%;background:linear-gradient(#2c313d,#0d1016);border-radius:0 0 2px 2px}
.ap-post.l{left:24%}.ap-post.r{right:24%}
.ap-card{transition:transform .25s ease,border-color .25s ease,box-shadow .25s ease}
.ap-card:hover{transform:translateY(-3px);border-color:rgba(201,155,59,.55);box-shadow:0 14px 40px -16px rgba(201,155,59,.4)}
.ap-btn{position:relative;overflow:hidden}
.ap-btn::after{content:"";position:absolute;inset:0;background:linear-gradient(110deg,transparent 30%,rgba(255,255,255,.5) 50%,transparent 70%);transform:translateX(-120%);animation:ap-sheen 6s ease-in-out infinite}
@keyframes ap-sheen{0%,65%{transform:translateX(-120%)}100%{transform:translateX(120%)}}
@media (prefers-reduced-motion:reduce){.ap-root *,.ap-root *::after{animation:none!important;transition:none!important}.ap-slide:nth-of-type(1){opacity:1}}
`;

export default function LandingPage() {
  const navigate = useNavigate();
  const primary = "ap-btn rounded-lg bg-[#c99b3b] px-5 py-2.5 text-sm font-semibold text-black";
  const secondary = "rounded-lg border border-[#c99b3b] px-5 py-2.5 text-sm font-semibold text-[#c99b3b] hover:bg-[#c99b3b]/10";

  return (
    <div className="ap-root min-h-screen bg-ink-950 text-ink-50">
      <style>{CSS}</style>
      <div className="ap-bg" aria-hidden="true" />
      <div className="ap-grid" aria-hidden="true" />

      <div className="relative">
        <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <span className="text-lg font-bold">Nexora AdPilot</span>
          <button type="button" onClick={() => navigate("/login")} className="text-sm text-[#c99b3b] hover:underline">
            Sign in
          </button>
        </header>

        <main className="mx-auto max-w-5xl px-5 pb-10">
          <section className="grid items-center gap-10 py-10 lg:grid-cols-2 lg:py-16">
            <div className="text-center lg:text-left">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#c99b3b]">For OOH and digital signage companies</p>
              <h1 className="mt-3 text-3xl font-bold leading-tight sm:text-5xl">
                Run your advertising screens and campaigns in <span className="ap-shimmer">one place</span>
              </h1>
              <p className="mt-4 text-base leading-7 text-ink-400">
                Nexora AdPilot is a subscription web application (SaaS) for out-of-home (OOH) and digital out-of-home (DOOH)
                advertising companies. Manage screens, campaigns, proposals, invoices, client reporting and field operations together.
              </p>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                <button type="button" onClick={() => navigate("/signup")} className={primary}>Start free trial</button>
                <button type="button" onClick={() => navigate("/login")} className={secondary}>Sign in</button>
              </div>
            </div>

            <div className="ap-board" aria-hidden="true">
              <div className="ap-lamps"><i /><i /><i /><i /><i /></div>
              <div className="ap-frame">
                <div className="ap-screen">
                  <div className="ap-slide">
                    <span className="ap-tag">Screens &middot; Live</span>
                    <span className="ap-big">Every screen, one dashboard</span>
                    <span className="ap-sub">Availability, rates and bookings</span>
                    <div className="ap-bar"><i /></div>
                  </div>
                  <div className="ap-slide">
                    <span className="ap-tag">Campaign booked</span>
                    <span className="ap-big">Proposal approved by your client</span>
                    <span className="ap-sub">Schedule, invoice and report</span>
                  </div>
                  <div className="ap-slide">
                    <span className="ap-tag">Proof of play</span>
                    <span className="ap-big">Verified in the field with GPS</span>
                    <span className="ap-sub">Photos your clients can trust</span>
                  </div>
                  <div className="ap-scan" />
                  <div className="ap-pixels" />
                </div>
              </div>
              <span className="ap-post l" />
              <span className="ap-post r" />
            </div>
          </section>

          <section aria-label="Features" className="py-8">
            <h2 className="text-2xl font-semibold">What you get</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <div key={f.title} className="ap-card rounded-xl border border-ink-700 bg-ink-950/60 p-4">
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
                <div
                  key={p.key}
                  className={"ap-card flex flex-col rounded-xl border bg-ink-950/60 p-4 " + (p.key === "professional" ? "border-[#c99b3b]/60" : "border-ink-700")}
                >
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
    </div>
  );
}
