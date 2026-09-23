import type { ID, Timestamps, TenantScoped } from "./shared";

export type ScreenLiveStatus = "online" | "warning" | "offline" | "maintenance";

export interface LiveScreen extends Timestamps, TenantScoped {
  id: ID;
  assetId: ID;
  name: string;
  city: string;
  liveStatus: ScreenLiveStatus;
  currentCampaignId: ID | null;
  currentCreativeId: ID | null;
  lastHeartbeatAt: string;
  network: "good" | "degraded" | "offline";
  storagePct: number;
  temperatureC: number;
  playerVersion: string;
}

export type PlaybackStatus = "scheduled" | "delivered" | "failed" | "estimated";

export interface PlaybackRecord extends Timestamps {
  id: ID;
  companyId: ID;
  campaignId: ID;
  screenId: ID;
  creativeId: ID;
  playedAt: string; // ISO datetime
  durationSec: number;
  status: PlaybackStatus;
  estimatedImpressions: number;
}

export type AlertSeverity = "critical" | "warning" | "info" | "success";

export interface OperationsAlert extends Timestamps, TenantScoped {
  id: ID;
  severity: AlertSeverity;
  screenId: ID | null;
  campaignId: ID | null;
  title: string;
  detail: string;
  acknowledged: boolean;
}

export interface EmergencyOverrideRecord extends Timestamps, TenantScoped {
  id: ID;
  screenIds: ID[];
  creativeId: ID;
  actorUserId: ID;
  actorName: string;
  reason: string;
  result: "published" | "denied_permission";
}
