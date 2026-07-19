import { NextResponse, type NextRequest } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/authorization";
import { authorizationFailureResponse } from "@/lib/auth/authorization-http";
import { getVerifiedCaseById } from "@/lib/case-search/case-search-service";

export const runtime = "nodejs";

export async function GET(_request: NextRequest, context: { params: Promise<{ caseId: string }> }) {
  const authResult = await requireAuthenticatedUser();
  if (!authResult.ok) {
    const failure = authorizationFailureResponse(authResult.reason);
    return NextResponse.json(failure.body, { status: failure.status });
  }

  const { caseId } = await context.params;
  const verifiedCase = await getVerifiedCaseById(caseId);
  if (!verifiedCase) {
    return NextResponse.json({ status: "not-found" }, { status: 404 });
  }

  return NextResponse.json({ status: "found", case: verifiedCase }, { status: 200 });
}
