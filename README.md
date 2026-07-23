# CaseCompass AI

Guided legal research for people who can't afford a lawyer — individuals and incarcerated users describe their situation in plain language, and CaseCompass turns it into a structured research roadmap: what to look for, why it matters, and real, verified case law to start from. It is explicitly **not** legal advice — every AI-generated explanation is labeled as such and kept separate from the original court opinion it describes.

## What it does

- **Guided intake.** A short set of deterministic questions (case type, jurisdiction, procedural stage, research goals, document types) followed by an adaptive, OpenAI-backed interview that asks only what it still needs to know.
- **Research roadmaps.** Each completed intake becomes a step-by-step roadmap grouped by topic, with plain-language explanations of *why* each step matters.
- **Verified case search.** Roadmap topics are searched against real case law (via CourtListener) — every result carries its citation, court, date, and a verification badge. Nothing is fabricated; if a provider isn't configured or returns nothing, the UI says so rather than inventing results.
- **Multiple matters per user.** An individual can run more than one legal matter at once, each with its own isolated intake, roadmap, saved cases, and notes — renaming a matter never touches its ID or disconnects anything linked to it.
- **Educational resources.** A library of plain-language guides (reading a court opinion, legal research basics, citations, terminology, research safety, and the tool's own limits), reachable from both the public site and the authenticated dashboard.
- **Institutional accounts.** Facilities (prisons, jails, reentry programs, law libraries, legal-aid partners) can register, issue accounts to their users, and manage them — with strict role separation: a facility administrator can never generate a roadmap for the institution itself, only for its users.

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router, React Server Components) + [React 19](https://react.dev) + TypeScript
- [Tailwind CSS v4](https://tailwindcss.com) + [base-ui](https://base-ui.com) primitives (dialogs, checkboxes, radio groups)
- [Clerk](https://clerk.com) for authentication
- [Prisma 7](https://www.prisma.io) + Supabase Postgres for application data (Clerk owns credentials; Prisma owns role/authorization/domain data)
- [OpenAI](https://platform.openai.com) (Responses API, Structured Outputs) for the adaptive intake interview and case explanations
- [CourtListener](https://www.courtlistener.com) for real, verified case search
- [Vitest](https://vitest.dev) (unit/integration) + [Playwright](https://playwright.dev) (end-to-end) for testing

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in real values — see below
npm run db:seed              # optional: seeds sample data
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

See `.env.example` for the full list with inline explanations. At minimum you'll need:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` | Authentication |
| `DATABASE_URL` / `DIRECT_URL` | Supabase Postgres (pooled + direct connections) |
| `OPENAI_API_KEY` | Adaptive intake interview and case explanations. If unset, the interview fails safely with a clear message — nothing is faked. |
| `CASE_SEARCH_PROVIDER` / `COURTLISTENER_API_TOKEN` | Verified case search. Defaults to `none`, which shows an honest "not available yet" state rather than fabricating results. |

## Scripts

```bash
npm run dev          # start the dev server
npm run build        # production build
npm run lint         # eslint
npm run type-check   # tsc --noEmit
npm test             # vitest (unit + integration)
npm run test:e2e     # playwright (end-to-end)
npm run db:seed      # seed sample data (prisma/seed.ts)
```

## Documentation

`docs/behavior/` is the source of truth for how the product is *supposed* to behave — each file documents one area (intake, roadmap generation, verified case search, matters, institutional accounts, authentication, authorization) alongside the tests that enforce it. `docs/behavior/security-invariants.md` is a running table of every security-relevant guarantee the app makes and where it's enforced. `docs/behavior/implementation-log.md` is an append-only log of what was built, when, and why. `docs/demos/README.md` documents the two recorded product-demo videos and how to regenerate them.

## Project structure

```
app/                  Routes (Server Components by default; "use client" only where interactive)
components/           UI, grouped by feature area (onboarding, dashboard, site, auth, ui primitives)
lib/                  Domain logic — auth, matters, case-search, resources data, etc.
prisma/               Schema, migrations, seed data
scripts/              One-off operational scripts (backfills, demo-video recording) — not part of the app
tests/
  unit/                Pure logic
  integration/          Service layer + API routes (real test database)
  components/          Component behavior (Testing Library)
  e2e/                  Full-flow specs against a real running dev server (Playwright)
docs/behavior/         Expected behavior + security invariants, one file per feature area
```
