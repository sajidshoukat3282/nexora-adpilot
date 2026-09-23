import type { ID, Role, Timestamps, Permission } from "./shared";

/** Canonical report families exposed through the permission-aware Report Center. */
export type ReportType =
  | "crm"
  | "sales"
  | "campaign"
  | "inventory"
  | "creative"
  | "delivery"
  | "proof"
  | "analytics"
  | "finance"
  | "subscription"
  | "client_portal"
  | "field_verification";

export type ReportFormat = "pdf" | "csv" | "xlsx" | "json";
export type ReportDeliveryChannel = "download" | "email" | "client_portal";
export type ReportStatus = "requested" | "generating" | "ready" | "failed" | "expired";

export interface ReportScope {
  companyId: ID;
  userId: ID;
  /** Optional business scope; server must resolve/validate all IDs within companyId. */
  campaignIds?: ID[];
  clientIds?: ID[];
  assetIds?: ID[];
  userIds?: ID[];
  startDate?: string;
  endDate?: string;
  timezone?: string;
}

export interface ReportDefinition {
  type: ReportType;
  label: string;
  requiredPermission: Permission;
  generatePermission?: Permission;
  sendPermission?: Permission;
  allowedRoles?: Role[];
  formats: ReportFormat[];
  supportsDateRange: boolean;
  supportsClientScope: boolean;
  supportsCampaignScope: boolean;
}

export interface ReportRequest extends Timestamps {
  id: ID;
  companyId: ID;
  requestedByUserId: ID;
  type: ReportType;
  format: ReportFormat;
  scope: ReportScope;
  status: ReportStatus;
  delivery: ReportDeliveryChannel;
  requestedAt: string;
  completedAt?: string;
  expiresAt?: string;
  failureReason?: string;
}

export interface ReportArtifact extends Timestamps {
  id: ID;
  reportRequestId: ID;
  companyId: ID;
  format: ReportFormat;
  fileName: string;
  contentType: string;
  sizeBytes?: number;
  storageKey?: string;
  downloadUrl?: string;
  generatedAt: string;
  expiresAt?: string;
}

export interface ReportRecipient {
  userId?: ID;
  email?: string;
}

export interface ReportSendRequest {
  reportRequestId: ID;
  companyId: ID;
  requestedByUserId: ID;
  recipients: ReportRecipient[];
  message?: string;
}

export const REPORT_DEFINITIONS: ReportDefinition[] = [
  { type: "crm", label: "CRM", requiredPermission: "crm.manage", formats: ["pdf", "csv", "xlsx"], supportsDateRange: true, supportsClientScope: true, supportsCampaignScope: false },
  { type: "sales", label: "Sales", requiredPermission: "proposals.manage", formats: ["pdf", "csv", "xlsx"], supportsDateRange: true, supportsClientScope: true, supportsCampaignScope: true },
  { type: "campaign", label: "Campaigns", requiredPermission: "campaigns.manage", formats: ["pdf", "csv", "xlsx"], supportsDateRange: true, supportsClientScope: true, supportsCampaignScope: true },
  { type: "inventory", label: "Inventory", requiredPermission: "inventory.manage", formats: ["pdf", "csv", "xlsx"], supportsDateRange: false, supportsClientScope: false, supportsCampaignScope: true },
  { type: "creative", label: "Creative", requiredPermission: "creatives.manage", formats: ["pdf", "csv", "xlsx"], supportsDateRange: true, supportsClientScope: true, supportsCampaignScope: true },
  { type: "delivery", label: "Delivery", requiredPermission: "campaigns.manage", formats: ["pdf", "csv", "xlsx"], supportsDateRange: true, supportsClientScope: true, supportsCampaignScope: true },
  { type: "proof", label: "Proof & Verification", requiredPermission: "operations.manage", formats: ["pdf", "csv", "xlsx"], supportsDateRange: true, supportsClientScope: true, supportsCampaignScope: true },
  { type: "analytics", label: "Analytics", requiredPermission: "reports.view", formats: ["pdf", "csv", "xlsx", "json"], supportsDateRange: true, supportsClientScope: true, supportsCampaignScope: true },
  { type: "finance", label: "Finance", requiredPermission: "finance.view", formats: ["pdf", "csv", "xlsx"], supportsDateRange: true, supportsClientScope: true, supportsCampaignScope: true },
  { type: "subscription", label: "Subscription & Usage", requiredPermission: "company.manage", formats: ["pdf", "csv", "xlsx"], supportsDateRange: true, supportsClientScope: false, supportsCampaignScope: false },
  { type: "client_portal", label: "Client Reports", requiredPermission: "client_portal.view", formats: ["pdf", "csv"], supportsDateRange: true, supportsClientScope: true, supportsCampaignScope: true },
  { type: "field_verification", label: "Field Verification", requiredPermission: "operations.manage", formats: ["pdf", "csv", "xlsx"], supportsDateRange: true, supportsClientScope: true, supportsCampaignScope: true },
];

export function getReportDefinition(type: ReportType): ReportDefinition {
  const definition = REPORT_DEFINITIONS.find((item) => item.type === type);
  if (!definition) throw new Error(`Unsupported report type: ${type}`);
  return definition;
}
