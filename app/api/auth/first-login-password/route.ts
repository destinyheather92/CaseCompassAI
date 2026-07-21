import { NextResponse, type NextRequest } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/authorization";
import { authorizationFailureResponse } from "@/lib/auth/authorization-http";
import { firstLoginPasswordSchema } from "@/lib/auth/password-policy";
import { completeFirstLogin } from "@/lib/auth/first-login-password";
import { getPostPasswordSetupRoute } from "@/lib/auth/post-password-setup-redirect";
import { createRateLimiter } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

const firstLoginRateLimiter = createRateLimiter({ windowMs: 60_000, max: 10 });

export async function POST(request: NextRequest) {
  // allowPendingPasswordChange: this endpoint IS the password-change gate,
  // so it must be reachable by a user who still has mustChangePassword
  // true — but requireActiveAccount still runs, so a disabled/locked
  // account is correctly rejected here too.
  const authResult = await requireAuthenticatedUser({ allowPendingPasswordChange: true });
  if (!authResult.ok) {
    const failure = authorizationFailureResponse(authResult.reason);
    return NextResponse.json(failure.body, { status: failure.status });
  }

  if (firstLoginRateLimiter.isLimited(authResult.user.id)) {
    return NextResponse.json(
      { status: "rate-limited", message: "Too many attempts. Please wait a moment and try again." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ status: "invalid-request", message: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = firstLoginPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { status: "invalid-request", message: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }

  const result = await completeFirstLogin({
    appUserId: authResult.user.id,
    clerkUserId: authResult.user.clerkUserId,
    mustChangePassword: authResult.user.mustChangePassword,
    currentPassword: parsed.data.currentPassword,
    newPassword: parsed.data.newPassword,
  });

  switch (result.status) {
    case "changed":
    case "not-required": {
      const redirectTo = await getPostPasswordSetupRoute({ id: authResult.user.id, role: authResult.user.role });
      return NextResponse.json({ status: result.status, redirectTo }, { status: 200 });
    }
    case "incorrect-current-password":
      return NextResponse.json(
        { status: "incorrect-current-password", message: "Your current password is incorrect." },
        { status: 400 },
      );
    case "error":
      return NextResponse.json({ status: "error", message: result.message }, { status: 500 });
  }
}
