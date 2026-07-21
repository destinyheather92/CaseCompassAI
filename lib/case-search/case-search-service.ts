import { getServerEnv } from "@/lib/env";
import { caseSearchRequestSchema, type CaseSearchRequestInput } from "@/lib/case-search/case-search-schema";
import { courtListenerCaseProvider } from "@/lib/case-search/courtlistener-provider";
import { getCachedSearch, setCachedSearch } from "@/lib/case-search/cache";
import { isValidProviderCaseId, citationTextSchema } from "@/lib/case-search/case-id-schema";
import { runProgressiveSearch } from "@/lib/case-search/pipeline/run-progressive-search";
import { CASE_SEARCH_UNAVAILABLE_MESSAGE, CASE_SEARCH_SAFE_ERROR_MESSAGE } from "@/lib/case-search/case-search-constants";
import type { CitationVerificationResult, RelatedCaseResult, VerifiedCaseResult } from "@/lib/case-search/types";
import type { ProgressiveSearchResult } from "@/lib/case-search/pipeline/types";

export type SearchCasesResult =
  | ({ status: "ok" } & ProgressiveSearchResult)
  | { status: "unavailable"; message: string }
  | { status: "invalid-request"; message: string };

function buildCacheKey(request: CaseSearchRequestInput, summary?: string): string {
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
    summary: summary ?? null,
  });
}

/**
 * Retrieval-only: validates the request, checks that a provider is
 * actually configured, then runs the progressive multi-stage search
 * pipeline (lib/case-search/pipeline/) — trying progressively broader
 * queries and jurisdictions rather than stopping at the first empty
 * result. Never falls back to AI-invented results on a provider
 * failure. Only structured topic/jurisdiction/term fields and the
 * roadmap's own generated `summary` ever reach the provider (enforced by
 * caseSearchRequestSchema stripping unknown fields) — `summary` is
 * accepted as a separate, server-only parameter specifically so it can
 * never be supplied or overridden by client input, and it must always be
 * the roadmap's own generated summary text, never the user's private
 * intake narrative.
 */
export async function searchCasesForRoadmap(rawRequest: unknown, summary?: string): Promise<SearchCasesResult> {
  const parsed = caseSearchRequestSchema.safeParse(rawRequest);
  if (!parsed.success) {
    return { status: "invalid-request", message: parsed.error.issues[0]?.message ?? "Invalid request." };
  }

  const { CASE_SEARCH_PROVIDER } = getServerEnv();
  if (CASE_SEARCH_PROVIDER === "none") {
    return { status: "unavailable", message: CASE_SEARCH_UNAVAILABLE_MESSAGE };
  }

  const cacheKey = buildCacheKey(parsed.data, summary);
  const cached = getCachedSearch(cacheKey);
  if (cached) {
    return { status: "ok", ...cached };
  }

  const result = await runProgressiveSearch(
    {
      jurisdiction: parsed.data.jurisdiction,
      topics: parsed.data.topics,
      legalTerms: parsed.data.legalTerms ?? [],
      summary,
      courtLevel: parsed.data.courtLevel,
      proceduralStage: parsed.data.proceduralStage,
      dateRange: parsed.data.dateRange,
      publishedOnly: parsed.data.publishedOnly,
      limit: parsed.data.limit,
      cursor: parsed.data.cursor,
    },
    courtListenerCaseProvider,
  );

  // Every attempt failed at the provider level (network/timeout/rate-limit) — an outage, not a real "nothing found." Never cached, and never shown as the friendly exhausted-search empty state.
  if (result.isProviderFailure) {
    return { status: "unavailable", message: CASE_SEARCH_SAFE_ERROR_MESSAGE };
  }

  setCachedSearch(cacheKey, result);
  return { status: "ok", ...result };
}

export async function getVerifiedCaseById(providerCaseId: string): Promise<VerifiedCaseResult | null> {
  const { CASE_SEARCH_PROVIDER } = getServerEnv();
  if (CASE_SEARCH_PROVIDER === "none") return null;
  if (!isValidProviderCaseId(providerCaseId)) return null;
  return courtListenerCaseProvider.getCaseById(providerCaseId);
}

export type VerifyCitationServiceResult =
  | { status: "invalid-request"; message: string }
  | CitationVerificationResult;

const CITATION_NOT_CONFIGURED_MESSAGE = "Citation verification is not available yet.";

/**
 * The citation-verification guardrail every "Verified" label depends on
 * — validates the input shape first (bounded length, safe character
 * set), then delegates to the provider's own authoritative citation
 * lookup. Never falls back to a client-side guess when unconfigured or
 * failing; that's exactly what "source_unavailable" communicates instead.
 */
export async function verifyCaseCitation(rawCitation: unknown): Promise<VerifyCitationServiceResult> {
  const parsed = citationTextSchema.safeParse(rawCitation);
  if (!parsed.success) {
    return { status: "invalid-request", message: parsed.error.issues[0]?.message ?? "Invalid citation." };
  }

  const { CASE_SEARCH_PROVIDER } = getServerEnv();
  if (CASE_SEARCH_PROVIDER === "none") {
    return { status: "source_unavailable", message: CITATION_NOT_CONFIGURED_MESSAGE };
  }

  return courtListenerCaseProvider.verifyCitation(parsed.data);
}

export type CitationGraphServiceResult =
  | { status: "ok"; cases: RelatedCaseResult[] }
  | { status: "unavailable"; message: string }
  | { status: "invalid-request"; message: string };

/**
 * Cases citing (`direction: "citing"`) or cited by (`direction: "cited"`)
 * a given opinion — never labeled as approving/following/overruling,
 * only "cited" (see RelatedCaseResult). providerCaseId is validated
 * before it ever reaches a URL (SSRF/path-injection defense).
 */
export async function getCaseCitationGraph(providerCaseId: string, direction: "citing" | "cited"): Promise<CitationGraphServiceResult> {
  if (!isValidProviderCaseId(providerCaseId)) {
    return { status: "invalid-request", message: "Invalid case id." };
  }

  const { CASE_SEARCH_PROVIDER } = getServerEnv();
  if (CASE_SEARCH_PROVIDER === "none") {
    return { status: "unavailable", message: CASE_SEARCH_UNAVAILABLE_MESSAGE };
  }

  const result =
    direction === "citing"
      ? await courtListenerCaseProvider.getCitingCases(providerCaseId)
      : await courtListenerCaseProvider.getCitedCases(providerCaseId);

  if (result.status === "ok") {
    return { status: "ok", cases: result.cases };
  }
  if (result.status === "not-configured") {
    return { status: "unavailable", message: CASE_SEARCH_UNAVAILABLE_MESSAGE };
  }
  return { status: "unavailable", message: CASE_SEARCH_SAFE_ERROR_MESSAGE };
}
