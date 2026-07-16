# First-Login Password Change

## Why this exists

Institution-managed users, especially incarcerated individuals, are given a temporary password by staff through an out-of-band process (verbally, on paper, etc.). That temporary credential must never remain a viable long-term password — the user must set a private one only they know, before touching anything else in the product.

## Flow

1. User authenticates at `/institution/login` with their username + temporary password (Clerk's own login, not a custom implementation).
2. They land on `/first-login` (`app/first-login/page.tsx`), a server component that:
   - Redirects to `/institution/login` if there's no valid session.
   - Redirects onward (`/institution/dashboard` for staff, `/get-started` otherwise) if `mustChangePassword` is already `false` — so this page is a no-op past the first time, not an error.
   - Otherwise renders `<FirstLoginForm>`.
3. The form (`components/auth/first-login-form.tsx`) collects the current (temporary) password, a new password, and confirmation, validated client-side with the exact same Zod schema (`lib/auth/password-policy.ts`) used server-side.
4. On submit, it posts to `POST /api/auth/first-login-password`.

## Server-side verification — not just trusting the client

This is the part worth being explicit about: **the server itself verifies the current password**, via Clerk's Backend API `verifyPassword({userId, password})` (`lib/auth/first-login-password.ts`), before touching anything. It does not trust that the client already got this right. If verification fails, nothing changes — not the Clerk password, not any Prisma field — and a `first_login_password_rejected` audit event is recorded.

Only after verification succeeds does the server call Clerk's `updateUser({password: newPassword})` to set the new password, then update Prisma: `mustChangePassword: false`, `accountStatus: ACTIVE`, `passwordChangedAt: now`, `temporaryPasswordExpiresAt: null`. A `first_login_password_completed` audit event is recorded.

This is why "invalid current temporary password fails" and "temporary password becomes invalid after change" are true statements enforced by Clerk itself, not custom logic this codebase has to get right on its own.

## Password requirements

`lib/auth/password-policy.ts`, shared client and server:

- Minimum 10 characters, maximum 128.
- No complexity requirements (no forced uppercase/number/symbol) — passphrases with spaces are explicitly supported.
- The new password cannot equal the current/temporary password (case- and whitespace-insensitive comparison, so `"TempPass"` and `"  temppass  "` are both rejected as reuse).
- A small common-password blocklist is checked.

## Bypass resistance (invariant #32)

Entering `/first-login`, or any other protected route, directly cannot skip this requirement:

- `/first-login` itself is a server component that checks `requirePasswordChangeComplete` via `requireAuthenticatedUser` — there's no client-only gate to defeat.
- Every other protected route independently calls the same authorization chain, which checks `mustChangePassword` before any role/institution check runs (proven in `tests/integration/authorization/load-app-user.test.ts`: "blocks a user who must still change their password before any role/institution check runs").
- `proxy.ts` also coarsely protects `/first-login` and the institution dashboard routes as a UX-friendly first gate, but is explicitly documented as insufficient on its own — see security-invariants.md #7/#8.

## What's not built yet

- A visible countdown/expiry UI for `temporaryPasswordExpiresAt` (the field exists and is enforced at the data level via `TEMPORARY_PASSWORD_EXPIRED` status, but nothing currently transitions an account into that status automatically).
