import { getServerEnv } from "@/lib/env";
import { courtListenerCaseProvider } from "@/lib/case-search/courtlistener-provider";
import { defaultOpenAICaseExplainer } from "@/lib/ai/providers/openai-case-explainer";
import { verifyQuotesAgainstSource } from "@/lib/case-explainer/verify-quotes";
import { getCachedExplanation, setCachedExplanation } from "@/lib/case-explainer/explanation-cache";
import { getStoredExplanation, persistCaseExplanation } from "@/lib/case-explainer/case-explanation-store";
import type { CaseExplainerProvider } from "@/lib/ai/providers/case-explainer-provider";
import type { VerifiedCaseExplanation } from "@/lib/case-explainer/case-explanation-schema";
import type { VerifiedCaseResult } from "@/lib/case-search/types";

export type ExplainCaseResult =
  | { status: "ok"; caseResult: VerifiedCaseResult; explanation: VerifiedCaseExplanation; opinionText: string | null }
  | { status: "not-found" }
  /** The case itself was found and can still be shown (header + original opinion text) — only the AI explanation failed. */
  | { status: "explanation-unavailable"; caseResult: VerifiedCaseResult; opinionText: string | null; message: string };

const SAFE_UNAVAILABLE_MESSAGE =
  "CaseCompass could not prepare a plain-language explanation for this case right now. You can still read the original opinion using the link on this page.";

export interface ExplainCaseDeps {
  explainerProvider?: CaseExplainerProvider;
}

/**
 * Fetches a verified case + its opinion text (when available), asks the
 * AI explainer to break it down, and independently re-verifies every
 * quote the model returns against the real opinion text before trusting
 * it — never surfaces a quote the model merely claims is verbatim. The
 * roadmap/case-search boundary this composes with never trusts client
 * input for jurisdiction/ownership; this function takes only a
 * provider-scoped case id, which is public data, not user-owned.
 *
 * Three-tier lookup: in-memory cache (fastest, this process only) ->
 * persisted `LegalCaseRecord`/`CaseExplanationRecord` (survives restarts,
 * shared across processes) -> the real provider + AI call (slowest,
 * only when neither cache has a hit for this exact opinion text).
 */
export async function explainCase(providerCaseId: string, deps: ExplainCaseDeps = {}): Promise<ExplainCaseResult> {
  const explainerProvider = deps.explainerProvider ?? defaultOpenAICaseExplainer;

  const { CASE_SEARCH_PROVIDER } = getServerEnv();
  if (CASE_SEARCH_PROVIDER === "none") {
    return { status: "not-found" };
  }

  const caseResult = await courtListenerCaseProvider.getCaseById(providerCaseId);
  if (!caseResult) {
    return { status: "not-found" };
  }

  const memoryCached = getCachedExplanation(caseResult.providerName, caseResult.providerCaseId);
  if (memoryCached) {
    return { status: "ok", caseResult, explanation: memoryCached.explanation, opinionText: memoryCached.opinionText };
  }

  const opinionText = await courtListenerCaseProvider.getOpinionText(providerCaseId);

  const stored = await getStoredExplanation(caseResult.providerName, caseResult.providerCaseId, opinionText);
  if (stored) {
    setCachedExplanation(caseResult.providerName, caseResult.providerCaseId, stored.explanation, stored.opinionText);
    return { status: "ok", caseResult, explanation: stored.explanation, opinionText: stored.opinionText };
  }

  const result = await explainerProvider.explainCase({
    caseName: caseResult.caseName,
    court: caseResult.court,
    citation: caseResult.citation,
    decisionDate: caseResult.decisionDate,
    opinionText,
  });

  if (result.status !== "ok") {
    return { status: "explanation-unavailable", caseResult, opinionText, message: SAFE_UNAVAILABLE_MESSAGE };
  }

  const explanation: VerifiedCaseExplanation = {
    ...result.explanation,
    importantQuotes: verifyQuotesAgainstSource(result.explanation.importantQuotes, opinionText),
  };

  setCachedExplanation(caseResult.providerName, caseResult.providerCaseId, explanation, opinionText);
  await persistCaseExplanation(caseResult, opinionText, explanation);

  return { status: "ok", caseResult, explanation, opinionText };
}
