# Test Coverage Map

Updated as each behavior lands — see [implementation-log.md](./implementation-log.md) for the narrative version.

| Behavior | Test File | Test Type | Status |
|---|---|---|---|
| Database connects and round-trips data via the Prisma 7 driver-adapter setup | `tests/integration/db-connectivity.test.ts` | Integration | Covered |
| Generic rate limiter allows/blocks/resets correctly and never leaks key existence | `tests/unit/security/rate-limit.test.ts` | Unit | Covered |
| Existing legal-terms rate limiter is behavior-preserving after refactor | `tests/unit/security/legal-sources-rate-limiter.test.ts` | Unit (regression) | Covered |
| Secrets are redacted before logging (keys, nesting, arrays, case-insensitivity) | `tests/unit/security/safe-logger.test.ts` | Unit | Covered |
| Audit events persist correctly and never store secrets/case narratives even if passed | `tests/integration/audit/audit-log.test.ts` | Integration | Covered |
| Password policy: length bounds, no complexity requirement, blocklist, temp-password reuse rejected | `tests/unit/auth/password-policy.test.ts` | Unit | Covered |
| Username/temporary-password generation is cryptographically random, unique, unambiguous | `tests/unit/auth/generate-credentials.test.ts` | Unit | Covered |
| Authorization pure functions (active/password-change/role/institution/facility) | `tests/unit/auth/authorization.test.ts` | Unit | Covered |
| `loadAppUserByClerkId` + composed `authorize()` against real data, including cross-institution and must-change-password precedence | `tests/integration/authorization/load-app-user.test.ts` | Integration | Covered |
| Individual users get a Prisma row synced from Clerk's `user.created` webhook, idempotently and without overwriting institutional accounts | `tests/integration/auth/sync-clerk-user.test.ts` | Integration | Covered |
| Clerk webhook route rejects forged/missing signatures; accepts validly-signed events | `tests/integration/auth/clerk-webhook-route.test.ts` | Integration | Covered |
| Institutional user creation sends only username+password to Clerk (no email/phone), lands `PENDING_FIRST_LOGIN`, rejects disallowed roles/taken usernames/foreign facilities, audit-logs without the temp password | `tests/integration/institution/create-user.test.ts` | Integration | Covered |
| Temporary password reset invalidates the old one, returns account to pending-first-login, institution-scoped | `tests/integration/institution/reset-user-password.test.ts` | Integration | Covered |
| Account deactivate/reactivate bans/unbans at Clerk (defense in depth), institution-scoped | `tests/integration/institution/change-user-status.test.ts` | Integration | Covered |
| Institution user list: scoping, filters, search, pagination, minimal projection | `tests/integration/institution/list-users.test.ts` | Integration | Covered |
| Institution user API routes: auth gating, validation, and client-supplied institutionId is never trusted | `tests/integration/institution/users-route.test.ts`, `users-list-route.test.ts`, `user-detail-routes.test.ts` | Integration | Covered |
| First-login gate blocks protected routes until password changed | *(pending)* | Integration + E2E | Not yet built |
| Intake step validation | *(pending)* | Unit | Not yet built |
| Roadmap schema validation / deterministic fallback / rate limiting | *(pending)* | Unit + Integration | Not yet built |

This table will be filled in as each remaining phase completes; entries are not marked "Covered" until a real test run has passed.
