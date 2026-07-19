import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/case-search/courtlistener-provider", () => ({
  courtListenerCaseProvider: {
    name: "courtlistener",
    searchCases: vi.fn(),
    getCaseById: vi.fn(),
  },
}));

const { courtListenerCaseProvider } = await import("@/lib/case-search/courtlistener-provider");
const { searchCasesForRoadmap, getVerifiedCaseById } = await import("@/lib/case-search/case-search-service");
const { resetCaseSearchCache } = await import("@/lib/case-search/cache");

const originalProvider = process.env.CASE_SEARCH_PROVIDER;

const validRequest = { jurisdiction: "SC", topics: ["habeas corpus"] };

const samplePage = {
  cases: [
    {
      providerName: "courtlistener",
      providerCaseId: "1",
      caseName: "Smith v. State",
      citation: null,
      court: "sc",
      jurisdiction: "sc",
      decisionDate: null,
      docketNumber: null,
      sourceUrl: "https://www.courtlistener.com/opinion/1/smith-v-state/",
      sourceName: "CourtListener (Free Law Project)",
      publicationStatus: "published" as const,
      matchedTopics: ["habeas corpus"],
      relevanceSummary: "This case may be useful to review because it discusses a topic identified in your roadmap: habeas corpus.",
      laterHistoryStatus: "not-checked" as const,
      verificationStatus: "verified" as const,
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

  it("returns the provider's page on success", async () => {
    vi.mocked(courtListenerCaseProvider.searchCases).mockResolvedValueOnce({ status: "ok", page: samplePage });
    const result = await searchCasesForRoadmap(validRequest);
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.page.cases).toHaveLength(1);
    }
  });

  it("maps a provider-error result to a safe unavailable message, never the raw provider error", async () => {
    vi.mocked(courtListenerCaseProvider.searchCases).mockResolvedValueOnce({ status: "provider-error", message: "raw upstream failure detail" });
    const result = await searchCasesForRoadmap(validRequest);
    expect(result.status).toBe("unavailable");
    if (result.status === "unavailable") {
      expect(result.message).not.toContain("raw upstream failure detail");
    }
  });

  it("maps a timeout result to a safe unavailable message", async () => {
    vi.mocked(courtListenerCaseProvider.searchCases).mockResolvedValueOnce({ status: "timeout", message: "x" });
    const result = await searchCasesForRoadmap(validRequest);
    expect(result.status).toBe("unavailable");
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
});
