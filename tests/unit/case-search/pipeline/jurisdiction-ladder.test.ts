import { describe, expect, it } from "vitest";
import { buildJurisdictionLadder } from "@/lib/case-search/pipeline/jurisdiction-ladder";

describe("buildJurisdictionLadder", () => {
  it("builds selected -> federal -> all tiers for a known state", () => {
    const tiers = buildJurisdictionLadder("SC");
    expect(tiers.map((t) => t.tierName)).toEqual(["selected-jurisdiction", "federal-jurisdiction", "all-jurisdictions"]);
    expect(tiers[0].court).toBe("sc");
    expect(tiers[0].label).toContain("South Carolina");
    expect(tiers[0].isOutOfJurisdiction).toBe(false);
  });

  it("uses the correct federal circuit court id for a known state", () => {
    const tiers = buildJurisdictionLadder("SC");
    const federal = tiers.find((t) => t.tierName === "federal-jurisdiction");
    expect(federal?.court).toBe("scotus ca4");
  });

  it("marks the all-jurisdictions tier as out-of-jurisdiction", () => {
    const tiers = buildJurisdictionLadder("SC");
    const all = tiers.find((t) => t.tierName === "all-jurisdictions");
    expect(all?.court).toBeNull();
    expect(all?.isOutOfJurisdiction).toBe(true);
  });

  it("handles the FEDERAL jurisdiction option with only two tiers", () => {
    const tiers = buildJurisdictionLadder("FEDERAL");
    expect(tiers.map((t) => t.tierName)).toEqual(["federal-jurisdiction", "all-jurisdictions"]);
    expect(tiers[0].court).toContain("scotus");
  });

  it("handles UNKNOWN with a single all-jurisdictions tier", () => {
    const tiers = buildJurisdictionLadder("UNKNOWN");
    expect(tiers).toHaveLength(1);
    expect(tiers[0].tierName).toBe("all-jurisdictions");
    expect(tiers[0].court).toBeNull();
  });

  it("is case-insensitive on the jurisdiction code", () => {
    const tiers = buildJurisdictionLadder("sc");
    expect(tiers[0].court).toBe("sc");
  });
});
