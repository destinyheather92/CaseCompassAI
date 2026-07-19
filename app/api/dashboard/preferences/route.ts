import { NextResponse, type NextRequest } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/authorization";
import { authorizationFailureResponse } from "@/lib/auth/authorization-http";
import { updateUserPreferences } from "@/lib/dashboard/update-user-preferences";

export const runtime = "nodejs";

function statusCodeFor(status: string): number {
  switch (status) {
    case "updated":
      return 200;
    case "invalid-request":
      return 400;
    default:
      return 500;
  }
}

export async function PATCH(request: NextRequest) {
  const authResult = await requireAuthenticatedUser();
  if (!authResult.ok) {
    const failure = authorizationFailureResponse(authResult.reason);
    return NextResponse.json(failure.body, { status: failure.status });
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

  const result = await updateUserPreferences(authResult.user.id, body);
  return NextResponse.json(result, { status: statusCodeFor(result.status) });
}
