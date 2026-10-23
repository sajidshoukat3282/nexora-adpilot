import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@/lib/router";
import { FIN } from "../finance/financeUi";
import { CATEGORY_LABEL, notificationsApi, severityTone, timeAgo, type AppNotification } from "@/lib/api/notifications";

export const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [muted, setMuted] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [cat, setCat] = useState("all");
  const [prefs, setPrefs] = useState(false);

  const load = async () => {
    try {
      const r = await notificationsApi.list();
      setItems(r.items); setMuted(r.muted || []); setCategories(r.categories || []); setError("");
    } catch (e: any) { setError(e?.message || "Could not load notifications."); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const unread = items.filter((n) => !n.read).length;
  const shown = useMemo(() => items.filter((n) => (!unreadOnly || !n.read) && (cat === "all" || n.category === cat)), [items, unreadOnly, cat]);
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    items.forEach((n) => { if (!n.read) c[n.category] = (c[n.category] || 0) + 1; });
    return c;
  }, [items]);

  const open = async (n: AppNotification) => {
    if (!n.read) { try { await notificationsApi.markRead([n.id]); } catch { /* ignore */ } }
    if (n.link_path) navigate(n.link_path); else load();
  };
  const toggleMute = async (c: string) => {
    const next = muted.includes(c) ? muted.filter((x) => x !== c) : [...muted, c];
    setMuted(next);
    try { await notificationsApi.setMuted(next); } catch { /* ignore */ }
    load();
  };

  return (
    <div className={FIN.page}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#c99b3b]/30 pb-3">
        <div>
          <h1 className="text-[18px] font-semibold uppercase tracking-[0.24em] text-zinc-50">Notifications</h1>
          <p className="mt-1 text-[11px] font-medium text-[#d9b45a]">{unread > 0 ? `${unread} unread` : "You are all caught up"}</p>
        </div>
        <div className="flex gap-2">
          <button className={FIN.btnGhost} onClick={() => setPrefs((v) => !v)}>Preferences</button>
          <button className={FIN.btnGhost} disabled={unread === 0} onClick={async () => { await notificationsApi.markAllRead().catch(() => {}); load(); }}>Mark all read</button>
          <button className={FIN.btnGhost} onClick={async () => { await notificationsApi.archiveRead().catch(() => {}); load(); }}>Clear read</button>
        </div>
      </div>

      {prefs && (
        <div className={`${FIN.panel} mb-4 p-4`}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#d9b45a]">Show me notifications about</p>
          <div className="mt-2 flex flex-wrap gap-3">
            {categories.map((c) => (
              <label key={c} className="flex cursor-pointer items-center gap-2 text-[12px] text-zinc-200">
                <input type="checkbox" checked={!muted.includes(c)} onChange={() => toggleMute(c)} />
                {CATEGORY_LABEL[c] ?? c}
              </label>
            ))}
            {categories.length === 0 && <span className="text-[12px] text-zinc-500">Nothing to configure.</span>}
          </div>
          <p className="mt-2 text-[10px] text-zinc-500">These settings apply only to you.</p>
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {["all", ...categories].map((c) => (
          <button key={c} onClick={() => setCat(c)} className={`rounded-full border px-3 py-1 text-[11px] font-medium transition ${cat === c ? "border-[#c99b3b] bg-[#c99b3b]/15 text-[#f1d68a]" : "border-[#2b3038] text-zinc-400 hover:text-zinc-100"}`}>
            {c === "all" ? "All" : CATEGORY_LABEL[c] ?? c}{c !== "all" && counts[c] ? <span className="ml-1 text-[#d9b45a]">{counts[c]}</span> : null}
          </button>
        ))}
        <label className="ml-auto flex cursor-pointer items-center gap-2 text-[11px] text-zinc-400"><input type="checkbox" checked={unreadOnly} onChange={() => setUnreadOnly((v) => !v)} /> Unread only</label>
      </div>

      {error && <div className="mb-3 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-300">{error}</div>}

      <div className={`${FIN.panel} overflow-hidden`}>
        {loading && <p className="p-6 text-center text-[12px] text-zinc-500">Loading...</p>}
        {!loading && shown.length === 0 && <p className="p-8 text-center text-[12px] text-zinc-500">Nothing here. You are all caught up.</p>}
        {shown.map((n) => {
          const t = severityTone(n.severity);
          return (
            <div key={n.id} className={`group flex items-start gap-3 border-b border-[#1d2128] px-4 py-3 transition hover:bg-white/5 ${n.read ? "" : "bg-white/[0.03]"}`}>
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? "bg-zinc-600" : t.dot}`} />
              <button onClick={() => open(n)} className="min-w-0 grow text-left">
                <span className={`block text-[13px] ${n.read ? "text-zinc-400" : "font-semibold text-zinc-50"}`}>{n.title}</span>
                {n.detail && <span className="mt-0.5 block text-[12px] text-zinc-500">{n.detail}</span>}
              </button>
              <div className="shrink-0 text-right">
                <span className={`block text-[10px] font-semibold uppercase tracking-wider ${t.text}`}>{CATEGORY_LABEL[n.category] ?? n.category}</span>
                <span className="block text-[10px] text-zinc-600">{timeAgo(n.created_at)}</span>
                <button className="mt-1 hidden text-[10px] text-zinc-500 hover:text-zinc-200 group-hover:inline" onClick={async () => { await notificationsApi.archive([n.id]).catch(() => {}); load(); }}>Dismiss</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default NotificationsPage;
