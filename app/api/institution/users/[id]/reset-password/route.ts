import { NextResponse, type NextRequest } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/authorization";
import { authorizationFailureResponse } from "@/lib/auth/authorization-http";
import { resetInstitutionUserPassword } from "@/lib/institution/reset-user-password";

export const runtime = "nodejs";

export async function POST(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const authResult = await requireAuthenticatedUser({ roles: ["INSTITUTION_ADMIN"] });
  if (!authResult.ok) {
    const failure = authorizationFailureResponse(authResult.reason);
    return NextResponse.json(failure.body, { status: failure.status });
  }
  if (!authResult.user.institutionId) {
    return NextResponse.json(
      { status: "forbidden", message: "Your account is not associated with an institution." },
      { status: 403 },
    );
  }

  const { id } = await context.params;

  const result = await resetInstitutionUserPassword({
    actorUserId: authResult.user.id,
    institutionId: authResult.user.institutionId,
    targetUserId: id,
  });

  switch (result.status) {
    case "reset":
      return NextResponse.json({ status: "reset", temporaryPassword: result.temporaryPassword }, { status: 200 });
    case "not-found":
      return NextResponse.json({ status: "not-found", message: "User not found." }, { status: 404 });
    case "forbidden-institution":
      return NextResponse.json(
        { status: "forbidden", message: "You do not have permission to manage this user." },
        { status: 403 },
      );
    case "error":
      return NextResponse.json({ status: "error", message: result.message }, { status: 500 });
  }
}
