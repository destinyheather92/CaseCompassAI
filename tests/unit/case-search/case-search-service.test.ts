import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/case-search/courtlistener-provider", () => ({
  courtListenerCaseProvider: {
    name: "courtlistener",
    searchCases: vi.fn(),
    getCaseById: vi.fn(),
    getOpinionText: vi.fn(),
    verifyCitation: vi.fn(),
    getCitingCases: vi.fn(),
    getCitedCases: vi.fn(),
  },
}));

const { courtListenerCaseProvider } = await import("@/lib/case-search/courtlistener-provider");
const { searchCasesForRoadmap, getVerifiedCaseById, verifyCaseCitation, getCaseCitationGraph } = await import(
  "@/lib/case-search/case-search-service"
);
const { resetCaseSearchCache } = await import("@/lib/case-search/cache");

const originalProvider = process.env.CASE_SEARCH_PROVIDER;

const validRequest = { jurisdiction: "SC", topics: ["habeas corpus"] };

const samplePage = {
  cases: [
    {
      providerName: "courtlistener" as const,
      providerCaseId: "1",
      clusterId: null,
      caseName: "Smith v. State",
      citation: null,
      citations: [],
      court: "sc",
      courtId: "sc",
      jurisdiction: "sc",
      decisionDate: null,
      docketNumber: null,
      sourceUrl: "https://www.courtlistener.com/opinion/1/smith-v-state/",
      sourceName: "CourtListener (Free Law Project)",
      originalCollection: null,
      publicationStatus: "published" as const,
      matchedTopics: ["habeas corpus"],
      relevanceSummary: "This case may be useful to review because it discusses a topic identified in your roadmap: habeas corpus.",
      laterHistoryStatus: "not-checked" as const,
      verificationStatus: "verified" as const,
      verificationMethod: "search-match" as const,
      dateVerified: new Date().toISOString(),
      disclaimer: "x",
    },
  ],
  nextCursor: null,
};

