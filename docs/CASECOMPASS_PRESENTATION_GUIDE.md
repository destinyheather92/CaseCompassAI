# CaseCompass AI — Demo Day Presentation Guide

*A study guide for explaining your own application confidently — to technical judges, engineers, founders, and investors — in five minutes or less.*

> **Accuracy note**: everything in this document was verified directly against the current codebase (routes, schema, components, tests) while writing it, not assumed. Where something is a recommendation or an inference rather than a currently-implemented feature, it is explicitly labeled as such. Where a feature does not exist, it says so.

---

## 1. Project Elevator Pitch (30 seconds)

> "CaseCompass AI is a legal research assistant for people who have to represent themselves — mainly incarcerated individuals, but also anyone who can't afford a lawyer. It doesn't give legal advice. Instead, it takes a plain-language description of someone's situation, runs it through a structured, AI-guided interview, and turns that into a personalized research roadmap — real case law pulled from a verified legal database, plain-English explanations of legal terms, and a clear list of what to research next. It also has an institutional mode so correctional facilities can provision accounts for people with no email or phone access at all."

---

## 2. Two-Minute Overview

**Problem**: Incarcerated individuals and other unrepresented people often have access to a law library or legal database, but no legal training. A wall of citations and legal jargon isn't the same as knowing where to start. The result is people who technically have "access to justice" resources but no real path through them.

**Solution**: CaseCompass AI runs a structured, adaptive intake (deterministic questions first, then an AI-driven follow-up interview) to understand someone's situation in plain language, then generates a personalized research roadmap: what legal concepts apply, what to look up, and — critically — real, verified case law from CourtListener (not AI-invented citations), with plain-language explanations that are visually and structurally kept separate from the actual court opinion text.

**Target users**:
- **Individuals** researching their own case (self-represented litigants, people preparing post-conviction filings, etc.)
- **Correctional facilities / institutions**, who provision accounts for people with no email, phone, or independent internet access

**Value proposition**: Direction, not decisions. The product is explicit and repeated throughout the UI that it does not give legal advice — it gives people a starting point and teaches them how to navigate real legal sources themselves, with every case-law claim traceable back to a real, verifiable source.

---

## 3. Five-Minute Demo Script

*(Conversational, not memorized — hit these beats in your own words.)*

**Homepage** — "This is the landing page. Two audiences fork right away — individuals researching their own case, and facilities that want to set this up for the people they serve." *(Point at the "Get Started" vs. facility path.)*

**Authentication** — "Getting started now always requires an account — that's actually a change I made deliberately. Early on, guests could walk through the whole intake and hit a dead end at the very last step. Now it asks you to log in up front, and — this is the part I'm a little proud of — it remembers what you were trying to do and takes you right back to it after you log in, instead of dumping you on the homepage."

**Dashboard** — "Once you're in, this is your dashboard. Down here" *(point at "Your Matters")* "is something I just built: you're not limited to one case anymore. Each matter — say, a post-conviction issue and a separate civil issue — gets its own intake, its own roadmap, its own saved cases. They never mix."

**Creating a Matter** — "Hit New Matter, and it walks you into intake."

**Completing Intake** — "First it asks a handful of deterministic questions — case type, jurisdiction, what stage you're at. Then it hands off to an AI interviewer that asks follow-up questions in plain language, one at a time, to fill in the gaps — this part is a real OpenAI call with structured output, not a canned script."

**Generating the Roadmap** — "Once you confirm the summary is accurate, it builds a roadmap. That's deliberately deterministic, not AI — a template matched to your case type — so there's zero chance of an AI hallucinating your legal strategy."

**Viewing Cases** — "This is the part that took the most engineering effort: Cases to Research. Every case here is pulled live from CourtListener — a real legal database — and verified through their citation-lookup API before it's ever labeled 'Verified.' If the first search comes up empty, it doesn't just give up — it progressively broadens the search: simpler query, then just the core legal issue, then federal courts, then every jurisdiction, before it ever tells the user 'nothing found.'"

**Viewing Resources** — "And every legal term has a plain-language definition — a glossary, not a wall of Latin."

**Multiple Matters** — "Back on the dashboard — this second matter here is completely separate from the first. Different intake, different roadmap, different cases. That's new as of this build."

**Institution Dashboard** — "And on the facility side — a facility administrator never sees this personal-research flow at all. They get an aggregate dashboard: how many accounts, how many roadmaps generated — never anyone's actual private research content. That separation is enforced server-side, not just hidden in the UI."

**Closing** — "So: real intake, real AI, real verified case law, real separation between what the court actually wrote and what the AI explained — and now, real support for more than one case per person."

---

## 4. Product Overview

