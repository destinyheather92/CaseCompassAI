import type { VerifiedCaseResult } from "@/lib/case-search/types";

/** Every stage the progressive search pipeline can try, in roughly the order it tries them. */
export type SearchStageName =
  | "primary-query"
  | "simplified-query"
  | "primary-legal-issue"
  | "synonym-expanded"
  | "natural-language"
  | "federal-jurisdiction"
  | "all-jurisdictions"
  | "landmark-precedent";

/** Selected-jurisdiction attempts reuse the query-strategy stage names above; these three name the jurisdiction-broadening tiers themselves. */
export type JurisdictionTierName = "selected-jurisdiction" | "federal-jurisdiction" | "all-jurisdictions";

export interface QueryStrategy {
  stageName: SearchStageName;
  /** Human-readable label for the search-transparency panel, e.g. "Searching related terms…". */
  label: string;
  query: string;
  /** True only for the semantic/natural-language strategy — tells the provider call to set semantic=true. */
  semantic?: boolean;
}

export interface JurisdictionTier {
  tierName: JurisdictionTierName;
  label: string;
  /** CourtListener `court` param value, or null to search all jurisdictions. */
  court: string | null;
  /** True once this tier no longer represents the roadmap's own (binding) jurisdiction. */
  isOutOfJurisdiction: boolean;
}

export interface SearchAttempt {
  stageName: SearchStageName;
  label: string;
  query: string;
  court: string | null;
  semantic: boolean;
  isOutOfJurisdiction: boolean;
}

export interface StageAttemptLog {
  stageName: SearchStageName;
  label: string;
  query: string;
  court: string | null;
  resultCount: number;
  elapsedMs: number;
  succeeded: boolean;
  /** Set only when the provider call itself failed (network/timeout) rather than simply returning zero results. */
  errored: boolean;
}

/** One confidence tier — never claims a factual match we cannot actually verify, only what the search/jurisdiction data supports. */
export interface ConfidenceRating {
  stars: 1 | 2 | 3 | 4 | 5;
  label: string;
  explanation: string;
}

export interface RankedCaseResult {
  case: VerifiedCaseResult;
  confidence: ConfidenceRating;
  isPersuasiveAuthority: boolean;
  foundVia: SearchStageName;
}

export interface ProgressiveSearchResult {
  cases: RankedCaseResult[];
  succeededStage: SearchStageName | null;
  attempts: StageAttemptLog[];
  /** True when every stage genuinely queried the provider and came back empty — a real "nothing found," not an outage. */
  isExhaustedFallback: boolean;
  /** True when every attempt failed at the provider level (network/timeout/rate-limit) — this is an outage, and must be surfaced as "unavailable," never as the friendly exhausted-search empty state. */
  isProviderFailure: boolean;
  /** Suggested manual research terms shown alongside the exhausted-fallback empty state — never fabricated, always drawn from the roadmap's own terms/strategies. */
  suggestedResearchTerms: string[];
}
