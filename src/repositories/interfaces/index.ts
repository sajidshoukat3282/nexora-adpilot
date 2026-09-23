import type { LocationSearchQuery, LocationSearchResponse, LocationResolution, GeoCoordinate, ID } from "@/domain";
import type {
  Client, Contact, Lead, LeadStage, Opportunity, OpportunityStage,
  Proposal, ProposalStatus,
  Invoice, Payment,
  Notification,
  Company, User,
} from "@/domain";

export interface CrmRepository {
  listClients(search?: string): Promise<Client[]>;
  getClient(id: ID): Promise<Client | null>;
  listContactsForClient(clientId: ID): Promise<Contact[]>;
  listLeads(stage?: LeadStage[]): Promise<Lead[]>;
  transitionLeadStage(id: ID, next: LeadStage): Promise<Lead>;
  getLeadQualification(id: ID): Promise<import("@/domain").LeadQualification | null>;
  qualifyLead(id: ID, qualification: import("@/domain").LeadQualification): Promise<Lead>;
  listOpportunities(stage?: OpportunityStage[]): Promise<Opportunity[]>;
  getOpportunity(id: ID): Promise<Opportunity | null>;
  createOpportunity(input: Omit<Opportunity, "id" | "createdAt" | "updatedAt">): Promise<Opportunity>;
  transitionOpportunityStage(id: ID, next: OpportunityStage): Promise<Opportunity>;
}

export interface CreateProposalInput {
  clientId: ID;
  campaignName: string;
  startDate: string;
  endDate: string;
  items: Array<{ assetId: ID; description: string; days: number; unitPriceCents: number }>;
  discountPct: number;
}

export interface ProposalRepository {
  listProposals(status?: ProposalStatus[]): Promise<Proposal[]>;
  getProposal(id: ID): Promise<Proposal | null>;
  createProposal(input: CreateProposalInput): Promise<Proposal>;
  transitionProposalStatus(id: ID, next: ProposalStatus): Promise<Proposal>;
}

export interface FinanceRepository {
  listInvoices(): Promise<Invoice[]>;
  getInvoice(id: ID): Promise<Invoice | null>;
  listPaymentsForInvoice(invoiceId: ID): Promise<Payment[]>;
  recordPayment(invoiceId: ID, amountCents: number, method: Payment["method"], reference: string): Promise<Payment>;
}

export interface NotificationRepository {
  list(): Promise<Notification[]>;
  markRead(id: ID): Promise<Notification>;
  markAllRead(): Promise<void>;
}

export interface CompanyRepository {
  getCurrentCompany(): Promise<Company>;
  listUsers(): Promise<User[]>;
  getCurrentUser(): Promise<User>;
  setActiveRole(role: User["role"]): Promise<User>;
}


/** Provider boundary for global location/geography search. */
export interface LocationSearchRepository {
  search(query: LocationSearchQuery): Promise<LocationSearchResponse>;
  resolve(resultId: ID): Promise<LocationResolution | null>;
  reverseGeocode?(coordinate: GeoCoordinate): Promise<LocationSearchResponse | null>;
}

/** Server-backed Report Center boundary. Implementations must enforce tenant and permission scope. */
export interface ReportRepository {
  listAvailableDefinitions(): Promise<import("@/domain").ReportDefinition[]>;
  createRequest(input: Omit<import("@/domain").ReportRequest, "createdAt" | "updatedAt">): Promise<import("@/domain").ReportRequest>;
  getRequest(id: ID): Promise<import("@/domain").ReportRequest | null>;
  getArtifact(requestId: ID): Promise<import("@/domain").ReportArtifact | null>;
  send(input: import("@/domain").ReportSendRequest): Promise<void>;
}

/** Deterministic smart media planning boundary; implementations must remain tenant-scoped. */
export interface SmartMediaPlanningRepository {
  generate(request: import("@/domain").SmartMediaPlanningRequest): Promise<import("@/domain").SmartMediaPlan>;
  get(planId: ID): Promise<import("@/domain").SmartMediaPlan | null>;
}

export type { CreativeRepository } from "./CreativeRepository";
export type { CreativeStorageRepository } from "./CreativeStorageRepository";

export interface ApprovalRepository { list(creativeId: ID): Promise<import('@/domain').ApprovalReview[]>; submit(input: Omit<import('@/domain').ApprovalReview,'id'|'createdAt'|'updatedAt'>): Promise<import('@/domain').ApprovalReview>; }
export interface SchedulingRepository { listForCampaign(campaignId: ID): Promise<import('@/domain').CampaignScheduleAssignment[]>; create(input: Omit<import('@/domain').CampaignScheduleAssignment,'id'|'createdAt'|'updatedAt'>): Promise<import('@/domain').CampaignScheduleAssignment>; }
export interface DeliveryRepository { publish(command: import('@/domain').DeliveryCommand): Promise<import('@/domain').DeliveryCommand>; unpublish(command: import('@/domain').DeliveryCommand): Promise<import('@/domain').DeliveryCommand>; health(assetId: ID): Promise<import('@/domain').ScreenHealth|null>; }
export interface ProofRepository { listForCampaign(campaignId: ID): Promise<import('@/domain').ProofEvidence[]>; submit(input: Omit<import('@/domain').ProofEvidence,'id'|'createdAt'|'updatedAt'>): Promise<import('@/domain').ProofEvidence>; }
export interface FieldVerificationRepository { listAssigned(userId: ID): Promise<import('@/domain').FieldTask[]>; submitCapture(input: import('@/domain').FieldCapture): Promise<import('@/domain').ProofEvidence>; }
export interface AnalyticsRepository { query(input: import('@/domain').AnalyticsQuery): Promise<import('@/domain').DeliveryMetric[]>; }
export interface SubscriptionRepository { get(companyId: ID): Promise<import('@/domain').Subscription|null>; }
export interface AuditRepository { append(event: import('@/domain').AuditEvent): Promise<void>; list(entityType: string, entityId: ID): Promise<import('@/domain').AuditEvent[]>; }
export type { AccountRepository, MembershipRepository, DeviceRepository, IntegrationRepository, ClientPortalRepository } from './PlatformRepositories';
