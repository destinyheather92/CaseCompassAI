# Authorization Matrix

Every row is enforced server-side by `lib/auth/authorization.ts` (`requireRole`, `requireInstitutionAccess`, `requireFacilityAccess`, composed via `authorize()`/`requireAuthenticatedUser()`), not by hiding UI. "Built" means a route/module exists and is tested; "Planned" means the role/rule is modeled but no route exercises it yet in this build.

| Action | guest | individual | incarcerated-user | educator | legal-aid-staff | institution-admin | system-admin |
|---|---|---|---|---|---|---|---|
| Begin guest intake | ✅ | ✅ | — | — | — | — | — |
| Generate guest roadmap preview | ✅ (rate-limited) | ✅ | — | — | — | — | — |
| Save a roadmap | ❌ (must create an account) | ✅ own | ✅ own | — | — | — | — |
| View own roadmap | — | ✅ own | ✅ own | — | — | ❌ (not automatic) | ❌ (not automatic) |
| Create institution user | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ own institution only | Planned |
| Reset institution user password | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ own institution only | Planned |
| Deactivate institution user | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ own institution only | Planned |
| Reactivate institution user | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ own institution only | Planned |
| List/search institution users | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ own institution only | Planned |
| Change a user's role | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ (not exposed) | Planned |
| Assign `institution-admin` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ (invariant #31) | Planned |
| Assign `system-admin` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ (invariant #31) | Planned |
| View institution-level analytics | ❌ | ❌ | ❌ | ❌ | ❌ | Planned (aggregate only) | Planned |
| View private intake description / roadmap content of another user | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ (never automatic) | ❌ (never automatic) |
| Manage institution settings | ❌ | ❌ | ❌ | ❌ | ❌ | Planned | Planned |

## Least-privilege notes

- **Guest**: no account exists; a guest is simply an unauthenticated caller. Guest roadmap generation is rate-limited per client IP (`lib/security/rate-limit.ts`), same mechanism as authenticated rate limiting but keyed differently.
- **Individual / incarcerated-user**: identical privilege shape for their own data — the distinction is only in how the account was created and authenticated, not in what it can do with its own research.
- **Educator / legal-aid-staff**: modeled in the `UserRole` enum and included in the assignable-roles set for institution user creation, but no route currently grants them elevated permissions beyond "manage their own data" — matching the task's "permissions must be explicitly defined" requirement rather than assuming capability from the role name.
- **institution-admin**: every institution-scoped action requires `requireInstitutionAccess`, which reads `institutionId` only from the authenticated staff member's own Prisma row — never from client input (tested explicitly by submitting a foreign `institutionId` and confirming it's ignored).
- **system-admin**: role exists in the enum for future platform-level operations but has no routes in this build. Per the task's own principle, a system-admin should not automatically read private case narratives even once such routes exist — that would require a separate, explicitly-audited support-access path, not blanket role access.

## Server-side enforcement, not UI hiding

Every action above that isn't `✅` for a given role fails a real server-side check when attempted directly against the API, independent of what the client UI shows. See `tests/integration/institution/users-route.test.ts`, `user-detail-routes.test.ts`, and `tests/integration/authorization/load-app-user.test.ts` for the tests proving this (403 for wrong role, 403 for cross-institution, 403 for `mustChangePassword` still pending, etc.).
