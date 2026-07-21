import { describe, expect, it, vi } from "vitest";
import { runProgressiveSearch } from "@/lib/case-search/pipeline/run-progressive-search";
import type { CaseSourceProvider, VerifiedCaseResult } from "@/lib/case-search/types";

const sampleCase: VerifiedCaseResult = {
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

function makeProvider(): CaseSourceProvider {
  return {
    name: "courtlistener",
    searchCases: vi.fn(),
    getCaseById: vi.fn(),
    getOpinionText: vi.fn(),
    verifyCitation: vi.fn(),
    getCitingCases: vi.fn(),
    getCitedCases: vi.fn(),
  };
}

describe("runProgressiveSearch", () => {
  it("stops at the first attempt that returns results and never calls the provider again", async () => {
    const provider = makeProvider();
    vi.mocked(provider.searchCases).mockResolvedValueOnce({ status: "ok", page: { cases: [sampleCase], nextCursor: null } });

    const result = await runProgressiveSearch({ jurisdiction: "SC", topics: ["due process"], legalTerms: [] }, provider);

    expect(result.cases).toHaveLength(1);
    expect(result.succeededStage).toBe("primary-query");
    expect(result.isExhaustedFallback).toBe(false);
    expect(result.isProviderFailure).toBe(false);
    expect(provider.searchCases).toHaveBeenCalledTimes(1);
  });

  it("keeps trying broader attempts when earlier ones return zero results", async () => {
    const provider = makeProvider();
    vi.mocked(provider.searchCases)
      .mockResolvedValueOnce({ status: "ok", page: { cases: [], nextCursor: null } })
      .mockResolvedValueOnce({ status: "ok", page: { cases: [], nextCursor: null } })
      .mockResolvedValueOnce({ status: "ok", page: { cases: [sampleCase], nextCursor: null } });

    const result = await runProgressiveSearch({ jurisdiction: "SC", topics: ["ineffective assistance of counsel"], legalTerms: [] }, provider);

    expect(result.cases).toHaveLength(1);
    expect(vi.mocked(provider.searchCases).mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it("continues past a single failed attempt instead of giving up", async () => {
    const provider = makeProvider();
    vi.mocked(provider.searchCases)
      .mockResolvedValueOnce({ status: "provider-error", message: "x" })
      .mockResolvedValueOnce({ status: "ok", page: { cases: [sampleCase], nextCursor: null } });

    const result = await runProgressiveSearch({ jurisdiction: "SC", topics: ["due process"], legalTerms: [] }, provider);

    expect(result.cases).toHaveLength(1);
    expect(result.attempts[0].errored).toBe(true);
  });

  it("reports isExhaustedFallback (not isProviderFailure) when every attempt genuinely returns zero results", async () => {
    const provider = makeProvider();
    vi.mocked(provider.searchCases).mockResolvedValue({ status: "ok", page: { cases: [], nextCursor: null } });

    const result = await runProgressiveSearch({ jurisdiction: "SC", topics: ["due process"], legalTerms: ["Due Process"] }, provider);

    expect(result.cases).toHaveLength(0);
    expect(result.isExhaustedFallback).toBe(true);
    expect(result.isProviderFailure).toBe(false);
    expect(result.suggestedResearchTerms.length).toBeGreaterThan(0);
  });

  it("reports isProviderFailure when every single attempt fails at the provider level", async () => {
    const provider = makeProvider();
    vi.mocked(provider.searchCases).mockResolvedValue({ status: "timeout", message: "x" });

    const result = await runProgressiveSearch({ jurisdiction: "SC", topics: ["due process"], legalTerms: [] }, provider);

    expect(result.cases).toHaveLength(0);
    expect(result.isProviderFailure).toBe(true);
  });

  it("stops immediately when the provider reports it is not configured", async () => {
    const provider = makeProvider();
    vi.mocked(provider.searchCases).mockResolvedValue({ status: "not-configured", message: "x" });

    const result = await runProgressiveSearch({ jurisdiction: "SC", topics: ["due process"], legalTerms: [] }, provider);

    expect(provider.searchCases).toHaveBeenCalledTimes(1);
    expect(result.isProviderFailure).toBe(true);
  });

  it("never sends the roadmap's summary as a raw private narrative field name — only as the natural-language stage's query", async () => {
    const provider = makeProvider();
    vi.mocked(provider.searchCases).mockResolvedValueOnce({ status: "ok", page: { cases: [sampleCase], nextCursor: null } });

    await runProgressiveSearch({ jurisdiction: "SC", topics: ["due process"], legalTerms: [], summary: "Roadmap summary text" }, provider);

    const callArg = vi.mocked(provider.searchCases).mock.calls[0][0];
    expect(callArg).not.toHaveProperty("summary");
    expect(callArg).not.toHaveProperty("narrative");
  });
});
