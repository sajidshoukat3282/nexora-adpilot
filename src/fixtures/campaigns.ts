import type { Campaign, ActivityLogEntry } from "@/domain";
import { money } from "@/domain";
import { COMPANY } from "./company";
import { isoDaysAgo, daysFromNow, isoFromNow } from "./helpers";

function budget(inv: number, creative: number, addl: number, discount: number, cpm: number): Campaign["budget"] {
  const total = inv + creative + addl - discount;
  return {
    inventoryCost: money(inv),
    creativeFees: money(creative),
    additionalFees: money(addl),
    discount: money(discount),
    total: money(total),
    estimatedCpmCents: cpm,
  };
}

export const CAMPAIGNS: Campaign[] = [
  {
    id: "campaign-1", companyId: COMPANY.id, code: "CMP-1042", name: "Zenith Summer Refresh",
    clientId: "client-zenith", brand: "Zenith Cola", objective: "brand_awareness", status: "live",
    schedule: { startDate: daysFromNow(-10), endDate: daysFromNow(20), daysOfWeek: [0,1,2,3,4,5,6], operatingHours: { start: "06:00", end: "23:00" }, spotDurationSec: 10, loopPosition: 2, dayparts: ["morning_commute", "evening_commute"] },
    targeting: { locations: ["Lahore", "Karachi"], radiusKm: null, audience: ["18-34", "urban"], weatherTriggered: false, eventTriggered: false },
    budget: budget(1950000, 85000, 20000, 60000, 1450),
    assetIds: ["asset-lhr-01", "asset-khi-01"], creativeIds: ["creative-1"], ownerUserId: "user-cm",
    createdAt: isoDaysAgo(15), updatedAt: isoDaysAgo(1),
  },
  {
    id: "campaign-2", companyId: COMPANY.id, code: "CMP-1043", name: "Orbit 5G Launch",
    clientId: "client-orbit", brand: "Orbit 5G", objective: "product_launch", status: "live",
    schedule: { startDate: daysFromNow(-5), endDate: daysFromNow(10), daysOfWeek: [0,1,2,3,4,5,6], operatingHours: { start: "07:00", end: "22:00" }, spotDurationSec: 15, loopPosition: 1, dayparts: ["evening_commute"] },
    targeting: { locations: ["Lahore"], radiusKm: 5, audience: ["tech-forward", "25-45"], weatherTriggered: false, eventTriggered: true },
    budget: budget(570000, 45000, 12000, 0, 980),
    assetIds: ["asset-lhr-02"], creativeIds: ["creative-2"], ownerUserId: "user-cm",
    createdAt: isoDaysAgo(12), updatedAt: isoDaysAgo(1),
  },
  {
    id: "campaign-3", companyId: COMPANY.id, code: "CMP-1044", name: "Lumen Digital Savings Push",
    clientId: "client-lumen", brand: "Lumen Bank", objective: "always_on", status: "scheduled",
    schedule: { startDate: daysFromNow(5), endDate: daysFromNow(35), daysOfWeek: [1,2,3,4,5], operatingHours: { start: "08:00", end: "20:00" }, spotDurationSec: 10, loopPosition: null, dayparts: ["business_hours"] },
    targeting: { locations: ["Islamabad"], radiusKm: null, audience: ["professionals", "30-55"], weatherTriggered: false, eventTriggered: false },
    budget: budget(930000, 60000, 15000, 40000, 1120),
    assetIds: ["asset-isb-03"], creativeIds: ["creative-3"], ownerUserId: "user-cm",
    createdAt: isoDaysAgo(3), updatedAt: isoDaysAgo(1),
  },
  {
    id: "campaign-4", companyId: COMPANY.id, code: "CMP-1038", name: "Pinnacle Motors New Model Reveal",
    clientId: "client-pinnacle", brand: "Pinnacle Velocity", objective: "product_launch", status: "completed",
    schedule: { startDate: daysFromNow(-30), endDate: daysFromNow(-2), daysOfWeek: [0,1,2,3,4,5,6], operatingHours: { start: "09:00", end: "21:00" }, spotDurationSec: 15, loopPosition: 3, dayparts: ["weekend_leisure"] },
    targeting: { locations: ["Karachi"], radiusKm: null, audience: ["25-50", "high-income"], weatherTriggered: false, eventTriggered: false },
    budget: budget(1260000, 95000, 18000, 80000, 1340),
    assetIds: ["asset-khi-04"], creativeIds: ["creative-4"], ownerUserId: "user-cm",
    createdAt: isoDaysAgo(35), updatedAt: isoDaysAgo(2),
  },
  {
    id: "campaign-5", companyId: COMPANY.id, code: "CMP-1045", name: "Aura Cosmetics Glow Campaign",
    clientId: "client-aura", brand: "Aura Radiance", objective: "brand_awareness", status: "booked",
    schedule: { startDate: daysFromNow(8), endDate: daysFromNow(28), daysOfWeek: [0,1,2,3,4,5,6], operatingHours: { start: "10:00", end: "22:00" }, spotDurationSec: 10, loopPosition: null, dayparts: ["evening_commute", "weekend_leisure"] },
    targeting: { locations: ["Lahore", "Islamabad"], radiusKm: null, audience: ["18-35", "female-skew"], weatherTriggered: false, eventTriggered: false },
    budget: budget(680000, 52000, 10000, 25000, 990),
    assetIds: ["asset-lhr-04"], creativeIds: ["creative-5"], ownerUserId: "user-sales",
    createdAt: isoDaysAgo(6), updatedAt: isoDaysAgo(1),
  },
  {
    id: "campaign-6", companyId: COMPANY.id, code: "CMP-1046", name: "Skyward New Route Launch",
    clientId: "client-skyward", brand: "Skyward Airlines", objective: "event_promotion", status: "pending_approval",
    schedule: { startDate: daysFromNow(15), endDate: daysFromNow(45), daysOfWeek: [0,1,2,3,4,5,6], operatingHours: { start: "05:00", end: "23:00" }, spotDurationSec: 15, loopPosition: 1, dayparts: ["morning_commute"] },
    targeting: { locations: ["Islamabad"], radiusKm: null, audience: ["business travellers"], weatherTriggered: false, eventTriggered: true },
    budget: budget(825000, 40000, 14000, 0, 1050),
    assetIds: ["asset-isb-05"], creativeIds: [], ownerUserId: "user-sales",
    createdAt: isoDaysAgo(2), updatedAt: isoDaysAgo(0),
  },
  {
    id: "campaign-7", companyId: COMPANY.id, code: "CMP-1047", name: "Zenith Foods Ramadan Special",
    clientId: "client-zenith", brand: "Zenith Snacks", objective: "brand_awareness", status: "proposal",
    schedule: { startDate: daysFromNow(25), endDate: daysFromNow(55), daysOfWeek: [0,1,2,3,4,5,6], operatingHours: { start: "16:00", end: "23:00" }, spotDurationSec: 10, loopPosition: null, dayparts: ["evening_commute"] },
    targeting: { locations: ["Lahore", "Karachi", "Islamabad"], radiusKm: null, audience: ["families"], weatherTriggered: false, eventTriggered: true },
    budget: budget(2100000, 90000, 22000, 150000, 1280),
    assetIds: [], creativeIds: [], ownerUserId: "user-sales",
    createdAt: isoDaysAgo(1), updatedAt: isoDaysAgo(0),
  },
  {
    id: "campaign-8", companyId: COMPANY.id, code: "CMP-1048", name: "Orbit Telecom Loyalty Push",
    clientId: "client-orbit", brand: "Orbit Rewards", objective: "always_on", status: "draft",
    schedule: { startDate: daysFromNow(40), endDate: daysFromNow(70), daysOfWeek: [1,2,3,4,5], operatingHours: { start: "08:00", end: "20:00" }, spotDurationSec: 10, loopPosition: null, dayparts: ["business_hours"] },
    targeting: { locations: ["Karachi"], radiusKm: null, audience: ["existing customers"], weatherTriggered: false, eventTriggered: false },
    budget: budget(0, 0, 0, 0, 0),
    assetIds: [], creativeIds: [], ownerUserId: "user-cm",
    createdAt: isoDaysAgo(0), updatedAt: isoDaysAgo(0),
  },
  {
    id: "campaign-9", companyId: COMPANY.id, code: "CMP-1020", name: "Pinnacle Motors Service Reminder",
    clientId: "client-pinnacle", brand: "Pinnacle Care", objective: "always_on", status: "archived",
    schedule: { startDate: daysFromNow(-120), endDate: daysFromNow(-90), daysOfWeek: [1,2,3,4,5], operatingHours: { start: "09:00", end: "18:00" }, spotDurationSec: 10, loopPosition: null, dayparts: ["business_hours"] },
    targeting: { locations: ["Karachi"], radiusKm: null, audience: ["existing owners"], weatherTriggered: false, eventTriggered: false },
    budget: budget(340000, 20000, 5000, 0, 780),
    assetIds: [], creativeIds: [], ownerUserId: "user-cm",
    createdAt: isoDaysAgo(130), updatedAt: isoDaysAgo(89),
  },
  {
    id: "campaign-10", companyId: COMPANY.id, code: "CMP-1035", name: "Lumen Bank Trial Concept",
    clientId: "client-lumen", brand: "Lumen Bank", objective: "brand_awareness", status: "cancelled",
    schedule: { startDate: daysFromNow(-60), endDate: daysFromNow(-40), daysOfWeek: [0,1,2,3,4,5,6], operatingHours: { start: "08:00", end: "20:00" }, spotDurationSec: 10, loopPosition: null, dayparts: ["business_hours"] },
    targeting: { locations: ["Islamabad"], radiusKm: null, audience: ["professionals"], weatherTriggered: false, eventTriggered: false },
    budget: budget(210000, 15000, 0, 0, 900),
    assetIds: [], creativeIds: [], ownerUserId: "user-sales",
    createdAt: isoDaysAgo(65), updatedAt: isoDaysAgo(58),
  },
];

