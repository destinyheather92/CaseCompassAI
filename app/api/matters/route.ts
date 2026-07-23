import { NextResponse, type NextRequest } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/authorization";
import { authorizationFailureResponse } from "@/lib/auth/authorization-http";
import { createMatter } from "@/lib/matters/create-matter";
import { listMattersForUser } from "@/lib/matters/list-matters";
import { createRateLimiter } from "@/lib/security/rate-limit";
import { isRequestTooLarge } from "@/lib/security/request-limits";

export const runtime = "nodejs";

const createMatterRateLimiter = createRateLimiter({ windowMs: 60_000, max: 10 });

function statusCodeFor(status: string): number {
  switch (status) {
    case "created":
      return 201;
    case "invalid-request":
      return 400;
    default:
      return 500;
  }
}

/** Every one of the caller's own matters — never another user's. */
export async function GET() {
  const authResult = await requireAuthenticatedUser();
  if (!authResult.ok) {
    const failure = authorizationFailureResponse(authResult.reason);
    return NextResponse.json(failure.body, { status: failure.status });
  }

  const matters = await listMattersForUser(authResult.user.id);
  return NextResponse.json({ status: "ok", matters });
}

/** Creates a new, empty matter for the caller — the "New Matter" dashboard action. */
export async function POST(request: NextRequest) {
  const authResult = await requireAuthenticatedUser();
  if (!authResult.ok) {
    const failure = authorizationFailureResponse(authResult.reason);
    return NextResponse.json(failure.body, { status: failure.status });
  }

  if (createMatterRateLimiter.isLimited(authResult.user.id)) {
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
    body = request.headers.get("content-length") === "0" || !request.headers.get("content-length") ? {} : await request.json();
  } catch {
    return NextResponse.json({ status: "invalid-request", message: "Request body must be valid JSON." }, { status: 400 });
  }

  const result = await createMatter(body, authResult.user);
  return NextResponse.json(result, { status: statusCodeFor(result.status) });
}
