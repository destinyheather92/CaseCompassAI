import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAuthenticatedUser } from "@/lib/auth/authorization";
import { authorizationFailureResponse } from "@/lib/auth/authorization-http";
import { INSTITUTION_MANAGEMENT_ROLES } from "@/lib/auth/institution-permissions";
import { changeInstitutionUserStatus } from "@/lib/institution/change-user-status";

export const runtime = "nodejs";

const patchSchema = z.object({
  action: z.enum(["deactivate", "reactivate", "archive"]),
});

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const authResult = await requireAuthenticatedUser({ roles: INSTITUTION_MANAGEMENT_ROLES });
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ status: "invalid-request", message: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { status: "invalid-request", message: "action must be 'deactivate', 'reactivate', or 'archive'." },
      { status: 400 },
    );
  }

  const result = await changeInstitutionUserStatus({
    actorUserId: authResult.user.id,
    institutionId: authResult.user.institutionId,
    targetUserId: id,
    action: parsed.data.action,
  });

  switch (result.status) {
    case "updated":
      return NextResponse.json({ status: "updated", accountStatus: result.accountStatus }, { status: 200 });
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
