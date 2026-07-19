import { NextResponse, type NextRequest } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/authorization";
import { authorizationFailureResponse } from "@/lib/auth/authorization-http";
import { removeSavedResource } from "@/lib/saved/remove-saved-resource";

export const runtime = "nodejs";

function statusCodeFor(status: string): number {
  switch (status) {
    case "removed":
      return 200;
    case "not-found":
      return 404;
    default:
      return 500;
  }
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ savedItemId: string }> }) {
  const authResult = await requireAuthenticatedUser();
  if (!authResult.ok) {
    const failure = authorizationFailureResponse(authResult.reason);
    return NextResponse.json(failure.body, { status: failure.status });
  }

  const { savedItemId } = await context.params;
  const result = await removeSavedResource(savedItemId, authResult.user);
  return NextResponse.json(result, { status: statusCodeFor(result.status) });
}
