import React from "react";

type Tone = "cyan" | "blue" | "violet" | "green" | "amber" | "red" | "rose" | "slate";

const TONE_CLASSES: Record<Tone, string> = {
  cyan: "bg-signal-cyan/10 text-signal-cyan border-signal-cyan/25",
  blue: "bg-signal-blue/10 text-signal-blue border-signal-blue/25",
  violet: "bg-signal-violet/10 text-signal-violet border-signal-violet/25",
  green: "bg-signal-green/10 text-signal-green border-signal-green/25",
  amber: "bg-signal-amber/10 text-signal-amber border-signal-amber/25",
  red: "bg-signal-red/10 text-signal-red border-signal-red/25",
  rose: "bg-signal-rose/10 text-signal-rose border-signal-rose/25",
  slate: "bg-ink-700/40 text-ink-300 border-ink-600",
};

export const StatusBadge: React.FC<{ label: string; tone: Tone; dot?: boolean }> = ({ label, tone, dot = true }) => (
  <span className={`badge border ${dot ? "badge-dot" : ""} ${TONE_CLASSES[tone]}`}>{label}</span>
);

// --- Centralized status -> tone mappings, so every screen renders the same color for the same status.

export function campaignStatusTone(status: string): Tone {
  switch (status) {
    case "live": return "green";
    case "scheduled": return "cyan";
    case "booked": return "blue";
    case "pending_approval": return "amber";
    case "proposal": return "violet";
    case "draft": return "slate";
    case "completed": return "blue";
    case "archived": return "slate";
    case "cancelled": return "red";
    default: return "slate";
  }
}

export function creativeStatusTone(status: string): Tone {
  switch (status) {
    case "approved": return "green";
    case "client_review": return "cyan";
    case "internal_review": return "amber";
    case "rejected": return "red";
    case "draft": return "slate";
    default: return "slate";
  }
}

export function screenStatusTone(status: string): Tone {
  switch (status) {
    case "online": return "green";
    case "warning": return "amber";
    case "offline": return "red";
    case "maintenance": return "violet";
    default: return "slate";
  }
}

export function alertSeverityTone(sev: string): Tone {
  switch (sev) {
    case "critical": return "red";
    case "warning": return "amber";
    case "info": return "cyan";
    case "success": return "green";
    default: return "slate";
  }
}

export function leadStageTone(stage: string): Tone {
  switch (stage) {
    case "won": return "green";
    case "lost": return "red";
    case "negotiation": return "amber";
    case "proposal": return "cyan";
    case "qualified": return "blue";
    default: return "slate";
  }
}

export function invoiceStatusTone(status: string): Tone {
  switch (status) {
    case "paid": return "green";
    case "partially_paid": return "cyan";
    case "sent": return "blue";
    case "overdue": return "red";
    case "void": return "slate";
    default: return "slate";
  }
}

export function proposalStatusTone(status: string): Tone {
  switch (status) {
    case "accepted": return "green";
    case "rejected": return "red";
    case "changes_requested": return "amber";
    case "client_review": return "cyan";
    case "sent": return "blue";
    default: return "slate";
  }
}

export function assetOperationalTone(status: string): Tone {
  switch (status) {
    case "online": return "green";
    case "maintenance": return "violet";
    case "offline": return "red";
    default: return "slate";
  }
}
