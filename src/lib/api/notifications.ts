import { apiRequest } from "@/lib/api/client";

export interface AppNotification {
  id: string;
  severity: "info" | "success" | "warning" | "critical";
  category: string;
  title: string;
  detail: string | null;
  link_path: string | null;
  created_at: string;
  read: boolean;
}

export interface NotificationList {
  ok: boolean;
  items: AppNotification[];
  unread: number;
  muted: string[];
  categories?: string[];
}

const body = (b: unknown): RequestInit => ({ body: JSON.stringify(b) });

export const notificationsApi = {
  list: () => apiRequest<NotificationList>("/api/notifications"),
  markRead: (ids: string[]) => apiRequest<{ ok: boolean }>("/api/notifications/read", { method: "POST", ...body({ ids }) }),
  markAllRead: () => apiRequest<{ ok: boolean }>("/api/notifications/read", { method: "POST", ...body({ all: true }) }),
  archive: (ids: string[]) => apiRequest<{ ok: boolean }>("/api/notifications/archive", { method: "POST", ...body({ ids }) }),
  archiveRead: () => apiRequest<{ ok: boolean }>("/api/notifications/archive", { method: "POST", ...body({ all: true }) }),
  setMuted: (muted: string[]) => apiRequest<{ ok: boolean; muted: string[] }>("/api/notifications/prefs", { method: "PUT", ...body({ muted }) }),
};

export const CATEGORY_LABEL: Record<string, string> = {
  finance: "Finance", credit: "Credit", campaign: "Campaigns", proposal: "Proposals", crm: "CRM", client: "Clients", system: "System",
};

export const severityTone = (s: string): { dot: string; text: string } =>
  s === "critical" ? { dot: "bg-rose-400", text: "text-rose-300" }
  : s === "warning" ? { dot: "bg-amber-400", text: "text-amber-300" }
  : s === "success" ? { dot: "bg-emerald-400", text: "text-emerald-300" }
  : { dot: "bg-sky-400", text: "text-sky-300" };

export function timeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const m = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (m < 1) return "Just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}
