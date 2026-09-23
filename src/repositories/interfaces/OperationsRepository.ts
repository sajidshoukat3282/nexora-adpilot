import type {
  LiveScreen, ScreenLiveStatus, OperationsAlert, PlaybackRecord,
  EmergencyOverrideRecord, ID,
} from "@/domain";

export interface ScreenFilters {
  search?: string;
  status?: ScreenLiveStatus[];
  city?: string;
}

export interface OperationsRepository {
  listScreens(filters?: ScreenFilters): Promise<LiveScreen[]>;
  getScreen(id: ID): Promise<LiveScreen | null>;
  listAlerts(includeAcknowledged?: boolean): Promise<OperationsAlert[]>;
  acknowledgeAlert(id: ID): Promise<OperationsAlert>;
  listPlaybackForScreen(screenId: ID): Promise<PlaybackRecord[]>;
  listPlaybackForCampaign(campaignId: ID): Promise<PlaybackRecord[]>;
  publishEmergencyOverride(input: {
    screenIds: ID[];
    creativeId: ID;
    reason: string;
    hasPermission: boolean;
    actorName: string;
  }): Promise<EmergencyOverrideRecord>;
}
