import { NextResponse, type NextRequest } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/authorization";
import { authorizationFailureResponse } from "@/lib/auth/authorization-http";
import { updateRoadmapProgress } from "@/lib/roadmap/update-roadmap-progress";
import { createRateLimiter } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

const progressRateLimiter = createRateLimiter({ windowMs: 60_000, max: 60 });

function statusCodeFor(status: string): number {
  switch (status) {
    case "updated":
      return 200;
    case "invalid-request":
    case "invalid-step":
      return 400;
    case "not-found":
      return 404;
    default:
      return 500;
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ roadmapId: string }> }) {
  const authResult = await requireAuthenticatedUser();
  if (!authResult.ok) {
    const failure = authorizationFailureResponse(authResult.reason);
    return NextResponse.json(failure.body, { status: failure.status });
  }

  if (progressRateLimiter.isLimited(authResult.user.id)) {
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

  const { roadmapId } = await context.params;
  const result = await updateRoadmapProgress(roadmapId, body, authResult.user);
  return NextResponse.json(result, { status: statusCodeFor(result.status) });
}
