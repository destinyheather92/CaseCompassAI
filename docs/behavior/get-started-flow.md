# Get Started Flow

## Purpose

`/get-started` builds a legal research roadmap for one **matter** at a time (see `docs/behavior/matters.md`). As of 2026-07-22 it always requires a real, signed-in account — the original "guests may complete the entire interview" design has been superseded; see `docs/behavior/ai-intake-interview.md`'s privacy-behavior section for that history.

`app/get-started/page.tsx` is now an async **Server Component** whose only job is the auth gate:

```ts
const authResult = await requireAuthenticatedUser();
if (!authResult.ok) {
  if (authResult.reason === "unauthenticated" || authResult.reason === "account-not-found") {
    return <AuthRequiredModal redirectTo="/get-started" message="..." />;
  }
  redirect(authResult.redirectTo);
}
```

An unauthenticated visit shows `components/auth/auth-required-modal.tsx` (a real, accessible dialog — not a silent redirect) with "Log In" / "Create Account" links, each carrying `?redirect_url=/get-started` so the visitor lands back here — not the homepage — once authenticated (`lib/auth/safe-redirect.ts` validates that param is always an internal path, never an open redirect). The modal also offers an upper-right close button and a "Back to Home" link; closing it by any means (X, Escape, backdrop click, Back to Home) simply navigates the visitor to `/` — it never traps them and never begins intake. Every other failure reason (disabled account, must-change-password, etc.) keeps the previous hard-redirect behavior, since those represent a real account that needs something else first, not "you're not logged in."

The actual interactive wizard lives in `components/onboarding/get-started-wizard.tsx` (`GetStartedWizard`) — a client component the page renders only once authentication has passed. A `?matterId=` search param, when present and owned by the caller (`requireOwnedMatter`), threads through to `POST /api/intake/interview/start` so the intake attaches to that matter instead of creating a new one — this is how the dashboard's "New Matter" button and "Continue Intake" links on an existing matter both work through the same wizard.

## Steps

1. **Welcome** — disclaimer copy, and (when local persistence found saved progress) "Continue where I left off" / "Start over" instead of silently discarding it.
2. **Case Type** (Layer 1, deterministic) — `components/onboarding/single-choice-step.tsx`.
3. **Jurisdiction** (Layer 1) — `components/onboarding/jurisdiction-step.tsx`; all 50 states + DC + Federal + Not Sure, stable value codes (`lib/jurisdictions-data.ts`).
4. **Procedural Stage** (Layer 1) — single-choice.
5. **Research Goals** (Layer 1) — multi-choice.
6. **Document Types** (Layer 1) — multi-choice; "Not yet" is exclusive with every other option (`stores/use-intake-store.ts`'s `toggleDocumentType`).
7. **AI Interview** (Layer 2) — see `docs/behavior/ai-intake-interview.md`. One question at a time, `components/onboarding/adaptive-question.tsx` switches control type by `answerType`.
8. **Review** — factual summary, unresolved items, prior Q&A, required acknowledgement checkbox before Confirm is enabled.
9. **Confirm → roadmap generation** — since every wizard visit is now authenticated, Confirm always calls `POST /api/dashboard/roadmap/generate` immediately (no guest dead-end "You're ready" screen anymore) and redirects straight to `/dashboard/roadmaps/[roadmapId]` on success, or shows a "Your intake is saved" recovery screen with Try Again / Return to Dashboard if generation fails — the intake itself is never lost.

## State management

`stores/use-intake-store.ts` (Zustand) holds all of the above client-side: Layer 1 field values, current step, session id, current AI question, answered-turn history, loading/error state. Errors set via `setError` never clear any other field — that's what makes "answers preserved after failure" true; it's a plain object merge, not a reset.

Local persistence is a single deployment-wide flag (`NEXT_PUBLIC_INSTITUTION_LOCAL_PERSISTENCE`), not per-account detection — see `docs/behavior/shared-device-privacy.md` for why, and for the documented simplification this represents relative to the fuller per-account design in the original spec.

## Editing

The Review screen's "Edit" control returns to the Case Type step with every Layer 1 field still populated (the store isn't cleared) — the user can change any Layer 1 answer and walk back through to Document Types, which re-submits to `/api/intake/interview/start` and begins a fresh Layer 2 interview reflecting the edit. There is currently no in-place editor for a single already-answered Layer 2 question; see the "Known Limitations" note in `docs/behavior/implementation-log.md`'s AI-intake-interview entries.

## Landing page entry points

The hero's "Build My Research Roadmap" button links to `/get-started`. The homepage's two demo-video buttons ("Watch 60 Second Demo" in the hero, "Watch Facility Demo" in the For Facilities section) open `components/site/demo-video-modal.tsx` rather than navigating anywhere — see `docs/demos/README.md` for how those recordings are produced. The For Facilities section's real registration CTA (`facilitiesContent.cta` → `/institution/register`) is unchanged and was deliberately preserved rather than replaced by the new demo button.
