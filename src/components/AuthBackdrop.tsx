const CSS = `
.au-wrap{position:fixed;inset:0;overflow:hidden;pointer-events:none;z-index:0}
.au-glow{position:absolute;inset:0;background:radial-gradient(55% 40% at 50% -5%,rgba(201,155,59,.20),transparent 70%),radial-gradient(40% 35% at 90% 85%,rgba(201,155,59,.07),transparent 70%)}
.au-grid{position:absolute;inset:0;opacity:.5;background-image:linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px);background-size:56px 56px;-webkit-mask-image:radial-gradient(70% 60% at 50% 30%,#000,transparent 80%);mask-image:radial-gradient(70% 60% at 50% 30%,#000,transparent 80%)}
.au-beam{position:absolute;top:-20%;left:-20%;width:38vmax;height:140%;background:linear-gradient(90deg,transparent,rgba(201,155,59,.07),transparent);transform:rotate(18deg);animation:au-sweep 16s ease-in-out infinite alternate}
@keyframes au-sweep{from{left:-20%}to{left:75%}}
.au-lamps{position:absolute;top:18px;left:50%;transform:translateX(-50%);display:flex;gap:46px}
.au-lamps i{width:7px;height:7px;border-radius:50%;background:#f0d48a;box-shadow:0 0 10px 3px rgba(240,212,138,.5);animation:au-blink 3.2s ease-in-out infinite}
.au-lamps i:nth-child(2){animation-delay:.5s}.au-lamps i:nth-child(3){animation-delay:1s}.au-lamps i:nth-child(4){animation-delay:1.5s}.au-lamps i:nth-child(5){animation-delay:2s}
@keyframes au-blink{0%,100%{opacity:.3}50%{opacity:1}}
@media (prefers-reduced-motion:reduce){.au-wrap *{animation:none!important}}
`;

export function AuthBackdrop() {
  return (
    <div className="au-wrap" aria-hidden="true">
      <style>{CSS}</style>
      <div className="au-glow" />
      <div className="au-grid" />
      <div className="au-beam" />
      <div className="au-lamps"><i /><i /><i /><i /><i /></div>
    </div>
  );
}
