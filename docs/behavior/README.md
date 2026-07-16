# Behavior Documentation

This folder is the security and behavior record for CaseCompass AI's authentication, institutional account management, and guided-intake/roadmap systems. It exists alongside the automated test suite, not instead of it.

## Why this exists

CaseCompass AI serves people who cannot recover a lost password by email, and institutions that are legally and ethically obligated not to over-reach into a participant's private research. The behaviors in this folder — who can authenticate how, what gates a first-time password change, what an institution admin can and cannot see — are security-critical and easy to silently regress during future feature work. Writing them down, and pointing each one at the test that enforces it, is how we keep that from happening.

## How these documents relate to the automated tests

Every behavior described here should be backed by at least one automated test, listed in [test-coverage-map.md](./test-coverage-map.md). The docs explain *why* a behavior exists and what it's supposed to do; the tests are what actually enforce it. If a document describes a behavior with no corresponding test, that's a gap, not a formality — treat it as a TODO.

## How future developers should update these files

- **Changing a documented behavior requires changing its test(s) first** (or alongside), following the same red → green → refactor flow used to build it originally. Don't edit the doc to match code that already changed; change the code with a failing test, then update the doc.
- **Security invariants in [security-invariants.md](./security-invariants.md) must never be silently removed.** If a product decision genuinely requires relaxing one, that has to be an explicit, reviewed decision — update the doc to explain the new boundary and why, don't just delete the line.
- **Append to [implementation-log.md](./implementation-log.md)** for every completed behavior — it's an append-only record of what was built, why, which tests cover it, and what was verified (and how). Don't rewrite history in it; add a new dated entry.
- Keep new behavior docs in this folder, not scattered into the general `docs/` tree, so security-relevant behavior stays discoverable in one place.

## Files in this folder

| File | Purpose |
|---|---|
| [get-started-flow.md](./get-started-flow.md) | The guided intake experience for guests and authenticated users |
| [authentication-behavior.md](./authentication-behavior.md) | Individual + institutional login, account status model and transitions |
| [institutional-accounts.md](./institutional-accounts.md) | How staff create/manage institution-managed users |
| [first-login-password-change.md](./first-login-password-change.md) | The mandatory temporary-password → private-password flow |
| [authorization-matrix.md](./authorization-matrix.md) | Which roles can do what |
| [roadmap-generation.md](./roadmap-generation.md) | AI/deterministic roadmap generation and its safety constraints |
| [shared-device-privacy.md](./shared-device-privacy.md) | Shared-institutional-device data isolation |
| [security-invariants.md](./security-invariants.md) | The non-negotiable rules, each mapped to enforcing code/tests |
| [audit-events.md](./audit-events.md) | Audit event catalog and what's deliberately excluded from it |
| [test-coverage-map.md](./test-coverage-map.md) | Behavior → test file → status |
| [implementation-log.md](./implementation-log.md) | Append-only development log |

## Running the security regression suite

```
npm run test              # full Vitest suite (unit + integration)
npm run test:security     # security-critical subset only
npm run type-check        # tsc --noEmit
npm run lint
```

Integration tests run against the real (development) Supabase Postgres database configured via `DATABASE_URL`/`DIRECT_URL` in `.env.local`. They create uniquely-suffixed fixture data and clean up after themselves — see the "Known limitations" note in [implementation-log.md](./implementation-log.md) about test database isolation.
