# Get Started Flow

## Purpose

`/get-started` is the single entry point for building a legal research roadmap, for both guests and authenticated users (individual or institution-managed). It intentionally does not require an account up front.

## Steps

1. **Welcome** — disclaimer copy, and (when local persistence found saved progress) "Continue where I left off" / "Start over" instead of silently discarding it.
2. **Case Type** (Layer 1, deterministic) — `components/onboarding/single-choice-step.tsx`.
3. **Jurisdiction** (Layer 1) — `components/onboarding/jurisdiction-step.tsx`; all 50 states + DC + Federal + Not Sure, stable value codes (`lib/jurisdictions-data.ts`).
4. **Procedural Stage** (Layer 1) — single-choice.
5. **Research Goals** (Layer 1) — multi-choice.
6. **Document Types** (Layer 1) — multi-choice; "Not yet" is exclusive with every other option (`stores/use-intake-store.ts`'s `toggleDocumentType`).
7. **AI Interview** (Layer 2) — see `docs/behavior/ai-intake-interview.md`. One question at a time, `components/onboarding/adaptive-question.tsx` switches control type by `answerType`.
8. **Review** — factual summary, unresolved items, prior Q&A, required acknowledgement checkbox before Confirm is enabled.
9. **Complete** — confirms the session is ready; roadmap generation is a separate, later system (not built in this phase).

## State management

`stores/use-intake-store.ts` (Zustand) holds all of the above client-side: Layer 1 field values, current step, session id, current AI question, answered-turn history, loading/error state. Errors set via `setError` never clear any other field — that's what makes "answers preserved after failure" true; it's a plain object merge, not a reset.

Local persistence is a single deployment-wide flag (`NEXT_PUBLIC_INSTITUTION_LOCAL_PERSISTENCE`), not per-account detection — see `docs/behavior/shared-device-privacy.md` for why, and for the documented simplification this represents relative to the fuller per-account design in the original spec.

## Editing

The Review screen's "Edit" control returns to the Case Type step with every Layer 1 field still populated (the store isn't cleared) — the user can change any Layer 1 answer and walk back through to Document Types, which re-submits to `/api/intake/interview/start` and begins a fresh Layer 2 interview reflecting the edit. There is currently no in-place editor for a single already-answered Layer 2 question; see the "Known Limitations" note in `docs/behavior/implementation-log.md`'s AI-intake-interview entries.

## Landing page entry point

The hero's "Build My Research Roadmap" button now links to `/get-started` (previously `href="#get-started"`, which pointed at an element that didn't exist anywhere in the app, so it silently did nothing). The "For Facilities" section's "Request a Facility Demo" button was deliberately **not** repointed to `/get-started` — it's a distinct institutional contact/demo-request call to action, and no such contact flow exists yet in this build; redirecting it into the personal intake wizard would mislead facility visitors. It remains a dead anchor, documented here as a known gap rather than silently "fixed" into something incorrect.
