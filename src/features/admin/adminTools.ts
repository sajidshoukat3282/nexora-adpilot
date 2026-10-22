export function timeAgo(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return "Never";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "Never";
  const mins = Math.floor((now - t) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export type ExpiryState = { label: string; tone: "ok" | "soon" | "expired"; hoursLeft: number };

export function inviteExpiry(expiresAt: string | undefined, now = Date.now()): ExpiryState | null {
  if (!expiresAt) return null;
  const t = new Date(expiresAt).getTime();
  if (Number.isNaN(t)) return null;
  const hours = Math.floor((t - now) / 3600000);
  if (t <= now) return { label: "Invite expired", tone: "expired", hoursLeft: -1 };
  if (hours < 1) return { label: "Expires in under 1h", tone: "soon", hoursLeft: 0 };
  if (hours < 24) return { label: `Expires in ${hours}h`, tone: "soon", hoursLeft: hours };
  return { label: `Expires in ${Math.floor(hours / 24)}d`, tone: "ok", hoursLeft: hours };
}

/** True when an invitation should be re-sent (expired or expiring within 24h). */
export const needsResend = (e: ExpiryState | null): boolean => !!e && e.tone !== "ok";

export const fmtDateTime = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
};

export const CURRENCY_NAMES: Record<string, string> = {
  PKR: "Pakistani Rupee", USD: "US Dollar", GBP: "British Pound", EUR: "Euro", AED: "UAE Dirham",
  CAD: "Canadian Dollar", AUD: "Australian Dollar", SAR: "Saudi Riyal", QAR: "Qatari Riyal",
  INR: "Indian Rupee", CNY: "Chinese Yuan", JPY: "Japanese Yen", CHF: "Swiss Franc",
  ZAR: "South African Rand", TRY: "Turkish Lira",
};
