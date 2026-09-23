import type {
  CrmRepository, ProposalRepository, CreateProposalInput, FinanceRepository, NotificationRepository, CompanyRepository,
} from "@/repositories/interfaces";
import type { LeadStage, ProposalStatus, Payment, Role } from "@/domain";
import { LEAD_TRANSITIONS, PROPOSAL_TRANSITIONS, money } from "@/domain";
import { store, persist, withLatency, genId, nowIso } from "./store";

export class DemoCrmRepository implements CrmRepository {
  async getLeadQualification(id: string): Promise<import("@/domain").LeadQualification | null> {
    const lead = store.leads.find((l) => l.id === id);
    return lead ? { status: (lead.stage === "qualified" ? "qualified" : "unqualified") as import("@/domain").LeadQualificationStatus, qualifiedAt: null, qualifiedByUserId: null, notes: "", nextActionAt: null } : null;
  }
  async qualifyLead(id: string, qualification: import("@/domain").LeadQualification) {
    const lead = store.leads.find((l) => l.id === id);
    if (!lead) throw new Error(`Lead ${id} not found`);
    lead.updatedAt = nowIso(); persist(); return withLatency(lead);
  }
  async listOpportunities(stage?: import("@/domain").OpportunityStage[]) {
    const results = stage?.length ? store.opportunities.filter((o) => stage.includes(o.stage)) : store.opportunities; return withLatency(results);
  }
  async getOpportunity(id: string) { return withLatency(store.opportunities.find((o) => o.id === id) ?? null); }
  async createOpportunity(input: Omit<import("@/domain").Opportunity,"id"|"createdAt"|"updatedAt">) { const opportunity={...input,id:genId("opp"),createdAt:nowIso(),updatedAt:nowIso()}; store.opportunities.push(opportunity); persist(); return withLatency(opportunity); }
  async transitionOpportunityStage(id: string, next: import("@/domain").OpportunityStage) { const o=store.opportunities.find((x)=>x.id===id); if(!o)throw new Error(`Opportunity ${id} not found`); o.stage=next;o.updatedAt=nowIso();persist();return withLatency(o); }
  async listClients(search?: string) {
    let results = store.clients;
    if (search) {
      const q = search.toLowerCase();
      results = results.filter((c) => c.name.toLowerCase().includes(q) || c.industry.toLowerCase().includes(q));
    }
    return withLatency(results);
  }
  async getClient(id: string) {
    return withLatency(store.clients.find((c) => c.id === id) ?? null);
  }
  async listContactsForClient(clientId: string) {
    return withLatency(store.contacts.filter((c) => c.clientId === clientId));
  }
  async listLeads(stage?: LeadStage[]) {
    let results = store.leads;
    if (stage?.length) results = results.filter((l) => stage.includes(l.stage));
    return withLatency(results);
  }
  async transitionLeadStage(id: string, next: LeadStage) {
    const lead = store.leads.find((l) => l.id === id);
    if (!lead) throw new Error(`Lead ${id} not found`);
    if (!LEAD_TRANSITIONS[lead.stage]?.includes(next)) {
      throw new Error(`Cannot move lead from "${lead.stage}" to "${next}".`);
    }
    lead.stage = next;
    lead.updatedAt = nowIso();
    persist();
    return withLatency(lead, 240);
  }
}

