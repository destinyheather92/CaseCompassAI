import { describe, expect, it } from "vitest";
import { buildRelevanceSummary } from "@/lib/case-search/relevance-summary";

describe("buildRelevanceSummary", () => {
  it("mentions matched topics using cautious language", () => {
    const summary = buildRelevanceSummary(["habeas corpus"]);
    expect(summary).toContain("may be useful to review");
    expect(summary).toContain("habeas corpus");
  });

  it("never claims a case proves, guarantees, or definitely applies", () => {
    const summary = buildRelevanceSummary(["ineffective assistance", "appeal deadline"]);
    expect(summary.toLowerCase()).not.toMatch(/proves|guarantee|definitely applies|best case|should be cited/);
  });

  it("falls back to a generic cautious summary with no matched topics", () => {
    const summary = buildRelevanceSummary([]);
    expect(summary).toBe("This case may be useful to review as part of your research.");
  });
});
