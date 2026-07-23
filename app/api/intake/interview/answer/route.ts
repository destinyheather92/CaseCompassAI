import { NextResponse, type NextRequest } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/authorization";
import { authorizationFailureResponse } from "@/lib/auth/authorization-http";
import { submitIntakeAnswer } from "@/lib/intake/submit-intake-answer";
import { createRateLimiter } from "@/lib/security/rate-limit";
import { isRequestTooLarge } from "@/lib/security/request-limits";

export const runtime = "nodejs";

const answerRateLimiter = createRateLimiter({ windowMs: 60_000, max: 20 });

function statusCodeFor(status: string): number {
  switch (status) {
    case "answered":
      return 200;
    case "invalid-request":
    case "question-mismatch":
      return 400;
    case "not-found":
      return 404;
    case "forbidden":
      return 403;
    case "already-completed":
      return 409;
    case "provider-unavailable":
      return 503;
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

  if (answerRateLimiter.isLimited(authResult.user.id)) {
    return NextResponse.json(
      { status: "rate-limited", message: "Too many requests. Please wait a moment and try again." },
      { status: 429 },
    );
  }

  if (isRequestTooLarge(request)) {
    return NextResponse.json({ status: "invalid-request", message: "Request body is too large." }, { status: 413 });
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

  const result = await submitIntakeAnswer(body, authResult.user);
  return NextResponse.json(result, { status: statusCodeFor(result.status) });
}
