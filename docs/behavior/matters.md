# Matters (Multiple Legal Matters per Individual User)

## Purpose

An individual (or institutional-inmate) user can now research more than one distinct legal issue without the data mixing together. Each is a **Matter** — the unit that an intake, a generated roadmap, saved cases, and saved resources are grouped under.

## Schema (`prisma/schema.prisma`, migration `20260722000000_add_matters`)

```prisma
model Matter {
  id           String   @id @default(cuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  title        String
  caseNumber   String?
  court        String?
  jurisdiction String?
  matterType   String?
  status       MatterStatus @default(ACTIVE)  // ACTIVE | COMPLETED | ARCHIVED
  intakeSessions IntakeSession[]
  roadmaps       ResearchRoadmap[]
  savedResources SavedResource[]
  savedCases     SavedCase[]
}
```

`matterId` was added as an **optional, additive** foreign key to `IntakeSession`, `ResearchRoadmap`, `SavedResource`, and `SavedCase` — the pre-existing `userId` column on every one of these models was deliberately **kept, not removed**. This was a safety-first design choice:

- Every existing ownership check (`requireOwnedIntake`, `requireOwnedRoadmap`, `requireOwnedSavedItem`, `requireOwnedSavedCase` in `lib/auth/dashboard-authorization.ts`) still does `resource.userId !== user.id` and needed **zero changes** — a matter-scoped row's `userId` always still correctly identifies its owner, matter grouping or not.
- `RoadmapProgress` was left alone entirely — its ownership already flows transitively through `roadmapId → ResearchRoadmap.matterId`, so no direct `matterId` column was needed there.
- `SavedResource`/`SavedCase` each gained a **second** unique constraint (`[matterId, ...]`) alongside the original `[userId, ...]` one, rather than replacing it — Postgres treats every `NULL` in a unique index as distinct, so rows saved outside any matter context (`matterId: null`, e.g. a glossary term saved from the general Resources pages) are still deduplicated per-user by the original constraint, while matter-scoped saves are deduplicated per-matter by the new one. The same case or resource can therefore be saved once per matter without colliding across matters.

## Backfill (`scripts/backfill-matters.ts`)

A one-time, idempotent script: for every user with any pre-existing intake/roadmap/saved-resource/saved-case row and no matter yet, it creates one default Matter ("My First Matter") and reattaches all of that user's existing rows to it. Run once during this migration (confirmed: 6 users backfilled in the dev database, all pre-existing data preserved — nothing deleted). Safe to re-run — it only ever touches rows where `matterId IS NULL`.

## Creating and using a matter

- `POST /api/matters` (`lib/matters/create-matter.ts`) creates an empty matter for the caller. No title → `generateDefaultMatterTitle()` (`lib/matters/matter-title.ts`) picks a neutral default: a case-number-derived title if known, else a jurisdiction-derived one ("South Carolina Matter"), else a sequential fallback ("Matter 1", "Matter 2", ...).
- The dashboard's "New Matter" button (`components/dashboard/matters-list.tsx`) calls this, then redirects to `/get-started?matterId=<id>`.
- `startIntakeSession` (`lib/intake/start-intake-session.ts`) now requires a real `actor.userId` (no longer nullable) and accepts an optional `actor.matterId`: if given (and already ownership-verified by the caller — see the route below), it's reused; if omitted, a new matter is created automatically, so a direct visit to `/get-started` with no `matterId` in the URL still works.
- `POST /api/intake/interview/start` never trusts a client-supplied `matterId` at face value — it's checked via `requireOwnedMatter` first; an invalid/foreign id is silently dropped (falls back to creating a fresh matter) rather than erroring.
- `createRoadmapFromIntake` (`lib/roadmap/create-roadmap-from-intake.ts`) copies `intake.matterId` onto the created `ResearchRoadmap` — a roadmap always belongs to the same matter as the intake it came from.
- `saveCase` derives `matterId` from the roadmap it was saved from (`requireOwnedRoadmap(...).resource.matterId`), never from client input directly — a standalone case save (no `roadmapId`) has no matter context and stays `null`.

## Dashboard UI

`components/dashboard/matters-list.tsx` (`MattersList`) is the primary multi-matter navigation surface, added to `app/dashboard/page.tsx` above the existing single-thread "Overview" section (which is now labeled "most recently updated matter" for clarity, rather than removed or duplicated). Each matter card shows title, case number, court/jurisdiction, matter type, status badge, intake-progress bar (when intake isn't complete yet), last-updated date, and a single primary-action button whose label/href is computed by `lib/dashboard/research-status.ts`'s existing `computeResearchStatus`/`primaryActionFor` — applied **per matter** now (`lib/matters/list-matters.ts`) instead of once per account, so each matter's card always reflects only that matter's own intake/roadmap progress, never another matter's.

The empty state (`components/dashboard/dashboard-empty-state.tsx`) reads: *"You have not created a matter yet. Start a new matter to build your personalized legal research roadmap."*

## Authorization

`requireOwnedMatter(matterId, user)` (`lib/auth/dashboard-authorization.ts`) follows the exact same pattern as every other `requireOwned*` function: returns `not-found` (never `forbidden`) for a matter that exists but belongs to someone else, so a client can never distinguish "not yours" from "doesn't exist" by response shape. Changing a `matterId` in a URL or request body cannot expose another user's matter — every entry point that accepts one (`/get-started?matterId=`, `POST /api/intake/interview/start`) verifies ownership server-side before using it.

## Role scope

Matters apply to whichever roles can reach `/get-started` and generate a roadmap today — `INDIVIDUAL` and `INCARCERATED_USER` — since both already share the exact same intake/roadmap code path (no separate system was built for either). `INSTITUTION_ADMIN` accounts are blocked from creating an intake at all (`isInstitutionAdministrationRole` check in the start route, invariant #63) and therefore never have matters — enforced the same way before this change, unaffected by it.

## Known limitations

- `SavedResource` saves made outside a matter's roadmap context (e.g. a glossary term saved from the general Resources pages) stay account-wide (`matterId: null`), not matter-scoped — this was a deliberate scope decision given the time available, not an oversight; wiring every save call site to a specific matter would require passing matter context through several more components.
- There is no dedicated "matter detail" page — opening a matter routes to its existing intake or roadmap detail page (whichever `primaryActionFor` recommends), reusing already-tested, already-secured pages rather than building a parallel one.
- A matter's `status` (`ACTIVE`/`COMPLETED`/`ARCHIVED`) is set at creation and by seed data, but there is no UI yet for a user to explicitly mark a matter completed or archive it — it currently only reflects the initial value.
