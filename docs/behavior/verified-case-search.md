# Verified Case Search

## Purpose

"Cases to Research" and "Find Additional Cases" help a user locate judicial opinions that may be educationally relevant to their roadmap. This is retrieval-only: every case shown came back from a real legal-source provider's API response. No AI model is ever asked to invent a case name, citation, quotation, statute, rule, or holding from memory.

## Architecture

- `lib/case-search/types.ts` — `CaseSourceProvider` interface (`searchCases(request)`, `getCaseById(id)`), mirroring the existing `LegalSourceProvider` pattern in `lib/legal-sources/types.ts` but returning a full result union (`ok | not-configured | provider-error | timeout`) since this is a real network-backed provider, not the article the cheap in-memory glossary lookup.
- `lib/case-search/courtlistener-provider.ts` — the one real provider implemented so far, gated behind `COURTLISTENER_API_TOKEN`. **Unverified against a live CourtListener account** — no token is configured in this environment, so the field mappings follow CourtListener's publicly documented v4 search API but have never been confirmed against a real response. Flagged in code comments; confirm before relying on this in production.
- `lib/case-search/case-search-service.ts` — the orchestration layer: validates the request (`case-search-schema.ts`), checks `CASE_SEARCH_PROVIDER` is actually configured (returns the safe "not available yet" message when it's `"none"`), delegates to the provider, caches a successful page for 15 minutes (`cache.ts`, in-memory, keyed by the normalized search parameters — never by user, since no private data is ever part of the key), and maps every provider failure mode to one generic safe message rather than the raw upstream error.
- `lib/case-search/build-roadmap-case-request.ts` — builds the request for a roadmap's "Cases to Research": topics/legal terms are derived from the roadmap's own generated step titles and `relatedTerms`, and **jurisdiction always comes from the roadmap itself** — a client-supplied `jurisdiction` override is structurally impossible to smuggle through (the function's override parameter type excludes it, and the route additionally never reads it from the raw request body).
- `lib/case-search/relevance-summary.ts` — deterministic, cautious relevance text built only from matched topics. Never claims a case proves, guarantees, or definitely applies to the user's situation.

## Never invented, never overclaimed

- Every `VerifiedCaseResult` field comes from a mapped provider record; a record missing `caseName`/`court`/a source URL is dropped rather than filled in with a guess (`mapResult` in the CourtListener provider).
- `laterHistoryStatus` defaults to `"not-checked"` and stays that way — no citator/later-history service is integrated yet. The UI (`components/roadmap/case-result-card.tsx`) shows the exact required notice whenever this status is `"not-checked"`: *"CaseCompass has not confirmed whether this decision has been limited, questioned, reversed, or overruled..."*
- `relevanceSummary` never claims detailed factual similarity — only "this case discusses a topic identified in your roadmap."
- If no provider is configured (`CASE_SEARCH_PROVIDER=none`, the default), the UI shows: *"Verified case search is not available yet. Your roadmap and educational resources are still available."* No demo/placeholder cases are ever rendered.
- A provider failure (timeout, non-2xx, malformed JSON) never falls back to AI-generated results — it surfaces the same safe "could not verify additional cases right now" message as an unconfigured provider.

## Saved cases

`SavedCase` (Prisma) stores the full verified source record (provider name/id, case name, citation, court, jurisdiction, decision date, docket number, source URL, source name) plus an optional link to the roadmap it was saved from and a private note — never just an AI-generated summary without the underlying record. A `(userId, providerName, providerCaseId)` unique constraint prevents duplicate saves at the database level. Ownership is enforced the same way as every other dashboard resource — `requireOwnedSavedCase` (`lib/auth/dashboard-authorization.ts`) returns `not-found`, never `forbidden`, for another user's saved case.

## Authorization

- `GET /api/roadmaps/[roadmapId]/cases` and `POST /api/roadmaps/[roadmapId]/cases/search` require authentication and roadmap ownership (`requireOwnedRoadmap`) before ever calling the search service.
- `GET/POST /api/saved-cases`, `DELETE/PATCH /api/saved-cases/[savedCaseId]` require authentication; the detail routes additionally require ownership via `requireOwnedSavedCase`.
- No route ever trusts a client-supplied `jurisdiction`, `userId`, or ownership flag.

## Environment

`CASE_SEARCH_PROVIDER` (`none` default | `courtlistener`), `COURTLISTENER_API_TOKEN` (server-only, never `NEXT_PUBLIC_*`), `CASE_SEARCH_RESULT_LIMIT` (default 10). See `.env.example`.

## Known limitations

- Only one provider is implemented (CourtListener). The `CaseSourceProvider` interface is designed to support additional providers (official court sites, Cornell LII, Caselaw Access Project, licensed providers) later without changing the service layer or UI.
- No later-history/citator integration — `laterHistoryStatus` is always `"not-checked"` today.
- The CourtListener field mapping is unverified against a live response (no token configured in this environment).
- No full-opinion text retrieval/display — every case links out to its authoritative source rather than reproducing the text, since no license/permission to reproduce full opinions has been confirmed.
