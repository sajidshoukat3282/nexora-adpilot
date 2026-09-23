import type { Campaign, CampaignStatus, CampaignStatusHistoryEntry, ActivityLogEntry, ID } from "@/domain";

export interface CampaignFilters {
  search?: string;
  status?: CampaignStatus[];
  clientId?: ID;
}

export interface CreateCampaignInput {
  name: string;
  clientId: ID;
  brand: string;
  objective: Campaign["objective"];
  schedule: Campaign["schedule"];
}

export interface CampaignRepository {
  listCampaigns(filters?: CampaignFilters): Promise<Campaign[]>;
  getCampaign(id: ID): Promise<Campaign | null>;
  createCampaign(input: CreateCampaignInput): Promise<Campaign>;
  updateCampaignStatus(id: ID, next: CampaignStatus, actorName: string): Promise<Campaign>;
  getStatusHistory(campaignId: ID): Promise<CampaignStatusHistoryEntry[]>;
  addAssetToCampaign(campaignId: ID, assetId: ID): Promise<Campaign>;
  removeAssetFromCampaign(campaignId: ID, assetId: ID): Promise<Campaign>;
  getActivity(campaignId: ID): Promise<ActivityLogEntry[]>;
}
