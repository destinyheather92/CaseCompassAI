import { NextResponse, type NextRequest } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/authorization";
import { authorizationFailureResponse } from "@/lib/auth/authorization-http";
import { requireOwnedRoadmap } from "@/lib/auth/dashboard-authorization";
import { buildRoadmapCaseRequest } from "@/lib/case-search/build-roadmap-case-request";
import { searchCasesForRoadmap } from "@/lib/case-search/case-search-service";
import { createRateLimiter } from "@/lib/security/rate-limit";
import type { ResearchRoadmapContent } from "@/types/roadmap";
import type { CaseSearchRequestInput } from "@/lib/case-search/case-search-schema";

export const runtime = "nodejs";

const casesSearchRateLimiter = createRateLimiter({ windowMs: 60_000, max: 20 });

function statusCodeFor(status: string): number {
  switch (status) {
    case "ok":
      return 200;
    case "unavailable":
      return 503;
    case "invalid-request":
      return 400;
    default:
      return 500;
  }
}

/** Only pulls recognized, type-checked fields out of the raw body — jurisdiction is deliberately never one of them (always derived from the roadmap itself). */
function extractOverrides(body: unknown): Partial<Omit<CaseSearchRequestInput, "jurisdiction">> {
  if (typeof body !== "object" || body === null) return {};
  const b = body as Record<string, unknown>;
  const dateRange =
    typeof b.dateRange === "object" && b.dateRange !== null
      ? {
          from: typeof (b.dateRange as Record<string, unknown>).from === "string" ? ((b.dateRange as Record<string, unknown>).from as string) : undefined,
          to: typeof (b.dateRange as Record<string, unknown>).to === "string" ? ((b.dateRange as Record<string, unknown>).to as string) : undefined,
        }
      : undefined;

  return {
    topics: Array.isArray(b.topics) ? b.topics.filter((t): t is string => typeof t === "string") : undefined,
    legalTerms: Array.isArray(b.legalTerms) ? b.legalTerms.filter((t): t is string => typeof t === "string") : undefined,
    courtLevel: typeof b.courtLevel === "string" ? (b.courtLevel as CaseSearchRequestInput["courtLevel"]) : undefined,
    proceduralStage: typeof b.proceduralStage === "string" ? b.proceduralStage : undefined,
    dateRange,
    publishedOnly: typeof b.publishedOnly === "boolean" ? b.publishedOnly : undefined,
    limit: typeof b.limit === "number" ? b.limit : undefined,
    cursor: typeof b.cursor === "string" ? b.cursor : undefined,
  };
}

/**
 * "Find Additional Cases" — structured filters only, never unrestricted
 * chat. jurisdiction always comes from the roadmap itself; a
 * client-supplied jurisdiction in the body is silently ignored (see
 * extractOverrides / buildRoadmapCaseRequest).
 */
export async function POST(request: NextRequest, context: { params: Promise<{ roadmapId: string }> }) {
  const authResult = await requireAuthenticatedUser();
  if (!authResult.ok) {
    const failure = authorizationFailureResponse(authResult.reason);
    return NextResponse.json(failure.body, { status: failure.status });
  }

  if (casesSearchRateLimiter.isLimited(authResult.user.id)) {
    return NextResponse.json(
      { status: "rate-limited", message: "Too many requests. Please wait a moment and try again." },
      { status: 429 },
    );
  }

  const { roadmapId } = await context.params;
  const owned = await requireOwnedRoadmap(roadmapId, authResult.user);
  if (!owned.ok) {
    return NextResponse.json({ status: "not-found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { status: "invalid-request", message: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const content = owned.resource.content as unknown as ResearchRoadmapContent;
  const caseRequest = buildRoadmapCaseRequest(content, extractOverrides(body));
  const result = await searchCasesForRoadmap(caseRequest, content.summary);
  return NextResponse.json(result, { status: statusCodeFor(result.status) });
}
