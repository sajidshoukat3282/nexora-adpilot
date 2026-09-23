import type { Company, User, Client, Contact } from "@/domain";
import { nextId, isoDaysAgo, hoursAgoIso } from "./helpers";

export const COMPANY: Company = {
  id: "company-1",
  name: "Vantage Outdoor Media",
  plan: "growth",
  logoInitial: "V",
  seatsUsed: 8,
  seatsLimit: 12,
  devicesActive: 11,
  devicesLimit: 20,
  timezone: "Asia/Karachi",
  defaultCurrency: "PKR",
  createdAt: isoDaysAgo(410),
  updatedAt: isoDaysAgo(2),
};

export const USERS: User[] = [
  { id: "user-owner", companyId: COMPANY.id, name: "Ayesha Khan", email: "ayesha@vantageooh.com", role: "owner", avatarInitial: "A", lastActiveAt: hoursAgoIso(1), createdAt: isoDaysAgo(410), updatedAt: isoDaysAgo(1) },
  { id: "user-cm", companyId: COMPANY.id, name: "Bilal Ahmed", email: "bilal@vantageooh.com", role: "campaign_manager", avatarInitial: "B", lastActiveAt: hoursAgoIso(3), createdAt: isoDaysAgo(380), updatedAt: isoDaysAgo(1) },
  { id: "user-sales", companyId: COMPANY.id, name: "Sara Malik", email: "sara@vantageooh.com", role: "sales_manager", avatarInitial: "S", lastActiveAt: hoursAgoIso(5), createdAt: isoDaysAgo(360), updatedAt: isoDaysAgo(2) },
  { id: "user-creative", companyId: COMPANY.id, name: "Hamza Riaz", email: "hamza@vantageooh.com", role: "creative_manager", avatarInitial: "H", lastActiveAt: hoursAgoIso(2), createdAt: isoDaysAgo(340), updatedAt: isoDaysAgo(1) },
  { id: "user-field", companyId: COMPANY.id, name: "Usman Tariq", email: "usman@vantageooh.com", role: "field_operator", avatarInitial: "U", lastActiveAt: hoursAgoIso(0.5), createdAt: isoDaysAgo(300), updatedAt: isoDaysAgo(1) },
  { id: "user-finance", companyId: COMPANY.id, name: "Fatima Noor", email: "fatima@vantageooh.com", role: "finance", avatarInitial: "F", lastActiveAt: hoursAgoIso(6), createdAt: isoDaysAgo(300), updatedAt: isoDaysAgo(3) },
  { id: "user-client", companyId: COMPANY.id, name: "Daniyal Chaudhry", email: "daniyal@zenithfoods.com", role: "client", avatarInitial: "D", lastActiveAt: hoursAgoIso(20), createdAt: isoDaysAgo(120), updatedAt: isoDaysAgo(5) },
  { id: "user-viewer", companyId: COMPANY.id, name: "Nadia Farooq", email: "nadia@vantageooh.com", role: "viewer", avatarInitial: "N", lastActiveAt: hoursAgoIso(30), createdAt: isoDaysAgo(90), updatedAt: isoDaysAgo(10) },
];

export const CLIENTS: Client[] = [
  { id: "client-zenith", companyId: COMPANY.id, name: "Zenith Foods", industry: "Food & Beverage", logoInitial: "Z", contactIds: ["contact-1", "contact-2"], isPortalEnabled: true, createdAt: isoDaysAgo(200), updatedAt: isoDaysAgo(4) },
  { id: "client-orbit", companyId: COMPANY.id, name: "Orbit Telecom", industry: "Telecommunications", logoInitial: "O", contactIds: ["contact-3"], isPortalEnabled: true, createdAt: isoDaysAgo(180), updatedAt: isoDaysAgo(8) },
  { id: "client-lumen", companyId: COMPANY.id, name: "Lumen Bank", industry: "Banking & Finance", logoInitial: "L", contactIds: ["contact-4"], isPortalEnabled: false, createdAt: isoDaysAgo(150), updatedAt: isoDaysAgo(15) },
  { id: "client-pinnacle", companyId: COMPANY.id, name: "Pinnacle Motors", industry: "Automotive", logoInitial: "P", contactIds: ["contact-5"], isPortalEnabled: true, createdAt: isoDaysAgo(95), updatedAt: isoDaysAgo(6) },
  { id: "client-aura", companyId: COMPANY.id, name: "Aura Cosmetics", industry: "Beauty & Personal Care", logoInitial: "A", contactIds: ["contact-6"], isPortalEnabled: true, createdAt: isoDaysAgo(60), updatedAt: isoDaysAgo(3) },
  { id: "client-skyward", companyId: COMPANY.id, name: "Skyward Airlines", industry: "Travel & Aviation", logoInitial: "S", contactIds: ["contact-7"], isPortalEnabled: false, createdAt: isoDaysAgo(40), updatedAt: isoDaysAgo(9) },
];

export const CONTACTS: Contact[] = [
  { id: "contact-1", clientId: "client-zenith", name: "Daniyal Chaudhry", title: "Head of Marketing", email: "daniyal@zenithfoods.com", phone: "+92 300 1112233", primary: true, createdAt: isoDaysAgo(200), updatedAt: isoDaysAgo(200) },
  { id: "contact-2", clientId: "client-zenith", name: "Mehwish Iqbal", title: "Brand Manager", email: "mehwish@zenithfoods.com", phone: "+92 300 1112244", primary: false, createdAt: isoDaysAgo(200), updatedAt: isoDaysAgo(200) },
  { id: "contact-3", clientId: "client-orbit", name: "Kamran Sheikh", title: "Marketing Director", email: "kamran@orbittelecom.com", phone: "+92 301 4445566", primary: true, createdAt: isoDaysAgo(180), updatedAt: isoDaysAgo(180) },
  { id: "contact-4", clientId: "client-lumen", name: "Rabia Saeed", title: "Brand & Comms Lead", email: "rabia@lumenbank.com", phone: "+92 302 7778899", primary: true, createdAt: isoDaysAgo(150), updatedAt: isoDaysAgo(150) },
  { id: "contact-5", clientId: "client-pinnacle", name: "Faraz Alam", title: "Marketing Manager", email: "faraz@pinnaclemotors.com", phone: "+92 303 2223344", primary: true, createdAt: isoDaysAgo(95), updatedAt: isoDaysAgo(95) },
  { id: "contact-6", clientId: "client-aura", name: "Zoya Malik", title: "Brand Manager", email: "zoya@auracosmetics.com", phone: "+92 304 5556677", primary: true, createdAt: isoDaysAgo(60), updatedAt: isoDaysAgo(60) },
  { id: "contact-7", clientId: "client-skyward", name: "Imran Qureshi", title: "Head of Marketing", email: "imran@skywardair.com", phone: "+92 305 8889900", primary: true, createdAt: isoDaysAgo(40), updatedAt: isoDaysAgo(40) },
];

export function userById(id: string): User | undefined {
  return USERS.find((u) => u.id === id);
}
export function clientById(id: string): Client | undefined {
  return CLIENTS.find((c) => c.id === id);
}
