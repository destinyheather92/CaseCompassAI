# Verified Case Search

## Root cause of "Verified case search is not available yet"

Confirmed by inspection, not assumption: `CASE_SEARCH_PROVIDER` defaults to `"none"` (`lib/env.ts`) and no `COURTLISTENER_API_TOKEN` is set in `.env.local` in this environment. The CourtListener integration itself has existed and been unit-tested (with mocked `fetch`) since earlier in this project — the placeholder message is not a missing feature, it's the documented, intentional behavior of `case-search-service.ts` when no provider is configured, so that the app never falls back to inventing results. Turning this on for real requires a real CourtListener API token, which is outside what this environment has; everything below is built and tested against mocked responses shaped like CourtListener's real, current v4 API (confirmed via the live FLP wiki docs, not assumed), with one integration test gated behind an explicit env flag for whoever adds a real token later.

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

## Case reading experience (plain-language explanation + original opinion)

Clicking "Read This Case" on any `CaseResultCard` opens `/dashboard/cases/[caseId]`, which shows a structured, plain-language breakdown of the opinion alongside the original text — toggle between "Plain English" and "Original Opinion."

- `lib/case-search/courtlistener-provider.ts`'s `getOpinionText()` fetches the opinion's `plain_text` (falling back to stripped `html`/`html_lawbox`/`html_columbia`) from CourtListener's `/opinions/{id}/` endpoint. Judicial opinion text is a public-domain government work (not copyrighted editorial content like headnotes), so displaying it verbatim with clear sourcing is safe — unlike reproducing a proprietary summary. Returns `null`, never a guess, when unavailable.
- `lib/case-explainer/` (mirrors the AI intake interviewer's architecture exactly — schema, system prompt, injectable provider, OpenAI implementation): `case-explanation-schema.ts` (Structured Outputs Zod schema: case summary, facts, legal issues, holding, court's reasoning, rule of law, why it matters, how it might relate, important quotes, key terms, and `basedOnFullOpinionText`), `lib/ai/prompts/case-explainer-system.ts` (instructs the model to use only the given opinion text — or, absent it, only verified metadata — and never invent facts, holdings, or quotes), `explain-case.ts` (the orchestrating service).
- **Quotes are never trusted from the model alone.** `lib/case-explainer/verify-quotes.ts` independently re-checks every `importantQuotes[].quote` the model returns against the real opinion text (whitespace/case-normalized substring match) and silently drops any quote that isn't actually there — defense in depth against fabrication, verified directly by a live test against the real OpenAI API (all three real quotes matched; a synthetic fabricated quote in a separate test was correctly stripped).
- If the AI explanation call fails, the case's verified metadata and original opinion text are still shown (`explanation-unavailable` status) — an AI outage never hides the underlying verified source.
- If no opinion text is available at all, the plain-language view still renders a limited, explicitly-labeled summary from metadata only (no facts/holding/quotes invented), and the original-opinion view shows an honest "not available" message with a link to the authoritative source instead of a blank page.
- Highlighting (`lib/case-explainer/highlight-opinion-text.ts`) never uses `dangerouslySetInnerHTML` — it splits the opinion text into plain-text segments and the component wraps matched ones in `<mark>`, so there is no HTML-injection surface even though the underlying text comes from a third-party API.

## Provider architecture (future licensed sources)

`CaseSourceProvider` (`lib/case-search/types.ts`) is the seam every provider implements: `searchCases`, `getCaseById`, `getOpinionText`, `verifyCitation`, `getCitingCases`, `getCitedCases`. `LegalCaseProviderName` (`"courtlistener" | "vlex" | "fastcase" | "westlaw" | "lexis"`) and the matching Prisma `LegalCaseProvider` enum already name every planned provider — but only `courtListenerCaseProvider` is implemented or ever called. vLex, Fastcase, Westlaw, and Lexis are documented future adapters: adding one means implementing this same interface and switching `CASE_SEARCH_PROVIDER`, never scraping, and never touching the service layer or UI, which depend only on the interface's `VerifiedCaseResult`/`CitationVerificationResult`/`CitationGraphResult` shapes, not CourtListener's response format. No code calls or fetches from any of the four future providers today.

## Citation verification (the "Verified" guardrail)

A case is never labeled "Verified" because an AI generated its name — every `VerifiedCaseResult` carries a `verificationStatus` (`verified | possible_match | not_verified | source_unavailable`) and a `verificationMethod` (`citation-lookup | id-lookup | search-match | none`), so the UI and any future audit can tell exactly how a status was reached.

