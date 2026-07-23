import { NextResponse, type NextRequest } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/authorization";
import { authorizationFailureResponse } from "@/lib/auth/authorization-http";
import { isInstitutionAdministrationRole } from "@/lib/auth/institution-permissions";
import { requireOwnedMatter } from "@/lib/auth/dashboard-authorization";
import { startIntakeSession } from "@/lib/intake/start-intake-session";
import { createRateLimiter } from "@/lib/security/rate-limit";
import { isRequestTooLarge } from "@/lib/security/request-limits";

export const runtime = "nodejs";

const startRateLimiter = createRateLimiter({ windowMs: 60_000, max: 10 });

export async function POST(request: NextRequest) {
  // Intake now always requires a real, signed-in account — beginning a
  // matter/roadmap is never guest-reachable. See docs/behavior/matters.md.
  const authResult = await requireAuthenticatedUser();
  if (!authResult.ok) {
    const failure = authorizationFailureResponse(authResult.reason);
    return NextResponse.json(failure.body, { status: failure.status });
  }

  // A legal roadmap belongs only to an individual user or an
  // institutional inmate — institution administration roles manage the
  // institution, they are never the subject of one. Enforced here, the
  // actual creation entry point, since the UI never routing them here
  // isn't a substitute for a server-side check.
  if (isInstitutionAdministrationRole(authResult.user.role)) {
    return NextResponse.json(
      { status: "forbidden", message: "Institution staff and administrator accounts cannot create a personal intake." },
      { status: 403 },
    );
  }

  if (startRateLimiter.isLimited(authResult.user.id)) {
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

  // A client-supplied matterId is only ever trusted after confirming it
  // actually belongs to this caller — never taken at face value.
  let matterId: string | undefined;
  if (body && typeof body === "object" && "matterId" in body && typeof (body as { matterId?: unknown }).matterId === "string") {
    const owned = await requireOwnedMatter((body as { matterId: string }).matterId, authResult.user);
    if (!owned.ok) {
      return NextResponse.json({ status: "invalid-request", message: "That matter could not be found." }, { status: 404 });
    }
    matterId = owned.resource.id;
  }

  const result = await startIntakeSession(body, {
    userId: authResult.user.id,
    institutionId: authResult.user.institutionId,
    facilityId: authResult.user.facilityId,
    matterId,
  });

  const statusCode = result.status === "started" ? 201 : result.status === "invalid-request" ? 400 : 503;
  return NextResponse.json(result, { status: statusCode });
}