export const ACTIVITY_LOG: ActivityLogEntry[] = [
  { id: "act-1", companyId: COMPANY.id, entityType: "campaign", entityId: "campaign-1", action: "status_changed", actorUserId: "user-cm", actorName: "Bilal Ahmed", detail: "Moved from Scheduled to Live", createdAt: isoDaysAgo(10), updatedAt: isoDaysAgo(10) },
  { id: "act-2", companyId: COMPANY.id, entityType: "campaign", entityId: "campaign-1", action: "asset_added", actorUserId: "user-cm", actorName: "Bilal Ahmed", detail: "Added Gulberg Boulevard LED Tower to inventory selection", createdAt: isoDaysAgo(14), updatedAt: isoDaysAgo(14) },
  { id: "act-3", companyId: COMPANY.id, entityType: "campaign", entityId: "campaign-1", action: "creative_approved", actorUserId: "user-creative", actorName: "Hamza Riaz", detail: "Zenith Summer Refresh — Hero Spot v2 approved by client", createdAt: isoDaysAgo(11), updatedAt: isoDaysAgo(11) },
  { id: "act-4", companyId: COMPANY.id, entityType: "campaign", entityId: "campaign-2", action: "status_changed", actorUserId: "user-cm", actorName: "Bilal Ahmed", detail: "Moved from Scheduled to Live", createdAt: isoDaysAgo(5), updatedAt: isoDaysAgo(5) },
  { id: "act-5", companyId: COMPANY.id, entityType: "campaign", entityId: "campaign-3", action: "status_changed", actorUserId: "user-cm", actorName: "Bilal Ahmed", detail: "Moved from Booked to Scheduled", createdAt: isoDaysAgo(1), updatedAt: isoDaysAgo(1) },
  { id: "act-6", companyId: COMPANY.id, entityType: "campaign", entityId: "campaign-6", action: "submitted_for_approval", actorUserId: "user-sales", actorName: "Sara Malik", detail: "Submitted for internal approval ahead of client sign-off", createdAt: isoDaysAgo(2), updatedAt: isoDaysAgo(2) },
];

export function campaignById(id: string): Campaign | undefined {
  return CAMPAIGNS.find((c) => c.id === id);
}