export class DemoProposalRepository implements ProposalRepository {
  async listProposals(status?: ProposalStatus[]) {
    let results = store.proposals;
    if (status?.length) results = results.filter((p) => status.includes(p.status));
    return withLatency([...results].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
  }
  async getProposal(id: string) {
    return withLatency(store.proposals.find((p) => p.id === id) ?? null);
  }
  async createProposal(input: CreateProposalInput) {
    const items = input.items.map((item) => ({
      id: genId("pi"),
      assetId: item.assetId,
      description: item.description,
      days: item.days,
      unitPriceCents: item.unitPriceCents,
      totalCents: item.days * item.unitPriceCents,
    }));
    const subtotal = items.reduce((s, i) => s + i.totalCents, 0);
    const discountCents = Math.round(subtotal * (input.discountPct / 100));
    const estimatedImpressions = items.reduce((sum, item) => {
      const asset = store.assets.find((a) => a.id === item.assetId);
      return sum + (asset ? asset.audience.estimatedDailyImpressions * item.days : 0);
    }, 0);

    const proposal = {
      id: genId("proposal"),
      companyId: "company-1",
      code: `PRO-${2100 + store.proposals.length}`,
      clientId: input.clientId,
      campaignName: input.campaignName,
      status: "draft" as const,
      startDate: input.startDate,
      endDate: input.endDate,
      items,
      discountPct: input.discountPct,
      estimatedImpressions,
      total: money(subtotal - discountCents),
      ownerUserId: store.activeUserId,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    store.proposals.unshift(proposal);
    persist();
    return withLatency(proposal, 350);
  }
  async transitionProposalStatus(id: string, next: ProposalStatus) {
    const proposal = store.proposals.find((p) => p.id === id);
    if (!proposal) throw new Error(`Proposal ${id} not found`);
    if (!PROPOSAL_TRANSITIONS[proposal.status]?.includes(next)) {
      throw new Error(`Cannot move proposal from "${proposal.status}" to "${next}".`);
    }
    proposal.status = next;
    proposal.updatedAt = nowIso();
    persist();
    return withLatency(proposal, 260);
  }
}

export class DemoFinanceRepository implements FinanceRepository {
  async listInvoices() {
    return withLatency([...store.invoices].sort((a, b) => b.issueDate.localeCompare(a.issueDate)));
  }
  async getInvoice(id: string) {
    return withLatency(store.invoices.find((i) => i.id === id) ?? null);
  }
  async listPaymentsForInvoice(invoiceId: string) {
    return withLatency(store.payments.filter((p) => p.invoiceId === invoiceId));
  }
  async recordPayment(invoiceId: string, amountCents: number, method: Payment["method"], reference: string) {
    const invoice = store.invoices.find((i) => i.id === invoiceId);
    if (!invoice) throw new Error(`Invoice ${invoiceId} not found`);
    const payment: Payment = {
      id: genId("pay"), companyId: invoice.companyId, invoiceId, amount: money(amountCents),
      method, reference, paidAt: nowIso(), createdAt: nowIso(), updatedAt: nowIso(),
    };
    store.payments.push(payment);
    invoice.amountPaid = money(invoice.amountPaid.amountCents + amountCents);
    invoice.status = invoice.amountPaid.amountCents >= invoice.total.amountCents ? "paid" : "partially_paid";
    invoice.updatedAt = nowIso();
    persist();
    return withLatency(payment, 350);
  }
}

export class DemoNotificationRepository implements NotificationRepository {
  async list() {
    return withLatency([...store.notifications].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  }
  async markRead(id: string) {
    const n = store.notifications.find((x) => x.id === id);
    if (!n) throw new Error(`Notification ${id} not found`);
    n.read = true;
    persist();
    return withLatency(n, 120);
  }
  async markAllRead() {
    store.notifications.forEach((n) => (n.read = true));
    persist();
    return withLatency(undefined, 150);
  }
}

export class DemoCompanyRepository implements CompanyRepository {
  async getCurrentCompany() {
    const { COMPANY } = await import("@/fixtures");
    return withLatency(COMPANY);
  }
  async listUsers() {
    return withLatency(store.users);
  }
  async getCurrentUser() {
    const user = store.users.find((u) => u.id === store.activeUserId) ?? store.users[0];
    return withLatency(user);
  }
  async setActiveRole(role: Role) {
    const user = store.users.find((u) => u.role === role);
    if (!user) throw new Error(`No demo user with role ${role}`);
    store.activeUserId = user.id;
    persist();
    return withLatency(user, 150);
  }
}
