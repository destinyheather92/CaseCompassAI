# Shared Institutional Device Privacy

## Purpose

Institutional devices may be shared by multiple participants. This document covers what the intake/Get Started layer does (and doesn't yet do) to keep one user's data from leaking to the next person who sits down at the same device.

## What's implemented

- **Persistence is opt-in, gated by a single deployment-wide flag** — `NEXT_PUBLIC_INSTITUTION_LOCAL_PERSISTENCE` (`stores/use-intake-store.ts`). When it isn't exactly `"true"`, the store's Zustand `persist` middleware writes to a no-op storage implementation instead of `localStorage`, so nothing survives a page reload. The intent, per the original spec, is that an institution deploying CaseCompass for shared/kiosk devices sets this to `false` for that entire deployment.
- **The flag is a client-behavior switch only, never an authorization control.** Server-side privacy/authorization enforcement (session ownership via `lib/intake/intake-access.ts`, account-status checks via `lib/auth/authorization.ts`) does not read this flag and does not depend on it — see security invariant #21-adjacent framing in `docs/behavior/security-invariants.md`.
- **A session belongs to exactly the user who created it.** `checkIntakeSessionAccess()` rejects any other authenticated user, and institution staff have no elevated access to a participant's intake session — the institution dashboard (Phase 1) only ever shows account status, never intake content.

## Known simplification vs. the fuller original design

The original spec describes *per-account* dynamic detection (an institution-managed account should have persistence disabled automatically, regardless of the deployment-wide flag; a guest on their own personal device should default to persistence enabled). This build implements the simpler, single global flag instead — deferred because per-account detection would require exposing a client-visible "is this an institution-managed account" signal that doesn't exist yet in this codebase, and a wrong default in that direction (accidentally enabling persistence for an institution-managed account) would be a real privacy problem, whereas the conservative single-flag version can only ever be *more* restrictive than intended, never less. Recommended follow-up: expose a minimal, non-sensitive "account kind" signal (e.g. via a Clerk public metadata field synced from Prisma at session-token-claim time) so the store can make this decision per-account rather than per-deployment.

## What's not yet implemented

- No explicit "Clear My Session" button exists yet in the UI (the store's `clearSession()`/`reset()` actions exist and are tested, but nothing in `app/get-started/page.tsx` currently exposes a manual clear action to the user directly — "Start Over" on the Welcome step calls `reset()`, which covers the same need when returning to Welcome, but not from mid-flow).
- No session-timeout warning or automatic expiration exists yet for the guided intake flow specifically (Clerk's own session timeout applies to authenticated users generally, per Phase 1).
