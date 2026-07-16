import { NextResponse, type NextRequest } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/authorization";
import { authorizationFailureResponse } from "@/lib/auth/authorization-http";
import { institutionUserCreateSchema } from "@/lib/institution/institution-schema";
import { createInstitutionUser } from "@/lib/institution/create-user";
import { listInstitutionUsers } from "@/lib/institution/list-users";
import { createRateLimiter } from "@/lib/security/rate-limit";
import type { AccountStatus, UserRole } from "@/lib/generated/prisma/enums";

export const runtime = "nodejs";

// Keyed per acting staff member, not per IP — an institution could
// legitimately have many staff behind one NAT'd facility network.
const createUserRateLimiter = createRateLimiter({ windowMs: 60_000, max: 20 });

const VALID_ROLES = new Set<UserRole>(["INCARCERATED_USER", "EDUCATOR", "LEGAL_AID_STAFF", "INSTITUTION_ADMIN"]);
const VALID_STATUSES = new Set<AccountStatus>([
  "ACTIVE",
  "DISABLED",
  "LOCKED",
  "PENDING_FIRST_LOGIN",
  "TEMPORARY_PASSWORD_EXPIRED",
]);

export async function GET(request: NextRequest) {
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

  const params = request.nextUrl.searchParams;
  const roleParam = params.get("role")?.toUpperCase();
  const statusParam = params.get("status")?.toUpperCase();

  // institutionId is always the caller's own — a `?institutionId=` query
  // param, if present, is silently ignored rather than trusted.
  const result = await listInstitutionUsers({
    institutionId: authResult.user.institutionId,
    facilityId: params.get("facilityId") ?? undefined,
    role: roleParam && VALID_ROLES.has(roleParam as UserRole) ? (roleParam as UserRole) : undefined,
    status: statusParam && VALID_STATUSES.has(statusParam as AccountStatus) ? (statusParam as AccountStatus) : undefined,
    search: params.get("search") ?? undefined,
    page: params.has("page") ? Number(params.get("page")) : undefined,
    pageSize: params.has("pageSize") ? Number(params.get("pageSize")) : undefined,
  });

  return NextResponse.json(result, { status: 200 });
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuthenticatedUser({ roles: ["INSTITUTION_ADMIN"] });
  if (!authResult.ok) {
    const failure = authorizationFailureResponse(authResult.reason);
    return NextResponse.json(failure.body, { status: failure.status });
  }

  if (createUserRateLimiter.isLimited(authResult.user.id)) {
    return NextResponse.json(
      { status: "rate-limited", message: "Too many requests. Please wait a moment and try again." },
      { status: 429 },
    );
  }

  if (!authResult.user.institutionId) {
    return NextResponse.json(
      { status: "forbidden", message: "Your account is not associated with an institution." },
      { status: 403 },
    );
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

  const parsed = institutionUserCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { status: "invalid-request", message: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }

  // institutionId always comes from the authenticated staff member's own
  // AppUser, never from the request body — see security-invariants.md #23.
  const result = await createInstitutionUser({
    actorUserId: authResult.user.id,
    institutionId: authResult.user.institutionId,
    role: parsed.data.role,
    username: parsed.data.username,
    displayName: parsed.data.displayName,
    facilityId: parsed.data.facilityId,
    internalIdentifier: parsed.data.internalIdentifier,
  });

  switch (result.status) {
    case "created":
      return NextResponse.json(
        { status: "created", user: result.user, temporaryPassword: result.temporaryPassword },
        { status: 201 },
      );
    case "invalid-role":
      return NextResponse.json(
        { status: "invalid-role", message: "That role cannot be assigned here." },
        { status: 400 },
      );
    case "invalid-facility":
      return NextResponse.json(
        { status: "invalid-facility", message: "That facility is not part of your institution." },
        { status: 400 },
      );
    case "username-taken":
      return NextResponse.json(
        { status: "username-taken", message: "That username is already in use." },
        { status: 409 },
      );
    case "error":
      return NextResponse.json({ status: "error", message: result.message }, { status: 500 });
  }
}
