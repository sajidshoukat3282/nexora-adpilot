import type { LiveScreen, PlaybackRecord, OperationsAlert } from "@/domain";
import { COMPANY } from "./company";
import { isoDaysAgo, hoursAgoIso, isoFromNow } from "./helpers";
import { nextId } from "./helpers";

function screen(input: Omit<LiveScreen, "companyId" | "createdAt" | "updatedAt">): LiveScreen {
  return { ...input, companyId: COMPANY.id, createdAt: isoDaysAgo(180), updatedAt: hoursAgoIso(0.2) };
}

export const LIVE_SCREENS: LiveScreen[] = [
  screen({ id: "screen-lhr-01", assetId: "asset-lhr-01", name: "Gulberg Boulevard LED Tower", city: "Lahore", liveStatus: "online", currentCampaignId: "campaign-1", currentCreativeId: "creative-1", lastHeartbeatAt: hoursAgoIso(0.03), network: "good", storagePct: 62, temperatureC: 41, playerVersion: "NX-Player 4.2.1" }),
  screen({ id: "screen-khi-01", assetId: "asset-khi-01", name: "Shahrah-e-Faisal LED Tower", city: "Karachi", liveStatus: "online", currentCampaignId: "campaign-1", currentCreativeId: "creative-1", lastHeartbeatAt: hoursAgoIso(0.05), network: "good", storagePct: 58, temperatureC: 44, playerVersion: "NX-Player 4.2.1" }),
  screen({ id: "screen-lhr-02", assetId: "asset-lhr-02", name: "MM Alam Road Digital Screen", city: "Lahore", liveStatus: "online", currentCampaignId: "campaign-2", currentCreativeId: "creative-2", lastHeartbeatAt: hoursAgoIso(0.1), network: "good", storagePct: 71, temperatureC: 38, playerVersion: "NX-Player 4.2.1" }),
  screen({ id: "screen-khi-02", assetId: "asset-khi-02", name: "Clifton Beachfront Digital Screen", city: "Karachi", liveStatus: "warning", currentCampaignId: null, currentCreativeId: null, lastHeartbeatAt: hoursAgoIso(2.4), network: "degraded", storagePct: 88, temperatureC: 49, playerVersion: "NX-Player 4.1.9" }),
  screen({ id: "screen-isb-02", assetId: "asset-isb-02", name: "Blue Area Digital Screen", city: "Islamabad", liveStatus: "offline", currentCampaignId: null, currentCreativeId: null, lastHeartbeatAt: hoursAgoIso(14), network: "offline", storagePct: 45, temperatureC: 0, playerVersion: "NX-Player 4.1.9" }),
  screen({ id: "screen-lhr-04", assetId: "asset-lhr-04", name: "Packages Mall Atrium Screen", city: "Lahore", liveStatus: "online", currentCampaignId: null, currentCreativeId: null, lastHeartbeatAt: hoursAgoIso(0.15), network: "good", storagePct: 39, temperatureC: 29, playerVersion: "NX-Player 4.2.1" }),
  screen({ id: "screen-khi-04", assetId: "asset-khi-04", name: "Dolmen Mall Clifton Screen", city: "Karachi", liveStatus: "online", currentCampaignId: null, currentCreativeId: null, lastHeartbeatAt: hoursAgoIso(0.2), network: "good", storagePct: 51, temperatureC: 30, playerVersion: "NX-Player 4.2.1" }),
  screen({ id: "screen-isb-01", assetId: "asset-isb-01", name: "Jinnah Avenue LED Tower", city: "Islamabad", liveStatus: "online", currentCampaignId: null, currentCreativeId: null, lastHeartbeatAt: hoursAgoIso(0.08), network: "good", storagePct: 66, temperatureC: 40, playerVersion: "NX-Player 4.2.1" }),
  screen({ id: "screen-isb-04", assetId: "asset-isb-04", name: "Centaurus Mall Screen", city: "Islamabad", liveStatus: "online", currentCampaignId: null, currentCreativeId: null, lastHeartbeatAt: hoursAgoIso(0.3), network: "good", storagePct: 47, temperatureC: 28, playerVersion: "NX-Player 4.2.1" }),
  screen({ id: "screen-isb-05", assetId: "asset-isb-05", name: "Islamabad Airport Departures", city: "Islamabad", liveStatus: "maintenance", currentCampaignId: null, currentCreativeId: null, lastHeartbeatAt: hoursAgoIso(20), network: "good", storagePct: 30, temperatureC: 26, playerVersion: "NX-Player 4.1.7" }),
  screen({ id: "screen-lhr-06", assetId: "asset-lhr-06", name: "Allama Iqbal Airport Arrivals", city: "Lahore", liveStatus: "online", currentCampaignId: null, currentCreativeId: null, lastHeartbeatAt: hoursAgoIso(0.12), network: "good", storagePct: 55, temperatureC: 27, playerVersion: "NX-Player 4.2.1" }),
];

