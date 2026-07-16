import type { IntakeStatus as PrismaIntakeStatus } from "@/lib/generated/prisma/enums";
import type { IntakeStatus } from "@/types/intake-interview";

const API_TO_PRISMA: Record<IntakeStatus, PrismaIntakeStatus> = {
  draft: "DRAFT",
  interviewing: "INTERVIEWING",
  "needs-clarification": "NEEDS_CLARIFICATION",
  "ready-for-review": "READY_FOR_REVIEW",
  completed: "COMPLETED",
  abandoned: "ABANDONED",
};

const PRISMA_TO_API: Record<PrismaIntakeStatus, IntakeStatus> = {
  DRAFT: "draft",
  INTERVIEWING: "interviewing",
  NEEDS_CLARIFICATION: "needs-clarification",
  READY_FOR_REVIEW: "ready-for-review",
  COMPLETED: "completed",
  ABANDONED: "abandoned",
};

export function toPrismaIntakeStatus(status: IntakeStatus): PrismaIntakeStatus {
  return API_TO_PRISMA[status];
}

export function fromPrismaIntakeStatus(status: PrismaIntakeStatus): IntakeStatus {
  return PRISMA_TO_API[status];
}

/** Maps the AI interviewer's per-turn status to the session-level IntakeStatus. */
export function fromAiInterviewStatus(
  aiStatus: "needs-more-information" | "needs-clarification" | "intake-complete",
): IntakeStatus {
  switch (aiStatus) {
    case "needs-more-information":
      return "interviewing";
    case "needs-clarification":
      return "needs-clarification";
    case "intake-complete":
      return "ready-for-review";
  }
}
