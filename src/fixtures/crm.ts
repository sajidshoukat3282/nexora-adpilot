import type { Lead } from "@/domain";
import { COMPANY } from "./company";
import { isoDaysAgo } from "./helpers";

export const LEADS: Lead[] = [
  { id: "lead-1", companyId: COMPANY.id, companyName: "Horizon Retail Group", contactName: "Bushra Anwar", contactEmail: "bushra@horizonretail.com", stage: "lead", estimatedValue: 450000, source: "Inbound — website", ownerUserId: "user-sales", clientIdIfWon: null, createdAt: isoDaysAgo(3), updatedAt: isoDaysAgo(3) },
  { id: "lead-2", companyId: COMPANY.id, companyName: "Everest Sportswear", contactName: "Ali Jawad", contactEmail: "ali@everestsport.com", stage: "qualified", estimatedValue: 680000, source: "Referral", ownerUserId: "user-sales", clientIdIfWon: null, createdAt: isoDaysAgo(9), updatedAt: isoDaysAgo(2) },
  { id: "lead-3", companyId: COMPANY.id, companyName: "Meadow Dairy Co.", contactName: "Sana Yousuf", contactEmail: "sana@meadowdairy.com", stage: "proposal", estimatedValue: 920000, source: "Outbound — cold call", ownerUserId: "user-sales", clientIdIfWon: null, createdAt: isoDaysAgo(18), updatedAt: isoDaysAgo(4) },
  { id: "lead-4", companyId: COMPANY.id, companyName: "Crestline Real Estate", contactName: "Omar Farooqi", contactEmail: "omar@crestline.com", stage: "negotiation", estimatedValue: 1450000, source: "Trade show", ownerUserId: "user-sales", clientIdIfWon: null, createdAt: isoDaysAgo(25), updatedAt: isoDaysAgo(1) },
  { id: "lead-5", companyId: COMPANY.id, companyName: "Aura Cosmetics", contactName: "Zoya Malik", contactEmail: "zoya@auracosmetics.com", stage: "won", estimatedValue: 680000, source: "Referral", ownerUserId: "user-sales", clientIdIfWon: "client-aura", createdAt: isoDaysAgo(65), updatedAt: isoDaysAgo(60) },
  { id: "lead-6", companyId: COMPANY.id, companyName: "Falcon Insurance", contactName: "Adeel Rashid", contactEmail: "adeel@falconinsure.com", stage: "lost", estimatedValue: 380000, source: "Inbound — website", ownerUserId: "user-sales", clientIdIfWon: null, createdAt: isoDaysAgo(40), updatedAt: isoDaysAgo(20) },
  { id: "lead-7", companyId: COMPANY.id, companyName: "Northbridge University", contactName: "Hina Basit", contactEmail: "hina@northbridge.edu", stage: "lead", estimatedValue: 260000, source: "Inbound — LinkedIn", ownerUserId: "user-sales", clientIdIfWon: null, createdAt: isoDaysAgo(1), updatedAt: isoDaysAgo(1) },
  { id: "lead-8", companyId: COMPANY.id, companyName: "Meridian Coffee Roasters", contactName: "Tariq Nasim", contactEmail: "tariq@meridiancoffee.com", stage: "qualified", estimatedValue: 310000, source: "Referral", ownerUserId: "user-sales", clientIdIfWon: null, createdAt: isoDaysAgo(6), updatedAt: isoDaysAgo(2) },
];

export function leadById(id: string): Lead | undefined {
  return LEADS.find((l) => l.id === id);
}
