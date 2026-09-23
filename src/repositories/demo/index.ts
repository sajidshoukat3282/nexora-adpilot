import { DemoInventoryRepository } from "./DemoInventoryRepository";
import { DemoCampaignRepository } from "./DemoCampaignRepository";
import { DemoCreativeRepository } from "./DemoCreativeRepository";
import { DemoOperationsRepository } from "./DemoOperationsRepository";
import {
  DemoCrmRepository, DemoProposalRepository, DemoFinanceRepository,
  DemoNotificationRepository, DemoCompanyRepository,
} from "./DemoRemainingRepositories";

/**
 * Single composition point for every repository. UI code (via hooks in
 * src/hooks) should only ever import `repo` from here — never a fixture or
 * a Demo*Repository class directly. Swapping to a real backend later means
 * replacing the values below with Worker-backed implementations of the same
 * interfaces; nothing in src/features or src/components changes.
 */
export const repo = {
  inventory: new DemoInventoryRepository(),
  campaigns: new DemoCampaignRepository(),
  creatives: new DemoCreativeRepository(),
  operations: new DemoOperationsRepository(),
  crm: new DemoCrmRepository(),
  proposals: new DemoProposalRepository(),
  finance: new DemoFinanceRepository(),
  notifications: new DemoNotificationRepository(),
  company: new DemoCompanyRepository(),
};

export { resetDemoStore } from "./store";
