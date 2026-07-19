import "server-only";
import { getServerEnv } from "@/lib/env";
import { buildRelevanceSummary } from "@/lib/case-search/relevance-summary";
import { CASE_RESEARCH_DISCLAIMER } from "@/lib/case-search/case-search-constants";
import type {
  CaseSourceProvider,
  CaseSearchRequest,
  CaseSearchProviderResult,
  VerifiedCaseResult,
  PublicationStatus,
} from "@/lib/case-search/types";

const BASE_URL = "https://www.courtlistener.com/api/rest/v4";
const REQUEST_TIMEOUT_MS = 8000;

/**
 * UNVERIFIED against a live CourtListener account — no
 * COURTLISTENER_API_TOKEN is configured in this environment. The field
 * mappings below follow CourtListener's (Free Law Project) publicly
 * documented v4 search API as of this writing; confirm against a real
 * response before relying on this in production. See
 * docs/behavior/verified-case-search.md.
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
}

interface RawCourtListenerSearchResponse {
  results?: RawCourtListenerResult[];
  next?: string | null;
}

function mapPublicationStatus(raw: RawCourtListenerResult): PublicationStatus {
  const status = (raw.precedential_status ?? raw.status ?? "").toLowerCase();
  if (status.includes("unpublished")) return "unpublished";
  if (status.includes("published")) return "published";
  return "unknown";
}

/** Rejects any record missing a field required to build a trustworthy, linkable result — never fills a gap with a guess. */
function mapResult(raw: RawCourtListenerResult, matchedTopics: string[]): VerifiedCaseResult | null {
  const caseName = raw.caseName ?? raw.case_name;
  const court = raw.court ?? raw.court_id;
  const providerCaseId = raw.id !== undefined ? String(raw.id) : raw.cluster_id !== undefined ? String(raw.cluster_id) : null;

  if (!caseName || !court || !raw.absolute_url || !providerCaseId) {
    return null;
  }

  const citationValue = Array.isArray(raw.citation) ? (raw.citation[0] ?? null) : (raw.citation ?? null);

  return {
    providerName: "courtlistener",
    providerCaseId,
    caseName,
    citation: citationValue,
    court,
    jurisdiction: court,
    decisionDate: raw.dateFiled ?? raw.date_filed ?? null,
    docketNumber: raw.docketNumber ?? raw.docket_number ?? null,
    sourceUrl: raw.absolute_url.startsWith("http") ? raw.absolute_url : `https://www.courtlistener.com${raw.absolute_url}`,
    sourceName: "CourtListener (Free Law Project)",
    publicationStatus: mapPublicationStatus(raw),
    matchedTopics,
    relevanceSummary: buildRelevanceSummary(matchedTopics),
    laterHistoryStatus: "not-checked",
    verificationStatus: "verified",
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

async function fetchFromCourtListener(url: string, token: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, {
      headers: { Authorization: `Token ${token}` },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

const NOT_CONFIGURED_MESSAGE = "Verified case search is not available yet.";
const PROVIDER_ERROR_MESSAGE = "The case search provider is currently unavailable.";
const TIMEOUT_MESSAGE = "The case search provider took too long to respond.";

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
      .map((raw) => mapResult(raw, request.topics))
      .filter((result): result is VerifiedCaseResult => result !== null)
      .slice(0, limit);

    return {
      status: "ok",
      page: { cases, nextCursor: body.next ? extractCursor(body.next) : null },
    };
  },

  async getCaseById(providerCaseId: string): Promise<VerifiedCaseResult | null> {
    const { COURTLISTENER_API_TOKEN } = getServerEnv();
    if (!COURTLISTENER_API_TOKEN) return null;

    let response: Response;
    try {
      response = await fetchFromCourtListener(
        `${BASE_URL}/search/?type=o&id=${encodeURIComponent(providerCaseId)}`,
        COURTLISTENER_API_TOKEN,
      );
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
    return mapResult(first, []);
  },
};
