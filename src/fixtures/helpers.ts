/** Deterministic-ish helpers for building demo fixtures. */

let counter = 0;
export function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}-${1000 + counter}`;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** "today" is pinned once per session so relative demo dates stay stable. */
export const DEMO_NOW = new Date();

export function daysFromNow(offset: number): string {
  return new Date(DEMO_NOW.getTime() + offset * DAY_MS).toISOString().slice(0, 10);
}

export function isoDaysAgo(offset: number): string {
  return new Date(DEMO_NOW.getTime() - offset * DAY_MS).toISOString();
}

export function isoFromNow(offset: number): string {
  return new Date(DEMO_NOW.getTime() + offset * DAY_MS).toISOString();
}

export function hoursAgoIso(hours: number): string {
  return new Date(DEMO_NOW.getTime() - hours * 60 * 60 * 1000).toISOString();
}
