# Product Demo Videos

Two short screen recordings of the real, running application — not mockups — embedded on the homepage behind the "Watch 60 Second Demo" (individual) and "Watch Facility Demo" (institutional) buttons via `components/site/demo-video-modal.tsx`.

Both are produced by Playwright driving a real Chromium browser against a real local dev server and real Clerk authentication. As of 2026-07-22, the individual demo additionally uses two clearly-labeled speed-up techniques so it can hit a ~60-second target instead of the earlier, un-paced 2:41 recording — see "Demo-only speed-ups" below. **Nothing about the real production app was weakened or shortened to achieve this** — only the recording flow.

## Files

| Video | Recording script | Output |
|---|---|---|
| Individual user demo | `scripts/demos/individual-demo.ts` | `public/demos/individual-user-demo.mp4` |
| Facility demo | `scripts/demos/facility-demo.ts` | `public/demos/facility-demo.mp4` |

`scripts/demos/prep-individual-account.ts` creates the demo account the individual recording logs in as, and — unlike the facility script — also drives one **real, off-camera** intake → roadmap → case-detail cycle ("Matter 1") before the recording starts, so the on-camera recording can open on an already-populated dashboard. The facility demo needs no separate prep step: `/institution/register` itself issues real admin credentials on screen, which the script reads directly off the page and uses immediately.

## Prerequisites

- `npm run dev` running against `http://localhost:3000` (both scripts hit the real dev server; neither auto-starts it).
- `COURTLISTENER_API_TOKEN` and `CASE_SEARCH_PROVIDER=courtlistener` set in `.env.local` if you want the individual demo's "Cases to Research" section to show real results.
- `OPENAI_API_KEY` set — the prep script drives one real AI interview turn off-camera.
- `ffmpeg-static` (already an installed devDependency) — Playwright's own bundled ffmpeg is a stripped-down build with no `libx264`/mp4 muxer, so this project's own full-featured ffmpeg binary is what actually produces the `.mp4`.

## Regenerating the individual demo

```bash
npx tsx scripts/demos/prep-individual-account.ts   # creates a fresh demo account + one real, pre-warmed matter (once per recording)
npx tsx scripts/demos/individual-demo.ts           # records + transcodes to public/demos/individual-user-demo.mp4
```

The prep script must be re-run before each recording attempt — it produces a fresh account plus `scripts/demos/.artifacts/individual-credentials.json` and `individual-demo-meta.json` (the pre-warmed matter/roadmap/case IDs the recording script reads).

## Regenerating the facility demo

```bash
npx tsx scripts/demos/facility-demo.ts
```

No prep step — every run registers a brand-new demo facility (the script appends a timestamp suffix to the facility name/contact email so re-runs never collide with a previous demo facility).

## What each recording shows

**Individual demo** (`individual-demo.ts`): homepage -> "Build My Research Roadmap" while logged out -> the auth-required modal (`AuthRequiredModal`, since intake now always requires login) -> real login via the demo account's real credentials -> the authenticated dashboard, already showing Matter 1 (prepared off-camera) -> New Matter (a real second matter, named live on camera) -> a condensed real intake (Layer 1 questions + a demo-mocked single-turn AI interview, see below) -> review/confirm -> the real, freshly generated roadmap for the new matter -> Matter 1's real roadmap (Cases to Research) -> Matter 1's real, pre-warmed case detail page (source attribution + AI-labeled plain-language explanation) -> back to the dashboard, now showing both matters.

**Facility demo** (`facility-demo.ts`): homepage facilities section -> `/institution/register` filled with sample (fictional) facility information -> issued admin username/temporary password shown on screen -> `/institution/login` -> mandatory first-login password change -> the institution (facility-admin) dashboard -> Manage Users -> Create User (an institutional/incarcerated-user account) -> issued user credentials shown on screen. The institution nav visible throughout never offers a "Get Started"/personal-intake link — that's the on-screen proof that a facility administrator never builds a roadmap for the institution itself (enforced server-side too, see `docs/behavior/institutional-accounts.md` and security invariant #63).

## Demo-only speed-ups (individual demo only — never in production code)

1. **Network-boundary mocking of the AI interview.** `individual-demo.ts`'s `mockIntakeInterview(page)` intercepts only `/api/intake/interview/start` and `/api/intake/interview/answer` via Playwright's `page.route()` — the same technique `tests/e2e/ai-intake-interview.spec.ts` already uses — and returns one fixed question/answer round-trip instead of waiting on real OpenAI latency. This affects nothing except the bytes this one recording's browser receives; the real, unmocked interview can still ask as many adaptive questions as it needs in actual use.
2. **Pre-warmed seeded content.** `prep-individual-account.ts` completes one real intake → roadmap → case-detail cycle off-camera first, so the case's AI-generated explanation (`CaseExplanationRecord`) is already cached by the time the recording visits it — avoiding a slow, live OpenAI call happening on camera.

Everything else in the recording — login, matter creation, roadmap generation for the newly created matter, the CourtListener case search, the case source-attribution panel — is real, unmocked application behavior, just paced quickly (`pause()` calls in the 300–2000ms range rather than the earlier recording's longer holds).

## Known limitations

- Neither script has a fallback for a Clerk hosted-component UI change (e.g. if Clerk changes the identifier/password field labels or button text) — a script failure will show exactly which selector broke; fix the selector and re-run rather than assuming the underlying feature is broken.
- The individual demo's case-search step depends on `CASE_SEARCH_PROVIDER` being configured for the prep script's off-camera warm-up to have real cases to show.
- Demo accounts created by these scripts are real rows in whatever database `DATABASE_URL` points to — clean them up manually if you don't want them lingering in a shared dev database.
- Actual recorded duration should always be measured (`ffprobe`/`ffmpeg -i`) after regenerating — the ~60s target is a pacing goal for the script, not a guarantee, since real page loads and real network calls (login, roadmap generation, case search) add some unpredictable time on top of the scripted waits.
