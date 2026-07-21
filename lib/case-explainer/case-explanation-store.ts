import { createHash } from "node:crypto";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { LegalCaseProvider as PrismaLegalCaseProvider } from "@/lib/generated/prisma/enums";
import type { VerifiedCaseResult, CaseVerificationStatus, LegalCaseProviderName } from "@/lib/case-search/types";
import type { VerifiedCaseExplanation } from "@/lib/case-explainer/case-explanation-schema";
import type { VerifiedQuote } from "@/lib/case-explainer/verify-quotes";

const OPENAI_MODEL_NAME = "openai-case-explainer";
export const CASE_EXPLAINER_PROMPT_VERSION = "case-explainer-v1";

/** Deterministic content hash — lets a cached explanation be invalidated if the underlying opinion text ever changes (e.g. becomes available after previously being null). */
export function hashSourceText(text: string | null): string {
  return createHash("sha256").update(text ?? "").digest("hex");
}

function toPrismaProvider(providerName: LegalCaseProviderName): PrismaLegalCaseProvider {
  return providerName.toUpperCase() as PrismaLegalCaseProvider;
}

function toPrismaVerificationStatus(status: CaseVerificationStatus): "VERIFIED" | "POSSIBLE_MATCH" | "NOT_VERIFIED" | "SOURCE_UNAVAILABLE" {
  return status.toUpperCase() as "VERIFIED" | "POSSIBLE_MATCH" | "NOT_VERIFIED" | "SOURCE_UNAVAILABLE";
}

/**
 * Upserts the normalized case record and creates a new explanation row.
 * Always writes both together — a `LegalCaseRecord` with no explanation
 * yet is a valid transient state (case fetched, explanation still
 * generating), but this function only runs after a real, quote-verified
 * explanation exists, so it writes the pair atomically enough for this
 * app's needs (Prisma runs these as sequential statements; a partial
 * failure here just means the next request re-fetches from the provider,
 * never a corrupted read).
 */
export async function persistCaseExplanation(
  caseResult: VerifiedCaseResult,
  opinionText: string | null,
  explanation: VerifiedCaseExplanation,
): Promise<void> {
  const sourceTextHash = hashSourceText(opinionText);

  const legalCase = await prisma.legalCaseRecord.upsert({
    where: {
      provider_providerCaseId: {
        provider: toPrismaProvider(caseResult.providerName),
        providerCaseId: caseResult.providerCaseId,
      },
    },
    create: {
      provider: toPrismaProvider(caseResult.providerName),
      providerCaseId: caseResult.providerCaseId,
      clusterId: caseResult.clusterId,
      caseName: caseResult.caseName,
      citation: caseResult.citation,
      citations: caseResult.citations,
      courtName: caseResult.court,
      courtId: caseResult.courtId,
      jurisdiction: caseResult.jurisdiction,
      docketNumber: caseResult.docketNumber,
      decisionDate: caseResult.decisionDate ? new Date(caseResult.decisionDate) : undefined,
      opinionText,
      sourceUrl: caseResult.sourceUrl,
      verificationStatus: toPrismaVerificationStatus(caseResult.verificationStatus),
      verificationMethod: caseResult.verificationMethod,
      originalCollection: caseResult.originalCollection,
    },
    update: {
      caseName: caseResult.caseName,
      citation: caseResult.citation,
      citations: caseResult.citations,
      opinionText,
      verificationStatus: toPrismaVerificationStatus(caseResult.verificationStatus),
      verificationMethod: caseResult.verificationMethod,
    },
  });

  await prisma.caseExplanationRecord.create({
    data: {
      legalCaseId: legalCase.id,
      model: OPENAI_MODEL_NAME,
      promptVersion: CASE_EXPLAINER_PROMPT_VERSION,
      sourceTextHash,
      summary: explanation.caseSummary,
      keyFacts: explanation.keyFacts,
      legalIssues: explanation.legalIssues,
      holding: explanation.holding,
      courtsReasoning: explanation.courtsReasoning,
      ruleOfLaw: explanation.ruleOfLaw,
      whyThisCaseMatters: explanation.whyThisCaseMatters,
      howItMightRelate: explanation.howItMightRelate,
      importantQuotes: explanation.importantQuotes as unknown as Prisma.InputJsonValue,
      keyTerms: explanation.keyTerms as unknown as Prisma.InputJsonValue,
      basedOnFullOpinionText: explanation.basedOnFullOpinionText,
    },
  });
}

export interface StoredExplanation {
  explanation: VerifiedCaseExplanation;
  opinionText: string | null;
}

/**
 * Reads a previously-persisted explanation, only when it was generated
 * from the exact same opinion text this request has (via the hash) —
 * never returns a stale explanation for text that has since changed
 * (e.g. the provider now returns full text where it previously didn't).
 */
export async function getStoredExplanation(
  providerName: LegalCaseProviderName,
  providerCaseId: string,
  opinionText: string | null,
): Promise<StoredExplanation | null> {
  const sourceTextHash = hashSourceText(opinionText);

  const legalCase = await prisma.legalCaseRecord.findUnique({
    where: { provider_providerCaseId: { provider: toPrismaProvider(providerName), providerCaseId } },
    include: {
      explanations: { where: { sourceTextHash }, orderBy: { generatedAt: "desc" }, take: 1 },
    },
  });

  if (!legalCase || legalCase.explanations.length === 0) return null;
  const stored = legalCase.explanations[0];

  const importantQuotes = stored.importantQuotes as unknown as VerifiedQuote[];
  const keyTerms = stored.keyTerms as unknown as VerifiedCaseExplanation["keyTerms"];
  const keyFacts = stored.keyFacts as unknown as string[];
  const legalIssues = stored.legalIssues as unknown as string[];

  return {
    opinionText: legalCase.opinionText,
    explanation: {
      caseSummary: stored.summary,
      keyFacts,
      legalIssues,
      holding: stored.holding,
      courtsReasoning: stored.courtsReasoning,
      ruleOfLaw: stored.ruleOfLaw,
      whyThisCaseMatters: stored.whyThisCaseMatters,
      howItMightRelate: stored.howItMightRelate,
      importantQuotes,
      keyTerms,
      basedOnFullOpinionText: stored.basedOnFullOpinionText,
    },
  };
}
