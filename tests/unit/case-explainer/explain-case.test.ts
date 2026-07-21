import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/case-search/courtlistener-provider", () => ({
  courtListenerCaseProvider: {
    name: "courtlistener",
    searchCases: vi.fn(),
    getCaseById: vi.fn(),
    getOpinionText: vi.fn(),
  },
}));

// This is a fast unit suite exercising explainCase's own orchestration
// logic — durable persistence (case-explanation-store.ts) has its own
// integration tests against a real database (tests/integration/case-explainer/).
vi.mock("@/lib/case-explainer/case-explanation-store", () => ({
  getStoredExplanation: vi.fn(async () => null),
  persistCaseExplanation: vi.fn(async () => undefined),
}));

const { courtListenerCaseProvider } = await import("@/lib/case-search/courtlistener-provider");
const { getStoredExplanation, persistCaseExplanation } = await import("@/lib/case-explainer/case-explanation-store");
const { explainCase } = await import("@/lib/case-explainer/explain-case");
const { resetExplanationCache } = await import("@/lib/case-explainer/explanation-cache");
const { createStaticCaseExplainerProvider } = await import("../../helpers/fake-case-explainer-provider");

const originalProvider = process.env.CASE_SEARCH_PROVIDER;

const sampleCase = {
  providerName: "courtlistener" as const,
  providerCaseId: "1",
  clusterId: null,
  caseName: "Smith v. State",
  citation: "123 S.E.2d 456",
  citations: ["123 S.E.2d 456"],
  court: "sc",
  courtId: "sc",
  jurisdiction: "sc",
  decisionDate: "2019-05-01",
  docketNumber: null,
  sourceUrl: "https://www.courtlistener.com/opinion/1/smith-v-state/",
  sourceName: "CourtListener (Free Law Project)",
  originalCollection: null,
  publicationStatus: "published" as const,
  matchedTopics: [],
  relevanceSummary: "x",
  laterHistoryStatus: "not-checked" as const,
  verificationStatus: "verified" as const,
  verificationMethod: "id-lookup" as const,
  dateVerified: new Date().toISOString(),
  disclaimer: "x",
};

const opinionText = "The Court held that officers may seize evidence in plain view during a lawful stop.";

function validExplanation(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    caseSummary: "A brief summary.",
    keyFacts: ["Fact one."],
    legalIssues: ["Was the search lawful?"],
    holding: "The search was lawful.",
    courtsReasoning: "Because of the plain-view exception.",
    ruleOfLaw: "Officers may seize items in plain view during a lawful stop.",
    whyThisCaseMatters: "It clarifies the plain-view exception.",
    howItMightRelate: "May be relevant background.",
    importantQuotes: [{ quote: "officers may seize evidence in plain view", whyItMatters: "States the rule." }],
    keyTerms: [{ term: "plain view", definition: "A doctrine allowing seizure of visible evidence." }],
    basedOnFullOpinionText: true,
    ...overrides,
  };
}

