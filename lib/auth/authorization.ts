import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { syncIndividualUserFromClerk } from "@/lib/auth/sync-clerk-user";
import type { UserRole, AccountStatus } from "@/lib/generated/prisma/enums";

/**
 * The application-owned authorization record for the current caller.
 * Deliberately just the fields authorization decisions need — never a
 * password or credential of any kind, since Clerk owns those.
 */
export interface AppUser {
  id: string;
  clerkUserId: string;
  role: UserRole;
  accountStatus: AccountStatus;
  institutionId: string | null;
  facilityId: string | null;
  mustChangePassword: boolean;
}

export type AuthorizationFailureReason =
  | "unauthenticated"
  | "account-not-found"
  | "account-disabled"
  | "account-archived"
  | "account-locked"
  | "temporary-password-expired"
  | "must-change-password"
  | "forbidden-role"
  | "forbidden-institution"
  | "forbidden-facility";

export type AuthorizationResult =
  | { ok: true; user: AppUser }
  | { ok: false; reason: AuthorizationFailureReason; redirectTo: string };

function ok(user: AppUser): AuthorizationResult {
  return { ok: true, user };
}

function fail(reason: AuthorizationFailureReason, redirectTo: string): AuthorizationResult {
  return { ok: false, reason, redirectTo };
}

/**
 * Loads the AppUser for a verified Clerk user id. Takes the id as a
 * parameter (rather than calling Clerk's `auth()` itself) so it's
 * testable without an HTTP request, and so there is no code path where a
 * client-supplied identifier can be substituted for the server-verified
 * one — see `requireAuthenticatedUser` for the real entry point.
 *
 * Falls back to lazily creating the individual-user row when none exists
 * yet — the primary sync path is the `user.created` Clerk webhook
 * (`app/api/webhooks/clerk/route.ts`), but that webhook requires a
 * publicly-reachable URL registered in the Clerk Dashboard, which isn't
 * configured in every environment (see CLERK_WEBHOOK_SIGNING_SECRET in
 * .env.example). Without this fallback, a real signed-in Clerk user with
 * no Prisma row is indistinguishable from "not signed in" and gets
 * bounced to /sign-in — this closes that gap safely: it can only ever
 * create an INDIVIDUAL account (never a role/institution a client could
 * influence), and institution-managed users always already have their
 * row created synchronously at account-creation time, before they're
 * ever issued credentials to sign in with, so this path never applies to
 * them in practice.
 */
export async function loadAppUserByClerkId(clerkUserId: string | null): Promise<AuthorizationResult> {
  if (!clerkUserId) {
    return fail("unauthenticated", "/sign-in");
  }

  let user = await prisma.user.findUnique({ where: { clerkUserId } });
  if (!user) {
    user = await syncIndividualUserFromClerk({ clerkUserId });
  }

  return ok(user);
}

export function requireActiveAccount(user: AppUser): AuthorizationResult {
  switch (user.accountStatus) {
    case "DISABLED":
      return fail("account-disabled", "/sign-in");
    case "ARCHIVED":
      return fail("account-archived", "/sign-in");
    case "LOCKED":
      return fail("account-locked", "/sign-in");
    case "TEMPORARY_PASSWORD_EXPIRED":
      return fail("temporary-password-expired", "/institution/login");
    case "ACTIVE":
    case "PENDING_FIRST_LOGIN":
      return ok(user);
  }
}

/**
 * The staff-issued-temporary-password lifecycle is institution-only —
 * individual accounts authenticate through Clerk's own self-serve
 * email/password (or OAuth) and never have a temporary password to
 * begin with. Gate exempts INDIVIDUAL entirely so this check can never
 * misfire for a regular user, even if `mustChangePassword` were
 * somehow true on that row.
 */
export function requirePasswordChangeComplete(user: AppUser): AuthorizationResult {
  if (user.role !== "INDIVIDUAL" && user.mustChangePassword) {
    return fail("must-change-password", "/first-login");
  }
  return ok(user);
}

