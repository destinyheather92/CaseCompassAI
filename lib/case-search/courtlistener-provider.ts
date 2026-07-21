import "server-only";
import { getServerEnv } from "@/lib/env";
import { buildRelevanceSummary } from "@/lib/case-search/relevance-summary";
import { CASE_RESEARCH_DISCLAIMER } from "@/lib/case-search/case-search-constants";
import { isValidProviderCaseId } from "@/lib/case-search/case-id-schema";
import type {
  CaseSourceProvider,
  CaseSearchRequest,
  CaseSearchProviderResult,
  VerifiedCaseResult,
  PublicationStatus,
  CitationVerificationResult,
  CitationGraphResult,
  RelatedCaseResult,
} from "@/lib/case-search/types";

const BASE_URL = "https://www.courtlistener.com/api/rest/v4";
const REQUEST_TIMEOUT_MS = 8000;
/** Bounds how many citing/cited cases get hydrated with full metadata per call — the citation graph itself can return far more edges than are useful to show, and each hydration is its own request. */
const MAX_RELATED_CASES = 10;

/**
 * Endpoint paths and shapes below are confirmed against CourtListener's
 * (Free Law Project) current, live v4 API documentation
 * (wiki.free.law/c/courtlistener/help/api/rest/v4/*) as part of this
 * feature's implementation — not assumed from training data. Field
 * mappings for individual response records remain UNVERIFIED against a
 * live account (no COURTLISTENER_API_TOKEN is configured in this
 * environment); confirm against a real response before relying on this
 * in production. See docs/behavior/verified-case-search.md.
 */
interface RawCourtListenerResult {
  id?: number | string;
  cluster_id?: number | string;
  caseName?: string;
  case_name?: string;
  court?: string;
  court_id?: string;
  dateFiled?: string;
  date_filed?: string;
  citation?: string[] | string;
  docketNumber?: string;
  docket_number?: string;
  absolute_url?: string;
  status?: string;
  precedential_status?: string;
  source?: string;
}

interface RawCourtListenerSearchResponse {
  results?: RawCourtListenerResult[];
  next?: string | null;
}

interface RawCourtListenerOpinion {
  plain_text?: string;
  html?: string;
  html_lawbox?: string;
  html_columbia?: string;
  html_with_citations?: string;
}

/**
 * POST /api/rest/v4/citation-lookup/ response shape. `status` follows
 * CourtListener's documented convention: 200 = matched, 404 = valid
 * citation shape but not found, 400 = malformed/unknown reporter,
 * 300 = ambiguous (multiple candidate clusters), 429 = rate-limited.
 */
interface RawCitationLookupEntry {
  citation?: string;
  status?: number;
  error_message?: string;
  clusters?: RawCourtListenerResult[];
}

/** GET /api/rest/v4/opinions-cited/ edge — citing_opinion/cited_opinion are resource URIs, not bare ids. */
interface RawOpinionsCitedEdge {
  id?: number | string;
  citing_opinion?: string;
  cited_opinion?: string;
  depth?: number;
}

interface RawOpinionsCitedResponse {
  results?: RawOpinionsCitedEdge[];
}

