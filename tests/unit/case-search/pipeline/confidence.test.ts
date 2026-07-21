import { describe, expect, it } from "vitest";
import { computeConfidence, rankCase, rankCases } from "@/lib/case-search/pipeline/confidence";
import type { VerifiedCaseResult } from "@/lib/case-search/types";

const baseCase: VerifiedCaseResult = {
  providerName: "courtlistener",
  providerCaseId: "1",
  clusterId: null,
  caseName: "Smith v. State",
  citation: null,
  citations: [],
  court: "Supreme Court of South Carolina",
  courtId: "sc",
  jurisdiction: "sc",
  decisionDate: null,
  docketNumber: null,
  sourceUrl: "https://www.courtlistener.com/opinion/1/smith-v-state/",
  sourceName: "CourtListener (Free Law Project)",
  originalCollection: null,
  publicationStatus: "published",
  matchedTopics: [],
  relevanceSummary: "x",
  laterHistoryStatus: "not-checked",
  verificationStatus: "verified",
  verificationMethod: "search-match",
  dateVerified: new Date().toISOString(),
  disclaimer: "x",
};

describe("computeConfidence", () => {
  it("gives 5 stars to a primary-query match in the roadmap's own jurisdiction", () => {
    const rating = computeConfidence({ stageName: "primary-query", caseResult: baseCase, roadmapJurisdiction: "SC" });
    expect(rating.stars).toBe(5);
  });

  it("gives 4 stars to a primary-legal-issue match", () => {
    const rating = computeConfidence({ stageName: "primary-legal-issue", caseResult: baseCase });
    expect(rating.stars).toBe(4);
  });

  it("gives 2 stars and a persuasive-authority label to an all-jurisdictions match", () => {
    const rating = computeConfidence({ stageName: "all-jurisdictions", caseResult: baseCase });
    expect(rating.stars).toBe(2);
    expect(rating.label).toBe("Persuasive authority");
  });

  it("gives 1 star to a landmark-precedent fallback match", () => {
    const rating = computeConfidence({ stageName: "landmark-precedent", caseResult: baseCase });
    expect(rating.stars).toBe(1);
  });

  it("never claims a factual match — explanations stay limited to legal-issue/jurisdiction language", () => {
    const rating = computeConfidence({ stageName: "primary-query", caseResult: baseCase, roadmapJurisdiction: "SC" });
    expect(rating.explanation.toLowerCase()).not.toContain("factual");
  });
});

describe("rankCase / rankCases", () => {
  it("flags federal/all-jurisdiction/landmark stages as persuasive authority", () => {
    expect(rankCase({ caseResult: baseCase, stageName: "federal-jurisdiction" }).isPersuasiveAuthority).toBe(true);
    expect(rankCase({ caseResult: baseCase, stageName: "all-jurisdictions" }).isPersuasiveAuthority).toBe(true);
    expect(rankCase({ caseResult: baseCase, stageName: "landmark-precedent" }).isPersuasiveAuthority).toBe(true);
  });

  it("does not flag the selected-jurisdiction query stages as persuasive authority", () => {
    expect(rankCase({ caseResult: baseCase, stageName: "primary-query" }).isPersuasiveAuthority).toBe(false);
    expect(rankCase({ caseResult: baseCase, stageName: "simplified-query" }).isPersuasiveAuthority).toBe(false);
  });

  it("sorts ranked cases by confidence stars, highest first", () => {
    const ranked = [
      rankCase({ caseResult: baseCase, stageName: "landmark-precedent" }),
      rankCase({ caseResult: baseCase, stageName: "primary-query" }),
      rankCase({ caseResult: baseCase, stageName: "all-jurisdictions" }),
    ];
    const sorted = rankCases(ranked);
    expect(sorted.map((r) => r.confidence.stars)).toEqual([5, 2, 1]);
  });
});
