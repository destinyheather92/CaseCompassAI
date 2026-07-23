import { NextResponse, type NextRequest } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/authorization";
import { authorizationFailureResponse } from "@/lib/auth/authorization-http";
import { completeIntakeSession } from "@/lib/intake/complete-intake-session";
import { completeIntakeSessionRequestSchema } from "@/lib/intake/intake-deterministic-schema";

export const runtime = "nodejs";

function statusCodeFor(status: string): number {
  switch (status) {
    case "completed":
      return 200;
    case "not-found":
      return 404;
    case "forbidden":
      return 403;
    case "not-ready":
    case "acknowledgement-required":
      return 400;
    default:
      return 500;
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ sessionId: string }> }) {
  const authResult = await requireAuthenticatedUser();
  if (!authResult.ok) {
    const failure = authorizationFailureResponse(authResult.reason);
    return NextResponse.json(failure.body, { status: failure.status });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { status: "invalid-request", message: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const parsed = completeIntakeSessionRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { status: "invalid-request", message: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }

  const { sessionId } = await context.params;
  const result = await completeIntakeSession(sessionId, parsed.data.acknowledged, authResult.user);
  return NextResponse.json(result, { status: statusCodeFor(result.status) });
}
