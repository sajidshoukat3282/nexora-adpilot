import type { SetupStatus } from "@/lib/api/admin";

export interface SetupStep {
  id: string;
  title: string;
  desc: string;
  to: string;
  cta: string;
  optional?: boolean;
  done: (s: SetupStatus) => boolean;
}

export const SETUP_STEPS: SetupStep[] = [
  { id: "profile", title: "Complete your company profile", desc: "Name, address, phone and bank details print on every invoice.", to: "/admin", cta: "Open profile", done: (s) => s.profile },
  { id: "screen", title: "Add your first screen", desc: "Add a billboard or digital screen to Inventory.", to: "/inventory", cta: "Add screen", done: (s) => s.screens > 0 },
  { id: "client", title: "Add your first client", desc: "Create a client (or a lead) in CRM & Leads.", to: "/crm", cta: "Open CRM", done: (s) => s.clients > 0 || s.leads > 0 },
  { id: "campaign", title: "Create your first campaign", desc: "Book screens for a client for a date range.", to: "/campaigns", cta: "New campaign", done: (s) => s.campaigns > 0 },
  { id: "invoice", title: "Create your first invoice", desc: "Bill the client and share it by WhatsApp or email.", to: "/finance", cta: "Create invoice", done: (s) => s.invoices > 0 },
  { id: "payment", title: "Record a payment", desc: "Receive a payment against an invoice.", to: "/finance", cta: "Receive payment", done: (s) => s.payments > 0 },
  { id: "team", title: "Invite a team member", desc: "Give an employee access with the right permissions.", to: "/admin", cta: "Invite employee", optional: true, done: (s) => s.team > 0 },
];

export function setupProgress(s: SetupStatus | null): { done: number; total: number; pct: number } {
  const required = SETUP_STEPS.filter((x) => !x.optional);
  const done = s ? required.filter((x) => x.done(s)).length : 0;
  return { done, total: required.length, pct: Math.round((done / required.length) * 100) };
}