**What the software does**: Structured intake → AI-guided adaptive follow-up questions → a generated legal research roadmap → verified case-law search against a real external legal database → plain-language explanations of both legal terms and individual cases, kept visually and structurally distinct from the actual court opinion.

**Primary users**: Individuals researching their own legal matter (self-represented). Institutional/incarcerated users provisioned by a facility, going through the identical personal intake/roadmap flow.

**Institution users**: Provisioned by a facility administrator with a username + one-time temporary password (no email/phone required or used). Forced through a password change on first login. Never see another institution's data.

**Individual users**: Self-serve via Clerk (email or OAuth). Can now create multiple matters.

**Current capabilities** (confirmed in the codebase, not aspirational):
- Deterministic + AI-adaptive intake
- Deterministic (non-AI) roadmap generation from a case-type template
- Real CourtListener search, citation verification, and citation graph (citing/cited opinions)
- A progressive, multi-stage search pipeline that broadens rather than giving up
- AI-generated plain-language case explanations, with every quotation independently re-verified against the actual opinion text before being shown
- Multiple matters per individual user
- Institutional account provisioning, first-login password change, aggregate-only facility dashboard
- Two recorded product-demo videos, embedded on the homepage

**Current limitations** (see section 20 for the full, prioritized list):
- Roadmap generation itself is template-based, not AI-generated
- No payment/billing system exists
- No deployment configuration (Vercel config, Dockerfile, CI) currently exists in the repo
- `SavedResource` items saved outside a matter's roadmap context aren't matter-scoped
- No matter-archiving UI

**Future roadmap**: see section 21.

---

## 5. Architecture Overview (plain English)

