import * as fixtures from "@/fixtures";
import type {
  MediaAsset, InventoryPackage, AssetBooking, MaintenanceBlock,
  Campaign, ActivityLogEntry,
  Creative,
  LiveScreen, PlaybackRecord, OperationsAlert, EmergencyOverrideRecord,
  Client, Contact, Lead,
  Proposal,
  Invoice, Payment,
  Notification,
  User,
} from "@/domain";

/**
 * In-memory "database" for Phase 1. Seeded once from fixtures, then mutated
 * in place by the Demo* repositories below. This is the ONLY module that
 * should reach into /fixtures directly — everything else goes through a
 * repository interface, so swapping this file for a real Worker-backed
 * implementation later doesn't touch any UI code.
 *
 * Mutations are persisted to localStorage under one namespaced key so a
 * refresh doesn't lose demo interactions, per the Phase 1 brief.
 */

const STORAGE_KEY = "adpilot_demo_store_v1";

interface StoreShape {
  assets: MediaAsset[];
  packages: InventoryPackage[];
  bookings: AssetBooking[];
  maintenance: MaintenanceBlock[];
  campaigns: Campaign[];
  activity: ActivityLogEntry[];
  creatives: Creative[];
  screens: LiveScreen[];
  playback: PlaybackRecord[];
  alerts: OperationsAlert[];
  overrides: EmergencyOverrideRecord[];
  clients: Client[];
  contacts: Contact[];
  leads: Lead[];
  opportunities: import("@/domain").Opportunity[];
  proposals: Proposal[];
  invoices: Invoice[];
  payments: Payment[];
  notifications: Notification[];
  users: User[];
  activeUserId: string;
}

function seed(): StoreShape {
  return {
    assets: structuredClone(fixtures.ASSETS),
    packages: structuredClone(fixtures.PACKAGES),
    bookings: structuredClone(fixtures.BOOKINGS),
    maintenance: structuredClone(fixtures.MAINTENANCE_BLOCKS),
    campaigns: structuredClone(fixtures.CAMPAIGNS),
    activity: structuredClone(fixtures.ACTIVITY_LOG),
    creatives: structuredClone(fixtures.CREATIVES),
    screens: structuredClone(fixtures.LIVE_SCREENS),
    playback: structuredClone(fixtures.PLAYBACK_RECORDS),
    alerts: structuredClone(fixtures.OPERATIONS_ALERTS),
    overrides: [],
    clients: structuredClone(fixtures.CLIENTS),
    contacts: structuredClone(fixtures.CONTACTS),
    leads: structuredClone(fixtures.LEADS),
    opportunities: [],
    proposals: structuredClone(fixtures.PROPOSALS),
    invoices: structuredClone(fixtures.INVOICES),
    payments: structuredClone(fixtures.PAYMENTS),
    notifications: structuredClone(fixtures.NOTIFICATIONS),
    users: structuredClone(fixtures.USERS),
    activeUserId: "user-owner",
  };
}

function load(): StoreShape {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seed();
    const parsed = JSON.parse(raw) as Partial<StoreShape>;
    // Merge over a fresh seed so new fixture entities added between builds
    // still show up even if an older snapshot is in localStorage.
    return { ...seed(), ...parsed };
  } catch {
    return seed();
  }
}

export const store: StoreShape = typeof window !== "undefined" ? load() : seed();

let saveTimer: ReturnType<typeof setTimeout> | null = null;
export function persist(): void {
  if (typeof window === "undefined") return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch {
      // Storage unavailable/full — demo continues in-memory only.
    }
  }, 150);
}

export function resetDemoStore(): void {
  Object.assign(store, seed());
  persist();
}

/** Small artificial delay so list/detail transitions feel like real network
 *  calls rather than instant local array reads — improves demo realism
 *  without pretending there's a backend. */
export function withLatency<T>(value: T, ms = 220): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

let idCounter = 90000;
export function genId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
