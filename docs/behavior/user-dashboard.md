# User Dashboard

## Purpose

The authenticated dashboard (`/dashboard` and its sub-routes) is the private home base for a signed-in user's own research: intake status, roadmap progress, saved items, recent activity, and account/privacy controls. It is strictly single-tenant per user — there is no shared or aggregate view here, unlike the institution dashboard (which shows account status only, never research content).

## Routes

| Route | Purpose |
|---|---|
| `/dashboard` | Overview: research status, active intake summary, timeline, unresolved info, active roadmap progress, relevant legal terms, recommended resources, recent activity, disclaimer |
| `/dashboard/intakes/[intakeId]` | Full detail for one intake the user owns |
| `/dashboard/roadmaps/[roadmapId]` | Full roadmap detail with per-step progress controls |
| `/dashboard/research` | History of all of the user's intakes and roadmaps |
| `/dashboard/saved` | Saved resources/terms/notes, with remove |
| `/dashboard/settings` | Account info, Clear My Session, legal notice |

## Authentication & authorization

- `proxy.ts` gates `/dashboard(.*)` as a coarse first pass (redirects an unauthenticated browser before it renders anything), but this is never treated as sufficient on its own — every dashboard layout/page independently calls `requireDashboardAccess()` (`lib/auth/dashboard-authorization.ts`), which is `requireAuthenticatedUser()` with no role restriction: any authenticated, active, password-complete user (individual, institution-managed, staff) has a dashboard, since everyone has their own personal research to manage.
- **Ownership, not role, gates resource access.** `requireOwnedIntake`/`requireOwnedRoadmap`/`requireOwnedSavedItem` check `resource.userId === actorUser.id` directly. Institution staff (`INSTITUTION_ADMIN`) get **no automatic access** to another user's private research through these paths — the institution dashboard (separate route tree) remains aggregate-status-only.
- **A missing or someone-else's-resource both resolve to `not-found`, never `forbidden`.** This is deliberate: a client should not be able to distinguish "that intake doesn't exist" from "that intake exists but isn't yours" by response shape or HTTP status. `app/dashboard/intakes/[intakeId]/page.tsx` and `app/dashboard/roadmaps/[roadmapId]/page.tsx` both call Next's `notFound()` (renders the framework's standard 404) on an ownership-check failure — there is no separate "access denied" page that would leak existence.

## Data flow (read side)

All dashboard read paths are one-file-per-concern services under `lib/dashboard/`, each scoped to `userId` via a Prisma `WHERE` clause (never a post-filter over a broader query):

- `get-dashboard-overview.ts` — the single aggregation used by the overview page: most-recently-updated intake + roadmap, computed `ResearchStatus`, primary next action, timeline, unresolved info, legal term previews, recommended resources, recent activity, disclaimer.
- `get-user-intakes.ts` / `get-user-roadmaps.ts` / `get-user-activity.ts` / `get-user-saved-items.ts` — full per-user lists, used by the history/saved pages.
- `get-intake-detail.ts` / `get-roadmap-detail.ts` — single-resource detail views, both ownership-checked via `requireOwnedIntake`/`requireOwnedRoadmap` and returning `{status:"not-found"}` rather than throwing or exposing another user's data.

### Research status

`lib/dashboard/research-status.ts` computes a `ResearchStatus` (`not-started | intake-in-progress | ready-for-review | intake-confirmed | roadmap-generated | research-in-progress | roadmap-completed`) purely from server-loaded intake/roadmap state — never from anything the client claims. `primaryActionFor()` turns that status into exactly one next action (label + href), so the UI never has to duplicate this branching logic.

### Timeline: user-provided facts only, never invented dates

`lib/dashboard/timeline-mapper.ts` builds the intake timeline **only** from confirmed `IntakeAnswer` rows:

- An answer with `answerType === "date"` becomes an exact timeline entry only if it parses as a strict `YYYY-MM-DD` string; otherwise it's labeled "Date not provided" rather than guessed at.
- Other answers are included only if the question text reads as timing-relevant (a small keyword list — "when", "trial", "sentenc", "hearing", etc.), and always as an approximate "Date not provided" entry, never a fabricated date.
- "I don't know" answers are excluded outright — they carry no timeline-worthy fact.
- Nothing here is AI-inferred; it is a pure function over what the user actually typed.

### Legal terms & recommended resources

- `lib/dashboard/legal-terms-for-intake.ts` selects a small, case-type-keyed list of real curated-glossary term names, then looks each one up through the existing `lookupLegalTerm` retrieval-first service (never generates a definition inline). A term that isn't found is silently omitted — this section is a bonus, not a critical path.
- `lib/dashboard/resource-recommendations.ts` is a deterministic rules table over case type/jurisdiction/document types, reusing the existing `resourcesRegistry` (`lib/resources-data.ts`) as the single source of truth for resource metadata — no duplication, no AI, capped at 3 recommendations, never a duplicate slug.

## Roadmap generation & progress

- `lib/roadmap/create-roadmap-from-intake.ts` only accepts a `COMPLETED` intake — matching `completeIntakeSession`'s own invariant that roadmap generation must never be triggered by the AI reaching `intake-complete` on its own, only by the user's explicit confirmation. Content comes from the existing deterministic generator (`generateDeterministicRoadmap`, `sourceKind: "DETERMINISTIC_FALLBACK"`, `confidence.level: "low"` — no AI roadmap provider is configured) and is re-validated against `ResearchRoadmapContentSchema` before persisting, even though the deterministic path is trusted, so a future AI-generated path inherits the same guardrail for free.
- `lib/roadmap/update-roadmap-progress.ts` upserts a `RoadmapProgress` row keyed by `(userId, roadmapId, stepId)`. It never modifies `ResearchRoadmap.content` — progress is tracking data layered on top of the immutable generated content. A `stepId` that doesn't exist in the roadmap's own `content.steps` is rejected (`invalid-step`), so progress can't be recorded against a step that was never actually generated. Moving a step's status away from `not-started` sets `startedAt` (once, preserved across further updates); reaching `completed` sets `completedAt`; moving back to `not-started` clears both. `ROADMAP_STEP_STARTED`/`ROADMAP_STEP_COMPLETED` activity events fire once per transition, not on every no-op re-save of the same status.

## Saved items

`lib/saved/save-resource.ts` / `remove-saved-resource.ts` back `POST /api/dashboard/saved-resources` and `DELETE /api/dashboard/saved-resources/[savedItemId]`. A `(userId, resourceType, resourceKey)` unique constraint at the database level (not just application logic) prevents duplicate saves; a repeat save request returns `already-saved` rather than erroring or silently duplicating. `href` values are validated against a pattern that only allows relative internal paths or `https://` external URLs — `javascript:`/`data:`/plain-`http://` are all rejected at the Zod boundary, since a saved href is later rendered as a real link.

## Activity feed

`UserActivity` (distinct from `AuditLog`, which is the security/ops trail) is a small, deliberately-restricted allowlist of safe, UI-facing event types (`lib/activity/approved-activity-events.ts`). `recordUserActivity()`:

- Silently no-ops for any event type not on the allowlist — activity logging must never be able to crash the flow that triggered it.
- Hard-caps `title`/`description` length (200/300 chars) so a caller can never accidentally store a full case narrative here.
- Runs `metadata` through the same `redact()` guard used by `safeLog`/`recordAuditEvent` — reused, not reimplemented — so a stray `password`/`token`/`description` key in metadata is redacted before it's ever persisted.

## Shared-device privacy: "Clear My Session"

`lib/client/user-scoped-storage.ts` namespaces every CaseCompass client storage key under a single `casecompass` prefix (including the pre-existing Zustand intake-store key, `casecompass-intake-v1`). `clearAllLocalSessionData()` — wired to the "Clear My Session" control (`components/dashboard/clear-session-button.tsx`, present in the sidebar, mobile nav, and Settings page) — removes every one of those keys from both `localStorage` and `sessionStorage` unconditionally, regardless of the `NEXT_PUBLIC_INSTITUTION_LOCAL_PERSISTENCE` flag (stale data can predate a flag change), then signs the user out via Clerk and redirects home. It clears local data and signs out **even if** the server-side `POST /api/dashboard/clear-session` audit notification fails — the privacy action itself must never be blocked by a network error. The control requires an explicit two-step confirm (not a single click), since it signs the user out.

## Legal terms, disclaimers, and "not legal advice"

Every roadmap and the dashboard overview itself carry the same non-negotiable disclaimer text (`lib/resources-constants.ts`'s `RESOURCE_DISCLAIMER`, reused rather than restated) — CaseCompass provides general legal education and research guidance, not legal advice, and creates no attorney-client relationship. The deterministic roadmap generator additionally emits its own `safetyNotes` and a `confidence.level: "low"` marker on every generated roadmap, since none of this content has been reviewed by a person or a real AI provider.

## Post-intake-confirmation redirect

Per the account-type-aware redirect requirement: once an intake is confirmed complete on `/get-started`, a signed-in user (individual or institution-managed — both) sees a "Go to Dashboard" link to `/dashboard`; a guest sees the pre-existing "Return to Home" link to `/`. The decision is made client-side via Clerk's `useAuth()` `isSignedIn` flag — this is a UX convenience only, not a security boundary, since `/dashboard` re-authenticates independently regardless of how the user arrived there.
