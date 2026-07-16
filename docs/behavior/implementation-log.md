# Implementation Log

Append-only. Add a new dated entry per completed behavior — don't edit past entries except to fix a factual error.

## 2026-07-16 — AI intake interview: foundation (schema, env, OpenAI client)

### Expected Behavior

`IntakeSession` needs to support a two-layer intake (deterministic fields + AI-adaptive Q&A), with a server-validated env configuration for the OpenAI integration that never crashes the app when `OPENAI_API_KEY` is absent.

### Security Reason

A missing API key must degrade safely (invariant: "fail safely with a clear development error"), not take down unrelated routes via a module-import-time crash. Keeping the key/model name behind a single validated env module (rather than reading `process.env` ad hoc) is what makes "OpenAI credentials never reach the browser" and "model name never hardcoded" enforceable in one place.

### Tests Added

- `tests/unit/ai/env.test.ts` — defaults, coercion, and the no-key-doesn't-throw / throws-typed-error-on-demand split
- `tests/unit/ai/openai-client.test.ts` — lazy construction, caching, and (critically) that importing the module never throws even without a key
- `tests/unit/security/request-identity.test.ts` — extracted `clientIdFor` regression coverage

### Implementation

- `prisma/schema.prisma`: `IntakeStatus` reshaped to `DRAFT | INTERVIEWING | NEEDS_CLARIFICATION | READY_FOR_REVIEW | COMPLETED | ABANDONED`; `IntakeSession` gained `proceduralStage`, `factualSummary`, `unresolvedInformation`, `topicsCovered`, `questionCount`, `completedAt` and dropped the unused placeholder `description` field; new `IntakeAnswer` model. Migration `20260716164204_intake_ai_interview`.
- Prisma 7 note: `prisma migrate dev` refuses in this non-interactive environment (it wants to confirm the enum-value-removal data-loss warning interactively). Worked around it the supported non-interactive way: `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` to generate the SQL, wrote it into a manually-named `prisma/migrations/<timestamp>_name/migration.sql`, applied via `prisma migrate deploy` (which is designed to be non-interactive). Confirmed safe because no application code referenced `IntakeStatus`/`IntakeSession` yet (grepped first) and the database had zero real rows in that table.
- `lib/env.ts` — Zod-validated server env (`OPENAI_API_KEY` optional, `OPENAI_INTAKE_MODEL` default `gpt-5.6-luna` — flagged in comments as unverified against a real account, `INTAKE_MAX_AI_QUESTIONS` default `12`), `requireOpenAIApiKey()` throwing a typed `OpenAIConfigurationError` (message never includes the key).
- `lib/ai/openai-client.ts` — `import "server-only"`; lazy, cached `getOpenAIClient()`.
- `.env.example` created (first one in the repo) documenting every env var used so far.
- `lib/security/request-identity.ts` — extracted `clientIdFor()` out of `app/api/legal-terms/define/route.ts` (behavior-preserving; that route now imports the shared helper).
- Vitest gotcha worth recording: the `server-only` marker package throws under plain Vitest/Node because its `exports` map only serves the no-op build under the `react-server` condition (which Next's bundler sets, Vite/Vitest doesn't). Fixed by aliasing `server-only` → its own `empty.js` in `vitest.config.ts`, rather than setting the `react-server` resolution condition globally (which would risk changing resolution for other packages, like React itself, in ways not intended for plain unit tests).

### Verification

- `npx vitest run` (full suite): **27 test files, 164 tests, all passed**
- `npx tsc --noEmit`: clean
- Migration applied and verified against the live Supabase dev database (`prisma migrate status` → "up to date")

### Known Limitations

- `OPENAI_INTAKE_MODEL` default (`gpt-5.6-luna`) is unverified — no live OpenAI key is configured in this environment, so I could not confirm it against an actual account's available Responses-API models with Structured Outputs support.

---

## 2026-07-16 — AI intake interview: schema, provider, service layer, and API routes

### Expected Behavior

