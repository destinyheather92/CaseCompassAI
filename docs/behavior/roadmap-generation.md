# Roadmap Generation

## Status: not built in this phase

This document is a placeholder, kept in the file tree because `docs/behavior/README.md` references it and because `prisma/schema.prisma`'s `ResearchRoadmap` model and `IntakeSession.roadmaps` relation already exist in anticipation of it. No roadmap-generation code exists yet.

## What does exist that a future roadmap-generation phase should build on

- `IntakeSession` reaches `status = "completed"` only after the user has reviewed the AI-gathered facts and explicitly acknowledged the "not legal advice" disclaimer (`lib/intake/complete-intake-session.ts`) — a completed session's `factualSummary`, `caseType`, `jurisdiction`, `proceduralStage`, `researchGoals`, `documentTypes`, and its ordered `IntakeAnswer` rows are the intended input to a roadmap generator, not raw AI chat transcripts.
- `ResearchRoadmap.sourceKind` (`AI_GENERATED | DETERMINISTIC_FALLBACK`) and `ResearchRoadmap.content` (Json) are already modeled, matching the original task spec's structured `ResearchRoadmap` shape (topics, ordered steps, legal terms, source suggestions, confidence, disclaimer) — that Zod schema has not been written yet.
- The `lib/ai/` provider-abstraction pattern established for the intake interviewer (`IntakeInterviewerProvider`, dependency-injectable, schema-validated output, safe fallback on failure) is the template to reuse for a `RoadmapGeneratorProvider`, rather than inventing a new pattern.

## Recommended next step

Build `lib/roadmap/roadmap-schema.ts` (Zod, strict, mirroring the `ResearchRoadmap` TypeScript shape from the original spec), a deterministic fallback generator that never fabricates citations, and `POST /api/intake/roadmap` triggered only from a `completed` `IntakeSession` — following the same TDD discipline and provider-abstraction pattern used for the AI interview in this phase.
