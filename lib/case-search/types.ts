export type CourtLevel = "trial" | "appellate" | "supreme" | "unknown";

export type PublicationStatus = "published" | "unpublished" | "unknown";

/** Never "good-law" unless a real citator/later-history service actually checked — "not-checked" is the honest default. */
export type LaterHistoryStatus = "not-checked" | "good-law" | "questioned" | "limited" | "reversed" | "overruled";

/**
 * Four-state verification model — a case is never simply "verified" or
 * not. "verified" requires an authoritative-source match (citation
 * lookup or an exact id/metadata match); "possible_match" is for a
 * plausible-but-unconfirmed result (e.g. citation-lookup returned
 * multiple candidates); "not_verified" means the provider was reachable
 * but found nothing reliable; "source_unavailable" covers every
 * provider-side failure (not configured, network error, timeout, rate
 * limit) — never silently treated as "not_verified", since that would
 * misrepresent a temporary outage as "this case doesn't check out."
 */
export type CaseVerificationStatus = "verified" | "possible_match" | "not_verified" | "source_unavailable";

/** Names for every planned/active case-law provider — see docs/behavior/verified-case-search.md's provider architecture section. Only "courtlistener" is active; the rest are documented future adapters, never called. */
export type LegalCaseProviderName = "courtlistener" | "vlex" | "fastcase" | "westlaw" | "lexis";

export interface CaseSearchRequest {
  jurisdiction: string;
  courtLevel?: CourtLevel;
  /** Roadmap research topics / step titles — never the user's private narrative. */
  topics: string[];
  legalTerms?: string[];
  proceduralStage?: string;
  dateRange?: { from?: string; to?: string };
  publishedOnly?: boolean;
  limit?: number;
  cursor?: string | null;
}

/**
 * Every field here must come from a real provider record — nothing is
 * ever synthesized. relevanceSummary is cautious by construction (see
 * lib/case-search/relevance-summary.ts) and never claims a case proves,
 * guarantees, or definitely applies to the user's situation.
 */
export interface VerifiedCaseResult {
  providerName: LegalCaseProviderName;
  providerCaseId: string;
  clusterId: string | null;
  caseName: string;
  citation: string | null;
  /** Every reporter citation the provider returned for this case, not just the primary one. */
  citations: string[];
  court: string;
  courtId: string | null;
  jurisdiction: string;
  decisionDate: string | null;
  docketNumber: string | null;
  sourceUrl: string;
  sourceName: string;
  /** Set only when the provider's own metadata identifies this record as originally digitized by the Caselaw Access Project — never guessed. */
  originalCollection: "caselaw-access-project" | null;
  publicationStatus: PublicationStatus;
  matchedTopics: string[];
  relevanceSummary: string;
  laterHistoryStatus: LaterHistoryStatus;
  verificationStatus: CaseVerificationStatus;
  /** How the status above was established — never claim "citation lookup" unless that endpoint was actually called. */
  verificationMethod: "citation-lookup" | "id-lookup" | "search-match" | "none";
  dateVerified: string;
  disclaimer: string;
}

export interface CaseSearchResultPage {
  cases: VerifiedCaseResult[];
  nextCursor: string | null;
}

/** Mirrors lib/ai/providers/intake-interviewer-provider.ts's IntakeInterviewResult pattern — a network-backed provider gets a full result union, not just a bare return value, so every failure mode is explicit and never surfaces a raw error to the client. */
export type CaseSearchProviderResult =
  | { status: "ok"; page: CaseSearchResultPage }
  | { status: "not-configured"; message: string }
  | { status: "provider-error"; message: string }
  | { status: "timeout"; message: string };

/**
 * Result of verifying a single citation/case-name string against the
 * provider's authoritative citation-lookup service.
 * - "verified": exactly one confident match.
 * - "possible_match": the provider found candidates but couldn't
 *   resolve a single confident match (e.g. an ambiguous citation).
 * - "not_verified": the provider was reachable and found nothing.
 * - "source_unavailable": the provider couldn't be reached/queried at all.
 */
export type CitationVerificationResult =
  | { status: "verified"; matchedCase: VerifiedCaseResult; message: string }
  | { status: "possible_match"; candidates: VerifiedCaseResult[]; message: string }
  | { status: "not_verified"; message: string }
  | { status: "source_unavailable"; message: string };

/**
 * A case-law citation relationship (from CourtListener's opinions-cited
 * graph). "cited" is the only treatment this data can actually support —
 * the mere existence of a citation says nothing about whether the later
 * case followed, distinguished, limited, questioned, or overruled the
 * earlier one, so `treatment` is never anything else unless a real
 * citator is integrated later.
 */
export interface RelatedCaseResult {
  case: VerifiedCaseResult;
  treatment: "cited";
  /** Number of times the citing opinion references the cited opinion, per the provider's own citation graph. */
  depth: number;
}

export type CitationGraphResult =
  | { status: "ok"; cases: RelatedCaseResult[] }
  | { status: "not-configured"; message: string }
  | { status: "source-unavailable"; message: string };

/**
 * Common interface every case-law provider implements — a thin,
 * swappable seam so the service layer and UI never depend on one
 * provider's response shapes. Only CourtListenerProvider is active; the
 * shape intentionally matches what a future vLex/Fastcase/Westlaw/Lexis
 * adapter would also implement (see docs/behavior/verified-case-search.md).
 */
export interface CaseSourceProvider {
  readonly name: LegalCaseProviderName;
  searchCases(request: CaseSearchRequest): Promise<CaseSearchProviderResult>;
  getCaseById(providerCaseId: string): Promise<VerifiedCaseResult | null>;
  /**
   * Full opinion text for reading/AI-explanation purposes, or null when
   * unavailable — never fabricated. Judicial opinion text is a distinct,
   * heavier fetch from the search/metadata lookup above, so it is its own
   * method rather than a field always populated on VerifiedCaseResult.
   */
  getOpinionText(providerCaseId: string): Promise<string | null>;
  /** Authoritative citation verification — the required guardrail before any case is ever labeled "Verified". */
  verifyCitation(citation: string): Promise<CitationVerificationResult>;
  /** Later cases that cite this one (forward citations) — never labeled as approving/following, only "cited". */
  getCitingCases(providerCaseId: string): Promise<CitationGraphResult>;
  /** Cases this one cites (its authorities / backward citations). */
  getCitedCases(providerCaseId: string): Promise<CitationGraphResult>;
}
