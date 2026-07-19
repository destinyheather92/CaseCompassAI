import { NextResponse, type NextRequest } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/authorization";
import { authorizationFailureResponse } from "@/lib/auth/authorization-http";
import { removeSavedCase } from "@/lib/saved/remove-saved-case";
import { updateSavedCaseNote } from "@/lib/saved/update-saved-case-note";

export const runtime = "nodejs";

function deleteStatusCodeFor(status: string): number {
  switch (status) {
    case "removed":
      return 200;
    case "not-found":
      return 404;
    default:
      return 500;
  }
}

function patchStatusCodeFor(status: string): number {
  switch (status) {
    case "updated":
      return 200;
    case "not-found":
      return 404;
    case "invalid-request":
      return 400;
    default:
      return 500;
  }
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ savedCaseId: string }> }) {
  const authResult = await requireAuthenticatedUser();
  if (!authResult.ok) {
    const failure = authorizationFailureResponse(authResult.reason);
    return NextResponse.json(failure.body, { status: failure.status });
  }

  const { savedCaseId } = await context.params;
  const result = await removeSavedCase(savedCaseId, authResult.user);
  return NextResponse.json(result, { status: deleteStatusCodeFor(result.status) });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ savedCaseId: string }> }) {
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

  const { savedCaseId } = await context.params;
  const result = await updateSavedCaseNote(savedCaseId, body, authResult.user);
  return NextResponse.json(result, { status: patchStatusCodeFor(result.status) });
}