describe("searchCasesForRoadmap", () => {
  beforeEach(() => {
    vi.mocked(courtListenerCaseProvider.searchCases).mockReset();
    vi.mocked(courtListenerCaseProvider.getCaseById).mockReset();
    process.env.CASE_SEARCH_PROVIDER = "courtlistener";
    resetCaseSearchCache();
  });

  afterEach(() => {
    if (originalProvider === undefined) delete process.env.CASE_SEARCH_PROVIDER;
    else process.env.CASE_SEARCH_PROVIDER = originalProvider;
  });

  it("rejects malformed input without calling the provider", async () => {
    const result = await searchCasesForRoadmap({ jurisdiction: "SC" });
    expect(result.status).toBe("invalid-request");
    expect(courtListenerCaseProvider.searchCases).not.toHaveBeenCalled();
  });

  it("returns unavailable without calling the provider when CASE_SEARCH_PROVIDER is none", async () => {
    process.env.CASE_SEARCH_PROVIDER = "none";
    const result = await searchCasesForRoadmap(validRequest);
    expect(result.status).toBe("unavailable");
    if (result.status === "unavailable") {
      expect(result.message).toMatch(/not available yet/i);
    }
    expect(courtListenerCaseProvider.searchCases).not.toHaveBeenCalled();
  });

  it("returns the provider's cases on success, ranked, after only the first (primary-query) attempt", async () => {
    vi.mocked(courtListenerCaseProvider.searchCases).mockResolvedValueOnce({ status: "ok", page: samplePage });
    const result = await searchCasesForRoadmap(validRequest);
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.cases).toHaveLength(1);
      expect(result.cases[0].confidence.stars).toBe(5);
      expect(result.succeededStage).toBe("primary-query");
    }
    expect(courtListenerCaseProvider.searchCases).toHaveBeenCalledTimes(1);
  });

  it("broadens the search and keeps going when earlier attempts return zero results", async () => {
    vi.mocked(courtListenerCaseProvider.searchCases)
      .mockResolvedValueOnce({ status: "ok", page: { cases: [], nextCursor: null } })
      .mockResolvedValueOnce({ status: "ok", page: { cases: [], nextCursor: null } })
      .mockResolvedValueOnce({ status: "ok", page: samplePage });
    const result = await searchCasesForRoadmap(validRequest);
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.cases).toHaveLength(1);
    }
    expect(vi.mocked(courtListenerCaseProvider.searchCases).mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it("continues to the next stage when one attempt errors, rather than giving up immediately", async () => {
    vi.mocked(courtListenerCaseProvider.searchCases)
      .mockResolvedValueOnce({ status: "provider-error", message: "raw upstream failure detail" })
      .mockResolvedValueOnce({ status: "ok", page: samplePage });
    const result = await searchCasesForRoadmap(validRequest);
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.cases).toHaveLength(1);
    }
  });

  it("maps a total provider outage (every attempt fails) to a safe unavailable message, never the raw provider error", async () => {
    vi.mocked(courtListenerCaseProvider.searchCases).mockResolvedValue({ status: "provider-error", message: "raw upstream failure detail" });
    const result = await searchCasesForRoadmap(validRequest);
    expect(result.status).toBe("unavailable");
    if (result.status === "unavailable") {
      expect(result.message).not.toContain("raw upstream failure detail");
    }
  });

  it("maps a total timeout outage to a safe unavailable message", async () => {
    vi.mocked(courtListenerCaseProvider.searchCases).mockResolvedValue({ status: "timeout", message: "x" });
    const result = await searchCasesForRoadmap(validRequest);
    expect(result.status).toBe("unavailable");
  });

  it("returns an exhausted-fallback empty state (not 'unavailable') when every stage genuinely returns zero results", async () => {
    vi.mocked(courtListenerCaseProvider.searchCases).mockResolvedValue({ status: "ok", page: { cases: [], nextCursor: null } });
    const result = await searchCasesForRoadmap(validRequest);
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.cases).toHaveLength(0);
      expect(result.isExhaustedFallback).toBe(true);
      expect(result.suggestedResearchTerms.length).toBeGreaterThan(0);
    }
  });

  it("caches a successful result and does not call the provider again for the same request", async () => {
    vi.mocked(courtListenerCaseProvider.searchCases).mockResolvedValueOnce({ status: "ok", page: samplePage });
    await searchCasesForRoadmap(validRequest);
    await searchCasesForRoadmap(validRequest);
    expect(courtListenerCaseProvider.searchCases).toHaveBeenCalledTimes(1);
  });

  it("never sends the user's private narrative — only topics/terms/jurisdiction fields reach the provider", async () => {
    vi.mocked(courtListenerCaseProvider.searchCases).mockResolvedValueOnce({ status: "ok", page: samplePage });
    await searchCasesForRoadmap({ ...validRequest, extraPrivateField: "should be stripped by schema" });
    const callArg = vi.mocked(courtListenerCaseProvider.searchCases).mock.calls[0][0];
    expect(callArg).not.toHaveProperty("extraPrivateField");
  });
});

describe("getVerifiedCaseById", () => {
  beforeEach(() => {
    vi.mocked(courtListenerCaseProvider.getCaseById).mockReset();
    process.env.CASE_SEARCH_PROVIDER = "courtlistener";
  });

  afterEach(() => {
    if (originalProvider === undefined) delete process.env.CASE_SEARCH_PROVIDER;
    else process.env.CASE_SEARCH_PROVIDER = originalProvider;
  });

  it("returns null without calling the provider when no provider is configured", async () => {
    process.env.CASE_SEARCH_PROVIDER = "none";
    const result = await getVerifiedCaseById("1");
    expect(result).toBeNull();
    expect(courtListenerCaseProvider.getCaseById).not.toHaveBeenCalled();
  });

  it("delegates to the configured provider", async () => {
    vi.mocked(courtListenerCaseProvider.getCaseById).mockResolvedValueOnce(samplePage.cases[0]);
    const result = await getVerifiedCaseById("1");
    expect(result?.caseName).toBe("Smith v. State");
  });

  it("returns null without calling the provider for an unsafe/invalid case id", async () => {
    const result = await getVerifiedCaseById("../../etc");
    expect(result).toBeNull();
    expect(courtListenerCaseProvider.getCaseById).not.toHaveBeenCalled();
  });
});