- **Frontend**: Next.js 16 App Router (Turbopack), React 19, TypeScript, Tailwind v4. UI components are a mix of a custom design system (`glass-card`, `cc-*` color tokens) and shadcn-style primitives built on `@base-ui/react` (not Radix).
- **Backend**: Next.js API routes (`app/api/**`) and Server Components. No separate backend service — Next.js *is* the backend here.
- **Database**: Postgres, hosted on Supabase, accessed through Prisma 7 with the `@prisma/adapter-pg` driver adapter (not Supabase's own client SDK — Supabase here is purely the Postgres host).
- **Authentication**: Clerk owns sessions, password hashing, and login. Prisma's `User` table is the **authorization** system of record (role, institution/facility scope, account status) — deliberately never stores a password. Every protected server request re-derives the caller's role/status from Prisma via Clerk's verified user ID, never from client input.
- **External APIs**: OpenAI (Responses API with Structured Outputs, for the adaptive intake interview and AI case explanations) and CourtListener (Free Law Project's REST v4 API, for all real case-law data).
- **AI layer**: Two genuinely separate uses of AI — (1) the intake interviewer, which asks adaptive follow-up questions, and (2) the case explainer, which turns a real court opinion into a plain-language summary. Roadmap *generation* itself is not AI — it's a deterministic template lookup.
- **Research engine**: A provider-abstraction layer (`lib/case-search/`) with one real, active provider (CourtListener) and four documented-but-unimplemented future adapters (vLex, Fastcase, Westlaw, Lexis) — named in the type system so a future provider integration doesn't require an architecture change, but nothing calls them today.
- **Data persistence**: Normalized case-law records (`LegalCaseRecord`) are stored completely separately from AI-generated explanations of them (`CaseExplanationRecord`) — structurally impossible to confuse the two.
- **Deployment**: **Not currently implemented.** No `vercel.json`, `Dockerfile`, or `.github/` CI workflow exists in the repo. Next.js's own conventions make Vercel the natural target, but this is a recommendation, not a configured reality.

---

## 6. Folder Structure

| Folder | Responsibility |
|---|---|
| `app/` | Next.js App Router — every route, page, layout, and API endpoint |
| `components/` | React components, organized by feature area (`site/`, `dashboard/`, `onboarding/`, `institution/`, `case-explainer/`, `auth/`, `ui/`) |
| `lib/` | Nearly all business logic — auth, authorization, intake, roadmap generation, case search, matters, security, activity/audit logging |
| `prisma/` | `schema.prisma`, migrations, `seed.ts` |
| `stores/` | Zustand client-side state (currently just the intake wizard's state) |
| `types/` | Shared TypeScript type definitions not tied to a specific `lib/` module |
| `public/` | Static assets, including the two recorded demo videos under `public/demos/` |
| `scripts/` | One-off tooling — data backfills, demo-video recording automation — never imported by the running app |
| `tests/` | Vitest unit/integration/component tests and Playwright e2e specs |
| `docs/` | Behavior documentation (`docs/behavior/*.md`), demo docs, this presentation guide |

---

## 7. Tech Stack

| Technology | Why it was chosen |
|---|---|
| **Next.js 16** (App Router, Turbopack) | Server Components let authorization checks run server-side by default, not as an afterthought; one framework for both frontend and API routes |
| **React 19** | Ships with Next 16; no separate reasoning beyond "the version Next 16 uses" |
| **TypeScript** | Strict mode throughout — this is a security-sensitive app (institutional accounts, private legal research); the type system catches an entire class of "forgot to check ownership" bugs at compile time |
| **Tailwind CSS v4** | Utility-first styling with a small custom design-token layer (`cc-purple`, `cc-teal`, `glass-card`, etc.) on top |
| **Prisma 7** + **PostgreSQL (Supabase-hosted)** | Type-safe queries, a real migration history, and a schema that doubles as living documentation of every relationship in the app |
| **Clerk** | Outsources the hard, security-critical parts of authentication (password hashing, session management, webhook-based sync) so the app's own code only has to handle *authorization* |
| **OpenAI (Responses API, Structured Outputs)** | Structured Outputs (`zodTextFormat`) let every AI response be validated against a strict Zod schema before it's trusted — no free-form text parsing |
| **CourtListener (Free Law Project) REST v4** | A real, actively-maintained, non-paywalled legal database with a documented citation-verification endpoint — see section 11 for why it was chosen over Westlaw/Lexis |
| **Zustand** | Minimal, boilerplate-free client state for the multi-step intake wizard |
| **Zod** | One validation library used consistently for both API input validation and AI output validation |
| **Playwright** | Real-browser end-to-end tests and the demo-video recording automation both use the same tool |
| **Vercel** *(recommendation, not configured)* | The natural deployment target for a Next.js app; no deployment configuration currently exists |

---

## 8. Database Walkthrough

### Core models

- **`User`** — the authorization record for a Clerk identity. `clerkUserId` is the *only* link to Clerk; no password or password hash is ever stored here. Carries `role`, `accountStatus`, `institutionId`/`facilityId` (nullable), and the institutional-account lifecycle fields (`mustChangePassword`, `temporaryPasswordExpiresAt`).
- **`Matter`** *(new)* — one legal matter belonging to one user. `userId` is required (a matter can only be created by an authenticated account). Fans out to that matter's own intake sessions, roadmaps, saved resources, and saved cases.
- **`IntakeSession`** — one intake attempt: deterministic Layer-1 answers (case type, jurisdiction, procedural stage, goals, documents) plus the AI interview's running state (`factualSummary`, `topicsCovered`, `currentQuestion`). Optionally linked to a `Matter`.
- **`IntakeAnswer`** — one row per adaptive-interview question/answer turn, in order.
- **`ResearchRoadmap`** — the generated roadmap: `title`, `summary`, `sourceKind` (currently always `DETERMINISTIC_FALLBACK`), and a `content` JSON blob holding the full structured roadmap (steps, legal terms, source suggestions).
- **`RoadmapProgress`** — per-user, per-step completion tracking layered on top of a roadmap, never mutating the roadmap's own content.
- **`SavedResource`** / **`SavedCase`** — user-saved glossary terms, resources, and case-law results. Each carries its own private `note` field.
- **`LegalCaseRecord`** — a normalized, durable record of a case retrieved from CourtListener: citation, court, verification status/method, opinion text. Global (keyed by provider + provider case ID), not per-user.
- **`CaseExplanationRecord`** — AI-generated explanation of a `LegalCaseRecord`, **always a separate table** with its own foreign key — structurally impossible for AI-generated text to be stored as, or mistaken for, the original opinion.
- **`Institution`** / **`Facility`** — the organizational structure institutional accounts belong to.
- **`AuditLog`** / **`UserActivity`** — two intentionally distinct logs: `AuditLog` is a security/ops trail (never full case narratives); `UserActivity` is a safe, UI-facing activity feed drawn from a fixed allowlist of event types.

### How data flows

```
User ──┬── Matter ──┬── IntakeSession ── IntakeAnswer
       │            ├── ResearchRoadmap ── RoadmapProgress
       │            ├── SavedResource
       │            └── SavedCase ── (references) ── LegalCaseRecord ── CaseExplanationRecord
       └── Institution / Facility (institutional accounts only)
```

A deliberate design choice worth calling out to a technical audience: when the `Matter` model was introduced, the pre-existing `userId` column on `IntakeSession`/`ResearchRoadmap`/`SavedResource`/`SavedCase` was **kept, not replaced** by `matterId`. Every existing ownership check (`resource.userId !== user.id`) needed zero changes as a result — the refactor was purely additive.

---

## 9. Authentication Flow

- **Sign up / login**: Clerk's hosted `<SignIn>`/`<SignUp>` components for individuals (email or OAuth); a custom username/password form (`useSignIn()`) for institution-managed accounts, since incarcerated users have no email or phone.
- **Middleware**: `proxy.ts` (Next 16's renamed `middleware.ts`) wraps `clerkMiddleware()` and gates `/dashboard(.*)` and the institution-portal routes with a coarse `auth.protect()` — but this is explicitly documented and treated as a first pass only, never the actual authorization boundary.
- **Protected routes**: Every dashboard page, API route, and now every intake route independently re-derives the caller's role/status from Prisma via `requireAuthenticatedUser()` — defense in depth, not reliance on middleware matcher coverage.
- **Role separation**: `INDIVIDUAL`, `INCARCERATED_USER`, `EDUCATOR`, `LEGAL_AID_STAFF` share the personal intake/roadmap flow; `INSTITUTION_ADMIN` is explicitly blocked from creating a personal intake at the actual API entry point (not just hidden in the UI); `SYSTEM_ADMIN` is defined in the schema but has no built functionality yet.
- **Authorization**: A single module (`lib/auth/authorization.ts`) is the source of truth — `requireAuthenticatedUser`, `requireOwnedRoadmap`, `requireOwnedMatter`, etc. Ownership checks return `not-found` (never `forbidden`) for another user's resource, so a client can never distinguish "not yours" from "doesn't exist" by response shape.

---

## 10. Roadmap Generation Flow

```
User
 │
 ▼
Intake (deterministic Layer 1 + AI-adaptive Layer 2)
 │  (user reviews and explicitly confirms the summary)
 ▼
Roadmap generation — DETERMINISTIC template lookup by case type
 │  (never an AI call — a deliberate anti-hallucination choice)
 ▼
Research — real CourtListener search, progressively broadened if the
 │         first attempt finds nothing, each result citation-verified
 ▼
Dashboard — roadmap steps, verified cases, saved items, all scoped to
            the one Matter this roadmap belongs to
```

Roadmap generation is only ever triggered by an explicit user confirmation of a `COMPLETED` intake — never by the AI reaching "done" on its own.

---

## 11. CourtListener Integration

**What it is**: A free, non-profit-operated (Free Law Project) legal database with a REST API — search, opinion text, citation verification, and a citation graph (which opinions cite which).

**Why it was chosen**: It's the only major legal-research API that is both real/actively maintained *and* accessible without an enterprise licensing agreement — a hard requirement for a project serving a population with no budget for Westlaw/Lexis-scale contracts.

**Endpoints used**: `/search/` (case search, including `semantic=true` plain-language search), `/citation-lookup/` (the verification guardrail — a case is never labeled "Verified" without a real match here), `/opinions-cited/` (citation graph).

**How data is processed**: Every result is mapped into a normalized `VerifiedCaseResult` type with an explicit four-state verification status (`verified | possible_match | not_verified | source_unavailable`) — never a simple boolean. A progressive search pipeline (`lib/case-search/pipeline/`) broadens the query (full → simplified → primary legal issue → synonym-expanded → semantic → federal courts → all jurisdictions → landmark precedent) rather than reporting "no cases found" after a single narrow query.

**Limitations**: Only CourtListener is implemented; no real citator exists, so citation-graph relationships are only ever labeled "cited," never "followed/distinguished/overruled" (that would require a real citator service this project doesn't have). Authority classification (binding vs. persuasive) doesn't model full federal circuit hierarchies.

**Future improvements**: A real citator integration; a licensed provider adapter (vLex/Fastcase) for jurisdictions CourtListener covers less thoroughly — the provider interface already supports this without an architecture change.

---

## 12. AI Flow

**Where OpenAI is used**: (1) the adaptive intake interviewer — asks follow-up questions to fill factual gaps; (2) the case explainer — turns a real, retrieved court opinion into a plain-language summary, key terms, and important quotes.

**What prompts are doing**: The interviewer prompt gathers facts without ever answering a legal question or recommending a course of action (tested explicitly — see `tests/integration/intake/evaluation-fixtures.test.ts`'s "asks for legal advice" scenario). The case-explainer prompt is given the *real* opinion text and asked to summarize it — never asked to invent a case.

**What AI is NOT responsible for**: Roadmap generation (deterministic template), citation verification (a real API call, not an AI judgment call), whether a case is "good law" (never claimed without a real citator).

**How hallucinations are minimized**:
- Server-enforced question ceiling (`INTAKE_MAX_AI_QUESTIONS`) — the model doesn't get a vote on when to stop.
- Every AI-supplied quote is independently re-verified as an actual substring of the real opinion text before being shown; a quote that doesn't verify is silently dropped, never displayed as if it did.
- A quote's *location* (paragraph/character offset) is computed only after verification — the AI is never asked for, and never supplies, a location.
- Citation-graph relationships are typed to allow only the literal value `"cited"` — structurally impossible for the code to claim a stronger relationship.

**How citations are preserved**: `LegalCaseRecord` (the source) and `CaseExplanationRecord` (the AI's explanation) are always separate database tables/rows — never the same record — so AI-generated text can't be stored as, or later mistaken for, the original court opinion.

---

## 13. Security Review

- **Authentication**: Clerk (sessions, password hashing) — never duplicated or re-implemented.
- **Authorization**: A single `lib/auth/authorization.ts` module; role/status always re-derived server-side from Prisma via the Clerk-verified user ID, never trusted from client input.
- **Ownership validation**: Every `requireOwned*` function (`Matter`, `Roadmap`, `Intake`, `SavedItem`, `SavedCase`) returns `not-found` — never `forbidden` — for another user's resource.
- **Protected APIs**: Every `/api/intake/**`, `/api/dashboard/**`, `/api/matters`, and `/api/roadmaps/**` route independently calls its own authorization check — not solely reliant on middleware.
- **Role-based access**: Institution administrators are blocked from personal intake at the actual service-layer entry point, not just hidden in the UI.
- **URL protections**: Changing an ID in a URL (a roadmap, an intake, a matter) cannot expose another user's data — confirmed by dedicated tests (`tests/integration/authorization/dashboard-authorization.test.ts`).
- **Server validation**: Every mutating endpoint validates its input against a Zod schema server-side, independent of any client-side validation.
- The project maintains a living, numbered list of security invariants (`docs/behavior/security-invariants.md`) — 78 entries at last count, each paired with the test that enforces it.

---

## 14. Playwright

**Why it exists**: Real-browser coverage of flows that unit/integration tests can't fully exercise — actual page navigation, actual Clerk login, actual form interactions.

**What it tests**: A guided-intake flow (Layer 1 → AI interview → edit → review → confirm) against a real dev server, and a new auth-required suite (unauthenticated visits to protected routes/APIs, the redirect-back-after-login flow).

**Demo automation**: The two homepage demo videos are produced by dedicated Playwright scripts (`scripts/demos/`) that drive a real browser through the real app — real login, a real AI interview turn, a real CourtListener search — and transcode the recording to mp4.

**Future testing**: Broader e2e coverage of the multi-matter dashboard flows and institutional user-management flows currently only has integration-test (not e2e) coverage.

---

## 15. Scaling Strategy

If this became a production SaaS serving real volume, the honest list of what would need to change:

- **Redis / caching**: The in-memory rate limiter and case-search cache (`lib/security/rate-limit.ts`, `lib/case-search/cache.ts`) are explicitly documented as single-process, MVP-only — they wouldn't survive a restart or a multi-instance deployment. Redis (or Upstash) would be the natural replacement.
- **Queues / background jobs**: AI calls and CourtListener searches currently happen synchronously within the request. At scale, roadmap generation and case-explanation generation would move to a background job queue so a slow AI response doesn't hold open an HTTP request.
- **Vector search**: CourtListener's own `semantic=true` endpoint is used today for natural-language case search — a dedicated vector database would only become worthwhile if a second, self-hosted corpus were added.
- **Multiple research providers**: The provider-abstraction interface (`CaseSourceProvider`) already anticipates this — vLex/Fastcase/Westlaw/Lexis are named types today with zero implementation, ready for a real adapter without an architecture change.
- **Monitoring / logging / analytics**: Currently just `safeLog` (a redacting console wrapper) and the `AuditLog`/`UserActivity` tables. No external monitoring (Sentry, Datadog), no product analytics currently exists.
- **Horizontal scaling**: Next.js on Vercel scales serverless functions horizontally by default; the real bottleneck would be the in-memory rate limiter/cache noted above, which needs to move to a shared store first.
- **CDN**: Vercel's default CDN would cover static assets; the demo videos themselves are already static files servable this way.

---

## 16. Things I Can Say During Demo

- "One architectural decision I'm proud of: when I added support for multiple matters, I didn't touch a single existing ownership check — I kept the original `userId` column on every table and added `matterId` alongside it. That meant the whole security model didn't need to be re-audited."
- "I intentionally separated the original court opinion from the AI's explanation of it into two different database tables — it's structurally impossible for this app to display AI-generated text as if a judge wrote it."
- "I designed the case-verification model as four states, not a boolean, because 'the provider is down right now' and 'we searched and found nothing' are genuinely different situations, and telling a user the wrong one would be dishonest."
- "My next milestone is wiring up a second, licensed case-law provider behind the same interface I already built — the architecture is ready for it, nothing calls it yet."
- "I chose CourtListener because it's the only real legal database that's both actively maintained and accessible without an enterprise contract — which mattered a lot given who this is actually for."
- "The search pipeline never just gives up — if the first query finds nothing, it automatically broadens: simpler wording, then just the core legal issue, then federal courts, then every jurisdiction, before it ever tells someone 'nothing found.'"

---

## 17. Frequently Asked Questions

**Product**

1. **Why CourtListener?** Free, real, actively maintained, no enterprise contract required — matches the target population's actual access constraints.
2. **Why not Westlaw?** Enterprise licensing costs are exactly the access barrier this product exists to work around.
3. **Why not Lexis?** Same reason as Westlaw.
4. **Why AI at all, if it can't give legal advice?** The AI's job is narrow: ask clarifying questions and explain plain language, not decide legal strategy — narrowly scoped AI use, not a chatbot lawyer.
5. **How do you prevent hallucinations?** Deterministic roadmap generation (no AI), independent quote re-verification against real opinion text, a citation-verification API call as a hard guardrail before anything is labeled "Verified."
6. **How is legal advice avoided?** The interview prompt and UI copy are both explicit and repeated: research direction, not legal advice; tested directly against an "asks for legal advice" scenario.
7. **How is data secured?** Clerk for authentication, server-side re-derived authorization on every request, ownership checks that return `not-found` rather than leaking existence.
8. **How does authorization work?** A single module, re-derives role/status from Prisma on every request using the Clerk-verified user ID — never trusts client input.
9. **Why multiple matters?** One person can have more than one legal issue; mixing them into a single research thread would be confusing and, worse, could leak one matter's facts into another's roadmap.
10. **How do institutions use this?** A facility admin self-registers, gets real credentials, and provisions username/password-only accounts for people with no email/phone.
11. **How would you monetize?** *(See section 19 — investor framing.)*
12. **How would you scale?** *(See section 15.)*
13. **What happens if CourtListener fails?** The provider returns a `source_unavailable` status, distinct from "not verified" — the user is told the source is temporarily down, never shown a fabricated result.
14. **How do you prevent unauthorized access?** Server-side ownership checks on every ID in every URL — verified by dedicated tests.
15. **Why Prisma?** Type-safe queries and a real, reviewable migration history.
16. **Why Clerk?** Outsources password hashing/session security entirely — this app never touches a password.
17. **How expensive is OpenAI?** **Not currently tracked** — no cost-monitoring is built. Given the honest answer: "I haven't instrumented per-request cost tracking yet; that's a gap I'd close before any real usage volume."
18. **How would you support state statutes (not just case law)?** Not currently implemented; the provider-abstraction pattern used for case law could extend to a statute-search provider similarly.
19. **What differentiates you?** The combination of (a) a population-specific access model (no email/phone required) and (b) structural, code-level guarantees against AI-fabricated legal content — not just a prompt asking the model to "be careful."
20. **How is this different from ChatGPT?** ChatGPT can fabricate a citation with total confidence. This app can't — every case shown is independently verified against a real legal database before it's ever labeled "Verified," and the AI never generates case law itself.
21. **Does the AI ever write the roadmap?** No — deliberately deterministic, template-based, by case type.
22. **What if the AI's interview goes on forever?** A server-enforced hard cap (`INTAKE_MAX_AI_QUESTIONS`) — the model can't override it.
23. **Can a user lose their answers if something fails?** No — an answer is persisted before the next AI call; a failure never erases what was already typed.
24. **What happens to a guest who starts intake without an account?** They can no longer start it at all — a real account is required from the very first step, with a "log in or create an account" prompt that returns them to where they left off after logging in.
25. **Can one institution see another institution's data?** No — every institution-scoped query filters by the caller's own institution ID.
26. **Can a facility admin see an inmate's private research?** No — the institution dashboard is explicitly aggregate-only (counts, not content).
27. **What stops a facility admin from generating their own roadmap?** Blocked at the actual API entry point, not just hidden in the navigation.
28. **Is there a mobile app?** No — responsive web only.
29. **Does it work offline?** No.
30. **Is there a way to export a roadmap as PDF?** Not currently implemented.
31. **How are legal terms explained?** A curated glossary with plain-language definitions, separate from AI-generated content.
32. **What's the citation-graph feature?** Shows which later cases cite a given opinion, and which earlier cases it cites — always labeled "cited," never a stronger legal-treatment claim, since there's no real citator behind it.
33. **How many jurisdictions are supported?** All 50 states + DC + a generic "Federal" + "Not Sure" option in the intake; case-search jurisdiction broadening covers federal courts and all jurisdictions as fallback tiers.
34. **What database engine is this?** PostgreSQL, hosted on Supabase.
35. **Is the code open source?** Not stated in this document — a business decision, not a technical one.
36. **How long did this take to build?** Not tracked in a way this document can honestly quantify.
37. **What's the team size?** Not something this document should speculate about.
38. **Does it use RAG (retrieval-augmented generation)?** Not in the formal vector-database sense — case retrieval is via CourtListener's own search/semantic-search API, then fed to the AI explainer; there's no separate embedding/vector-store layer.
39. **How do you handle PII?** Audit logs and activity logs explicitly exclude free-text narrative content and secrets — enforced by an allowlist, not just a convention.
40. **What happens on a duplicate email/username?** Handled by Clerk's own uniqueness constraints plus the app's own username uniqueness in Prisma.
41. **Can a user delete their account?** Not confirmed as implemented in this document — would need direct verification before claiming it exists.
42. **Is there two-factor authentication?** Whatever Clerk's hosted components support by default for individual accounts; not independently built by this app.
43. **What's the uptime/SLA?** No production deployment currently exists to have an SLA.
44. **How do you test AI behavior?** Fictional, non-identifying evaluation scenarios (`tests/integration/intake/evaluation-fixtures.test.ts`) run against a scripted fake provider — including adversarial scenarios like prompt-injection-shaped answers.
45. **What's the biggest technical risk?** Dependency on two external services (OpenAI, CourtListener) whose availability the app doesn't control — mitigated with explicit failure-state handling, not eliminated.
46. **Why isn't roadmap generation AI-powered?** A deliberate anti-hallucination choice — a fixed template can't invent a legal strategy.
47. **Could roadmap generation become AI-powered later?** The architecture doesn't prevent it, but it would need the same guardrails (schema-validated output, no invented citations) applied.
48. **What happens if a user's account is disabled mid-session?** Every server-side authorization check re-verifies account status on each request — a disabled account is rejected immediately, not just on next login.
49. **Does the app store legal advice given by real attorneys?** No — there's no attorney-in-the-loop feature built.
50. **What's the single most important invariant in the whole app?** Arguably: a case is never labeled "Verified" without an authoritative match from the real provider — the one guardrail that everything else in the anti-hallucination design supports.

---

## 18. Technical Deep Dive

**Why Prisma?** Compile-time-checked queries against a schema that's also the most accurate documentation of every relationship in the app; a real, ordered migration history instead of hand-written SQL drift.

**Why Server Actions weren't used (API routes instead)?** *(Correction of premise, stated honestly)*: this app does not use Next.js Server Actions — all mutations go through explicit `app/api/**` route handlers with their own auth/rate-limit/validation chain. This is a deliberate, consistent pattern across the whole codebase, not an oversight.

**Why middleware (`proxy.ts`)?** As a coarse, UX-friendly first gate only — explicitly documented as *not* the actual authorization boundary, because Next's own middleware-matcher coverage can silently drift from real route coverage over time. Every real check happens again, server-side, at the page/route level.

**How are relationships modeled?** Foreign keys everywhere ownership matters (`userId` on every user-owned row); the `Matter` refactor is a good case study — added as an *additional* grouping FK rather than replacing the existing ownership FK, specifically to avoid having to re-verify every authorization check.

**How are protected routes enforced?** Defense in depth: middleware (coarse) → layout-level check → page/route-level check, all independently re-deriving the same authorization state from Prisma.

**How would you improve performance?** Move the in-memory rate limiter/cache to Redis (see section 15); background-queue the AI/CourtListener calls that currently block the request.

**How would you add caching?** A durable cache already exists for case-law records specifically (`LegalCaseRecord`/`CaseExplanationRecord`, keyed by a content hash for invalidation) — the gap is the *search-query* cache and rate limiter, both explicitly documented as in-memory/MVP-only.

**How would you add vector search?** CourtListener's own semantic-search endpoint is already used; a self-hosted vector store would only be justified by adding a second, independently-indexed corpus.

**How would you implement provider abstraction (if it didn't already exist)?** It already does — `CaseSourceProvider` is a documented interface with one real implementation and four named-but-unimplemented future adapters, specifically so a new provider is an implementation task, not an architecture change.

---

## 19. Investor Questions

**Market**: Self-represented litigants and the correctional/reentry population are both underserved by existing legal-tech products, which are built for practicing attorneys, not laypeople.

**Pricing** *(not currently implemented — framing for how you'd answer, not a stated plan)*: A plausible model is B2B2C — institutions (correctional facilities, reentry programs, legal aid nonprofits) pay for seats/accounts; individual self-serve users could have a freemium tier. No pricing model is built or configured in the codebase today.

**Competitive advantage**: Purpose-built for a population existing legal-tech ignores, with a no-email/no-phone account model institutions actually need, and code-level (not just prompt-level) guarantees against AI-fabricated legal content.

**Customer acquisition**: Institutional sales (facilities, reentry programs, legal aid organizations) is the more defensible channel given the product's own account model; individual-user acquisition would look more like consumer legal-tech.

**Institution adoption**: The self-service registration flow (`/institution/register`) already lets a facility onboard itself without a sales call — a real, working reduction in adoption friction, not just a pitch.

**Revenue**: Not currently modeled in the product. Be honest about this rather than inventing a number.

**Future roadmap**: See section 21.

---

## 20. Weaknesses (Honest, Prioritized)

1. **No deployment configuration exists.** No Vercel config, Dockerfile, or CI pipeline — this needs to exist before any real users touch the product. *(Highest priority — nothing else matters if it can't be deployed reliably.)*
2. **In-memory rate limiting and caching won't survive a restart or multiple instances.** Documented as an explicit known limitation; needs Redis (or similar) before real traffic.
3. **No cost monitoring for OpenAI usage.** A single runaway loop or traffic spike has no cost circuit breaker today.
4. **Only one case-law provider is implemented.** CourtListener alone may not have complete coverage for every state/topic — the architecture is ready for a second provider, but none is wired up.
5. **`SavedResource` items outside a matter's roadmap context aren't matter-scoped.** A minor but real inconsistency introduced by the most recent feature work, documented rather than hidden.
6. **No monitoring/observability stack (Sentry, Datadog, etc.).** Failures in production would currently only be visible via server logs.
7. **No automated CI** — tests are run manually, not gated on every push.

---

## 21. Future Roadmap

**Phase 1 (near-term)**: Production deployment configuration (Vercel + CI), move rate-limiting/caching to Redis, add basic cost/usage monitoring for OpenAI calls.

**Phase 2**: A second, licensed case-law provider behind the existing `CaseSourceProvider` interface; matter-level status UI (archive/complete); export a roadmap as PDF.

**Phase 3**: Real citator integration (so citation-graph treatment can move beyond "cited" to real Shepardize/KeyCite-equivalent signals); statute/regulation search alongside case law.

**Enterprise**: Multi-facility/multi-region institution management; SSO for institutional partners; usage analytics and reporting for institutional customers.

**National**: Broader case-law provider coverage across all state court systems; partnerships with public defender offices and legal aid organizations.

**International**: Not evaluated — the entire legal-source and jurisdiction model is built around U.S. state/federal courts today; international expansion would be a substantial re-architecture, not a feature addition.

---

## 22. Personal Cheat Sheet (read the night before)

**Tech stack**: Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind v4 · Prisma 7 + Postgres (Supabase-hosted) · Clerk (auth) · OpenAI (Structured Outputs) · CourtListener REST v4 · Zustand · Zod · Playwright

**Architecture in one line**: Clerk owns authentication; Prisma owns authorization and domain data; every protected request re-derives role/ownership server-side, never trusts the client.

**Major features**: Multi-matter dashboard · AI-adaptive intake · deterministic roadmap generation · progressive/self-broadening verified case search · AI case explanations kept structurally separate from real opinions · institutional accounts with no email/phone required · two real recorded product demos

**Talking points**:
- "Additive, not destructive" — the matter refactor added grouping without touching existing security checks.
- "Four states, not a boolean" — case verification honestly distinguishes an outage from a real empty result.
- "The AI explains; it doesn't decide" — roadmap generation is deterministic on purpose.
- "Never a dead end" — the search pipeline broadens automatically instead of giving up.

**Most likely questions**: Why CourtListener not Westlaw/Lexis (cost/access) · how hallucinations are prevented (verification + separation + deterministic roadmap) · how institutions are isolated from each other and from individual users (server-side scoping, tested) · what's not built yet (deployment config, second provider, cost monitoring)

**Key metrics** *(as of this build, not production traffic)*: 1011 automated tests passing · 78 documented, individually-tested security invariants · 2 real end-to-end demo videos of the actual running app

**Differentiators**: Purpose-built account model for a no-email/no-phone population; code-level (not prompt-level) guarantees against AI-fabricated legal content; a real, provider-verified case-search pipeline that keeps trying instead of giving up.

**Closing statement**: "CaseCompass AI doesn't try to replace a lawyer — it tries to make sure someone with no lawyer at all doesn't have to start from zero. Knowledge is power. Direction is freedom."
