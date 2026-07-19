import type { IntakeStatus as PrismaIntakeStatus } from "@/lib/generated/prisma/enums";

/**
 * `roadmap-ready` is kept in the union to match the product's documented
 * state model, but `computeResearchStatus` never emits it in this
 * implementation — "confirmed intake, no roadmap yet" is represented as
 * `intake-confirmed` instead, since the two would otherwise mean exactly
 * the same thing and split test/UI logic for no benefit. Reserved for a
 * future distinction (e.g. "roadmap generation in progress").
 */
export type ResearchStatus =
  | "not-started"
  | "intake-in-progress"
  | "ready-for-review"
  | "intake-confirmed"
  | "roadmap-ready"
  | "roadmap-generated"
  | "research-in-progress"
  | "roadmap-completed";

export interface ResearchStatusInput {
  /** Prisma IntakeStatus of the user's most recent/active intake, or null if none exists. */
  intakeStatus: PrismaIntakeStatus | null;
  /** Total steps in the active roadmap's content, 0 if no roadmap exists. */
  totalSteps: number;
  completedSteps: number;
  startedSteps: number;
}

const IN_PROGRESS_INTAKE_STATUSES = new Set<PrismaIntakeStatus>(["DRAFT", "INTERVIEWING", "NEEDS_CLARIFICATION"]);

/**
 * Never trusts client-supplied state — callers must pass values already
 * loaded server-side from Prisma (see lib/dashboard/get-dashboard-overview.ts).
 * Roadmap presence takes priority when intake state is missing/unknown,
 * so a defensive/conflicting combination still resolves to something
 * sensible rather than throwing.
 */
export function computeResearchStatus(input: ResearchStatusInput): ResearchStatus {
  const hasRoadmap = input.totalSteps > 0;

  if (hasRoadmap) {
    if (input.completedSteps >= input.totalSteps) return "roadmap-completed";
    if (input.completedSteps > 0 || input.startedSteps > 0) return "research-in-progress";
    return "roadmap-generated";
  }

  if (input.intakeStatus === null || input.intakeStatus === "ABANDONED") return "not-started";
  if (input.intakeStatus === "COMPLETED") return "intake-confirmed";
  if (input.intakeStatus === "READY_FOR_REVIEW") return "ready-for-review";
  if (IN_PROGRESS_INTAKE_STATUSES.has(input.intakeStatus)) return "intake-in-progress";

  return "not-started";
}

export interface PrimaryAction {
  label: string;
  href: string;
}

export interface PrimaryActionIds {
  intakeId: string | null;
  roadmapId: string | null;
}

/** Server-derived status in, a single unambiguous next action out. Never branches on anything the client provided. */
export function primaryActionFor(status: ResearchStatus, ids: PrimaryActionIds): PrimaryAction {
  switch (status) {
    case "not-started":
      return { label: "Start Intake", href: "/get-started" };
    case "intake-in-progress":
      return { label: "Continue Intake", href: `/dashboard/intakes/${ids.intakeId}` };
    case "ready-for-review":
      return { label: "Review Intake", href: `/dashboard/intakes/${ids.intakeId}` };
    case "intake-confirmed":
    case "roadmap-ready":
      return { label: "Build My Roadmap", href: `/dashboard/intakes/${ids.intakeId}` };
    case "roadmap-generated":
      return { label: "Continue My Roadmap", href: `/dashboard/roadmaps/${ids.roadmapId}` };
    case "research-in-progress":
      return { label: "Continue My Roadmap", href: `/dashboard/roadmaps/${ids.roadmapId}` };
    case "roadmap-completed":
      return { label: "Review My Research", href: `/dashboard/roadmaps/${ids.roadmapId}` };
  }
}
