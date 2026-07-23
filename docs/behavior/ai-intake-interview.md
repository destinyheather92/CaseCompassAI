# AI Intake Interview

## Purpose

The AI intake interview is the adaptive (Layer 2) portion of the Get Started guided intake. It exists to gather facts — jurisdiction detail, dates, procedural history, documents on hand — that a separate, not-yet-built system can later use to construct an educational legal research roadmap. It is not, and must never become, a source of legal advice.

## Deterministic (Layer 1) vs. adaptive (Layer 2) questions

Layer 1 is five fixed, non-AI questions collected client-side and validated with `lib/intake/intake-deterministic-schema.ts`: case category, jurisdiction, procedural stage, research goal(s), and document types on hand. No AI call happens until all five are answered.

Layer 2 begins the moment Layer 1 is submitted (`POST /api/intake/interview/start`). The AI interviewer receives the Layer 1 answers plus every prior Q&A turn, and returns exactly one next question (or a clarification, or `intake-complete`) per turn — never a batch of questions, never a chat-style back-and-forth transcript.

## What the AI may do

- Ask one clear, plain-language (roughly 6th–8th grade) question at a time about facts, dates, jurisdiction, court history, procedural posture, documents, or the user's research goal.
- Ask a clarifying question when the user's answer is ambiguous or conflicting.
- Flag safety conditions (`contains-sensitive-data`, `asks-for-legal-advice`, `possible-emergency`, `possible-deadline`, `unclear-jurisdiction`) without acting on them beyond flagging.
- Maintain a running plain-language factual summary and a list of unresolved information gaps.
- Decide the intake is complete once enough facts exist for a general roadmap.

## What the AI may not do

- Answer a legal question, give legal advice, or state that a violation occurred.
- Predict an outcome, recommend filing anything, or calculate a deadline.
- Invent or cite a case, statute, rule, or constitutional provision.
- Ask about something already answered, or ask more than one question in a turn.
- Request a password, SSN, banking detail, or full prisoner ID number.

These are enforced two ways: the system prompt (`lib/ai/prompts/intake-interviewer-system.ts`, directly tested in `tests/unit/ai/intake-interviewer-system-prompt.test.ts` for the presence of every directive above) instructs the model; the structured-output schema (below) constrains what shape a response can even take. Neither is a substitute for the other — the schema can't stop the model from *saying* something advice-shaped inside `collectedFactsSummary`, so this remains a prompt-level (not fully mechanically enforced) boundary, which is why the evaluation fixtures include an explicit "asks for legal advice" scenario as a behavioral smoke test.

## Question limits

`INTAKE_MAX_AI_QUESTIONS` (default 12, env-configurable) is enforced **server-side**, against the actual count of persisted `IntakeAnswer` rows — not a client-supplied count, and not something the model can override by continuing to return `needs-more-information`. Once the ceiling is hit, `submitIntakeAnswer` forces the session straight to `ready-for-review` without another provider call. See `lib/intake/submit-intake-answer.ts` and `tests/integration/intake/submit-intake-answer.test.ts`'s "forces ready-for-review once the server-enforced question limit is reached" test.

## Structured output schema

`lib/intake/intake-interview-schema.ts` (Zod) enforces:

- `question` is required (non-null) when `status` is `needs-more-information`/`needs-clarification`, and must be null when `status` is `intake-complete`.
- `choices` must be non-null only for `single-choice`/`multiple-choice` answer types, and null otherwise — note this uses `.nullable()`, not `.optional()`, because OpenAI's Structured Outputs strict mode rejects optional properties entirely (every field must be present in the JSON; "absent" is represented as `null`). A test (`tests/unit/intake/intake-interview-schema.test.ts`, "zodTextFormat compatibility") calls the real `zodTextFormat()` conversion to catch this class of mistake, rather than only asserting shape in isolation.
- `safetyFlags` rejects `none` combined with any other flag, and caps array lengths (`unresolvedInformation` ≤ 20, `topicsCovered` ≤ 30, `choices` ≤ 10, `safetyFlags` ≤ 6) so a malformed/adversarial response can't grow unbounded.
- Output is re-validated independently in `lib/ai/providers/openai-intake-interviewer.ts` even after the SDK's own `output_parsed` step — never trusted implicitly.

