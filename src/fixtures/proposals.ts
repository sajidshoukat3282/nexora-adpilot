import type { Proposal } from "@/domain";
import { money } from "@/domain";
import { COMPANY } from "./company";
import { isoDaysAgo, daysFromNow } from "./helpers";

export const PROPOSALS: Proposal[] = [
  {
    id: "proposal-1", companyId: COMPANY.id, code: "PRO-2091", clientId: "client-zenith", campaignName: "Zenith Foods Ramadan Special",
    status: "sent", startDate: daysFromNow(25), endDate: daysFromNow(55),
    items: [
      { id: "pi-1", assetId: "asset-lhr-01", description: "Gulberg Boulevard LED Tower — 30 days", days: 30, unitPriceCents: 65000, totalCents: 1950000 },
      { id: "pi-2", assetId: "asset-khi-01", description: "Shahrah-e-Faisal LED Tower — 30 days", days: 30, unitPriceCents: 72000, totalCents: 2160000 },
    ],
    discountPct: 8, estimatedImpressions: 11700000, total: money(4100000), ownerUserId: "user-sales",
    createdAt: isoDaysAgo(4), updatedAt: isoDaysAgo(1),
  },
  {
    id: "proposal-2", companyId: COMPANY.id, code: "PRO-2088", clientId: "client-pinnacle", campaignName: "Pinnacle Q3 Showroom Push",
    status: "client_review", startDate: daysFromNow(20), endDate: daysFromNow(50),
    items: [
      { id: "pi-3", assetId: "asset-khi-04", description: "Dolmen Mall Clifton Screen — 30 days", days: 30, unitPriceCents: 45000, totalCents: 1350000 },
    ],
    discountPct: 5, estimatedImpressions: 2040000, total: money(1282500), ownerUserId: "user-sales",
    createdAt: isoDaysAgo(9), updatedAt: isoDaysAgo(2),
  },
  {
    id: "proposal-3", companyId: COMPANY.id, code: "PRO-2075", clientId: "client-aura", campaignName: "Aura Radiance Launch",
    status: "accepted", startDate: daysFromNow(8), endDate: daysFromNow(28),
    items: [
      { id: "pi-4", assetId: "asset-lhr-04", description: "Packages Mall Atrium Screen — 20 days", days: 20, unitPriceCents: 42000, totalCents: 840000 },
    ],
    discountPct: 10, estimatedImpressions: 1120000, total: money(756000), ownerUserId: "user-sales",
    createdAt: isoDaysAgo(20), updatedAt: isoDaysAgo(6),
  },
  {
    id: "proposal-4", companyId: COMPANY.id, code: "PRO-2065", clientId: "client-lumen", campaignName: "Lumen Bank Trial Concept",
    status: "rejected", startDate: daysFromNow(-60), endDate: daysFromNow(-40),
    items: [
      { id: "pi-5", assetId: "asset-isb-03", description: "Faizabad Interchange Billboard — 20 days", days: 20, unitPriceCents: 31000, totalCents: 620000 },
    ],
    discountPct: 0, estimatedImpressions: 3160000, total: money(620000), ownerUserId: "user-sales",
    createdAt: isoDaysAgo(68), updatedAt: isoDaysAgo(58),
  },
  {
    id: "proposal-5", companyId: COMPANY.id, code: "PRO-2095", clientId: "client-skyward", campaignName: "Skyward New Route Launch",
    status: "draft", startDate: daysFromNow(15), endDate: daysFromNow(45),
    items: [
      { id: "pi-6", assetId: "asset-isb-05", description: "Islamabad Airport Departures — 30 days", days: 30, unitPriceCents: 55000, totalCents: 1650000 },
    ],
    discountPct: 0, estimatedImpressions: 1260000, total: money(1650000), ownerUserId: "user-sales",
    createdAt: isoDaysAgo(2), updatedAt: isoDaysAgo(2),
  },
];

export function proposalById(id: string): Proposal | undefined {
  return PROPOSALS.find((p) => p.id === id);
}