export function requireRole(user: AppUser, allowedRoles: UserRole[]): AuthorizationResult {
  if (!allowedRoles.includes(user.role)) {
    return fail("forbidden-role", "/");
  }
  return ok(user);
}

export function requireInstitutionAccess(user: AppUser, institutionId: string): AuthorizationResult {
  if (!user.institutionId || user.institutionId !== institutionId) {
    return fail("forbidden-institution", "/");
  }
  return ok(user);
}

export function requireFacilityAccess(user: AppUser, facilityId: string): AuthorizationResult {
  if (!user.facilityId || user.facilityId !== facilityId) {
    return fail("forbidden-facility", "/");
  }
  return ok(user);
}

export interface AuthorizeOptions {
  /** Skip the mustChangePassword gate — only for the first-login flow itself. */
  allowPendingPasswordChange?: boolean;
  roles?: UserRole[];
  institutionId?: string;
  facilityId?: string;
}

/**
 * Runs the full authorization chain in order: authenticated → active
 * account → password change complete → role → institution → facility.
 * Returns the first failure, or `{ok:true, user}` once every requested
 * check has passed. This is the function route handlers and server
 * components should call — see docs/behavior/authorization-matrix.md.
 */
export async function authorize(
  clerkUserId: string | null,
  options: AuthorizeOptions = {},
): Promise<AuthorizationResult> {
  const loaded = await loadAppUserByClerkId(clerkUserId);
  if (!loaded.ok) return loaded;

  const activeCheck = requireActiveAccount(loaded.user);
  if (!activeCheck.ok) return activeCheck;

  if (!options.allowPendingPasswordChange) {
    const passwordCheck = requirePasswordChangeComplete(loaded.user);
    if (!passwordCheck.ok) return passwordCheck;
  }

  if (options.roles) {
    const roleCheck = requireRole(loaded.user, options.roles);
    if (!roleCheck.ok) return roleCheck;
  }

  if (options.institutionId) {
    const institutionCheck = requireInstitutionAccess(loaded.user, options.institutionId);
    if (!institutionCheck.ok) return institutionCheck;
  }

  if (options.facilityId) {
    const facilityCheck = requireFacilityAccess(loaded.user, options.facilityId);
    if (!facilityCheck.ok) return facilityCheck;
  }

  return ok(loaded.user);
}

/**
 * Server-only entry point: reads the verified Clerk session via `auth()`
 * and runs the same authorization chain as `authorize`. Prefer this in
 * route handlers/server components; use `authorize`/the individual
 * `require*` functions directly in tests.
 */
export async function requireAuthenticatedUser(options: AuthorizeOptions = {}): Promise<AuthorizationResult> {
  const { userId } = await auth();
  return authorize(userId, options);
}

export type OptionalAuthResult =
  | { ok: true; user: AppUser | null }
  | { ok: false; reason: AuthorizationFailureReason; redirectTo: string };

/**
 * For guest-reachable endpoints (e.g. the intake interview): a missing
 * Clerk session is a valid guest (`user: null`), but a *present* session
 * still has to pass the active-account and password-change checks — a
 * disabled, locked, or must-change-password signed-in user is never
 * silently treated as an anonymous guest.
 */
export async function authorizeOptionalUser(clerkUserId: string | null): Promise<OptionalAuthResult> {
  if (!clerkUserId) {
    return { ok: true, user: null };
  }

  const loaded = await loadAppUserByClerkId(clerkUserId);
  if (!loaded.ok) return loaded;

  const activeCheck = requireActiveAccount(loaded.user);
  if (!activeCheck.ok) return activeCheck;

  const passwordCheck = requirePasswordChangeComplete(loaded.user);
  if (!passwordCheck.ok) return passwordCheck;

  return { ok: true, user: loaded.user };
}

/** Server-only entry point for `authorizeOptionalUser` — reads the verified Clerk session itself. */
export async function requireOptionalUser(): Promise<OptionalAuthResult> {
  const { userId } = await auth();
  return authorizeOptionalUser(userId);
}
