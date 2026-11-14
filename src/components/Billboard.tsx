const CSS = `
.bb-board{position:relative;width:100%;aspect-ratio:16/11}
.bb-frame{position:absolute;left:0;right:0;top:7%;height:74%;border-radius:12px;padding:7px;background:linear-gradient(145deg,#2c313d,#11141b);box-shadow:0 24px 60px -20px rgba(0,0,0,.85),0 0 0 1px rgba(255,255,255,.08),0 0 56px -12px rgba(201,155,59,.4);animation:bb-float 8s ease-in-out infinite}
@keyframes bb-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
.bb-screen{position:relative;width:100%;height:100%;border-radius:7px;overflow:hidden;background:#090c13;animation:bb-on 1.8s ease-out both}
@keyframes bb-on{0%{opacity:.1;filter:brightness(.3)}12%{opacity:.9}18%{opacity:.3}30%{opacity:1;filter:brightness(1.7)}100%{opacity:1;filter:brightness(1)}}
.bb-pixels{position:absolute;inset:0;pointer-events:none;z-index:3;background:repeating-linear-gradient(0deg,rgba(0,0,0,.18) 0,rgba(0,0,0,.18) 1px,transparent 1px,transparent 3px)}
.bb-scan{position:absolute;left:0;right:0;top:0;height:28%;z-index:2;pointer-events:none;background:linear-gradient(180deg,transparent,rgba(201,155,59,.16),transparent);animation:bb-scan 5.5s linear infinite}
@keyframes bb-scan{0%{transform:translateY(-110%)}100%{transform:translateY(430%)}}
.bb-slide{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;gap:5px;padding:8%;opacity:0;animation:bb-slide 12s infinite}
.bb-slide:nth-of-type(2){animation-delay:4s}
.bb-slide:nth-of-type(3){animation-delay:8s}
@keyframes bb-slide{0%{opacity:0;transform:translateY(8px)}6%,30%{opacity:1;transform:none}36%,100%{opacity:0;transform:translateY(-8px)}}
.bb-tag{font-size:8px;letter-spacing:.2em;text-transform:uppercase;color:#c99b3b}
.bb-big{font-size:clamp(13px,4.6vw,19px);font-weight:700;line-height:1.15;color:#f4f1e8}
.bb-sub{font-size:9px;color:#8d96a8}
.bb-bar{height:5px;border-radius:3px;background:rgba(255,255,255,.08);overflow:hidden;margin-top:3px}
.bb-bar i{display:block;height:100%;width:0;background:linear-gradient(90deg,#b88a2e,#f0d48a);animation:bb-fill 12s infinite}
@keyframes bb-fill{0%,3%{width:0}14%,30%{width:78%}36%,100%{width:0}}
.bb-lamps{position:absolute;left:12%;right:12%;top:0;display:flex;justify-content:space-between}
.bb-lamps i{width:6px;height:6px;border-radius:50%;background:#f0d48a;box-shadow:0 0 9px 3px rgba(240,212,138,.55);animation:bb-blink 3.2s ease-in-out infinite}
.bb-lamps i:nth-child(2){animation-delay:.5s}.bb-lamps i:nth-child(3){animation-delay:1s}.bb-lamps i:nth-child(4){animation-delay:1.5s}.bb-lamps i:nth-child(5){animation-delay:2s}
@keyframes bb-blink{0%,100%{opacity:.35}50%{opacity:1}}
.bb-post{position:absolute;bottom:0;height:22%;width:3.4%;background:linear-gradient(#2c313d,#0d1016);border-radius:0 0 2px 2px}
.bb-post.l{left:24%}.bb-post.r{right:24%}
@media (prefers-reduced-motion:reduce){.bb-board *{animation:none!important}.bb-slide:nth-of-type(1){opacity:1}}
`;

export function Billboard() {
  return (
    <div className="mx-auto mb-4 w-full max-w-[250px] sm:max-w-[340px]" aria-hidden="true">
      <style>{CSS}</style>
      <div className="bb-board">
        <div className="bb-lamps"><i /><i /><i /><i /><i /></div>
        <div className="bb-frame">
          <div className="bb-screen">
            <div className="bb-slide">
              <span className="bb-tag">Screens &middot; Live</span>
              <span className="bb-big">Every screen, one dashboard</span>
              <span className="bb-sub">Availability, rates and bookings</span>
              <div className="bb-bar"><i /></div>
            </div>
            <div className="bb-slide">
              <span className="bb-tag">Campaign booked</span>
              <span className="bb-big">Proposal approved by your client</span>
              <span className="bb-sub">Schedule, invoice and report</span>
            </div>
            <div className="bb-slide">
              <span className="bb-tag">Proof of play</span>
              <span className="bb-big">Verified in the field with GPS</span>
              <span className="bb-sub">Photos your clients can trust</span>
            </div>
            <div className="bb-scan" />
            <div className="bb-pixels" />
          </div>
        </div>
        <span className="bb-post l" />
        <span className="bb-post r" />
      </div>
    </div>
  );
}
