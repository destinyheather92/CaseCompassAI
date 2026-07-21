import { NextResponse, type NextRequest } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/authorization";
import { authorizationFailureResponse } from "@/lib/auth/authorization-http";
import { requireOwnedRoadmap } from "@/lib/auth/dashboard-authorization";
import { buildRoadmapCaseRequest } from "@/lib/case-search/build-roadmap-case-request";
import { searchCasesForRoadmap } from "@/lib/case-search/case-search-service";
import { createRateLimiter } from "@/lib/security/rate-limit";
import type { ResearchRoadmapContent } from "@/types/roadmap";

export const runtime = "nodejs";

const casesRateLimiter = createRateLimiter({ windowMs: 60_000, max: 30 });

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

/**
 * Default "Cases to Research" listing for a roadmap — topics/jurisdiction
 * are always derived server-side from the roadmap's own generated
 * content (see buildRoadmapCaseRequest), never trusted from the client.
 */
export async function GET(_request: NextRequest, context: { params: Promise<{ roadmapId: string }> }) {
  const authResult = await requireAuthenticatedUser();
  if (!authResult.ok) {
    const failure = authorizationFailureResponse(authResult.reason);
    return NextResponse.json(failure.body, { status: failure.status });
  }

  if (casesRateLimiter.isLimited(authResult.user.id)) {
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

  const content = owned.resource.content as unknown as ResearchRoadmapContent;
  const caseRequest = buildRoadmapCaseRequest(content);
  const result = await searchCasesForRoadmap(caseRequest, content.summary);
  return NextResponse.json(result, { status: statusCodeFor(result.status) });
}
