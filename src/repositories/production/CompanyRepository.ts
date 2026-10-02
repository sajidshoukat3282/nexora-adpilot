import type { Company, User } from "@/domain";
import type { CompanyRepository } from "@/repositories/interfaces";

export interface SessionResponse {
  company: Company;
  user: User;
}

export interface SessionApiClient {
  getSession(): Promise<SessionResponse>;
}

export class ProductionCompanyRepository implements CompanyRepository {
  constructor(private readonly api: SessionApiClient) {}

  async getCurrentCompany(): Promise<Company> {
    const session = await this.api.getSession();
    return session.company;
  }

  async listUsers(): Promise<User[]> {
    throw new Error("Production user listing is not implemented yet.");
  }

  async getCurrentUser(): Promise<User> {
    const session = await this.api.getSession();
    return session.user;
  }

  async setActiveRole(role: User["role"]): Promise<User> {
    throw new Error(
      `Production role switching is not implemented yet: ${role}`,
    );
  }
}
