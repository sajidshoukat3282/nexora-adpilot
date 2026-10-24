import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "@/lib/router";

interface PItem { id: string; name: string; campaign: string; type: "image" | "video"; src: string; repeat: number; seconds: number }
interface Manifest { ok: boolean; screen: string; version: string; refresh_seconds: number; items: PItem[]; skipped: number }

const CACHE = "adpilot-player-v1";

/** Round-robin order: an item with repeat 3 appears three times per cycle, spread out. */
function buildQueue(items: PItem[]): PItem[] {
  const q: PItem[] = [];
  const max = items.reduce((m, i) => Math.max(m, i.repeat), 1);
  for (let r = 0; r < max; r++) for (const it of items) if (it.repeat > r) q.push(it);
  return q;
}

async function warmCache(items: PItem[]): Promise<void> {
  try {
    if (typeof caches === "undefined") return;
    const c = await caches.open(CACHE);
    const keep = new Set(items.map((i) => i.src));
    for (const req of await c.keys()) if (!keep.has(new URL(req.url).pathname + new URL(req.url).search) && !keep.has(req.url)) await c.delete(req);
    for (const it of items) {
      if (!it.src.startsWith("/")) continue;
      if (!(await c.match(it.src))) {
        const res = await fetch(it.src);
        if (res.ok && res.status === 200) await c.put(it.src, res.clone());
      }
    }
  } catch { /* the player still works from the network */ }
}

async function localUrl(it: PItem): Promise<{ url: string; revoke: boolean }> {
  try {
    if (typeof caches !== "undefined" && it.src.startsWith("/")) {
      const c = await caches.open(CACHE);
      const hit = await c.match(it.src);
      if (hit) return { url: URL.createObjectURL(await hit.blob()), revoke: true };
    }
  } catch { /* use network */ }
  return { url: it.src, revoke: false };
}

