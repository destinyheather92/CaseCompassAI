# Audit Events

All audit events are written through `lib/security/audit-log.ts`'s `recordAuditEvent()`, which passes `metadata` through the same key-based redaction guard as `lib/security/safe-logger.ts` before persisting — so a caller that accidentally includes a `password`, `passwordHash`, `description`, `token`, etc. in metadata gets `"[REDACTED]"` written instead, never the real value. This is tested directly in `tests/integration/audit/audit-log.test.ts`.

## Event catalog (implemented)

| Action | Outcome values | Recorded by | Notes |
|---|---|---|---|
| `institution_user_created` | success | `lib/institution/create-user.ts` | metadata: `{role}` only — never the temporary password |
| `institution_user_creation_rejected` | failure | `lib/institution/create-user.ts` | recorded when the identity-provider call itself fails |
| `temporary_password_reset` | success | `lib/institution/reset-user-password.ts` | never contains the new temporary password |
| `temporary_password_reset_rejected` | failure | `lib/institution/reset-user-password.ts` | identity-provider error path |
| `account_deactivated` | success | `lib/institution/change-user-status.ts` | |
| `account_reactivated` | success | `lib/institution/change-user-status.ts` | |
| `first_login_password_completed` | success | `lib/auth/first-login-password.ts` | |
| `first_login_password_rejected` | failure | `lib/auth/first-login-password.ts` | recorded when the *current* password fails server-side verification — never contains either password |

## Fields

Every event carries: `actorUserId?`, `targetUserId?`, `institutionId?`, `facilityId?`, `action`, `outcome` (`SUCCESS`/`FAILURE`), `metadata?` (redacted JSON), `createdAt`. Indexed on `institutionId`, `action`, `createdAt`, `actorUserId`, `targetUserId` for institution-scoped audit review.

## What is never written

- Plaintext passwords or temporary passwords (redacted even if accidentally passed)
- Password hashes (none exist anywhere in this system — Clerk owns them entirely)
- Raw case descriptions / intake narratives (the `description` key is redacted by the same guard, for when audit logging is added around intake/roadmap actions)
- Full AI prompts

## Planned but not yet implemented

- `role_changed` — no route currently changes a user's role after creation.
- `unauthorized_access_denied` — authorization failures are currently surfaced as HTTP responses (401/403) but not separately audit-logged; every one of them is provable via the route-level tests instead. Adding an audit event for repeated/suspicious denial patterns is a reasonable follow-up.
- `roadmap_generation_rate_limited`, `roadmap_output_rejected_by_schema_validation` — land with the roadmap-generation phase.
- `failed_login_threshold_reached`, `account_locked`, `account_unlocked` — land if/when automatic lockout is implemented (currently `LOCKED` is a modeled, enforced status with no automatic trigger — see authentication-behavior.md's Known Limitations).
