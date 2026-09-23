import type { Notification } from "@/domain";
import { COMPANY } from "./company";
import { hoursAgoIso } from "./helpers";

export const NOTIFICATIONS: Notification[] = [
  { id: "notif-1", companyId: COMPANY.id, severity: "critical", title: "Screen offline for 14 hours", detail: "Blue Area Digital Screen (Islamabad) has not sent a heartbeat.", read: false, linkPath: "/operations?screen=screen-isb-02", category: "operations", createdAt: hoursAgoIso(14), updatedAt: hoursAgoIso(14) },
  { id: "notif-2", companyId: COMPANY.id, severity: "warning", title: "Delivery below target", detail: "Orbit 5G Launch delivery at 82% over the last 24h.", read: false, linkPath: "/campaigns/campaign-2", category: "campaign", createdAt: hoursAgoIso(3), updatedAt: hoursAgoIso(3) },
  { id: "notif-3", companyId: COMPANY.id, severity: "info", title: "Creative pending client review", detail: "Orbit 5G Launch — Speed Test is awaiting client decision.", read: false, linkPath: "/campaigns/campaign-2?tab=creatives", category: "creative", createdAt: hoursAgoIso(6), updatedAt: hoursAgoIso(6) },
  { id: "notif-4", companyId: COMPANY.id, severity: "success", title: "Payment received", detail: "INV-3081 fully paid by Zenith Foods.", read: true, linkPath: "/finance?invoice=invoice-1", category: "finance", createdAt: hoursAgoIso(190), updatedAt: hoursAgoIso(190) },
  { id: "notif-5", companyId: COMPANY.id, severity: "warning", title: "Invoice overdue", detail: "INV-3055 from Pinnacle Motors is 15 days overdue.", read: false, linkPath: "/finance?invoice=invoice-5", category: "finance", createdAt: hoursAgoIso(24), updatedAt: hoursAgoIso(24) },
  { id: "notif-6", companyId: COMPANY.id, severity: "info", title: "New proposal accepted", detail: "Aura Cosmetics accepted PRO-2075.", read: true, linkPath: "/proposals?proposal=proposal-3", category: "campaign", createdAt: hoursAgoIso(144), updatedAt: hoursAgoIso(144) },
  { id: "notif-7", companyId: COMPANY.id, severity: "warning", title: "Asset under maintenance", detail: "Liberty Chowk Bus Shelter offline for panel repair.", read: true, linkPath: "/inventory?asset=asset-lhr-05", category: "inventory", createdAt: hoursAgoIso(48), updatedAt: hoursAgoIso(40) },
];

export function unreadCount(): number {
  return NOTIFICATIONS.filter((n) => !n.read).length;
}
