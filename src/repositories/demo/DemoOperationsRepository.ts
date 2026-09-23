import type { OperationsRepository, ScreenFilters } from "@/repositories/interfaces/OperationsRepository";
import type { LiveScreen, OperationsAlert, EmergencyOverrideRecord } from "@/domain";
import { store, persist, withLatency, genId, nowIso } from "./store";

export class DemoOperationsRepository implements OperationsRepository {
  async listScreens(filters?: ScreenFilters): Promise<LiveScreen[]> {
    let results = store.screens;
    if (filters) {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        results = results.filter((s) => s.name.toLowerCase().includes(q) || s.city.toLowerCase().includes(q));
      }
      if (filters.status?.length) {
        results = results.filter((s) => filters.status!.includes(s.liveStatus));
      }
      if (filters.city) {
        results = results.filter((s) => s.city === filters.city);
      }
    }
    return withLatency(results);
  }

  async getScreen(id: string): Promise<LiveScreen | null> {
    return withLatency(store.screens.find((s) => s.id === id) ?? null);
  }

  async listAlerts(includeAcknowledged = false): Promise<OperationsAlert[]> {
    const results = includeAcknowledged ? store.alerts : store.alerts.filter((a) => !a.acknowledged);
    return withLatency([...results].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  }

  async acknowledgeAlert(id: string): Promise<OperationsAlert> {
    const alert = store.alerts.find((a) => a.id === id);
    if (!alert) throw new Error(`Alert ${id} not found`);
    alert.acknowledged = true;
    alert.updatedAt = nowIso();
    persist();
    return withLatency(alert, 200);
  }

  async listPlaybackForScreen(screenId: string) {
    return withLatency(store.playback.filter((p) => p.screenId === screenId));
  }

  async listPlaybackForCampaign(campaignId: string) {
    return withLatency(store.playback.filter((p) => p.campaignId === campaignId));
  }

  async publishEmergencyOverride(input: {
    screenIds: string[];
    creativeId: string;
    reason: string;
    hasPermission: boolean;
    actorName: string;
  }): Promise<EmergencyOverrideRecord> {
    const record: EmergencyOverrideRecord = {
      id: genId("override"),
      companyId: "company-1",
      screenIds: input.screenIds,
      creativeId: input.creativeId,
      actorUserId: store.activeUserId,
      actorName: input.actorName,
      reason: input.reason,
      result: input.hasPermission ? "published" : "denied_permission",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    store.overrides.unshift(record);

    if (input.hasPermission) {
      for (const screenId of input.screenIds) {
        const screen = store.screens.find((s) => s.id === screenId);
        if (screen) {
          screen.currentCreativeId = input.creativeId;
          screen.updatedAt = nowIso();
        }
      }
      store.activity.unshift({
        id: genId("act"), companyId: "company-1", entityType: "operations", entityId: record.id,
        action: "override_published", actorUserId: store.activeUserId, actorName: input.actorName,
        detail: `Emergency override published to ${input.screenIds.length} screen(s): ${input.reason}`,
        createdAt: nowIso(), updatedAt: nowIso(),
      });
    }
    persist();
    return withLatency(record, 500);
  }
}
