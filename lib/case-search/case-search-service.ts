import { getServerEnv } from "@/lib/env";
import { caseSearchRequestSchema, type CaseSearchRequestInput } from "@/lib/case-search/case-search-schema";
import { courtListenerCaseProvider } from "@/lib/case-search/courtlistener-provider";
import { getCachedSearch, setCachedSearch } from "@/lib/case-search/cache";
import { CASE_SEARCH_UNAVAILABLE_MESSAGE, CASE_SEARCH_SAFE_ERROR_MESSAGE } from "@/lib/case-search/case-search-constants";
import type { CaseSearchResultPage, VerifiedCaseResult } from "@/lib/case-search/types";

export type SearchCasesResult =
  | { status: "ok"; page: CaseSearchResultPage }
  | { status: "unavailable"; message: string }
  | { status: "invalid-request"; message: string };

function buildCacheKey(request: CaseSearchRequestInput): string {
  return JSON.stringify({
    jurisdiction: request.jurisdiction,
    courtLevel: request.courtLevel ?? null,
    topics: [...request.topics].sort(),
    legalTerms: [...(request.legalTerms ?? [])].sort(),
    proceduralStage: request.proceduralStage ?? null,
    dateRange: request.dateRange ?? null,
    publishedOnly: request.publishedOnly ?? false,
    limit: request.limit ?? null,
    cursor: request.cursor ?? null,
  });
}

/**
 * Retrieval-only: validates the request, checks that a provider is
 * actually configured, and delegates to it — never falls back to
 * AI-invented results on a provider failure. Only structured
 * topic/jurisdiction/term fields ever reach the provider (enforced by
 * caseSearchRequestSchema stripping unknown fields), never the user's
 * private intake narrative.
 */
export async function searchCasesForRoadmap(rawRequest: unknown): Promise<SearchCasesResult> {
  const parsed = caseSearchRequestSchema.safeParse(rawRequest);
  if (!parsed.success) {
    return { status: "invalid-request", message: parsed.error.issues[0]?.message ?? "Invalid request." };
  }

  const { CASE_SEARCH_PROVIDER } = getServerEnv();
  if (CASE_SEARCH_PROVIDER === "none") {
    return { status: "unavailable", message: CASE_SEARCH_UNAVAILABLE_MESSAGE };
  }

  const cacheKey = buildCacheKey(parsed.data);
  const cached = getCachedSearch(cacheKey);
  if (cached) {
    return { status: "ok", page: cached };
  }

  const result = await courtListenerCaseProvider.searchCases(parsed.data);

  if (result.status === "ok") {
    setCachedSearch(cacheKey, result.page);
    return { status: "ok", page: result.page };
  }

  if (result.status === "not-configured") {
    return { status: "unavailable", message: CASE_SEARCH_UNAVAILABLE_MESSAGE };
  }

  // provider-error / timeout — never surface the raw upstream message.
  return { status: "unavailable", message: CASE_SEARCH_SAFE_ERROR_MESSAGE };
}

export async function getVerifiedCaseById(providerCaseId: string): Promise<VerifiedCaseResult | null> {
  const { CASE_SEARCH_PROVIDER } = getServerEnv();
  if (CASE_SEARCH_PROVIDER === "none") return null;
  return courtListenerCaseProvider.getCaseById(providerCaseId);
}
