import React, { useCallback, useEffect, useRef, useState } from "react";
import { FiBell } from "react-icons/fi";
import { notificationsApi, severityTone, timeAgo, type AppNotification } from "@/lib/api/notifications";

/** Bell with an unread badge and a dropdown of the latest notifications. */
export const NotificationBell: React.FC<{
  onOpen: (n: AppNotification) => void;
  onViewAll: () => void;
}> = ({ onOpen, onViewAll }) => {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const r = await notificationsApi.list();
      setItems(r.items.slice(0, 8));
      setUnread(r.unread);
    } catch { /* the bell must never break the page */ }
  }, []);

  useEffect(() => {
    load();
    const t = window.setInterval(load, 60000);
    return () => window.clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const click = async (n: AppNotification) => {
    setOpen(false);
    if (!n.read) { try { await notificationsApi.markRead([n.id]); } catch { /* ignore */ } load(); }
    onOpen(n);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="relative flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-white/5 hover:text-[#f1d68a]"
        onClick={() => { setOpen((v) => !v); if (!open) load(); }}
        aria-label={unread > 0 ? `${unread} unread notifications` : "Notifications"}
      >
        <FiBell size={16} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-gradient-to-b from-[#f1d68a] to-[#a97b22] px-1 text-[9px] font-bold leading-none text-[#1a1204] ring-2 ring-[#0b0d10]">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[340px] max-w-[92vw] overflow-hidden rounded-xl border border-[#c99b3b]/25 bg-gradient-to-b from-[#171a20] to-[#0e1115] shadow-[0_24px_60px_rgba(0,0,0,0.65)]">
          <div className="flex items-center justify-between border-b border-[#2a2f37] px-3 py-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#d9b45a]">Notifications</span>
            {unread > 0 && (
              <button className="text-[11px] text-zinc-400 hover:text-zinc-100" onClick={async () => { try { await notificationsApi.markAllRead(); } catch { /* ignore */ } load(); }}>Mark all read</button>
            )}
          </div>
          <div className="max-h-[360px] overflow-y-auto">
            {items.length === 0 && <p className="p-5 text-center text-[12px] text-zinc-500">You are all caught up.</p>}
            {items.map((n) => {
              const t = severityTone(n.severity);
              return (
                <button key={n.id} onClick={() => click(n)} className={`flex w-full items-start gap-2.5 border-b border-[#1d2128] px-3 py-2.5 text-left transition hover:bg-white/5 ${n.read ? "" : "bg-white/[0.03]"}`}>
                  <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${n.read ? "bg-zinc-600" : t.dot}`} />
                  <span className="min-w-0 grow">
                    <span className={`block truncate text-[12px] ${n.read ? "text-zinc-400" : "font-semibold text-zinc-50"}`}>{n.title}</span>
                    {n.detail && <span className="mt-0.5 block text-[11px] leading-snug text-zinc-500">{n.detail}</span>}
                    <span className="mt-0.5 block text-[10px] text-zinc-600">{timeAgo(n.created_at)}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <button className="w-full border-t border-[#2a2f37] px-3 py-2 text-center text-[11px] font-medium text-[#d9b45a] hover:bg-white/5" onClick={() => { setOpen(false); onViewAll(); }}>View all</button>
        </div>
      )}
    </div>
  );
};
