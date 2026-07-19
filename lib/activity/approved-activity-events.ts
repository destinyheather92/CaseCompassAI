import type { UserActivityType } from "@/lib/generated/prisma/enums";

/**
 * The full allowlist of safe, UI-facing activity events. This is
 * intentionally kept separate from (and narrower in purpose than)
 * AuditLog's security/operational event names — see
 * docs/behavior/user-dashboard.md. Must stay in sync with the Prisma
 * `UserActivityType` enum.
 */
export const APPROVED_ACTIVITY_EVENTS: readonly UserActivityType[] = [
  "INTAKE_STARTED",
  "INTAKE_ANSWER_UPDATED",
  "INTAKE_REVIEW_OPENED",
  "INTAKE_CONFIRMED",
  "ROADMAP_GENERATED",
  "ROADMAP_STEP_STARTED",
  "ROADMAP_STEP_COMPLETED",
  "RESOURCE_VIEWED",
  "LEGAL_TERM_SEARCHED",
  "NOTE_SAVED",
  "RESOURCE_SAVED",
  "CASE_SAVED",
];

export function isApprovedActivityEvent(type: string): type is UserActivityType {
  return (APPROVED_ACTIVITY_EVENTS as readonly string[]).includes(type);
}