- `courtListenerCaseProvider.verifyCitation()` calls CourtListener's real `POST /api/rest/v4/citation-lookup/` endpoint (confirmed against Free Law Project's current, live API documentation as part of building this — not assumed from training data) with `{text: citation}`. Response status codes map directly: `200` (single matched cluster) → `verified`; `200`/`300` with multiple candidate clusters → `possible_match` with all candidates; `404`/`400` → `not_verified`; `429` (either at the HTTP level or per-entry) or any network/timeout failure or missing token → `source_unavailable`.
- Service layer: `lib/case-search/case-search-service.ts`'s `verifyCaseCitation()` validates the input (`case-id-schema.ts`'s `citationTextSchema` — bounded length, safe character set) before it ever reaches the provider.
- Route: `POST /api/cases/verify-citation`, authenticated, rate-limited (30/min/user).

## Citation graph (citing/cited cases)

`GET /api/rest/v4/opinions-cited/?cited_opinion={id}` (who cites this opinion — forward citations) and `?citing_opinion={id}` (what this opinion cites — its authorities) are CourtListener's real, documented citation-graph endpoints (confirmed live, including the exact query-param semantics and the `{id, citing_opinion, cited_opinion, depth}` edge shape). `courtListenerCaseProvider.getCitingCases`/`getCitedCases` fetch the edges, hydrate up to 10 unique related opinions with full metadata, and return `RelatedCaseResult[]` — each with `treatment: "cited"` (a type that structurally cannot hold any other value) and the real `depth` (how many times the opinion is referenced). **The mere existence of a citation is never presented as approval, following, distinguishing, limiting, questioning, or overruling** — this app has no real citator integration, so it only ever claims "cited," never anything stronger. `components/case-explainer/citation-graph-section.tsx` renders these as two lists ("Later Cases Citing This Opinion" / "Cases Cited By This Opinion") on the case reader page; `GET /api/cases/[caseId]/citing` and `.../cited` are the backing routes.

## Authority / jurisdiction relevance

`lib/case-search/authority-classifier.ts`'s `classifyAuthority()` is deliberately conservative: it returns `"binding"` only when a case's court/jurisdiction exactly matches the roadmap's own jurisdiction, or when the case is from the U.S. Supreme Court; `"persuasive"` for every other case with known jurisdiction metadata; and **`null` — no label at all — whenever the relationship can't be reliably determined**, rather than guessing. It never infers "binding" from a case merely discussing the same legal issue. Surfaced as a badge on `CaseResultCard` (only when a `roadmapJurisdiction` is supplied) and as a filter in `CasesToResearch`.

## Normalized, persisted storage

`SavedCase` (existing, user-initiated saves) is joined by two new tables that persist *every* case a user actually opens in detail, independent of whether they save it:

- **`LegalCaseRecord`** — the normalized source record (case name, citations, court, jurisdiction, docket number, decision date, opinion text, verification status/method, `rawSourceMetadata` for audit) — the durable counterpart to the in-memory search cache. Upserted (unique on `[provider, providerCaseId]`) whenever `explainCase()` fetches a case in detail; never touched by every search-result row, which stays ephemeral in `cache.ts` (search results are transient by nature — a user re-verifies by clicking through).
- **`CaseExplanationRecord`** — AI-generated content, **always a separate table** with a foreign key to `LegalCaseRecord`, so it is structurally impossible to accidentally display AI-generated text as part of the original opinion. Keyed by `sourceTextHash` (a SHA-256 of the opinion text) so a cached explanation is never served if the underlying text has since changed (e.g. becomes available after previously being null).
- `lib/case-explainer/case-explanation-store.ts` implements the read/write logic; `explainCase()` now checks three tiers in order: in-memory cache (fastest) → `LegalCaseRecord`/`CaseExplanationRecord` (survives restarts, shared across server instances) → the real provider + AI call (slowest, only on an actual miss).

## Quotation provenance

Every quote shown to a user is labeled "Quotation from the opinion," rendered in quotation marks, and linked back to the source. `lib/case-explainer/verify-quotes.ts` computes a `location` (character offset + a best-effort paragraph number, counted from blank-line breaks in the source text) for every quote that survives verification — **the AI is never asked for, and never supplies, a location**; it's computed independently after the fact, so it can't be invented. If the exact text can't be located in the source opinion, the quote is dropped entirely, never displayed with a fabricated or approximate location.

## Source attribution

