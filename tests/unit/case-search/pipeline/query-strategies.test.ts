import { describe, expect, it } from "vitest";
import { buildFullQuery, generateQueryStrategies } from "@/lib/case-search/pipeline/query-strategies";

describe("buildFullQuery", () => {
  it("joins topics and legal terms into one query string", () => {
    expect(buildFullQuery(["Understand Your Charges"], ["Due Process", "Arraignment"])).toBe(
      "Understand Your Charges Due Process Arraignment",
    );
  });
});

describe("generateQueryStrategies", () => {
  it("always includes the primary-query stage first", () => {
    const strategies = generateQueryStrategies({ topics: ["Understand Your Charges"], legalTerms: ["Due Process"] });
    expect(strategies[0].stageName).toBe("primary-query");
    expect(strategies[0].query).toBe("Understand Your Charges Due Process");
  });

  it("includes a simplified-query stage when simplification actually changes the query", () => {
    const strategies = generateQueryStrategies({ topics: ["Understand Your Charges"], legalTerms: [] });
    const simplified = strategies.find((s) => s.stageName === "simplified-query");
    expect(simplified).toBeDefined();
    expect(simplified?.query).not.toBe("Understand Your Charges");
  });

  it("includes a primary-legal-issue stage when a known legal issue phrase is present", () => {
    const strategies = generateQueryStrategies({ topics: ["My ineffective assistance of counsel claim"], legalTerms: [] });
    const issueStage = strategies.find((s) => s.stageName === "primary-legal-issue");
    expect(issueStage?.query).toBe("ineffective assistance of counsel");
  });

  it("omits the primary-legal-issue stage when no known phrase is present", () => {
    const strategies = generateQueryStrategies({ topics: ["Prepare for your hearing"], legalTerms: [] });
    expect(strategies.some((s) => s.stageName === "primary-legal-issue")).toBe(false);
  });

  it("includes a synonym-expanded stage when a synonym trigger word is present", () => {
    const strategies = generateQueryStrategies({ topics: ["Talk to your attorney"], legalTerms: [] });
    expect(strategies.some((s) => s.stageName === "synonym-expanded")).toBe(true);
  });

  it("includes a semantic natural-language stage only when a summary is provided", () => {
    const withSummary = generateQueryStrategies({ topics: ["x"], legalTerms: [], summary: "My case involves a guilty plea." });
    expect(withSummary.some((s) => s.stageName === "natural-language" && s.semantic)).toBe(true);

    const withoutSummary = generateQueryStrategies({ topics: ["x"], legalTerms: [] });
    expect(withoutSummary.some((s) => s.stageName === "natural-language")).toBe(false);
  });

  it("never duplicates an identical query across stages", () => {
    const strategies = generateQueryStrategies({ topics: ["due process"], legalTerms: [] });
    const queries = strategies.map((s) => s.query.toLowerCase());
    expect(new Set(queries).size).toBe(queries.length);
  });
});
