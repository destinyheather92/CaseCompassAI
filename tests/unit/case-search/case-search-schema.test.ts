import { describe, expect, it } from "vitest";
import { caseSearchRequestSchema } from "@/lib/case-search/case-search-schema";

describe("caseSearchRequestSchema", () => {
  it("accepts a minimal valid request", () => {
    const result = caseSearchRequestSchema.safeParse({ jurisdiction: "SC", topics: ["habeas corpus"] });
    expect(result.success).toBe(true);
  });

  it("accepts a fully specified request", () => {
    const result = caseSearchRequestSchema.safeParse({
      jurisdiction: "SC",
      courtLevel: "appellate",
      topics: ["habeas corpus", "ineffective assistance"],
      legalTerms: ["Habeas Corpus"],
      proceduralStage: "post-conviction",
      dateRange: { from: "2015-01-01", to: "2024-01-01" },
      publishedOnly: true,
      limit: 5,
      cursor: "abc",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a missing jurisdiction", () => {
    const result = caseSearchRequestSchema.safeParse({ topics: ["x"] });
    expect(result.success).toBe(false);
  });

  it("rejects an empty topics array", () => {
    const result = caseSearchRequestSchema.safeParse({ jurisdiction: "SC", topics: [] });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed date", () => {
    const result = caseSearchRequestSchema.safeParse({
      jurisdiction: "SC",
      topics: ["x"],
      dateRange: { from: "01/01/2020" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects a limit above 50", () => {
    const result = caseSearchRequestSchema.safeParse({ jurisdiction: "SC", topics: ["x"], limit: 100 });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid courtLevel", () => {
    const result = caseSearchRequestSchema.safeParse({ jurisdiction: "SC", topics: ["x"], courtLevel: "not-real" });
    expect(result.success).toBe(false);
  });
});
