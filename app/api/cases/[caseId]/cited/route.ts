import { NextResponse, type NextRequest } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/authorization";
import { authorizationFailureResponse } from "@/lib/auth/authorization-http";
import { getCaseCitationGraph } from "@/lib/case-search/case-search-service";

export const runtime = "nodejs";

/** Cases this opinion cites — its authorities / backward citations. */
export async function GET(_request: NextRequest, context: { params: Promise<{ caseId: string }> }) {
  const authResult = await requireAuthenticatedUser();
  if (!authResult.ok) {
    const failure = authorizationFailureResponse(authResult.reason);
    return NextResponse.json(failure.body, { status: failure.status });
  }

  const { caseId } = await context.params;
  const result = await getCaseCitationGraph(caseId, "cited");

  const statusCode = result.status === "ok" ? 200 : result.status === "invalid-request" ? 400 : 200;
  return NextResponse.json(result, { status: statusCode });
}
