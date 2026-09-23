import type { CampaignRepository, CampaignFilters, CreateCampaignInput } from "@/repositories/interfaces/CampaignRepository";
import type { Campaign, CampaignStatus, CampaignStatusHistoryEntry } from "@/domain";
import { canTransitionCampaign, campaignStatusEvent, money } from "@/domain";
import { store, persist, withLatency, genId, nowIso } from "./store";

export class DemoCampaignRepository implements CampaignRepository {
  private readonly statusHistory = new Map<string, CampaignStatusHistoryEntry[]>();
  async listCampaigns(filters?: CampaignFilters): Promise<Campaign[]> {
    let results = store.campaigns;
    if (filters) {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        results = results.filter((c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) || c.brand.toLowerCase().includes(q));
      }
      if (filters.status?.length) {
        results = results.filter((c) => filters.status!.includes(c.status));
      }
      if (filters.clientId) {
        results = results.filter((c) => c.clientId === filters.clientId);
      }
    }
    return withLatency([...results].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
  }

  async getCampaign(id: string): Promise<Campaign | null> {
    return withLatency(store.campaigns.find((c) => c.id === id) ?? null);
  }

  async createCampaign(input: CreateCampaignInput): Promise<Campaign> {
    const campaign: Campaign = {
      id: genId("campaign"),
      companyId: "company-1",
      code: `CMP-${1050 + store.campaigns.length}`,
      name: input.name,
      clientId: input.clientId,
      brand: input.brand,
      objective: input.objective,
      status: "draft",
      schedule: input.schedule,
      targeting: { locations: [], radiusKm: null, audience: [], weatherTriggered: false, eventTriggered: false },
      budget: {
        inventoryCost: money(0), creativeFees: money(0), additionalFees: money(0),
        discount: money(0), total: money(0), estimatedCpmCents: 0,
      },
      assetIds: [],
      creativeIds: [],
      ownerUserId: store.activeUserId,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    store.campaigns.unshift(campaign);
    persist();
    return withLatency(campaign, 320);
  }

  async updateCampaignStatus(id: string, next: CampaignStatus, actorName: string): Promise<Campaign> {
    const campaign = store.campaigns.find((c) => c.id === id);
    if (!campaign) throw new Error(`Campaign ${id} not found`);
    if (!canTransitionCampaign(campaign.status, next)) {
      throw new Error(`Cannot move campaign from "${campaign.status}" to "${next}" — invalid transition.`);
    }
    const from = campaign.status;
    campaign.status = next;
    campaign.updatedAt = nowIso();
    const timestamp = nowIso();
    const history = this.statusHistory.get(campaign.id) ?? [];
    history.push({
      id: genId("campaign-history"),
      campaignId: campaign.id,
      companyId: campaign.companyId,
      from,
      to: next,
      event: campaignStatusEvent(next),
      actorUserId: store.activeUserId,
      actorName,
      reason: null,
      metadata: {},
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    this.statusHistory.set(campaign.id, history);
    store.activity.unshift({
      id: genId("act"), companyId: campaign.companyId, entityType: "campaign", entityId: campaign.id,
      action: "status_changed", actorUserId: store.activeUserId, actorName,
      detail: `Moved from ${from.replace(/_/g, " ")} to ${next.replace(/_/g, " ")}`,
      createdAt: nowIso(), updatedAt: nowIso(),
    });
    persist();
    return withLatency(campaign, 280);
  }

  async addAssetToCampaign(campaignId: string, assetId: string): Promise<Campaign> {
    const campaign = store.campaigns.find((c) => c.id === campaignId);
    if (!campaign) throw new Error(`Campaign ${campaignId} not found`);
    if (!campaign.assetIds.includes(assetId)) {
      campaign.assetIds.push(assetId);
      campaign.updatedAt = nowIso();
      store.activity.unshift({
        id: genId("act"), companyId: campaign.companyId, entityType: "campaign", entityId: campaign.id,
        action: "asset_added", actorUserId: store.activeUserId, actorName: "You",
        detail: `Added asset ${assetId} to inventory selection`, createdAt: nowIso(), updatedAt: nowIso(),
      });
      persist();
    }
    return withLatency(campaign, 250);
  }

  async removeAssetFromCampaign(campaignId: string, assetId: string): Promise<Campaign> {
    const campaign = store.campaigns.find((c) => c.id === campaignId);
    if (!campaign) throw new Error(`Campaign ${campaignId} not found`);
    campaign.assetIds = campaign.assetIds.filter((id) => id !== assetId);
    campaign.updatedAt = nowIso();
    persist();
    return withLatency(campaign, 250);
  }

  async getStatusHistory(campaignId: string): Promise<CampaignStatusHistoryEntry[]> {
    return withLatency([...(this.statusHistory.get(campaignId) ?? [])]);
  }

  async getActivity(campaignId: string) {
    return withLatency(store.activity.filter((a) => a.entityId === campaignId && a.entityType === "campaign"));
  }
}