`components/case-explainer/source-attribution-panel.tsx` renders the full required field set on every case detail view: source provider (naming the operating organization, e.g. "CourtListener, operated by Free Law Project" — **never labeling the provider as the court itself**, which is always a separate field), case name, citation, court, decision date, docket number, the provider's own case identifier, verification status + method, retrieval timestamp, and a "View source opinion" link. When a case's metadata identifies it as originally digitized by the Caselaw Access Project, the required CAP notice is shown (`CASELAW_ACCESS_PROJECT_NOTICE`) — this app never calls the retired `api.case.law` service directly; CAP-originated cases only ever arrive through CourtListener.

## Separating source content from AI content

Every AI-generated section on the case reader carries `AI_EXPLANATION_LABEL` ("CaseCompass educational explanation — AI-generated from the source opinion.") and `AI_EXPLANATION_DISCLAIMER` ("This explanation is not part of the court's opinion and is not legal advice...") as a single banner at the top of the Plain-Language Guide — visually and structurally distinct from the Original Opinion view, which is headed "Original Legal Source" and states the text is reproduced unaltered.

## Error and empty states (exact required wording)

`lib/case-search/case-search-constants.ts` centralizes every required message: `NO_CASES_FOUND_MESSAGE`, `CITATION_NOT_VERIFIED_MESSAGE`, `CASE_SEARCH_SAFE_ERROR_MESSAGE` (provider-unavailable), `OPINION_TEXT_UNAVAILABLE_MESSAGE`, and the updated `LATER_HISTORY_NOT_CHECKED_NOTICE` (the required "CaseCompass located and verified this opinion, but has not independently confirmed its complete subsequent history..." wording, replacing looser earlier phrasing). None of these ever fall back to an invented AI case when the provider returns nothing.

## Security hardening

- **SSRF / path-injection defense**: `lib/case-search/case-id-schema.ts`'s `providerCaseIdSchema` (a strict `^[a-zA-Z0-9_-]+$`, length-bounded pattern) validates every provider case id *before* it's ever embedded in a fetch URL — `getCaseById`, `getOpinionText`, `getCitingCases`, `getCitedCases`, and the service-layer wrappers all reject an invalid id immediately, never reaching `fetch`. `citationTextSchema` applies the same discipline to user-submitted citation strings.
- Rate limiting: `POST /api/cases/verify-citation` (30/min/user); existing limits on search/roadmap-case routes are unchanged.
- Credentials: `COURTLISTENER_API_TOKEN` stays server-only (never `NEXT_PUBLIC_*`), read once through the validated `lib/env.ts` module.
- Institution-level isolation for case data flows through the existing roadmap-ownership chain (`requireOwnedRoadmap`) — case search/graph endpoints never accept a client-supplied jurisdiction or ownership flag.

## Known limitations

- Only one provider is implemented (CourtListener). vLex/Fastcase/Westlaw/Lexis are named in the type system as documented future adapters but have no implementation and are never called.
- No real citator integration — `laterHistoryStatus` is always `"not-checked"`, and citation-graph entries are always `"cited"`, never a stronger treatment (followed/distinguished/limited/questioned/overruled).
- The CourtListener field mappings (search, opinion text, citation lookup, citation graph) are unverified against a live account — no `COURTLISTENER_API_TOKEN` is configured in this environment. Endpoint paths and request/response shapes *were* confirmed against Free Law Project's current, live API documentation while building this (not assumed from training data); only the exact field names in a real response are unverified. The AI explanation pipeline itself *was* verified live against the real OpenAI API. One test file (`tests/integration/case-search/courtlistener-live.test.ts`) is written to call the real CourtListener API and is ready for whoever adds a real token — gated behind `RUN_LIVE_COURTLISTENER_TESTS=true`, skipped by default.
- The verbatim-quote defense is a deterministic substring check, not a semantic one — a quote reworded even slightly by the model (not verbatim) is correctly dropped as unverifiable, which is the intended conservative behavior, not a bug.
- Authority classification is jurisdiction-exact-match-or-SCOTUS only — it does not model federal circuit hierarchies (e.g. recognizing that a roadmap's federal district falls under a specific circuit), so a circuit court of appeals case is currently classified "persuasive" relative to a same-circuit district-level roadmap rather than "binding." Documented rather than silently guessed at, since a wrong circuit-mapping would be worse than no claim at all.
- Dashboard filters for verification status, authority type, and roadmap topic are client-side (applied to the already-fetched page of results) — there is no server-side "jurisdiction override" filter, since jurisdiction always comes from the roadmap itself and is never a user-changeable search parameter.