export const PlayerPage: React.FC = () => {
  const [params] = useSearchParams();
  const key = params.get("key") || "";
  const [man, setMan] = useState<Manifest | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "invalid">("loading");
  const [offline, setOffline] = useState(false);
  const [synced, setSynced] = useState("");
  const [idx, setIdx] = useState(0);
  const [src, setSrc] = useState<{ url: string; revoke: boolean } | null>(null);
  const [info, setInfo] = useState(true);
  const queueRef = useRef<PItem[]>([]);
  const nextManRef = useRef<Manifest | null>(null);
  const versionRef = useRef("");
  const storeKey = `adpilot-player-${key.slice(0, 10)}`;

  const apply = useCallback((m: Manifest) => {
    nextManRef.current = null;
    versionRef.current = m.version;
    queueRef.current = buildQueue(m.items);
    setMan(m);
    setIdx(0);
  }, []);

  const sync = useCallback(async () => {
    try {
      const res = await fetch(`/api/player/manifest?key=${encodeURIComponent(key)}`, { cache: "no-store" });
      if (res.status === 401) { setState("invalid"); return; }
      const m = (await res.json()) as Manifest;
      if (!m.ok) { setState("invalid"); return; }
      try { localStorage.setItem(storeKey, JSON.stringify(m)); } catch { /* ignore */ }
      setOffline(false); setState("ok"); setSynced(new Date().toLocaleTimeString());
      warmCache(m.items);
      if (!versionRef.current) apply(m);
      else if (m.version !== versionRef.current) nextManRef.current = m; // swap at the end of the current item
    } catch {
      setOffline(true);
      if (!versionRef.current) {
        try { const raw = localStorage.getItem(storeKey); if (raw) { setState("ok"); apply(JSON.parse(raw) as Manifest); } } catch { /* ignore */ }
      }
    }
  }, [key, storeKey, apply]);

  useEffect(() => {
    if (!key) { setState("invalid"); return; }
    sync();
    const t = window.setInterval(sync, Math.max(60, man?.refresh_seconds ?? 300) * 1000);
    const on = () => sync();
    window.addEventListener("online", on);
    return () => { window.clearInterval(t); window.removeEventListener("online", on); };
  }, [key, sync, man?.refresh_seconds]);

  useEffect(() => {
    let lock: any = null;
    try { (navigator as any).wakeLock?.request("screen").then((l: any) => { lock = l; }).catch(() => undefined); } catch { /* ignore */ }
    return () => { try { lock?.release(); } catch { /* ignore */ } };
  }, []);

  const q = queueRef.current;
  const current: PItem | null = q.length ? q[idx % q.length] : null;

  const next = useCallback(() => {
    if (nextManRef.current) { apply(nextManRef.current); return; }
    setIdx((i) => i + 1);
  }, [apply]);

  useEffect(() => {
    let dead = false;
    let made: { url: string; revoke: boolean } | null = null;
    setSrc(null);
    if (!current) return;
    localUrl(current).then((r) => { if (dead) { if (r.revoke) URL.revokeObjectURL(r.url); return; } made = r; setSrc(r); });
    return () => { dead = true; if (made?.revoke) URL.revokeObjectURL(made.url); };
  }, [current?.id, current?.src, idx]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!current || !src || current.type !== "image" || q.length < 2) return;
    const t = window.setTimeout(next, Math.max(3, current.seconds) * 1000);
    return () => window.clearTimeout(t);
  }, [current, src, q.length, next]);

  useEffect(() => {
    if (!info) return;
    const t = window.setTimeout(() => setInfo(false), 5000);
    return () => window.clearTimeout(t);
  }, [info]);

  const fullscreen = () => { try { (document.documentElement as any).requestFullscreen?.(); } catch { /* ignore */ } };

  if (state === "invalid") return <div className="flex min-h-screen items-center justify-center bg-black p-6 text-center text-[16px] text-zinc-400">This player link is not valid. Please create a new player link in Live Operations.</div>;
  if (state === "loading") return <div className="flex min-h-screen items-center justify-center bg-black text-[14px] text-zinc-600">Loading player...</div>;

  return (
    <div className="fixed inset-0 select-none overflow-hidden bg-black" style={{ cursor: info ? "default" : "none" }} onMouseMove={() => setInfo(true)} onTouchStart={() => setInfo(true)}>
      {current && src ? (
        current.type === "image" ? (
          <img key={`${idx}-${current.id}`} src={src.url} alt="" className="h-full w-full object-contain" onError={() => window.setTimeout(next, 1500)} />
        ) : (
          <video key={`${idx}-${current.id}`} src={src.url} className="h-full w-full object-contain" autoPlay muted playsInline loop={q.length < 2} onEnded={next} onError={() => window.setTimeout(next, 1500)} />
        )
      ) : !current ? (
        <div className="flex h-full flex-col items-center justify-center text-center">
          <p className="text-[22px] font-semibold uppercase tracking-[0.3em] text-zinc-200">{man?.screen}</p>
          <p className="mt-3 text-[13px] text-zinc-600">No campaign is scheduled on this screen right now.</p>
          {man && man.skipped > 0 && <p className="mt-1 text-[11px] text-amber-500/70">{man.skipped} creative(s) cannot be played (use an uploaded file or a direct image/video link).</p>}
        </div>
      ) : null}

      <div className={`pointer-events-none absolute left-0 right-0 top-0 flex items-start justify-between p-3 text-[11px] text-zinc-300 transition-opacity duration-500 ${info ? "opacity-100" : "opacity-0"}`}>
        <div className="rounded-lg bg-black/70 px-3 py-2">
          <p className="font-semibold text-zinc-100">{man?.screen}</p>
          <p>{q.length ? `${new Set(q.map((i) => i.id)).size} creative(s) in the loop` : "Idle"}{current ? ` \u00b7 now: ${current.campaign}` : ""}</p>
          <p className={offline ? "text-amber-300" : "text-emerald-300"}>{offline ? "Offline, playing saved content" : `Synced ${synced}`}</p>
        </div>
        <button className="pointer-events-auto rounded-lg bg-black/70 px-3 py-2 text-zinc-100" onClick={fullscreen}>Fullscreen</button>
      </div>
    </div>
  );
};