/** Playback: last 24 hours of hourly delivered spots for the two live campaigns,
 *  plus a handful of scheduled/failed entries so Proof of Play has real variety. */
function buildPlayback(): PlaybackRecord[] {
  const records: PlaybackRecord[] = [];
  const runs: Array<{ campaignId: string; screenId: string; creativeId: string; perHour: number; failRate: number }> = [
    { campaignId: "campaign-1", screenId: "screen-lhr-01", creativeId: "creative-1", perHour: 6, failRate: 0.03 },
    { campaignId: "campaign-1", screenId: "screen-khi-01", creativeId: "creative-1", perHour: 6, failRate: 0.02 },
    { campaignId: "campaign-2", screenId: "screen-lhr-02", creativeId: "creative-2", perHour: 4, failRate: 0.08 },
  ];
  for (const run of runs) {
    for (let h = 23; h >= 0; h--) {
      for (let i = 0; i < run.perHour; i++) {
        const failed = Math.random() < run.failRate;
        records.push({
          id: nextId("play"),
          companyId: COMPANY.id,
          campaignId: run.campaignId,
          screenId: run.screenId,
          creativeId: run.creativeId,
          playedAt: hoursAgoIso(h + i / run.perHour),
          durationSec: 10,
          status: failed ? "failed" : "delivered",
          estimatedImpressions: failed ? 0 : Math.round(180 + Math.random() * 420),
          createdAt: hoursAgoIso(h),
          updatedAt: hoursAgoIso(h),
        });
      }
    }
  }
  // A block of "scheduled" (future) plays for the scheduled campaign
  for (let h = 1; h <= 6; h++) {
    records.push({
      id: nextId("play"), companyId: COMPANY.id, campaignId: "campaign-3", screenId: "screen-isb-01",
      creativeId: "creative-3", playedAt: isoFromNow(0), durationSec: 10, status: "scheduled",
      estimatedImpressions: 0, createdAt: hoursAgoIso(0), updatedAt: hoursAgoIso(0),
    });
  }
  return records;
}

export const PLAYBACK_RECORDS: PlaybackRecord[] = buildPlayback();

export const OPERATIONS_ALERTS: OperationsAlert[] = [
  { id: "alert-1", companyId: COMPANY.id, severity: "critical", screenId: "screen-isb-02", campaignId: null, title: "Screen offline for 14 hours", detail: "Blue Area Digital Screen has not sent a heartbeat since last night. Field visit recommended.", acknowledged: false, createdAt: hoursAgoIso(14), updatedAt: hoursAgoIso(14) },
  { id: "alert-2", companyId: COMPANY.id, severity: "warning", screenId: "screen-khi-02", campaignId: null, title: "Degraded network on Clifton screen", detail: "Network quality degraded for 2+ hours; playback may be affected.", acknowledged: false, createdAt: hoursAgoIso(2.4), updatedAt: hoursAgoIso(2.4) },
  { id: "alert-3", companyId: COMPANY.id, severity: "warning", screenId: "screen-khi-02", campaignId: null, title: "Storage above 85%", detail: "Clifton Beachfront Digital Screen storage is at 88% — schedule a cache clear.", acknowledged: false, createdAt: hoursAgoIso(5), updatedAt: hoursAgoIso(5) },
  { id: "alert-4", companyId: COMPANY.id, severity: "warning", screenId: null, campaignId: "campaign-2", title: "Delivery below target", detail: "Orbit 5G Launch delivery is at 82% of scheduled plays over the last 24h — above the 8% failure threshold.", acknowledged: false, createdAt: hoursAgoIso(3), updatedAt: hoursAgoIso(3) },
  { id: "alert-5", companyId: COMPANY.id, severity: "info", screenId: null, campaignId: "campaign-6", title: "Creative missing for upcoming campaign", detail: "Skyward New Route Launch is pending approval but has no creative uploaded yet.", acknowledged: false, createdAt: hoursAgoIso(20), updatedAt: hoursAgoIso(20) },
  { id: "alert-6", companyId: COMPANY.id, severity: "success", screenId: null, campaignId: "campaign-1", title: "Campaign health improved", detail: "Zenith Summer Refresh delivery recovered to 97% after yesterday's fix.", acknowledged: true, createdAt: hoursAgoIso(28), updatedAt: hoursAgoIso(10) },
  { id: "alert-7", companyId: COMPANY.id, severity: "critical", screenId: null, campaignId: null, title: "Asset under maintenance", detail: "Liberty Chowk Bus Shelter (static asset) is under maintenance — panel replacement after storm damage.", acknowledged: true, createdAt: hoursAgoIso(48), updatedAt: hoursAgoIso(40) },
];

export function screenById(id: string): LiveScreen | undefined {
  return LIVE_SCREENS.find((s) => s.id === id);
}
