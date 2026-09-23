import { describe, expect, it } from "vitest";
import { canTransitionCampaign, transitionCampaignStatus } from "@/domain/campaigns";

describe("campaign workflow", () => {
  it("allows only defined lifecycle transitions", () => {
    expect(canTransitionCampaign("draft", "proposal")).toBe(true);
    expect(canTransitionCampaign("draft", "paid")).toBe(false);
    expect(canTransitionCampaign("live", "completed")).toBe(true);
    expect(canTransitionCampaign("paid", "live")).toBe(false);
  });

  it("rejects invalid transitions", () => {
    expect(() => transitionCampaignStatus("draft", "paid")).toThrow();
  });
});
