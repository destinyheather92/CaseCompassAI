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
| First-login gate blocks protected routes until password changed | `tests/components/auth/institution-login-form.test.tsx`, `tests/integration/authorization/*` | Integration + Component | Covered (E2E pending) |
| AI interview: structured-output schema validation, including OpenAI Structured Outputs compatibility | `tests/unit/intake/intake-interview-schema.test.ts` | Unit | Covered |
| AI interview: deterministic Layer-1 input validation | `tests/unit/intake/intake-deterministic-schema.test.ts` | Unit | Covered |
| AI interview: prompt context builder excludes secrets, delimits untrusted user content | `tests/unit/ai/build-intake-interview-input.test.ts` | Unit | Covered |
| AI interview: system prompt contains every required safety directive | `tests/unit/ai/intake-interviewer-system-prompt.test.ts` | Unit | Covered |
| AI interview: OpenAI provider handles success/refusal/malformed-output/timeout/not-configured without leaking raw errors | `tests/unit/ai/openai-intake-interviewer.test.ts` | Unit (DI, no network) | Covered |
| AI interview: guests allowed, but a disabled/locked/must-change-password signed-in user is never silently treated as guest | `tests/integration/authorization/authorize-optional-user.test.ts` | Integration | Covered |
| AI interview: session creation, question-limit enforcement, ownership, idempotent answer retry | `tests/integration/intake/start-intake-session.test.ts`, `submit-intake-answer.test.ts`, `get-and-complete-intake-session.test.ts` | Integration | Covered |
| AI interview API routes: auth gating, rate limiting, request-size limits, status-code mapping | `tests/integration/intake/start-route.test.ts`, `answer-route.test.ts`, `session-detail-routes.test.ts` | Integration | Covered |
| Roadmap generation | *(not in scope this phase — see `docs/behavior/roadmap-generation.md`)* | — | Deferred |
| Layer-1 choice steps: single-select, multi-select, exclusive "none", focus management, Back/Continue gating | `tests/components/onboarding/choice-steps.test.tsx` | Component | Covered |
| Jurisdiction step: full state list, stable value codes | `tests/components/onboarding/jurisdiction-step.test.tsx` | Component | Covered |
| Adaptive question: all 6 answerType controls, sensitive-info warning, focus, safe HTML rendering | `tests/components/onboarding/adaptive-question.test.tsx` | Component | Covered |
| Loading/recovery UI: honest copy, aria-live, Try Again / Review My Answers | `tests/components/onboarding/intake-loading-and-recovery.test.tsx` | Component | Covered |
| Review/confirmation: summary display, acknowledgement gating, Edit | `tests/components/onboarding/intake-review.test.tsx` | Component | Covered |
| Welcome step: disclaimer, resume-vs-start-over without discarding progress | `tests/components/onboarding/welcome-step.test.tsx` | Component | Covered |
| Zustand intake store: field updates, exclusive toggles, navigation, error-preserves-answers, reset/clearSession | `tests/unit/intake/use-intake-store.test.ts` | Unit | Covered |
| Get Started page orchestration: Layer 1 → start call → AI interview → review, error preserves Layer-1 answers | `tests/components/onboarding/get-started-page.test.tsx` | Component | Covered |
| Evaluation fixtures: 11 fictional scenarios (pretrial, appeal, post-conviction, civil, family, unsure jurisdiction, legal-advice request, prompt injection, conflicting dates, no documents, immediate-completion) run through the real service layer | `tests/integration/intake/evaluation-fixtures.test.ts` | Integration | Covered |
| End-to-end guided intake flow: Layer 1 → AI interview → edit → review → confirm, no legal advice/roadmap content, run against a live dev server with the AI turn mocked via network interception | `tests/e2e/ai-intake-interview.spec.ts` | E2E | **Covered — actually executed, not just written** |

This table will be filled in as each remaining phase completes; entries are not marked "Covered" until a real test run has passed.
