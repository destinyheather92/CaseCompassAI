# Institutional Accounts

## Who can create them

Only an authenticated user with Prisma role `INSTITUTION_ADMIN` can create, list, reset, deactivate, or reactivate institution-managed accounts — enforced server-side by `requireAuthenticatedUser({roles:["INSTITUTION_ADMIN"]})` on every route under `/api/institution/users*`, not by hiding a button client-side.

## Creation (`POST /api/institution/users`)

1. Staff submits `{role, username?, displayName?, facilityId?, internalIdentifier?}` — validated by `lib/institution/institution-schema.ts`, which restricts `role` to `incarcerated-user | educator | legal-aid-staff` (never `institution-admin` or `system-admin` through this endpoint — invariant #31).
2. `institutionId` is **never** read from the request. It's always the authenticated staff member's own `institutionId`, loaded server-side from Prisma (invariant #23) — tested explicitly in `tests/integration/institution/users-route.test.ts` by submitting a different institution's id in the body and confirming it's ignored.
3. If no username is supplied, one is generated: `<facility-or-institution-code>-<6 random unambiguous chars>` (`lib/auth/generate-credentials.ts`, using `crypto.randomInt`).
4. A temporary password is always system-generated (`generateTemporaryPassword()`), never accepted from the client in this build.
5. Clerk's Backend API creates the identity with **only** `{username, password}` — no email, no phone, ever (verified directly in `tests/integration/institution/create-user.test.ts`).
6. A Prisma `User` row is created: `accountStatus: PENDING_FIRST_LOGIN`, `mustChangePassword: true`, `temporaryPasswordExpiresAt` set 14 days out, `createdById` recorded.
7. The temporary password is returned in the API response **once**. It is never persisted anywhere in Prisma, never logged (all logging goes through `lib/security/safe-logger.ts`'s redaction), and cannot be retrieved again — only reset.
8. An audit event (`institution_user_created`) is recorded with role metadata only — never the password.

## Listing / search / filter (`GET /api/institution/users`)

`lib/institution/list-users.ts` always scopes by the caller's own `institutionId`; a `?institutionId=` query parameter, if present, is silently ignored. Supports filtering by facility, role, account status, a username/internal-identifier search, and pagination. The Prisma `select` deliberately excludes `clerkUserId` and everything else the dashboard doesn't need.

## Password reset (`POST /api/institution/users/[id]/reset-password`)

There is no forgot-password email flow for this population — the only recovery path is an authorized staff member triggering a reset. `lib/institution/reset-user-password.ts` generates a new temporary password, overwrites it in Clerk (which immediately invalidates the old one — invariant #28), and returns the account to `PENDING_FIRST_LOGIN`/`mustChangePassword:true`. Rejects if the target user belongs to a different institution than the caller.

## Deactivate / reactivate (`PATCH /api/institution/users/[id]`)

`lib/institution/change-user-status.ts` bans/unbans the Clerk identity directly (defense in depth) in addition to flipping `accountStatus`. Reactivating a user who still owes a password change returns them to `PENDING_FIRST_LOGIN`, not `ACTIVE` — they still have to complete first-login.

## What staff cannot do (enforced, not just hidden)

- Retrieve an existing password or password hash — there is no such field or endpoint.
- View another institution's users — every lookup is scoped by the caller's own `institutionId`, verified in tests with a deliberate cross-institution attempt.
- Assign `system-admin` (or `institution-admin`) through this endpoint — rejected by the Zod schema before any database or Clerk call.
- View private research content (roadmaps, intake descriptions) from the institution dashboard — the dashboard only surfaces the operational fields in `ListedInstitutionUser` (status, role, facility, last login, must-change-password), never `IntakeSession`/`ResearchRoadmap` content.

## Known limitations

- No bulk/CSV import — one account at a time, matching this build's required API surface.
- No facility-scoped staff role yet (`requireFacilityAccess` exists and is tested, but no route currently uses it — only institution-wide admins act in this build).
- No system-admin console for creating the *first* institution/institution-admin — see `prisma/seed.ts` (not yet run against the live Clerk tenant; requires explicit user go-ahead since it creates a real Clerk user).
