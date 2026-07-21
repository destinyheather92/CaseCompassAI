import { afterAll, afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { getStoredExplanation, persistCaseExplanation, hashSourceText } from "@/lib/case-explainer/case-explanation-store";
import type { VerifiedCaseResult } from "@/lib/case-search/types";
import type { VerifiedCaseExplanation } from "@/lib/case-explainer/case-explanation-schema";

const createdLegalCaseIds: string[] = [];

function makeCaseResult(overrides: Partial<VerifiedCaseResult> = {}): VerifiedCaseResult {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    providerName: "courtlistener",
    providerCaseId: `store-test-${suffix}`,
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
    publicationStatus: "published",
    matchedTopics: [],
    relevanceSummary: "x",
    laterHistoryStatus: "not-checked",
    verificationStatus: "verified",
    verificationMethod: "id-lookup",
    dateVerified: new Date().toISOString(),
    disclaimer: "x",
    ...overrides,
  };
}

const opinionText = "The Court held that officers may seize evidence in plain view during a lawful stop.";

function makeExplanation(overrides: Partial<VerifiedCaseExplanation> = {}): VerifiedCaseExplanation {
  return {
    caseSummary: "A brief summary.",
    keyFacts: ["Fact one."],
    legalIssues: ["Was the search lawful?"],
    holding: "The search was lawful.",
    courtsReasoning: "Because of the plain-view exception.",
    ruleOfLaw: "Officers may seize items in plain view during a lawful stop.",
    whyThisCaseMatters: "It clarifies the plain-view exception.",
    howItMightRelate: "May be relevant background.",
    importantQuotes: [
      { quote: "officers may seize evidence in plain view", whyItMatters: "States the rule.", location: { characterOffset: 20, paragraphNumber: 1 } },
    ],
    keyTerms: [{ term: "plain view", definition: "A doctrine allowing seizure of visible evidence." }],
    basedOnFullOpinionText: true,
    ...overrides,
  };
}

async function cleanup(providerCaseId: string) {
  const record = await prisma.legalCaseRecord.findUnique({ where: { provider_providerCaseId: { provider: "COURTLISTENER", providerCaseId } } });
  if (record) createdLegalCaseIds.push(record.id);
}

describe("case-explanation-store", () => {
  afterEach(async () => {
    await prisma.caseExplanationRecord.deleteMany({ where: { legalCaseId: { in: createdLegalCaseIds } } });
    await prisma.legalCaseRecord.deleteMany({ where: { id: { in: createdLegalCaseIds } } });
    createdLegalCaseIds.length = 0;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("persists a case + explanation and reads it back byte-for-byte", async () => {
    const caseResult = makeCaseResult();
    const explanation = makeExplanation();
    await persistCaseExplanation(caseResult, opinionText, explanation);
    await cleanup(caseResult.providerCaseId);

    const stored = await getStoredExplanation(caseResult.providerName, caseResult.providerCaseId, opinionText);
    expect(stored).not.toBeNull();
    expect(stored?.explanation.caseSummary).toBe(explanation.caseSummary);
    expect(stored?.explanation.importantQuotes).toEqual(explanation.importantQuotes);
    expect(stored?.opinionText).toBe(opinionText);
  });

  it("returns null when no record exists for that provider/case id", async () => {
    const stored = await getStoredExplanation("courtlistener", "does-not-exist-anywhere", opinionText);
    expect(stored).toBeNull();
  });

  it("returns null when the stored explanation was generated from different opinion text (hash mismatch)", async () => {
    const caseResult = makeCaseResult();
    const explanation = makeExplanation();
    await persistCaseExplanation(caseResult, opinionText, explanation);
    await cleanup(caseResult.providerCaseId);

    const stored = await getStoredExplanation(caseResult.providerName, caseResult.providerCaseId, "completely different opinion text");
    expect(stored).toBeNull();
  });

  it("upserts the LegalCaseRecord rather than duplicating it on a second persist for the same case", async () => {
    const caseResult = makeCaseResult();
    await persistCaseExplanation(caseResult, opinionText, makeExplanation());
    await persistCaseExplanation(caseResult, opinionText, makeExplanation({ caseSummary: "Updated summary." }));
    await cleanup(caseResult.providerCaseId);

    const count = await prisma.legalCaseRecord.count({
      where: { provider: "COURTLISTENER", providerCaseId: caseResult.providerCaseId },
    });
    expect(count).toBe(1);
  });

  it("never stores AI-generated content in the LegalCaseRecord row itself — only the source fields", async () => {
    const caseResult = makeCaseResult();
    await persistCaseExplanation(caseResult, opinionText, makeExplanation());
    await cleanup(caseResult.providerCaseId);

    const record = await prisma.legalCaseRecord.findUnique({
      where: { provider_providerCaseId: { provider: "COURTLISTENER", providerCaseId: caseResult.providerCaseId } },
    });
    expect(record).not.toBeNull();
    expect(JSON.stringify(record)).not.toContain("plain-view exception");
  });

  it("hashSourceText is deterministic for the same input and differs for different input", () => {
    expect(hashSourceText("a")).toBe(hashSourceText("a"));
    expect(hashSourceText("a")).not.toBe(hashSourceText("b"));
    expect(hashSourceText(null)).toBe(hashSourceText(null));
  });
});
