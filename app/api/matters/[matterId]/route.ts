import { NextResponse, type NextRequest } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/authorization";
import { authorizationFailureResponse } from "@/lib/auth/authorization-http";
import { renameMatter } from "@/lib/matters/rename-matter";
import { isRequestTooLarge } from "@/lib/security/request-limits";

export const runtime = "nodejs";

function statusCodeFor(status: string): number {
  switch (status) {
    case "renamed":
      return 200;
    case "invalid-request":
      return 400;
    case "not-found":
      return 404;
    default:
      return 500;
  }
}

/** Renames the caller's own matter — ownership is verified server-side before any write; a manipulated matterId for another user's matter resolves to 404, never a forbidden-but-informative error. */
export async function PATCH(request: NextRequest, context: { params: Promise<{ matterId: string }> }) {
  const authResult = await requireAuthenticatedUser();
  if (!authResult.ok) {
    const failure = authorizationFailureResponse(authResult.reason);
    return NextResponse.json(failure.body, { status: failure.status });
  }

  if (isRequestTooLarge(request)) {
    return NextResponse.json({ status: "invalid-request", message: "Request body is too large." }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ status: "invalid-request", message: "Request body must be valid JSON." }, { status: 400 });
  }

  const { matterId } = await context.params;
  const result = await renameMatter(matterId, body, authResult.user);
  return NextResponse.json(result, { status: statusCodeFor(result.status) });
}
