import { NextResponse, type NextRequest } from "next/server";
import { requireOptionalUser } from "@/lib/auth/authorization";
import { authorizationFailureResponse } from "@/lib/auth/authorization-http";
import { isInstitutionAdministrationRole } from "@/lib/auth/institution-permissions";
import { startIntakeSession } from "@/lib/intake/start-intake-session";
import { createRateLimiter } from "@/lib/security/rate-limit";
import { clientIdFor } from "@/lib/security/request-identity";
import { isRequestTooLarge } from "@/lib/security/request-limits";

export const runtime = "nodejs";

const startRateLimiter = createRateLimiter({ windowMs: 60_000, max: 10 });

export async function POST(request: NextRequest) {
  // Guest-reachable: authorizeOptionalUser only rejects a *signed-in*
  // caller who is disabled/locked/must-change-password — a guest passes.
  const authResult = await requireOptionalUser();
  if (!authResult.ok) {
    const failure = authorizationFailureResponse(authResult.reason);
    return NextResponse.json(failure.body, { status: failure.status });
  }

  // A legal roadmap belongs only to an individual user or an
  // institutional inmate — institution administration roles manage the
  // institution, they are never the subject of one. Enforced here, the
  // actual creation entry point, since the UI never routing them here
  // isn't a substitute for a server-side check.
  if (authResult.user && isInstitutionAdministrationRole(authResult.user.role)) {
    return NextResponse.json(
      { status: "forbidden", message: "Institution staff and administrator accounts cannot create a personal intake." },
      { status: 403 },
    );
  }

  const rateLimitKey = authResult.user?.id ?? clientIdFor(request);
  if (startRateLimiter.isLimited(rateLimitKey)) {
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

  const result = await startIntakeSession(body, {
    userId: authResult.user?.id ?? null,
    institutionId: authResult.user?.institutionId ?? null,
    facilityId: authResult.user?.facilityId ?? null,
  });

  const statusCode = result.status === "started" ? 201 : result.status === "invalid-request" ? 400 : 503;
  return NextResponse.json(result, { status: statusCode });
}
