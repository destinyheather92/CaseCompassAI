# Authentication Behavior

## Two identity paths, one provider

Clerk is the authentication system of record for every user, individual or institution-managed. There is no custom password hashing anywhere in this codebase — Prisma's `User` model has no password field at all.

- **Individual users** sign up/sign in through Clerk's existing hosted flow (`/sign-up`, `/sign-in`, Google OAuth) — unchanged by this work. Their Prisma authorization row is created reactively by a signature-verified webhook (`app/api/webhooks/clerk/route.ts`) on Clerk's `user.created` event — see `lib/auth/sync-clerk-user.ts`.
- **Institution-managed users** (including incarcerated individuals with no email/phone access) are created directly by institution staff through the Backend API (`lib/institution/create-user.ts`), with only a `username` and a system-generated or staff-supplied temporary password — never an email or phone number. They authenticate at `/institution/login`, which accepts either a username or an email as the identifier (Clerk resolves which) so the same screen also serves staff.

## Source of truth split

- **Clerk** owns: sessions, password hashing/verification, login, secure HTTP-only cookies, session expiration.
- **Prisma** owns: role, institution/facility scope, account status, `mustChangePassword`. Every protected server request re-derives these from Prisma via the Clerk-verified `userId` (`lib/auth/authorization.ts`) — never from client input, never cached in a Clerk metadata field that a client could influence.

## Account status model

```ts
type AccountStatus =
  | "ACTIVE"
  | "DISABLED"
  | "LOCKED"
  | "PENDING_FIRST_LOGIN"
  | "TEMPORARY_PASSWORD_EXPIRED";
```

### Transitions implemented

```
(institution creates account) → PENDING_FIRST_LOGIN
PENDING_FIRST_LOGIN → ACTIVE            (first-login password change completes — lib/auth/first-login-password.ts)
ACTIVE → DISABLED                        (staff deactivates — lib/institution/change-user-status.ts)
DISABLED → ACTIVE | PENDING_FIRST_LOGIN  (staff reactivates; PENDING_FIRST_LOGIN if a password change is still owed)
ACTIVE | PENDING_FIRST_LOGIN → PENDING_FIRST_LOGIN  (staff resets the temporary password — lib/institution/reset-user-password.ts)
```

`TEMPORARY_PASSWORD_EXPIRED` and `LOCKED` are modeled in the enum and enforced by `requireActiveAccount` (both reject authentication), but the transitions *into* them — an expiry sweep job, and a failed-login-threshold lockout — are not implemented in this build. See Known Limitations in the relevant implementation-log entries.

### Enforcement

`requireActiveAccount` (`lib/auth/authorization.ts`) rejects `DISABLED`, `LOCKED`, and `TEMPORARY_PASSWORD_EXPIRED`; it allows `ACTIVE` and `PENDING_FIRST_LOGIN` through (a pending user must reach the password-change gate, not be blocked before it). Deactivation additionally bans the Clerk identity directly via the Backend API — defense in depth, so even a missed app-layer check elsewhere can't let a disabled account authenticate.

## Login error messages

Institution login (and any future generic login) must never reveal whether a given identifier exists. `lib/auth/authorization-http.ts` collapses `unauthenticated` and `account-not-found` into one identical 401 response, and `lib/security/rate-limit.ts` treats every key (seen before or not) identically.

## What's not built yet

- Individual-user password reset/forgot-password flow (Clerk's existing hosted flow already covers this for individual users; not modified here).
- Automatic transition into `LOCKED`/`TEMPORARY_PASSWORD_EXPIRED` (thresholds and expiry sweeps).