/** Judicial opinion text is a public-domain government work — safe to display verbatim with clear sourcing, unlike copyrighted editorial content (headnotes, etc.), which this never fetches. */
function stripHtml(html: string): string {
  return html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function extractOpinionText(raw: RawCourtListenerOpinion): string | null {
  if (raw.plain_text && raw.plain_text.trim().length > 0) {
    return raw.plain_text.trim();
  }
  const html = raw.html_with_citations || raw.html || raw.html_lawbox || raw.html_columbia;
  if (html) {
    const stripped = stripHtml(html);
    if (stripped.length > 0) return stripped;
  }
  return null;
}

function mapPublicationStatus(raw: RawCourtListenerResult): PublicationStatus {
  const status = (raw.precedential_status ?? raw.status ?? "").toLowerCase();
  if (status.includes("unpublished")) return "unpublished";
  if (status.includes("published")) return "published";
  return "unknown";
}

/** Only ever set when the provider's own metadata says so — never guessed from a case's age or jurisdiction. */
function mapOriginalCollection(raw: RawCourtListenerResult): "caselaw-access-project" | null {
  const source = (raw.source ?? "").toLowerCase();
  return source.includes("cap") || source.includes("caselaw access project") ? "caselaw-access-project" : null;
}

/** Rejects any record missing a field required to build a trustworthy, linkable result — never fills a gap with a guess. */
function mapResult(
  raw: RawCourtListenerResult,
  matchedTopics: string[],
  verificationMethod: VerifiedCaseResult["verificationMethod"],
): VerifiedCaseResult | null {
  const caseName = raw.caseName ?? raw.case_name;
  const court = raw.court ?? raw.court_id;
  const providerCaseId = raw.id !== undefined ? String(raw.id) : raw.cluster_id !== undefined ? String(raw.cluster_id) : null;

  if (!caseName || !court || !raw.absolute_url || !providerCaseId) {
    return null;
  }

  const citations = Array.isArray(raw.citation) ? raw.citation : raw.citation ? [raw.citation] : [];

  return {
    providerName: "courtlistener",
    providerCaseId,
    clusterId: raw.cluster_id !== undefined ? String(raw.cluster_id) : null,
    caseName,
    citation: citations[0] ?? null,
    citations,
    court,
    courtId: raw.court_id ?? null,
    jurisdiction: court,
    decisionDate: raw.dateFiled ?? raw.date_filed ?? null,
    docketNumber: raw.docketNumber ?? raw.docket_number ?? null,
    sourceUrl: raw.absolute_url.startsWith("http") ? raw.absolute_url : `https://www.courtlistener.com${raw.absolute_url}`,
    sourceName: "CourtListener (Free Law Project)",
    originalCollection: mapOriginalCollection(raw),
    publicationStatus: mapPublicationStatus(raw),
    matchedTopics,
    relevanceSummary: buildRelevanceSummary(matchedTopics),
    laterHistoryStatus: "not-checked",
    verificationStatus: "verified",
    verificationMethod,
    dateVerified: new Date().toISOString(),
    disclaimer: CASE_RESEARCH_DISCLAIMER,
  };
}

function buildSearchParams(request: CaseSearchRequest): URLSearchParams {
  const params = new URLSearchParams();
  params.set("type", "o");
  params.set("q", [...request.topics, ...(request.legalTerms ?? [])].join(" "));
  if (request.jurisdiction) params.set("court", request.jurisdiction.toLowerCase());
  if (request.dateRange?.from) params.set("filed_after", request.dateRange.from);
  if (request.dateRange?.to) params.set("filed_before", request.dateRange.to);
  if (request.publishedOnly) params.set("stat_Published", "on");
  if (request.cursor) params.set("cursor", request.cursor);
  params.set("order_by", "score desc");
  return params;
}

function extractCursor(nextUrl: string): string | null {
  try {
    return new URL(nextUrl).searchParams.get("cursor");
  } catch {
    return null;
  }
}

/** citing_opinion/cited_opinion are full resource URIs like ".../opinions/12345/" — extract just the trailing id segment. */
function extractOpinionIdFromUri(uri: string | undefined): string | null {
  if (!uri) return null;
  const match = uri.match(/\/opinions\/(\d+)\/?/);
  return match ? match[1] : null;
}

async function fetchFromCourtListener(url: string, token: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...init,
      headers: { Authorization: `Token ${token}`, ...(init.headers ?? {}) },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

const NOT_CONFIGURED_MESSAGE = "Verified case search is not available yet.";
const PROVIDER_ERROR_MESSAGE = "The case search provider is currently unavailable.";
const TIMEOUT_MESSAGE = "The case search provider took too long to respond.";
const CITATION_NOT_VERIFIED_MESSAGE =
  "We could not verify this citation through the connected legal source. It may be incomplete, incorrect, unpublished, or unavailable.";
const CITATION_POSSIBLE_MATCH_MESSAGE = "This citation matched more than one case. Review the candidates below.";
const CITATION_VERIFIED_MESSAGE = "Verified through CourtListener's citation lookup service.";
const SOURCE_UNAVAILABLE_MESSAGE =
  "The legal source is temporarily unavailable. Your roadmap and saved educational resources remain available.";

async function getCaseByIdInternal(providerCaseId: string, token: string): Promise<VerifiedCaseResult | null> {
  let response: Response;
  try {
    response = await fetchFromCourtListener(`${BASE_URL}/search/?type=o&id=${encodeURIComponent(providerCaseId)}`, token);
  } catch {
    return null;
  }
  if (!response.ok) return null;

  let body: RawCourtListenerSearchResponse;
  try {
    body = await response.json();
  } catch {
    return null;
  }

  const first = body.results?.[0];
  if (!first) return null;
  return mapResult(first, [], "id-lookup");
}

/** Shared by getCitingCases/getCitedCases — fetches the citation-graph edges in one direction, then hydrates each unique related opinion id with full metadata, capped at MAX_RELATED_CASES. */
async function fetchCitationGraph(
  providerCaseId: string,
  direction: "citing_opinion" | "cited_opinion",
  token: string,
): Promise<CitationGraphResult> {
  let response: Response;
  try {
    response = await fetchFromCourtListener(
      `${BASE_URL}/opinions-cited/?${direction}=${encodeURIComponent(providerCaseId)}`,
      token,
    );
  } catch {
    return { status: "source-unavailable", message: SOURCE_UNAVAILABLE_MESSAGE };
  }
  if (!response.ok) {
    return { status: "source-unavailable", message: SOURCE_UNAVAILABLE_MESSAGE };
  }

  let body: RawOpinionsCitedResponse;
  try {
    body = await response.json();
  } catch {
    return { status: "source-unavailable", message: SOURCE_UNAVAILABLE_MESSAGE };
  }

  const edges = body.results ?? [];
  // When we asked "who cites X" (direction=cited_opinion), the related
  // case on each edge is citing_opinion, and vice versa.
  const relatedField = direction === "cited_opinion" ? "citing_opinion" : "cited_opinion";

  const seen = new Map<string, number>();
  for (const edge of edges) {
    const relatedId = extractOpinionIdFromUri(edge[relatedField]);
    if (!relatedId) continue;
    seen.set(relatedId, (seen.get(relatedId) ?? 0) + (edge.depth ?? 1));
    if (seen.size >= MAX_RELATED_CASES) break;
  }

  const cases: RelatedCaseResult[] = [];
  for (const [relatedId, depth] of seen) {
    const related = await getCaseByIdInternal(relatedId, token);
    if (related) {
      cases.push({ case: related, treatment: "cited", depth });
    }
  }

  return { status: "ok", cases };
}

export const courtListenerCaseProvider: CaseSourceProvider = {
  name: "courtlistener",

  async searchCases(request: CaseSearchRequest): Promise<CaseSearchProviderResult> {
    const { COURTLISTENER_API_TOKEN, CASE_SEARCH_RESULT_LIMIT } = getServerEnv();
    if (!COURTLISTENER_API_TOKEN) {
      return { status: "not-configured", message: NOT_CONFIGURED_MESSAGE };
    }

    const params = buildSearchParams(request);
    const limit = request.limit ?? CASE_SEARCH_RESULT_LIMIT;

    let response: Response;
    try {
      response = await fetchFromCourtListener(`${BASE_URL}/search/?${params.toString()}`, COURTLISTENER_API_TOKEN);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return { status: "timeout", message: TIMEOUT_MESSAGE };
      }
      return { status: "provider-error", message: PROVIDER_ERROR_MESSAGE };
    }

    if (!response.ok) {
      return { status: "provider-error", message: PROVIDER_ERROR_MESSAGE };
    }

    let body: RawCourtListenerSearchResponse;
    try {
      body = await response.json();
    } catch {
      return { status: "provider-error", message: PROVIDER_ERROR_MESSAGE };
    }

    const cases = (body.results ?? [])
      .map((raw) => mapResult(raw, request.topics, "search-match"))
      .filter((result): result is VerifiedCaseResult => result !== null)
      .slice(0, limit);

    return {
      status: "ok",
      page: { cases, nextCursor: body.next ? extractCursor(body.next) : null },
    };
  },

  async getCaseById(providerCaseId: string): Promise<VerifiedCaseResult | null> {
    if (!isValidProviderCaseId(providerCaseId)) return null;
    const { COURTLISTENER_API_TOKEN } = getServerEnv();
    if (!COURTLISTENER_API_TOKEN) return null;
    return getCaseByIdInternal(providerCaseId, COURTLISTENER_API_TOKEN);
  },

  async getOpinionText(providerCaseId: string): Promise<string | null> {
    if (!isValidProviderCaseId(providerCaseId)) return null;
    const { COURTLISTENER_API_TOKEN } = getServerEnv();
    if (!COURTLISTENER_API_TOKEN) return null;

    let response: Response;
    try {
      response = await fetchFromCourtListener(
        `${BASE_URL}/opinions/${encodeURIComponent(providerCaseId)}/`,
        COURTLISTENER_API_TOKEN,
      );
    } catch {
      return null;
    }
    if (!response.ok) return null;

    let body: RawCourtListenerOpinion;
    try {
      body = await response.json();
    } catch {
      return null;
    }

    return extractOpinionText(body);
  },

  async verifyCitation(citation: string): Promise<CitationVerificationResult> {
    const { COURTLISTENER_API_TOKEN } = getServerEnv();
    if (!COURTLISTENER_API_TOKEN) {
      return { status: "source_unavailable", message: SOURCE_UNAVAILABLE_MESSAGE };
    }

    let response: Response;
    try {
      response = await fetchFromCourtListener(`${BASE_URL}/citation-lookup/`, COURTLISTENER_API_TOKEN, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: citation }),
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return { status: "source_unavailable", message: TIMEOUT_MESSAGE };
      }
      return { status: "source_unavailable", message: SOURCE_UNAVAILABLE_MESSAGE };
    }

    // The lookup endpoint itself returns 429 at the HTTP level when the
    // caller is rate-limited (distinct from a single citation entry's own
    // per-citation status code, which is nested in the body).
    if (response.status === 429) {
      return { status: "source_unavailable", message: SOURCE_UNAVAILABLE_MESSAGE };
    }
    if (!response.ok) {
      return { status: "source_unavailable", message: SOURCE_UNAVAILABLE_MESSAGE };
    }

    let body: RawCitationLookupEntry[];
    try {
      body = await response.json();
    } catch {
      return { status: "source_unavailable", message: SOURCE_UNAVAILABLE_MESSAGE };
    }

    const entry = body[0];
    if (!entry) {
      return { status: "not_verified", message: CITATION_NOT_VERIFIED_MESSAGE };
    }

    if (entry.status === 429) {
      return { status: "source_unavailable", message: SOURCE_UNAVAILABLE_MESSAGE };
    }
    if (entry.status === 404 || entry.status === 400) {
      return { status: "not_verified", message: CITATION_NOT_VERIFIED_MESSAGE };
    }

    const mappedClusters = (entry.clusters ?? [])
      .map((raw) => mapResult(raw, [], "citation-lookup"))
      .filter((result): result is VerifiedCaseResult => result !== null);

    if (entry.status === 300) {
      if (mappedClusters.length === 0) {
        return { status: "not_verified", message: CITATION_NOT_VERIFIED_MESSAGE };
      }
      return { status: "possible_match", candidates: mappedClusters, message: CITATION_POSSIBLE_MATCH_MESSAGE };
    }

    if (entry.status === 200) {
      if (mappedClusters.length === 1) {
        return { status: "verified", matchedCase: mappedClusters[0], message: CITATION_VERIFIED_MESSAGE };
      }
      if (mappedClusters.length > 1) {
        return { status: "possible_match", candidates: mappedClusters, message: CITATION_POSSIBLE_MATCH_MESSAGE };
      }
      return { status: "not_verified", message: CITATION_NOT_VERIFIED_MESSAGE };
    }

    return { status: "not_verified", message: CITATION_NOT_VERIFIED_MESSAGE };
  },

  async getCitingCases(providerCaseId: string): Promise<CitationGraphResult> {
    if (!isValidProviderCaseId(providerCaseId)) {
      return { status: "source-unavailable", message: SOURCE_UNAVAILABLE_MESSAGE };
    }
    const { COURTLISTENER_API_TOKEN } = getServerEnv();
    if (!COURTLISTENER_API_TOKEN) {
      return { status: "not-configured", message: NOT_CONFIGURED_MESSAGE };
    }
    return fetchCitationGraph(providerCaseId, "cited_opinion", COURTLISTENER_API_TOKEN);
  },

  async getCitedCases(providerCaseId: string): Promise<CitationGraphResult> {
    if (!isValidProviderCaseId(providerCaseId)) {
      return { status: "source-unavailable", message: SOURCE_UNAVAILABLE_MESSAGE };
    }
    const { COURTLISTENER_API_TOKEN } = getServerEnv();
    if (!COURTLISTENER_API_TOKEN) {
      return { status: "not-configured", message: NOT_CONFIGURED_MESSAGE };
    }
    return fetchCitationGraph(providerCaseId, "citing_opinion", COURTLISTENER_API_TOKEN);
  },
};
