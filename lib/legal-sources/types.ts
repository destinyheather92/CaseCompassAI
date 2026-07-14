export type LegalSourceType =
  | "official"
  | "cornell-lii"
  | "case-law-database"
  | "licensed-provider"
  | "curated";

export type LegalSource = {
  title: string;
  url: string;
  sourceType: LegalSourceType;
};

export type LegalTermDefinition = {
  term: string;
  plainLanguageDefinition: string;
  formalDefinition: string;
  category: string;
  example: string;
  relatedTerms: string[];
  jurisdictionNote: string;
  sources: LegalSource[];
  lastVerified: string;
  disclaimer: string;
};

export type LegalTermLookupRequest = {
  term: string;
  jurisdiction?: string;
};

export type LegalTermLookupResult =
  | { status: "found"; definition: LegalTermDefinition }
  | { status: "not-found"; message: string; suggestions?: string[] }
  | { status: "invalid-request"; message: string }
  | { status: "rate-limited"; message: string };

/**
 * Common interface every legal source provider implements. The service
 * queries providers in priority order and stops at the first hit, so the
 * app never depends on a single provider.
 */
export interface LegalSourceProvider {
  readonly name: string;
  lookup(normalizedTerm: string): Promise<LegalTermDefinition | null>;
}
