import { describe, expect, it } from "vitest";
import { authorizeProtectedRequest } from "@/domain";

const base = {
  accountId: "acct-1",
  companyId: "company-1",
  membershipCompanyId: "company-1",
  role: "campaign_manager" as const,
  permission: "campaigns.manage" as const,
};

const activeProfessional = {
  id: "sub-1",
  companyId: "company-1",
  planId: "professional" as const,
  status: "active" as const,
  billingCycle: "monthly" as const,
  startsAt: "2026-01-01T00:00:00Z",
  maxSeats: 10,
  maxDevices: 20,
  paymentStatus: "paid" as const,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

describe("protected request pipeline", () => {
  it("rejects tenant mismatches before permissions", () => {
    const result = authorizeProtectedRequest({ ...base, membershipCompanyId: "company-2" });
    expect(result).toEqual({ allowed: false, stage: "tenant", reason: "Tenant mismatch." });
  });

  it("enforces subscription entitlements before allowing a request", () => {
    const result = authorizeProtectedRequest({ ...base, entitlement: "finance", subscription: activeProfessional });
    expect(result.allowed).toBe(false);
    expect(result.stage).toBe("entitlement");
  });

  it("enforces seat limits before permission success", () => {
    const result = authorizeProtectedRequest({ ...base, seatUsage: { current: 10, limit: 10 } });
    expect(result.allowed).toBe(false);
    expect(result.stage).toBe("seat");
  });

  it("allows a request after tenant, entitlement, usage and role checks pass", () => {
    const result = authorizeProtectedRequest({
      ...base,
      entitlement: "campaigns",
      subscription: activeProfessional,
      seatUsage: { current: 2, limit: 10 },
      deviceUsage: { current: 5, limit: 20 },
    });
    expect(result).toEqual({ allowed: true, stage: "permission" });
  });
});
