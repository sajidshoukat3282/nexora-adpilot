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

/**
 * The Nexora owner's own company keeps the full demo dataset. Every other
 * company starts with an EMPTY workspace. This is only a temporary frontend
 * rule until each module is moved to the database (the server will then
 * decide what a company sees using the company id from the session).
 */
export const DEMO_COMPANY_IDS: readonly string[] = [
  "ace7742a-78bb-475d-b865-a90719673d35", // Nexora Technologies (owner)
  "20083a73-7d8c-4e6a-9683-eed510e85818", // Nexora Media Agency (shared demo account)
];

export function isDemoCompany(companyId: string | null | undefined): boolean {
  return !!companyId && DEMO_COMPANY_IDS.includes(companyId);
}

const DEMO_STORAGE_KEY = "adpilot_demo_store_v1";
const WORKSPACE_STORAGE_PREFIX = "adpilot_ws_v1:";
const DEMO_WORKSPACE_PREFIX = "adpilot_demo_ws_v2:";

/** null = nothing is persisted (signed out). */
let storageKey: string | null = null;
let activeCompanyId: string | null = null;
let activeUserId: string | null = null;

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

function emptyStore(user?: User): StoreShape {
  return {
    assets: [],
    packages: [],
    bookings: [],
    maintenance: [],
    campaigns: [],
    activity: [],
    creatives: [],
    screens: [],
    playback: [],
    alerts: [],
    overrides: [],
    clients: [],
    contacts: [],
    leads: [],
    opportunities: [],
    proposals: [],
    invoices: [],
    payments: [],
    notifications: [],
    users: user ? [structuredClone(user)] : [],
    activeUserId: user ? user.id : "",
  };
}

function baseFor(companyId: string, user: User): StoreShape {
  return isDemoCompany(companyId) ? seed() : emptyStore(user);
}

function loadSaved(key: string, companyId: string, user: User): StoreShape {
  const base = baseFor(companyId, user);
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<StoreShape>;
    // Merge over a fresh base so new fixture entities added between builds
    // still show up for the demo company.
    const merged = { ...base, ...parsed };
    if (!isDemoCompany(companyId)) {
      // Real companies: the team list always comes from the signed-in account,
      // never from browser storage.
      merged.users = base.users;
      merged.activeUserId = base.activeUserId;
    }
    return merged;
  } catch {
    return base;
  }
}

/** Starts empty (nothing visible) until a signed-in workspace is selected. */
export const store: StoreShape = emptyStore();

/**
 * Called by the session provider after sign-in / session restore, and with
 * `null` on sign-out. Decides which dataset the app shows:
 *  - the Nexora owner's company  -> full demo data
 *  - any other company           -> empty workspace
 */
export function initWorkspace(ctx: { companyId: string; user: User } | null): void {
  if (!ctx) {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = null;
    storageKey = null;
    activeCompanyId = null;
    activeUserId = null;
    Object.assign(store, emptyStore());
    return;
  }

  // Same workspace already loaded (e.g. session refresh) -> keep in-memory state.
  if (activeCompanyId === ctx.companyId && activeUserId === ctx.user.id) return;

  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = null;

  activeCompanyId = ctx.companyId;
  activeUserId = ctx.user.id;
  // Each company keeps its own saved state in this browser. Demo companies use
  // their own key names so an old empty snapshot can never hide the demo data.
  if (ctx.companyId === DEMO_COMPANY_IDS[0]) {
    storageKey = DEMO_STORAGE_KEY;
  } else if (isDemoCompany(ctx.companyId)) {
    storageKey = `${DEMO_WORKSPACE_PREFIX}${ctx.companyId}`;
  } else {
    storageKey = `${WORKSPACE_STORAGE_PREFIX}${ctx.companyId}`;
  }

  Object.assign(store, typeof window !== "undefined" ? loadSaved(storageKey, ctx.companyId, ctx.user) : baseFor(ctx.companyId, ctx.user));
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
export function persist(): void {
  if (typeof window === "undefined") return;
  if (!storageKey) return;
  if (saveTimer) clearTimeout(saveTimer);
  const key = storageKey;
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(key, JSON.stringify(store));
    } catch {
      // Storage unavailable/full — demo continues in-memory only.
    }
  }, 150);
}

export function resetDemoStore(): void {
  // Demo company: back to the sample data. Any other company: back to empty.
  if (isDemoCompany(activeCompanyId)) {
    Object.assign(store, seed());
  } else {
    const me = store.users[0];
    Object.assign(store, emptyStore(me));
  }
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
