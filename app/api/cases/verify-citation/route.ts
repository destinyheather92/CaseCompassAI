import { NextResponse, type NextRequest } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/authorization";
import { authorizationFailureResponse } from "@/lib/auth/authorization-http";
import { verifyCaseCitation } from "@/lib/case-search/case-search-service";
import { createRateLimiter } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

const verifyCitationRateLimiter = createRateLimiter({ windowMs: 60_000, max: 30 });

export async function POST(request: NextRequest) {
  const authResult = await requireAuthenticatedUser();
  if (!authResult.ok) {
    const failure = authorizationFailureResponse(authResult.reason);
    return NextResponse.json(failure.body, { status: failure.status });
  }

  if (verifyCitationRateLimiter.isLimited(authResult.user.id)) {
    return NextResponse.json(
      { status: "rate-limited", message: "Too many requests. Please wait a moment and try again." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ status: "invalid-request", message: "Request body must be valid JSON." }, { status: 400 });
  }

  const citation = typeof body === "object" && body !== null && "citation" in body ? (body as { citation: unknown }).citation : undefined;
  const result = await verifyCaseCitation(citation);

  return NextResponse.json(result, { status: 200 });
}
