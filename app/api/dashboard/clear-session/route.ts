import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/authorization";
import { authorizationFailureResponse } from "@/lib/auth/authorization-http";
import { recordAuditEvent } from "@/lib/security/audit-log";
import { createRateLimiter } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

const clearSessionRateLimiter = createRateLimiter({ windowMs: 60_000, max: 20 });

/**
 * The actual browser storage clearing (lib/client/user-scoped-storage.ts)
 * and Clerk sign-out happen client-side — this endpoint just records that
 * a shared-device "Clear My Session" action occurred, for the user's own
 * observability. No case data is included in the audit metadata.
 */
export async function POST() {
  const authResult = await requireAuthenticatedUser();
  if (!authResult.ok) {
    const failure = authorizationFailureResponse(authResult.reason);
    return NextResponse.json(failure.body, { status: failure.status });
  }

  if (clearSessionRateLimiter.isLimited(authResult.user.id)) {
    return NextResponse.json(
      { status: "rate-limited", message: "Too many requests. Please wait a moment and try again." },
      { status: 429 },
    );
  }

  await recordAuditEvent({
    actorUserId: authResult.user.id,
    institutionId: authResult.user.institutionId,
    facilityId: authResult.user.facilityId,
    action: "dashboard_session_cleared",
    outcome: "success",
  });

  return NextResponse.json({ status: "cleared" }, { status: 200 });
}
