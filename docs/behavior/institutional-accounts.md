# Institutional Accounts

## Who can create/manage them

Only `INSTITUTION_ADMIN` (the "facility administrator") can create, list, reset, deactivate, archive, and reactivate institution-managed accounts (`lib/auth/institution-permissions.ts`'s `INSTITUTION_MANAGEMENT_ROLES`), enforced server-side by `requireAuthenticatedUser({roles: INSTITUTION_MANAGEMENT_ROLES})` on every route under `/api/institution/users*` and `/institution/dashboard`/`/institution/users`, not by hiding a button client-side.

There is deliberately only one institution-side role — no staff directory, staff invitations, staff-specific permissions, or staff-management UI. An `INSTITUTION_STAFF` role, its own creation flow, and staff-specific nav/permission branching were built and then explicitly rolled back per product direction (see the 2026-07-21 implementation log entry) — the institutional system needs exactly two account kinds: facility administrator and institutional inmate.

## How an institution itself is created

**Self-service registration (`POST /api/institution/register`, public, rate-limited by IP)** — `app/institution/register/page.tsx` collects facility name, institution type, address, contact person/title/email/phone, estimated population, and estimated users (`lib/institution/register-institution-schema.ts`). Per an explicit product decision, `lib/institution/register-institution.ts` creates a **live, immediately usable** Institution and its first `INSTITUTION_ADMIN` account right away — there is no approval queue. CaseCompass staff are expected to review new institutions after the fact rather than gating creation on manual approval. The contact work email is stored on `Institution.contactEmail` as contact information only and is **never** sent to Clerk — the admin authenticates the same username + system-generated temporary password way every institution-managed account does. The username and temporary password are shown exactly once on success.

This is the second (alongside `prisma/seed.ts`) legitimate place that creates an `INSTITUTION_ADMIN` directly — the staff-facing `lib/institution/create-user.ts` path never does, since a brand-new institution has no existing admin to perform that action yet.

## Creation of managed accounts (`POST /api/institution/users`)

1. The facility administrator submits `{role, username?, displayName?, firstName?, lastName?, docNumber?, housingUnit?, facilityId?, internalIdentifier?}` — validated by `lib/institution/institution-schema.ts`, which restricts `role` to `incarcerated-user | educator | legal-aid-staff` (never `institution-admin` or `system-admin` through this endpoint — invariant #31). `firstName`/`lastName`/`docNumber` (DOC number / inmate ID) / `housingUnit` are plain optional fields on `User`, most relevant for incarcerated-user accounts but not restricted to them.
2. `institutionId` is **never** read from the request. It's always the authenticated admin's own `institutionId`, loaded server-side from Prisma (invariant #23) — tested explicitly in `tests/integration/institution/users-route.test.ts` by submitting a different institution's id in the body and confirming it's ignored.
3. If no username is supplied, one is generated: `<facility-or-institution-code>-<6 random unambiguous chars>` (`lib/auth/generate-credentials.ts`, using `crypto.randomInt`).
4. A temporary password is always system-generated (`generateTemporaryPassword()`), never accepted from the client in this build.
5. Clerk's Backend API creates the identity with **only** `{username, password}` — no email, no phone, ever (verified directly in `tests/integration/institution/create-user.test.ts`).
6. A Prisma `User` row is created: `accountStatus: PENDING_FIRST_LOGIN`, `mustChangePassword: true`, `temporaryPasswordExpiresAt` set 14 days out, `createdById` recorded.
7. The temporary password is returned in the API response **once**. It is never persisted anywhere in Prisma, never logged (all logging goes through `lib/security/safe-logger.ts`'s redaction), and cannot be retrieved again — only reset.
8. An audit event (`institution_user_created`) is recorded with role metadata only — never the password.

## Listing / search / filter (`GET /api/institution/users`)

`lib/institution/list-users.ts` always scopes by the caller's own `institutionId`; a `?institutionId=` query parameter, if present, is silently ignored. Supports filtering by facility, role, account status, housing unit (a plain field today — "future-ready" per the product ask, no dedicated Housing Unit model needed later, just a filter that already works), and a search across username/internal-identifier/first name/last name/DOC number, plus pagination. The Prisma `select` deliberately excludes `clerkUserId` and everything else the dashboard doesn't need.

## Password reset (`POST /api/institution/users/[id]/reset-password`)

There is no forgot-password email flow for this population — the only recovery path is the facility administrator triggering a reset. `lib/institution/reset-user-password.ts` generates a new temporary password, overwrites it in Clerk (which immediately invalidates the old one — invariant #28), and returns the account to `PENDING_FIRST_LOGIN`/`mustChangePassword:true`. Rejects if the target user belongs to a different institution than the caller.

## Deactivate / archive / reactivate (`PATCH /api/institution/users/[id]`)

`lib/institution/change-user-status.ts` supports three actions:
- **deactivate** — temporary block. Bans the Clerk identity (defense in depth) and sets `accountStatus: DISABLED`.
- **archive** — permanent retirement. Also bans the Clerk identity and sets `accountStatus: ARCHIVED`. History (roadmaps, activity, audit rows) is never deleted, only hidden from the active roster.
- **reactivate** — works from either `DISABLED` or `ARCHIVED`. Unbans the Clerk identity. A user who still owes a password change returns to `PENDING_FIRST_LOGIN`, not `ACTIVE` — they still have to complete first-login.

## What a facility administrator cannot do (enforced, not just hidden)

- Retrieve an existing password or password hash — there is no such field or endpoint.
- View another institution's users — every lookup is scoped by the caller's own `institutionId`, verified in tests with a deliberate cross-institution attempt.
- Assign `system-admin` (or `institution-admin`) through the account-creation endpoint — rejected by the Zod schema before any database or Clerk call.
- Become the subject of a legal research roadmap — `isInstitutionAdministrationRole` (`lib/auth/institution-permissions.ts`) rejects an `INSTITUTION_ADMIN` actor server-side at the intake-creation entry point (`POST /api/intake/interview/start`), regardless of what the UI shows. A roadmap belongs only to an individual user or an institutional inmate — never the institution or its administrator. See `docs/behavior/security-invariants.md` #63.
- View private research content (roadmaps, intake descriptions) from the institution dashboard — the dashboard only surfaces the operational fields in `ListedInstitutionUser` (status, role, facility, last login, must-change-password), never `IntakeSession`/`ResearchRoadmap` content. `lib/institution/list-institution-roadmaps.ts` (used by `/institution/roadmaps`) likewise exposes only title/owner-label/date, never step content.
- Edit authentication settings directly (password policy, session config, etc.) — those stay managed through Clerk. `/institution/settings` is a read-only profile view of the fields collected at registration; there is no in-app authentication configuration surface at all.

## Post-login routing

`lib/auth/post-password-setup-redirect.ts`'s `getPostPasswordSetupRoute()` is the single source of truth for where a user lands immediately after completing mandatory first-login password setup — this replaced an earlier bug where every user, including facility administrators, was unconditionally sent to `/get-started` (the legal intake flow). Institution administrators always land on `/institution/dashboard`; incarcerated users are routed to `/get-started` or `/dashboard` depending on their own intake/roadmap status; individual users are unaffected (they never reach this path — `mustChangePassword` is always false for `INDIVIDUAL`, invariant #62).

## Known limitations

- No bulk/CSV import — one account at a time, matching this build's required API surface.
- No facility-scoped admin role yet (`requireFacilityAccess` exists and is tested, but no route currently uses it — only institution-wide admins act in this build).
- Self-service registration has no approval gate — a deliberate product decision (see above), not an oversight. Anyone can submit the form; CaseCompass is expected to review new institutions after the fact. Rate-limited (5/minute per IP) as the only friction.
- `/institution/settings` is read-only for this pass — an edit form for the institution's own profile fields is a natural next step, not yet built.
- `/institution/reports` currently shows the same aggregate counts as the dashboard, laid out for an at-a-glance summary — no trend charts or per-facility breakdowns yet.
