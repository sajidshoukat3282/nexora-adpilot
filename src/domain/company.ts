import type { ID, Timestamps, Role } from "./shared";
import type { CurrencyCode } from "./currency";

export interface Company extends Timestamps {
  id: ID;
  name: string;
  plan: "trial" | "growth" | "enterprise";
  logoInitial: string;
  seatsUsed: number;
  seatsLimit: number;
  devicesActive: number;
  devicesLimit: number;
  timezone: string;
  /** Company-level default currency for new commercial records. */
  defaultCurrency: CurrencyCode;
}

export interface User extends Timestamps {
  id: ID;
  companyId: ID;
  name: string;
  email: string;
  role: Role;
  avatarInitial: string;
  lastActiveAt: string;
}
