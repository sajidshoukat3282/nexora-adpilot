/**
 * Shared domain primitives.
 * Every business entity in AdPilot builds on these.
 */

export type ID = string;

export interface Timestamps {
  createdAt: string; // ISO 8601
  updatedAt: string;
}

export interface TenantScoped {
  companyId: ID;
}

export interface SoftDeletable {
  deletedAt: string | null;
}

import type { CurrencyCode } from "./currency";
import { currencyMinorUnits } from "./currency";

/**
 * Money is represented in integer minor units. `amountCents` is retained as a
 * compatibility field for Phase 1; new code should use `amountMinor`.
 */
export interface Money {
  amountCents: number;
  /** Canonical minor-unit amount for multi-currency values. */
  amountMinor?: number;
  currency: CurrencyCode;
}

export function money(amountCents: number, currency: CurrencyCode = "USD"): Money {
  return { amountCents, amountMinor: amountCents, currency };
}

export function moneyFromMinor(amountMinor: number, currency: CurrencyCode): Money {
  return { amountCents: amountMinor, amountMinor, currency };
}

export function moneyMinorAmount(m: Money): number {
  return m.amountMinor ?? m.amountCents;
}

export function formatMoney(m: Money): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: m.currency,
  }).format(moneyMinorAmount(m) / (10 ** currencyMinorUnits(m.currency)));
}

/**
 * Any value that is illustrative/simulated rather than a real measurement
 * carries this marker so the UI can render a "Demo data" / "Estimated"
 * label wherever it's surfaced, per the Phase 1 brief's honesty requirement.
 */
export interface Estimated<T> {
  value: T;
  estimated: true;
}

export function estimated<T>(value: T): Estimated<T> {
  return { value, estimated: true };
}

export type Role =
  | "owner"
  | "campaign_manager"
  | "sales_manager"
  | "creative_manager"
  | "field_operator"
  | "finance"
  | "client"
  | "viewer";

export const ROLE_LABELS: Record<Role, string> = {
  owner: "Owner",
  campaign_manager: "Campaign Manager",
  sales_manager: "Sales Manager",
  creative_manager: "Creative Manager",
  field_operator: "Field Operator",
  finance: "Finance",
  client: "Client",
  viewer: "Viewer",
};

export type Permission =
  | "campaigns.manage"
  | "inventory.manage"
  | "creatives.manage"
  | "creatives.approve"
  | "operations.manage"
  | "operations.override"
  | "crm.manage"
  | "proposals.manage"
  | "finance.view"
  | "finance.manage"
  | "company.manage"
  | "reports.view"
  | "reports.generate"
  | "reports.send"
  | "client_portal.view"
  | "proof.view"
  | "proof.submit"
  | "analytics.view"
  | "subscription.view";

/** role -> permissions the role holds. Server-enforced in a real backend;
 *  here it drives the RBAC *demonstration* only (see PermissionGate). */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  owner: [
    "campaigns.manage", "inventory.manage", "creatives.manage", "creatives.approve",
    "operations.manage", "operations.override", "crm.manage", "proposals.manage",
    "finance.view", "finance.manage", "company.manage", "reports.view", "reports.generate", "reports.send", "proof.view", "proof.submit", "analytics.view", "subscription.view",
  ],
  campaign_manager: [
    "campaigns.manage", "inventory.manage", "creatives.manage",
    "operations.manage", "reports.view", "reports.generate", "reports.send", "proof.view", "analytics.view",
  ],
  sales_manager: ["crm.manage", "proposals.manage", "reports.view", "reports.generate", "reports.send"],
  creative_manager: ["creatives.manage", "creatives.approve", "reports.view", "reports.generate", "reports.send"],
  field_operator: ["operations.manage", "operations.override", "proof.view", "proof.submit", "reports.view", "reports.generate"],
  finance: ["finance.view", "finance.manage", "reports.view", "reports.generate", "reports.send", "analytics.view"],
  client: ["client_portal.view", "reports.view", "reports.generate"],
  viewer: ["reports.view"],
};

export function roleHasPermission(role: Role, perm: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(perm) ?? false;
}
