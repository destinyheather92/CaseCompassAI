import { NextResponse, type NextRequest } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/authorization";
import { authorizationFailureResponse } from "@/lib/auth/authorization-http";
import { saveCase } from "@/lib/saved/save-case";
import { getUserSavedCases } from "@/lib/dashboard/get-user-saved-cases";
import { createRateLimiter } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

const saveCaseRateLimiter = createRateLimiter({ windowMs: 60_000, max: 60 });

function statusCodeFor(status: string): number {
  switch (status) {
    case "saved":
      return 201;
    case "already-saved":
      return 200;
    case "invalid-request":
    case "invalid-roadmap":
      return 400;
    default:
      return 500;
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuthenticatedUser();
  if (!authResult.ok) {
    const failure = authorizationFailureResponse(authResult.reason);
    return NextResponse.json(failure.body, { status: failure.status });
  }

  if (saveCaseRateLimiter.isLimited(authResult.user.id)) {
    return NextResponse.json(
      { status: "rate-limited", message: "Too many requests. Please wait a moment and try again." },
      { status: 429 },
    );
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

  const result = await saveCase(body, authResult.user);
  return NextResponse.json(result, { status: statusCodeFor(result.status) });
}

export async function GET(request: NextRequest) {
  const authResult = await requireAuthenticatedUser();
  if (!authResult.ok) {
    const failure = authorizationFailureResponse(authResult.reason);
    return NextResponse.json(failure.body, { status: failure.status });
  }

  const roadmapId = request.nextUrl.searchParams.get("roadmapId") ?? undefined;
  const cases = await getUserSavedCases(authResult.user.id, roadmapId);
  return NextResponse.json({ status: "found", cases }, { status: 200 });
}