## Review requirement

Reaching `intake-complete` from the AI only moves the session to `ready-for-review` — never `completed`. The user must see the reviewed summary (`components/onboarding/intake-review.tsx`), optionally edit Layer 1 and restart the interview, and explicitly acknowledge "CaseCompass provides general legal education and research guidance... not... legal advice" before `POST /api/intake/interview/[sessionId]/complete` will accept `acknowledged: true` and transition to `completed`. Roadmap generation is a separate, later system — this phase stops at `completed`.

## Privacy behavior

- **2026-07-22 update — guest access removed.** Every intake route (`start`, `answer`, `[sessionId]` GET, `[sessionId]/complete`) now calls `requireAuthenticatedUser()`, not `requireOptionalUser()` — beginning or continuing an intake always requires a real, signed-in account (see `docs/behavior/matters.md`). This reverses the original design documented below the line, which is kept here as historical context: a guest's `sessionId` was previously its own access credential (the same trust model as e.g. a Stripe Checkout session token). Existing rows created under the old model (`userId: null`) are still readable by `lib/intake/intake-access.ts`'s `checkIntakeSessionAccess` for backward compatibility, but no new guest-owned session can ever be created going forward — `startIntakeSession`'s `actor.userId` is now a required `string`, not `string | null`.
- A signed-in user who is disabled, locked, or must still change their temporary password is never silently treated as a guest — `lib/auth/authorization.ts`'s `authorizeOptionalUser()` rejects them outright (see `tests/integration/authorization/authorize-optional-user.test.ts`). `authorizeOptionalUser`/`requireOptionalUser` themselves are unchanged and still exist as general-purpose utilities; they're simply no longer called by the intake routes.
- Once a session belongs to an authenticated user (`session.userId` set), only that exact user may read or answer it — not institution staff, regardless of institution/facility membership (`lib/intake/intake-access.ts`).
- Audit events (`intake_interview_started`, `intake_interview_answer_submitted`, `intake_interview_answer_failed`, `intake_interview_question_limit_reached`, `intake_interview_completed`) never include the user's answer text or the AI's factual summary in `metadata` — only counts, statuses, and failure reasons. See `docs/behavior/audit-events.md`.

## Failure behavior

Every provider failure mode (`not-configured`, `provider-error`, `invalid-output`, `timeout`) is caught inside `OpenAIIntakeInterviewer` and converted to a safe, generic user-facing message — never a raw SDK error or stack trace. An answer is always persisted *before* the next AI call, so a failure after answering never loses what the user typed; retrying with the same `questionId` is idempotent (detected via an existing `IntakeAnswer` row, not a duplicate insert) — see `tests/integration/intake/submit-intake-answer.test.ts`'s retry test.

## Provider abstraction

`lib/ai/providers/intake-interviewer-provider.ts` defines the `IntakeInterviewerProvider` interface; `OpenAIIntakeInterviewer` is the real implementation, constructed with an optional injected `OpenAI` client so tests exercise its actual parsing/error-handling logic without a network call. `tests/helpers/fake-intake-interviewer-provider.ts` provides a scripted, no-network fake used by service-layer tests, the evaluation fixtures, and (via HTTP interception, not a production-code backdoor) the Playwright e2e spec.

## Known limitation: no real provider verified

No `OPENAI_API_KEY` is configured in this environment. `OpenAIIntakeInterviewer` is fully implemented and tested via dependency injection, but has never made a real OpenAI API call. `OPENAI_INTAKE_MODEL`'s default (`gpt-5.6-luna`) is unverified against a live account's actual available Responses-API models with Structured Outputs support.

## Tests enforcing this document

See `docs/behavior/test-coverage-map.md` for the full list; the load-bearing ones are `tests/unit/intake/intake-interview-schema.test.ts`, `tests/unit/ai/*`, `tests/integration/intake/*`, `tests/integration/authorization/authorize-optional-user.test.ts`, and `tests/e2e/ai-intake-interview.spec.ts`.