A guided intake flow where deterministic Layer-1 answers (case category, jurisdiction, procedural stage, research goals, document types) kick off an AI-adaptive Layer-2 interview: one question at a time, server-enforced question ceiling, never answers legal questions, requires explicit user review/confirmation before the session can be marked complete. Guests and authenticated users share the same endpoints; a signed-in but disabled/locked/must-change-password user is never silently treated as a guest.

### Security Reason

This is the highest-risk AI-integration surface in the app so far — untrusted user text flows into a prompt, and AI output flows back into persisted state and eventually (in a later phase) a roadmap. Every invariant in the spec traces to a concrete enforcement point: schema-validated AI output (never trust `output_parsed` blindly, even from the SDK's own parser — re-validated independently), a server-side question-count ceiling the model cannot override, and strict session-ownership checks so one user's intake answers are never readable by another.

### Tests Added (all red before implementation)

- `tests/unit/intake/intake-interview-schema.test.ts` (28 tests, including the `zodTextFormat` compatibility check that caught a real bug — see Implementation)
- `tests/unit/intake/intake-status.test.ts`, `intake-deterministic-schema.test.ts`, `intake-access.test.ts`
- `tests/unit/ai/build-intake-interview-input.test.ts`, `intake-interviewer-system-prompt.test.ts`, `openai-intake-interviewer.test.ts`
- `tests/integration/authorization/authorize-optional-user.test.ts`
- `tests/integration/intake/start-intake-session.test.ts`, `submit-intake-answer.test.ts`, `get-and-complete-intake-session.test.ts`
- `tests/integration/intake/start-route.test.ts`, `answer-route.test.ts`, `session-detail-routes.test.ts`
- `tests/unit/security/request-limits.test.ts`

### Implementation

Created: `lib/intake/intake-interview-schema.ts`, `intake-deterministic-schema.ts`, `intake-status.ts`, `intake-access.ts`, `start-intake-session.ts`, `submit-intake-answer.ts`, `get-intake-session.ts`, `complete-intake-session.ts`; `lib/ai/prompts/intake-interviewer-system.ts`, `build-intake-interview-input.ts`; `lib/ai/providers/intake-interviewer-provider.ts`, `openai-intake-interviewer.ts`; `lib/security/request-limits.ts`; `types/intake-interview.ts`; `tests/helpers/fake-intake-interviewer-provider.ts`; the four route handlers under `app/api/intake/interview/`.

Real bug caught by testing against the actual SDK rather than assuming: OpenAI's Structured Outputs strict mode rejects `.optional()` Zod fields entirely (`choices` on `IntakeQuestionSchema` must be `.nullable()` instead — present-but-null, not omittable). Found this by writing a test that actually calls `zodTextFormat()` on the schema, not just asserting shape in isolation — worth keeping that test as a regression guard against this class of mistake reappearing.

Schema correction mid-build: added `IntakeSession.currentQuestion` (Json, nullable) after starting the service layer, once it became clear `/answer` needs to know which question is actually pending server-side to validate against (rather than trusting the client's `questionId` blindly). Second small migration (`20260716173600_intake_current_question`).

Idempotent-retry design for `/answer`: the answer is persisted *before* the next AI call, so a provider failure after a successful save never loses the user's answer. A retry with the same `questionId` detects the already-saved row and skips re-inserting, then just retries the AI call — no separate "retry" endpoint needed. Verified directly by a test that fails the provider once, confirms the answer row exists, retries, and confirms no duplicate was created.

Question-limit enforcement happens server-side against the actual persisted `IntakeAnswer` row count, before the provider is ever called again once the ceiling is hit — the model has no path to override it.

Route tests follow the exact pattern already established in Phase 1 (`tests/integration/institution/users-route.test.ts`): mock `@clerk/nextjs/server`'s `auth()` plus the service function under test, so route tests verify HTTP wiring (auth gating, status-code mapping, rate limiting, request-size limits) without re-testing business logic already covered at the service layer.

Also fixed, while running the full suite: a genuine cross-file test-isolation bug in `start-intake-session.test.ts` (a "no session was created" assertion scoped only by `jurisdiction`/`caseType`, which collided with concurrently-running fixtures from other intake test files sharing those same default values under Vitest's parallel file execution) — fixed by uniquely-suffixing that one test's input, matching the unique-fixture convention used everywhere else. Also fixed one pre-existing lint error unrelated to this phase (`components/institution/user-management.tsx` — synchronous `setState` inside a `useEffect` body, flagged by `react-hooks/set-state-in-effect`; fixed by deferring past the callback's synchronous portion rather than duplicating fetch logic).

### Verification

- `npx vitest run`: **43 test files, 304 tests, all passed**
- `npx tsc --noEmit`: clean
- `npx eslint .`: clean (zero errors after the fix above)

### Known Limitations

- No real OpenAI key configured — `OpenAIIntakeInterviewer` is fully implemented and tested via dependency injection, but has never made a real API call in this environment.
- No dedicated "edit a prior answer" endpoint — the review step (next phase) can display the factual summary and unresolved items, but revising an individual already-answered question requires more design (would need to decide how re-answering an earlier turn interacts with the AI's running summary/topics-covered state) than fits this phase's scope. Documented here rather than silently dropped.
- `currentQuestion`/`researchGoals`/`documentTypes`/`unresolvedInformation`/`topicsCovered` are stored as Prisma `Json` columns without a DB-level schema constraint — validity is enforced entirely at the application layer (Zod on write). Acceptable for this stage; worth a Postgres CHECK constraint or generated column if this schema sees heavier direct SQL access later.

---

## 2026-07-16 — Guided intake UI, `/get-started`, evaluation fixtures, and e2e

### Expected Behavior

`/get-started` — previously nonexistent — walks a guest or authenticated user through five deterministic questions, then the AI interview turn-by-turn, then a review-and-confirm step, ending at a `completed` intake session (no roadmap UI — deferred). The landing page's hero CTA, dead since the marketing site was first built, needed to actually go there.

### Security Reason

This is where every previously-tested backend behavior becomes something a real user can actually drive — an untested UI wired incorrectly could silently defeat all of it (e.g. sending the wrong `questionId`, losing answers on error, or rendering AI-supplied text as HTML). The evaluation fixtures and the e2e run exist specifically to catch integration-level mistakes that per-unit tests can't see.

### Tests Added (all red before implementation)

- `tests/components/onboarding/choice-steps.test.tsx`, `jurisdiction-step.test.tsx`, `adaptive-question.test.tsx`, `intake-loading-and-recovery.test.tsx`, `intake-review.test.tsx`, `welcome-step.test.tsx`, `get-started-page.test.tsx`
- `tests/unit/intake/use-intake-store.test.ts`
- `tests/integration/intake/evaluation-fixtures.test.ts` (11 fictional scenarios)
- `tests/e2e/ai-intake-interview.spec.ts`

### Implementation

Created: `stores/use-intake-store.ts` (first real Zustand usage in this codebase), `components/onboarding/*` (single-choice-step, multi-choice-step, jurisdiction-step, adaptive-question, intake-loading, intake-recovery, intake-review, welcome-step), `lib/jurisdictions-data.ts`, `lib/intake-options-data.ts`, `types/intake.ts`, `app/get-started/page.tsx`, `playwright.config.ts`, `tests/fixtures/intake-scenarios.ts`. Added shadcn `textarea`/`radio-group`/`checkbox` (base-ui style, matching the existing `components.json` convention). Modified `components/site/hero.tsx` (`href="#get-started"` → `href="/get-started"`) — the only landing-page edit, fixing a link that pointed at an element that never existed anywhere in the app.

Two real bugs caught by tests, not by inspection:
1. **Invalid HTML id from unsanitized choice text.** `AdaptiveQuestion`'s radio/checkbox ids were built directly from AI-supplied choice text (e.g. `id="choice-Court opinion"`) — a space in an HTML id attribute breaks the `aria-labelledby` association per spec, which a real accessible-name query caught immediately (`getByRole("checkbox", {name: "Court opinion"})` found nothing). Fixed by switching to index-based ids (`multi-choice-0`, `single-choice-0`, ...).
2. **Ambiguous e2e locator, not a component bug** — the review screen legitimately shows both the factual summary text and the matching answered-question text, so a loose `/jury trial/i` regex matched two elements. This was actually confirmation the component does the right thing (shows both); the test just needed a more specific locator.

Also fixed two more `react-hooks/set-state-in-effect` lint errors during the final verification pass (same class of issue fixed once already in Phase 1's `user-management.tsx`): `AdaptiveQuestion` was resetting local answer state inside the same effect that moves focus — removed the reset entirely and documented that callers must render with `key={question.id}` (React's own recommended pattern for "reset state when a prop changes," used in `app/get-started/page.tsx`) instead of an effect-driven reset.

The deliberate decision to **not** repoint the "For Facilities" → "Request a Facility Demo" button at `/get-started`: that CTA's own copy is about requesting an institutional demo, not starting a personal intake — redirecting it into the guided-intake wizard would be actively misleading, not merely incomplete. Left as a known, documented gap (`docs/behavior/get-started-flow.md`) rather than silently doing something plausible-but-wrong.

### Verification

- `npx vitest run`: **52 test files, 372 tests, all passed** (final run, after this entry was written)
- `npx tsc --noEmit`: clean
- `npx eslint .`: clean
- `npx next build`: clean production build, `/get-started` compiles as a static route, all four `/api/intake/interview/*` routes compile as dynamic routes
- Manual check via `npm run dev`: `/get-started` renders, hero CTA link confirmed pointing at `/get-started`
- `npx playwright test tests/e2e/ai-intake-interview.spec.ts`: **1 passed** — run for real against a live `npm run dev` instance, with the AI interview turns mocked via Playwright's `page.route()` network interception (no production-code test-mode backdoor, no real OpenAI calls)

### Known Limitations

- No in-place editor for a single already-answered Layer-2 question — "Edit" on the review screen returns to Layer 1 and restarts the AI interview from scratch. Documented in `docs/behavior/get-started-flow.md`.
- No "Clear My Session" button surfaced in the UI yet, though the store actions it would call already exist and are tested. Documented in `docs/behavior/shared-device-privacy.md`.
- Local-persistence gating is a single deployment-wide flag, not per-account detection — documented simplification, see `docs/behavior/shared-device-privacy.md`.
- Audit metadata for the intake events is reviewed by hand to confirm it excludes narrative/summary text, but (unlike the general `recordAuditEvent` redaction guard, which *is* directly tested) there's no test specifically asserting this for the `intake_interview_*` action names — worth adding.
- The e2e suite has exactly one spec. The task's fuller Playwright list (institutional lifecycle, deactivation, cross-institution boundary — from Phase 1's original scope) remains written-but-unexecuted per that phase's documented decision; only this phase's new spec was run.

## 2026-07-15 — Database & Prisma foundation

### Expected Behavior

The application needs an authorization/domain database, separate from Clerk (which owns authentication). No password or credential material may ever be stored in it.

### Security Reason

Splitting authentication (Clerk) from authorization (Prisma/Postgres) means this codebase never implements or stores password hashing itself — eliminating an entire class of credential-handling risk — while still giving the app a server-verifiable, tamper-resistant source of truth for role/institution/account-status that the client cannot influence.

### Tests Added

- `tests/integration/db-connectivity.test.ts` — "connects to Postgres and can round-trip a row"

### Implementation

- Created `prisma/schema.prisma`: `Institution`, `Facility`, `User` (no password field), `IntakeSession`, `ResearchRoadmap`, `AuditLog`, plus `UserRole`/`AccountStatus`/`IntakeStatus`/`RoadmapSourceKind`/`AuditOutcome` enums.
- Prisma 7 architectural note: connection URLs no longer live in `schema.prisma`. `prisma.config.ts` holds the direct (`DIRECT_URL`) connection for Migrate; the running app constructs `PrismaClient` with an explicit `@prisma/adapter-pg` driver adapter using the pooled `DATABASE_URL` (`lib/db.ts`). This matches Supabase's recommended split (pooled for app traffic, direct for schema changes).
- First migration (`prisma/migrations/20260715171741_init`) applied directly against Supabase.

### Verification

- `npx vitest run tests/integration/db-connectivity.test.ts` — 1 passed
- Migration applied cleanly against the live Supabase dev database with no errors.

### Known Limitations

- Single Supabase project is used for both "dev" and "test" purposes — see the note in the security-foundation entry below about test database isolation.

---

## 2026-07-15 — Security & authorization foundation

### Expected Behavior

Before any account or route logic exists, the app needs: a reusable rate limiter, a redacting logger, an audit-log writer that can never persist secrets, a password policy that rejects a temporary password from becoming the new password, cryptographically-secure credential generation, and a composable server-side authorization chain (authenticated → active account → password change complete → role → institution → facility) that always re-derives its answer from Prisma rather than trusting client input.

### Security Reason

This is the load-bearing layer everything else in the system depends on. Invariants #2, #6, #8, #9, #10, #11, #12, #13, #18, #23, #29, #34 (see [security-invariants.md](./security-invariants.md)) all trace back to these modules. Building and testing them first, in isolation, means every later feature (institutional accounts, first-login, roadmap generation) can compose them instead of re-implementing auth logic per route.

### Tests Added (all written before their implementation, red → green)

- `tests/unit/security/rate-limit.test.ts` — generic `createRateLimiter`
- `tests/unit/security/legal-sources-rate-limiter.test.ts` — regression test proving the existing `/api/legal-terms/define` limiter is behavior-preserving after being refactored to delegate to the new generic limiter
- `tests/unit/security/safe-logger.test.ts` — key-based redaction, case-insensitive, nested/array-safe, non-mutating
- `tests/integration/audit/audit-log.test.ts` — writes real rows to Postgres; proves secret-shaped metadata keys are redacted even when a caller passes them by mistake
- `tests/unit/auth/password-policy.test.ts` — length bounds, no complexity requirements, blocklist, temp-password-reuse rejection (including case/whitespace variants)
- `tests/unit/auth/generate-credentials.test.ts` — username/temp-password format, uniqueness over 1000 samples, no visually-ambiguous characters, no sequential pattern between consecutive calls
- `tests/unit/auth/authorization.test.ts` — every `require*` pure function, including the explicit "a user cannot use a client-declared role to pass this check" case
- `tests/integration/authorization/load-app-user.test.ts` — `loadAppUserByClerkId` and the composed `authorize()` against real Postgres rows, including cross-institution rejection and must-change-password taking priority over role/institution checks

### Implementation

Created:
- `lib/security/rate-limit.ts` — generic `createRateLimiter({windowMs, max})`
- `lib/security/safe-logger.ts` — `redact()` + `safeLog()`
- `lib/security/audit-log.ts` — `recordAuditEvent()`, built on `redact()`
- `lib/auth/password-policy.ts` — `firstLoginPasswordSchema` (Zod), `isCommonPassword()`
- `lib/auth/generate-credentials.ts` — `generateUsername()`, `generateTemporaryPassword()` (Node `crypto.randomInt`, not `Math.random`)
- `lib/auth/authorization.ts` — `AppUser`, `loadAppUserByClerkId`, `requireActiveAccount`, `requirePasswordChangeComplete`, `requireRole`, `requireInstitutionAccess`, `requireFacilityAccess`, composed `authorize()`, and the Clerk-`auth()`-calling entry point `requireAuthenticatedUser()`

Modified:
- `lib/legal-sources/rate-limiter.ts` — now a thin wrapper over `lib/security/rate-limit.ts` instead of duplicating the sliding-window logic; the exported `isRateLimited(clientId)` signature is unchanged so `app/api/legal-terms/define/route.ts` needed no changes.

Architectural decision: authorization functions take a verified Clerk user id as a plain parameter rather than calling `auth()` internally wherever possible (`authorize()`, `loadAppUserByClerkId()`, all `require*` functions). Only `requireAuthenticatedUser()` calls Clerk's `auth()`, and it's a one-line wrapper around `authorize()`. This makes the entire authorization chain unit/integration-testable without mocking HTTP or Clerk.

### Verification

- `npx vitest run` (full suite so far): **9 test files, 62 tests, all passed**
- `type-check`/`lint`/`build` not yet run for the whole project — deferred to the final verification pass once more of the app exists, per the plan.

### Known Limitations

- Integration tests run against the same Supabase project used for local development, not a fully isolated test database. Tests use uniquely-suffixed fixture data and clean up in `afterEach`/`afterAll`, and never touch unrelated rows, but this is not true isolation (e.g. two test runs racing concurrently could theoretically interact). Recommended follow-up: provision a dedicated Supabase (or local Postgres) instance for `DATABASE_URL`/`DIRECT_URL` in CI and test-only `.env.test`.
- `requireActiveAccount`'s Clerk-side ban/lock defense-in-depth (banning the Clerk user when Prisma marks them `DISABLED`/`LOCKED`) is designed but not yet implemented — it lands with institutional account lifecycle management.

---

## 2026-07-15 — Individual-user Clerk↔Prisma sync via webhook

### Expected Behavior

When someone signs up through Clerk's existing email/Google flow, a Prisma `User` row (`role=INDIVIDUAL`, `accountStatus=ACTIVE`, `mustChangePassword=false`) must exist for them without any client-facing endpoint being able to create or influence that row — since a client-facing "create my user row with role X" endpoint would let a caller choose their own role.

### Security Reason

This closes the gap between "Clerk knows about a user" and "Prisma (the authorization source of truth) knows about a user." Doing it via a signature-verified webhook rather than lazily-on-request avoids a race where a freshly-signed-up user hits a protected route before any row exists, and avoids ever exposing a "create my own authorization row" endpoint to the browser.

### Tests Added

- `tests/integration/auth/sync-clerk-user.test.ts` — creates a row for a new Clerk id; is idempotent (no duplicate row) on a simulated webhook retry; critically, does **not** overwrite an institution-created user's role/institution/mustChangePassword if the webhook for their account arrives after staff already created their row synchronously
- `tests/integration/auth/clerk-webhook-route.test.ts` — signs real payloads with `svix`'s `Webhook.sign()` (the same primitive Clerk's `verifyWebhook` verifies against) to prove: a forged/invalid signature is rejected (400, no row created), a request missing signature headers entirely is rejected, a validly-signed `user.created` event creates the row, and non-`user.created` events are acknowledged without side effects

### Implementation

- `lib/auth/sync-clerk-user.ts` — `syncIndividualUserFromClerk()`, a Prisma `upsert` with an empty `update: {}` so it's a true no-op against an existing row
- `app/api/webhooks/clerk/route.ts` — verifies the webhook via `verifyWebhook` from `@clerk/nextjs/webhooks` (rejects with 400 on failure, logs via `safeLog` rather than a raw `console.error`) before touching the database
- `proxy.ts` — switched from an unconditional `clerkMiddleware()` to `clerkMiddleware(async (auth, req) => { if (isProtectedRoute(req)) await auth.protect() })` with an **opt-in** `createRouteMatcher` covering only `/first-login`, `/institution/dashboard(.*)`, `/institution/users(.*)` — this is deliberately an allowlist (routes that require protection) rather than a denylist (routes to exclude), so the webhook route and every other route stay reachable by default without needing an explicit exclusion, and so a newly-added protected route is protected by the code that creates it, not by remembering to also touch proxy.ts everywhere.

### Verification

- `npx vitest run` — **11 test files, 69 tests, all passed**

### Known Limitations

- `CLERK_WEBHOOK_SIGNING_SECRET` is not yet registered in the live Clerk Dashboard (that requires a publicly-reachable URL — e.g. a deployed environment or a tunnel — which this session doesn't have). The route and its signature verification are fully implemented and tested against locally-signed payloads; wiring the real Dashboard endpoint + secret is an infrastructure step for whoever deploys this.

---

## 2026-07-15 — Institutional account lifecycle (create, list, reset password, deactivate/reactivate)

### Expected Behavior

Institution staff (role `INSTITUTION_ADMIN`) can create institution-managed accounts (username + system-generated or staff-supplied temporary password, no email/phone ever sent to Clerk), list/search/filter their own institution's users, reset a user's temporary password (no forgot-password email flow exists for this population), and deactivate/reactivate accounts — all strictly scoped to the staff member's own institution, with the scope always derived server-side.

### Security Reason

This is where invariants #3, #4, #9, #21, #23, #28, #30, #31 become real, working code instead of a plan. The single highest-risk mistake this phase could make is trusting a client-supplied `institutionId` — every module and route here derives it from the authenticated staff member's own Prisma row instead, and there are tests that specifically try to smuggle a different institution's id through the request body/query string to prove it's ignored.

### Tests Added

- `tests/unit/auth/institution-schema.test.ts` — Zod schema restricts assignable roles to the three non-admin roles, strips a client-supplied `institutionId`
- `tests/unit/auth/authorization-http.test.ts` — authorization-failure → HTTP status/body mapping, including that `unauthenticated`/`account-not-found` and the three `forbidden-*` reasons each collapse to one generic response
- `tests/integration/institution/create-user.test.ts` — Clerk call receives only `{username, password}` (never email/phone), Prisma row lands `PENDING_FIRST_LOGIN`/`mustChangePassword:true`, disallowed roles and taken usernames are rejected before any Clerk call, a facility from another institution is rejected, audit event excludes the temporary password
- `tests/integration/institution/reset-user-password.test.ts` — new temp password generated, account returned to `PENDING_FIRST_LOGIN`, cross-institution reset rejected, audit event excludes the password
- `tests/integration/institution/change-user-status.test.ts` — deactivate bans the Clerk user (defense in depth), reactivate unbans and correctly chooses `ACTIVE` vs `PENDING_FIRST_LOGIN` depending on whether a password change is still owed, cross-institution rejected, distinct audit actions per direction
- `tests/integration/institution/list-users.test.ts` — institution scoping, role/status/facility filters, username search, pagination, and that the query projection never includes `clerkUserId`
- `tests/integration/institution/users-route.test.ts`, `users-list-route.test.ts`, `user-detail-routes.test.ts` — full route-level auth gating (401 unauthenticated, 403 non-admin, 403 must-change-password-first), request validation, and — the key test — that a client-supplied `institutionId` in either the POST body or the GET query string is never passed through to the service layer

### Implementation

Created:
- `lib/institution/institution-schema.ts`, `lib/institution/create-user.ts`, `lib/institution/reset-user-password.ts`, `lib/institution/change-user-status.ts`, `lib/institution/list-users.ts`
- `app/api/institution/users/route.ts` (GET list, POST create), `app/api/institution/users/[id]/route.ts` (PATCH status), `app/api/institution/users/[id]/reset-password/route.ts` (POST)

Architectural decision, continuing the pattern from the auth foundation: every function that calls Clerk's Backend API (`createInstitutionUser`, `resetInstitutionUserPassword`, `changeInstitutionUserStatus`) takes its Clerk-calling function as an injectable dependency with a real default implementation. This is what makes it possible to test the full business logic (including the negative/rejection paths) against a real Postgres database without ever creating a live Clerk user or banning a real account during a test run — the earlier attempt to `clerk users create` directly from the CLI to check instance config was correctly blocked as an unrequested mutation of shared infrastructure, and this dependency-injection pattern avoids automated tests ever doing the equivalent by accident, every time `npm test` runs (including in CI).

### Verification

- `npx vitest run` — **20 test files, 124 tests, all passed**

### Known Limitations

- No bulk/CSV account import (mentioned in the planning docs as a future capability) — this build only supports one-at-a-time creation, matching the task's required API surface.
- No facility-scoped (as opposed to institution-scoped) staff role exists yet — `requireFacilityAccess` is implemented and unit-tested, but no route currently calls it, since only `INSTITUTION_ADMIN` performs these actions in this build.
