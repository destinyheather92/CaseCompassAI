export type CourtLevel = "trial" | "appellate" | "supreme" | "unknown";

export type PublicationStatus = "published" | "unpublished" | "unknown";

/** Never "good-law" unless a real citator/later-history service actually checked — "not-checked" is the honest default. */
export type LaterHistoryStatus = "not-checked" | "good-law" | "questioned" | "limited" | "reversed" | "overruled";

export type CaseVerificationStatus = "verified";

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
  providerName: string;
  providerCaseId: string;
  caseName: string;
  citation: string | null;
  court: string;
  jurisdiction: string;
  decisionDate: string | null;
  docketNumber: string | null;
  sourceUrl: string;
  sourceName: string;
  publicationStatus: PublicationStatus;
  matchedTopics: string[];
  relevanceSummary: string;
  laterHistoryStatus: LaterHistoryStatus;
  verificationStatus: CaseVerificationStatus;
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
 * Common interface every case-search provider implements — a thin,
 * swappable seam so the service layer never depends on one provider.
 */
export interface CaseSourceProvider {
  readonly name: string;
  searchCases(request: CaseSearchRequest): Promise<CaseSearchProviderResult>;
  getCaseById(providerCaseId: string): Promise<VerifiedCaseResult | null>;
}
