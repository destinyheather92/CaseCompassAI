import { NextResponse, type NextRequest } from "next/server";
import { requireOptionalUser } from "@/lib/auth/authorization";
import { authorizationFailureResponse } from "@/lib/auth/authorization-http";
import { getIntakeSession } from "@/lib/intake/get-intake-session";

export const runtime = "nodejs";

function statusCodeFor(status: string): number {
  switch (status) {
    case "found":
      return 200;
    case "not-found":
      return 404;
    case "forbidden":
      return 403;
    default:
      return 500;
  }
}

export async function GET(_request: NextRequest, context: { params: Promise<{ sessionId: string }> }) {
  const authResult = await requireOptionalUser();
  if (!authResult.ok) {
    const failure = authorizationFailureResponse(authResult.reason);
    return NextResponse.json(failure.body, { status: failure.status });
  }

  const { sessionId } = await context.params;
  const result = await getIntakeSession(sessionId, authResult.user);
  return NextResponse.json(result, { status: statusCodeFor(result.status) });
}
