import { buildSearchAttempts } from "@/lib/case-search/pipeline/build-search-attempts";
import { rankCase, rankCases } from "@/lib/case-search/pipeline/confidence";
import { safeLog } from "@/lib/security/safe-logger";
import type { CaseSourceProvider, CaseSearchRequest } from "@/lib/case-search/types";
import type { ProgressiveSearchResult, StageAttemptLog } from "@/lib/case-search/pipeline/types";

export interface ProgressiveSearchInput {
  jurisdiction: string;
  topics: string[];
  legalTerms: string[];
  /** The roadmap's own generated summary text — never the user's private intake narrative. Used only for the natural-language/semantic stage. */
  summary?: string;
  courtLevel?: CaseSearchRequest["courtLevel"];
  proceduralStage?: string;
  dateRange?: CaseSearchRequest["dateRange"];
  publishedOnly?: boolean;
  limit?: number;
  cursor?: string | null;
}

/**
 * Runs the multi-stage progressive search: tries each attempt in
 * priority order (roadmap's own jurisdiction, broadest-to-narrowest
 * query, then federal courts, then every jurisdiction, then a landmark
 * fallback) and stops at the first one that returns results — an
 * experienced researcher keeps refining a search rather than stopping
 * after one empty query, and this is that behavior encoded. `provider`
 * is injectable so tests never make a real network call.
 */
export async function runProgressiveSearch(
  input: ProgressiveSearchInput,
  provider: CaseSourceProvider,
): Promise<ProgressiveSearchResult> {
  const attempts = buildSearchAttempts({
    jurisdiction: input.jurisdiction,
    topics: input.topics,
    legalTerms: input.legalTerms,
    summary: input.summary,
  });

  const log: StageAttemptLog[] = [];
  let anyAttemptSucceededAtProviderLevel = false;

  for (const attempt of attempts) {
    const startedAt = Date.now();
    const request: CaseSearchRequest = {
      jurisdiction: input.jurisdiction,
      courtLevel: input.courtLevel,
      topics: input.topics,
      legalTerms: input.legalTerms,
      proceduralStage: input.proceduralStage,
      dateRange: input.dateRange,
      publishedOnly: input.publishedOnly,
      limit: input.limit,
      cursor: input.cursor,
      rawQuery: attempt.query,
      courtOverride: attempt.court,
      semantic: attempt.semantic,
    };

    const result = await provider.searchCases(request);
    const elapsedMs = Date.now() - startedAt;

    if (result.status === "not-configured") {
      log.push({ stageName: attempt.stageName, label: attempt.label, query: attempt.query, court: attempt.court, resultCount: 0, elapsedMs, succeeded: false, errored: true });
      safeLog("warn", "case-search stage skipped: provider not configured", { stage: attempt.stageName });
      break;
    }

    if (result.status !== "ok") {
      log.push({ stageName: attempt.stageName, label: attempt.label, query: attempt.query, court: attempt.court, resultCount: 0, elapsedMs, succeeded: false, errored: true });
      safeLog("warn", "case-search stage failed", { stage: attempt.stageName, status: result.status, elapsedMs });
      continue;
    }

    anyAttemptSucceededAtProviderLevel = true;
    const resultCount = result.page.cases.length;
    log.push({ stageName: attempt.stageName, label: attempt.label, query: attempt.query, court: attempt.court, resultCount, elapsedMs, succeeded: resultCount > 0, errored: false });
    safeLog("info", "case-search stage completed", { stage: attempt.stageName, query: attempt.query, court: attempt.court, resultCount, elapsedMs });

    if (resultCount > 0) {
      const ranked = rankCases(
        result.page.cases.map((caseResult) => rankCase({ caseResult, stageName: attempt.stageName, roadmapJurisdiction: input.jurisdiction })),
      );
      return {
        cases: ranked,
        succeededStage: attempt.stageName,
        attempts: log,
        isExhaustedFallback: false,
        isProviderFailure: false,
        suggestedResearchTerms: [],
      };
    }
  }

  const suggestedResearchTerms = [...new Set([...input.legalTerms, ...attempts.map((a) => a.query)])].filter(Boolean).slice(0, 8);

  return {
    cases: [],
    succeededStage: null,
    attempts: log,
    isExhaustedFallback: anyAttemptSucceededAtProviderLevel,
    isProviderFailure: !anyAttemptSucceededAtProviderLevel,
    suggestedResearchTerms,
  };
}
