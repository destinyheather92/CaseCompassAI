import type { AppUser } from "@/lib/auth/authorization";

export type IntakeAccessResult = { ok: true } | { ok: false; reason: "forbidden" };

/**
 * A guest (never-authenticated) intake session has no owner — its
 * high-entropy cuid session id *is* the access credential, the same
 * trust model as e.g. a Stripe Checkout session token. Once a session is
 * created by an authenticated user, only that exact user may access it —
 * not even institution staff (private research content, see
 * docs/behavior/shared-device-privacy.md).
 */
export function checkIntakeSessionAccess(
  session: { userId: string | null },
  caller: AppUser | null,
): IntakeAccessResult {
  if (session.userId === null) {
    return { ok: true };
  }
  if (!caller || caller.id !== session.userId) {
    return { ok: false, reason: "forbidden" };
  }
  return { ok: true };
}
