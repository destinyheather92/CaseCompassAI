# Security Invariants

These rules must always hold. Each one is mapped to the code that enforces it and the test(s) that prove it. If you find yourself changing code in a way that would violate one of these, stop — either the invariant needs an explicit, reviewed update to this document, or the change is wrong.

| # | Invariant | Enforced by | Tested by |
|---|---|---|---|
| 1 | Passwords are never stored in plaintext | Clerk owns all password storage/hashing; Prisma `User` has no password field at all (`prisma/schema.prisma`) | Schema review — there is no column to store one in |
| 2 | Passwords are never written to logs | `lib/security/safe-logger.ts` redacts `password`/`passwordHash`/etc. before any `console.*` call | `tests/unit/security/safe-logger.test.ts` |
| 3 | Temporary passwords are displayed only at creation or reset | `POST /api/institution/users` and `POST /api/institution/users/[id]/reset-password` return the plaintext temp password once, in the response body only — never persisted | *(pending — institutional account creation phase)* |
| 4 | Temporary passwords cannot be retrieved later | No Prisma column stores it; Clerk's password hash is not readable via any API this app calls | *(pending)* |
| 5 | Temporary passwords become invalid after a successful password change | Clerk `user.updatePassword` overwrites the credential | *(pending — first-login phase)* |
| 6 | A user with `mustChangePassword = true` cannot access protected product routes | `lib/auth/authorization.ts` → `requirePasswordChangeComplete`, called by `authorize()`/`requireAuthenticatedUser()` before any role/scope check | `tests/unit/auth/authorization.test.ts`, `tests/integration/authorization/load-app-user.test.ts` |
| 7 | Client-side route hiding is not considered authorization | `proxy.ts` is a coarse UX gate only; every protected server component/route handler independently calls `lib/auth/authorization.ts` against Prisma | *(pending — route wiring phase)* |
| 8 | Authorization is enforced on the server | Same as above — `authorize()` always re-derives role/status/scope from Prisma via the Clerk-verified `userId`, never from client input | `tests/integration/authorization/load-app-user.test.ts` |
| 9 | Institutional administrators cannot access users outside their institution | `requireInstitutionAccess` | `tests/unit/auth/authorization.test.ts`, `tests/integration/authorization/load-app-user.test.ts` |
| 10 | Facility-level administrators cannot access users outside their permitted facilities | `requireFacilityAccess` | `tests/unit/auth/authorization.test.ts` |
| 11 | Deactivated users cannot authenticate | `requireActiveAccount` rejects `DISABLED`; institutional account lifecycle also bans the Clerk user directly (defense in depth) | `tests/unit/auth/authorization.test.ts`; Clerk-ban integration test *(pending)* |
| 12 | Locked users cannot authenticate until an approved recovery action occurs | `requireActiveAccount` rejects `LOCKED` | `tests/unit/auth/authorization.test.ts` |
| 13 | Login errors must not reveal whether a username exists | `createRateLimiter` treats every key identically regardless of prior existence; institution-login uses a single generic "username or password is incorrect" message | `tests/unit/security/rate-limit.test.ts` ("does not expose account existence"); login-copy test *(pending)* |
| 14 | Password hashes must never appear in API responses | `AppUser`/Prisma `User` selections never include a password field (none exists to select) | *(pending — API route phase)* |
| 15 | Guest roadmap generation must be rate-limited | `lib/security/rate-limit.ts` reused for `/api/intake/roadmap` | *(pending — roadmap phase)* |
| 16 | Authenticated roadmap generation must also be rate-limited | Same limiter, keyed by user id instead of IP | *(pending)* |
| 17 | Raw case descriptions must not appear in analytics | No analytics integration exists in this build | N/A currently |
| 18 | Raw case descriptions must not be included in ordinary application logs | `lib/security/safe-logger.ts` redacts `description`/`prompt` keys | `tests/unit/security/safe-logger.test.ts` |
| 19 | Guest intake information must not be silently stored on the server | `IntakeSession` rows are only created when a roadmap is actually requested, never on each step | *(pending — intake phase)* |
| 20 | Shared-device logout must clear sensitive client state | Zustand intake store namespaced per user, cleared on logout | *(pending — intake phase)* |
| 21 | Institution-managed accounts must not require email or phone verification | Institutional accounts are created via Clerk's Backend API with only `username`+`password` | *(pending — institutional account creation phase)* |
| 22 | Role checks must occur on every protected server action and API request | `authorize()`/`requireAuthenticatedUser()` is the mandatory entry point for protected routes | ongoing — verified per-route as each is built |
| 23 | Institution and facility scope must come from the authenticated account, not trusted client input | `requireInstitutionAccess`/`requireFacilityAccess` only ever read `user.institutionId`/`user.facilityId` from the Prisma row loaded via the verified Clerk id — no parameter accepts a client-supplied scope override | `tests/integration/authorization/load-app-user.test.ts` ("never trusts a client-supplied role or institutionId") |
| 24 | Roadmap generation must not fabricate legal authorities | Deterministic fallback never emits citations; AI path (when wired) is schema + prompt constrained | *(pending — roadmap phase)* |
| 25 | AI output must be schema-validated before being returned | `lib/roadmap/roadmap-schema.ts` (Zod, strict) | *(pending)* |
| 26 | Invalid AI output must fail safely | Falls back to the deterministic generator rather than returning partially-valid output | *(pending)* |
| 27 | A failed roadmap request must not erase intake answers | Zustand store keeps intake state independent of roadmap request state | *(pending)* |
| 28 | Resetting a temporary password must invalidate the previous temporary password | Clerk `updateUser({password})` overwrites the credential; Prisma `mustChangePassword` reset to `true` | *(pending)* |
| 29 | Audit logs must not contain secrets or full case narratives | `recordAuditEvent` redacts metadata via the same guard as `safeLog` | `tests/integration/audit/audit-log.test.ts` |
| 30 | A user cannot assign themselves a higher role | Role is only ever set server-side by an `INSTITUTION_ADMIN`/`SYSTEM_ADMIN` acting through `requireRole`-gated endpoints; no endpoint lets a user set their own role | *(pending — institutional account creation phase)* |
| 31 | Institution staff cannot create system administrators | Institution user creation endpoint restricts `role` to `incarcerated-user \| educator \| legal-aid-staff` at the Zod schema level | *(pending)* |
| 32 | Users cannot bypass the first-login password requirement by entering a route directly | Enforced server-side via `requirePasswordChangeComplete` inside every protected server component, not just `proxy.ts` | *(pending — route wiring phase)* |
| 33 | Session expiration must be enforced on the server | Delegated entirely to Clerk, which validates session tokens server-side on every `auth()` call | ongoing |
| 34 | Disabled accounts must lose access even if a prior client state still exists | `requireActiveAccount` is re-checked on every request via `authorize()` — there is no cached "is active" client flag that grants access | `tests/unit/auth/authorization.test.ts` |
| 35 | User-provided text must never be rendered as raw HTML | React's default escaping is relied on everywhere; `dangerouslySetInnerHTML` is not used for any user-supplied content | *(pending — component phase; will be grepped for as a build-time check)* |

"*(pending)*" entries are invariants whose enforcing code hasn't been built yet in this session — they're listed now so later phases are held to them, and this table is updated (not silently left inaccurate) as each one lands.