describe("explainCase", () => {
  beforeEach(() => {
    vi.mocked(courtListenerCaseProvider.getCaseById).mockReset();
    vi.mocked(courtListenerCaseProvider.getOpinionText).mockReset();
    vi.mocked(getStoredExplanation).mockReset().mockResolvedValue(null);
    vi.mocked(persistCaseExplanation).mockReset().mockResolvedValue(undefined);
    process.env.CASE_SEARCH_PROVIDER = "courtlistener";
    resetExplanationCache();
  });

  afterEach(() => {
    if (originalProvider === undefined) delete process.env.CASE_SEARCH_PROVIDER;
    else process.env.CASE_SEARCH_PROVIDER = originalProvider;
  });

  it("returns not-found without calling the case provider when no search provider is configured", async () => {
    process.env.CASE_SEARCH_PROVIDER = "none";
    const provider = createStaticCaseExplainerProvider({ status: "ok", explanation: validExplanation() });
    const result = await explainCase("1", { explainerProvider: provider });
    expect(result.status).toBe("not-found");
    expect(courtListenerCaseProvider.getCaseById).not.toHaveBeenCalled();
  });

  it("returns not-found when the case does not exist", async () => {
    vi.mocked(courtListenerCaseProvider.getCaseById).mockResolvedValueOnce(null);
    const provider = createStaticCaseExplainerProvider({ status: "ok", explanation: validExplanation() });
    const result = await explainCase("does-not-exist", { explainerProvider: provider });
    expect(result.status).toBe("not-found");
  });

  it("passes the real opinion text to the AI provider and returns the verified case + explanation", async () => {
    vi.mocked(courtListenerCaseProvider.getCaseById).mockResolvedValueOnce(sampleCase);
    vi.mocked(courtListenerCaseProvider.getOpinionText).mockResolvedValueOnce(opinionText);
    const provider = createStaticCaseExplainerProvider({ status: "ok", explanation: validExplanation() });

    const result = await explainCase("1", { explainerProvider: provider });

    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.caseResult.caseName).toBe("Smith v. State");
      expect(result.opinionText).toBe(opinionText);
      expect(result.explanation.importantQuotes).toHaveLength(1);
    }
    expect(provider.calls[0].opinionText).toBe(opinionText);
    expect(provider.calls[0].caseName).toBe("Smith v. State");
  });

  it("strips a quote the model fabricated that does not appear in the real opinion text", async () => {
    vi.mocked(courtListenerCaseProvider.getCaseById).mockResolvedValueOnce(sampleCase);
    vi.mocked(courtListenerCaseProvider.getOpinionText).mockResolvedValueOnce(opinionText);
    const provider = createStaticCaseExplainerProvider({
      status: "ok",
      explanation: validExplanation({
        importantQuotes: [
          { quote: "officers may seize evidence in plain view", whyItMatters: "real" },
          { quote: "this text was never actually in the opinion", whyItMatters: "fabricated" },
        ],
      }),
    });

    const result = await explainCase("1", { explainerProvider: provider });

    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.explanation.importantQuotes).toHaveLength(1);
      expect(result.explanation.importantQuotes[0].whyItMatters).toBe("real");
    }
  });

  it("still returns a limited explanation when no opinion text is available, honestly flagged", async () => {
    vi.mocked(courtListenerCaseProvider.getCaseById).mockResolvedValueOnce(sampleCase);
    vi.mocked(courtListenerCaseProvider.getOpinionText).mockResolvedValueOnce(null);
    const provider = createStaticCaseExplainerProvider({
      status: "ok",
      explanation: validExplanation({ importantQuotes: [], basedOnFullOpinionText: false }),
    });

    const result = await explainCase("1", { explainerProvider: provider });

    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.opinionText).toBeNull();
      expect(result.explanation.basedOnFullOpinionText).toBe(false);
    }
  });

  it("still returns the verified case + opinion text when only the AI explanation fails, never a raw error", async () => {
    vi.mocked(courtListenerCaseProvider.getCaseById).mockResolvedValueOnce(sampleCase);
    vi.mocked(courtListenerCaseProvider.getOpinionText).mockResolvedValueOnce(opinionText);
    const provider = createStaticCaseExplainerProvider({ status: "provider-error", message: "raw upstream detail" });

    const result = await explainCase("1", { explainerProvider: provider });

    expect(result.status).toBe("explanation-unavailable");
    if (result.status === "explanation-unavailable") {
      expect(result.caseResult.caseName).toBe("Smith v. State");
      expect(result.opinionText).toBe(opinionText);
      expect(result.message).not.toContain("raw upstream detail");
    }
  });

  it("caches a successful explanation and does not call the AI provider again for the same case", async () => {
    vi.mocked(courtListenerCaseProvider.getCaseById).mockResolvedValue(sampleCase);
    vi.mocked(courtListenerCaseProvider.getOpinionText).mockResolvedValue(opinionText);
    const provider = createStaticCaseExplainerProvider({ status: "ok", explanation: validExplanation() });

    await explainCase("1", { explainerProvider: provider });
    await explainCase("1", { explainerProvider: provider });

    expect(provider.calls).toHaveLength(1);
  });

  it("persists a fresh, successful explanation to durable storage", async () => {
    vi.mocked(courtListenerCaseProvider.getCaseById).mockResolvedValueOnce(sampleCase);
    vi.mocked(courtListenerCaseProvider.getOpinionText).mockResolvedValueOnce(opinionText);
    const provider = createStaticCaseExplainerProvider({ status: "ok", explanation: validExplanation() });

    await explainCase("1", { explainerProvider: provider });

    expect(persistCaseExplanation).toHaveBeenCalledTimes(1);
    const [persistedCase, persistedOpinionText] = vi.mocked(persistCaseExplanation).mock.calls[0];
    expect(persistedCase.caseName).toBe("Smith v. State");
    expect(persistedOpinionText).toBe(opinionText);
  });

  it("never persists when the AI explanation fails", async () => {
    vi.mocked(courtListenerCaseProvider.getCaseById).mockResolvedValueOnce(sampleCase);
    vi.mocked(courtListenerCaseProvider.getOpinionText).mockResolvedValueOnce(opinionText);
    const provider = createStaticCaseExplainerProvider({ status: "provider-error", message: "x" });

    await explainCase("1", { explainerProvider: provider });

    expect(persistCaseExplanation).not.toHaveBeenCalled();
  });

  it("checks durable storage before calling the AI provider when the in-memory cache misses", async () => {
    vi.mocked(courtListenerCaseProvider.getCaseById).mockResolvedValueOnce(sampleCase);
    vi.mocked(courtListenerCaseProvider.getOpinionText).mockResolvedValueOnce(opinionText);
    vi.mocked(getStoredExplanation).mockResolvedValueOnce({
      explanation: { ...validExplanation(), importantQuotes: [] } as never,
      opinionText,
    });
    const provider = createStaticCaseExplainerProvider({ status: "ok", explanation: validExplanation() });

    const result = await explainCase("1", { explainerProvider: provider });

    expect(provider.calls).toHaveLength(0);
    expect(persistCaseExplanation).not.toHaveBeenCalled();
    expect(result.status).toBe("ok");
  });
});