describe("verifyCaseCitation", () => {
  beforeEach(() => {
    vi.mocked(courtListenerCaseProvider.verifyCitation).mockReset();
    process.env.CASE_SEARCH_PROVIDER = "courtlistener";
  });

  afterEach(() => {
    if (originalProvider === undefined) delete process.env.CASE_SEARCH_PROVIDER;
    else process.env.CASE_SEARCH_PROVIDER = originalProvider;
  });

  it("rejects an invalid/empty citation without calling the provider", async () => {
    const result = await verifyCaseCitation("");
    expect(result.status).toBe("invalid-request");
    expect(courtListenerCaseProvider.verifyCitation).not.toHaveBeenCalled();
  });

  it("rejects a non-string citation without calling the provider", async () => {
    const result = await verifyCaseCitation(12345);
    expect(result.status).toBe("invalid-request");
    expect(courtListenerCaseProvider.verifyCitation).not.toHaveBeenCalled();
  });

  it("returns source_unavailable without calling the provider when unconfigured", async () => {
    process.env.CASE_SEARCH_PROVIDER = "none";
    const result = await verifyCaseCitation("466 U.S. 668");
    expect(result.status).toBe("source_unavailable");
    expect(courtListenerCaseProvider.verifyCitation).not.toHaveBeenCalled();
  });

  it("delegates a valid citation to the provider and returns its result", async () => {
    vi.mocked(courtListenerCaseProvider.verifyCitation).mockResolvedValueOnce({
      status: "verified",
      matchedCase: samplePage.cases[0],
      message: "Verified.",
    });
    const result = await verifyCaseCitation("466 U.S. 668");
    expect(result.status).toBe("verified");
  });
});

describe("getCaseCitationGraph", () => {
  beforeEach(() => {
    vi.mocked(courtListenerCaseProvider.getCitingCases).mockReset();
    vi.mocked(courtListenerCaseProvider.getCitedCases).mockReset();
    process.env.CASE_SEARCH_PROVIDER = "courtlistener";
  });

  afterEach(() => {
    if (originalProvider === undefined) delete process.env.CASE_SEARCH_PROVIDER;
    else process.env.CASE_SEARCH_PROVIDER = originalProvider;
  });

  it("rejects an invalid case id without calling the provider", async () => {
    const result = await getCaseCitationGraph("../../etc", "citing");
    expect(result.status).toBe("invalid-request");
    expect(courtListenerCaseProvider.getCitingCases).not.toHaveBeenCalled();
  });

  it("returns unavailable without calling the provider when unconfigured", async () => {
    process.env.CASE_SEARCH_PROVIDER = "none";
    const result = await getCaseCitationGraph("100", "citing");
    expect(result.status).toBe("unavailable");
    expect(courtListenerCaseProvider.getCitingCases).not.toHaveBeenCalled();
  });

  it("calls getCitingCases for direction 'citing'", async () => {
    vi.mocked(courtListenerCaseProvider.getCitingCases).mockResolvedValueOnce({ status: "ok", cases: [] });
    const result = await getCaseCitationGraph("100", "citing");
    expect(result.status).toBe("ok");
    expect(courtListenerCaseProvider.getCitingCases).toHaveBeenCalledWith("100");
    expect(courtListenerCaseProvider.getCitedCases).not.toHaveBeenCalled();
  });

  it("calls getCitedCases for direction 'cited'", async () => {
    vi.mocked(courtListenerCaseProvider.getCitedCases).mockResolvedValueOnce({ status: "ok", cases: [] });
    const result = await getCaseCitationGraph("100", "cited");
    expect(result.status).toBe("ok");
    expect(courtListenerCaseProvider.getCitedCases).toHaveBeenCalledWith("100");
    expect(courtListenerCaseProvider.getCitingCases).not.toHaveBeenCalled();
  });

  it("maps a provider source-unavailable result to a safe unavailable message", async () => {
    vi.mocked(courtListenerCaseProvider.getCitingCases).mockResolvedValueOnce({
      status: "source-unavailable",
      message: "raw upstream detail",
    });
    const result = await getCaseCitationGraph("100", "citing");
    expect(result.status).toBe("unavailable");
    if (result.status === "unavailable") {
      expect(result.message).not.toContain("raw upstream detail");
    }
  });
});
