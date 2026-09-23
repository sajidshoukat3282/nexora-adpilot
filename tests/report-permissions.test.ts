import { describe, expect, it } from "vitest";
import { roleHasPermission } from "@/domain/shared";
import { getReportDefinition } from "@/domain/reports";

describe("permission-aware reports", () => {
  it("requires finance permission for finance reports", () => {
    expect(getReportDefinition("finance").requiredPermission).toBe("finance.view");
    expect(roleHasPermission("finance", "finance.view")).toBe(true);
    expect(roleHasPermission("client", "finance.view")).toBe(false);
  });

  it("allows a client to use only the client-report permission", () => {
    expect(roleHasPermission("client", "client_portal.view")).toBe(true);
    expect(roleHasPermission("client", "finance.view")).toBe(false);
  });
});
