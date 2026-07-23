import { prisma } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import { requireOwnedIntake } from "@/lib/auth/dashboard-authorization";
import { generateDeterministicRoadmap } from "@/lib/roadmap/generate-roadmap";
import { ResearchRoadmapContentSchema } from "@/lib/roadmap/roadmap-schema";
import { recordUserActivity } from "@/lib/activity/record-user-activity";
import type { AppUser } from "@/lib/auth/authorization";

export type CreateRoadmapFromIntakeResult =
  | { status: "created"; roadmapId: string }
  | { status: "not-found" }
  | { status: "intake-not-ready"; message: string }
  | { status: "generation-failed"; message: string };

/**
 * Only a `COMPLETED` intake (the user has explicitly reviewed and
 * confirmed their summary via completeIntakeSession) may generate a
 * roadmap — matching that service's own invariant that roadmap
 * generation must never be triggered by the AI alone. Content is
 * re-validated against ResearchRoadmapContentSchema before persisting,
 * even though the deterministic generator is trusted, so a future
 * AI-generated path gets the same guardrail for free.
 */
export async function createRoadmapFromIntake(intakeId: string, actorUser: AppUser): Promise<CreateRoadmapFromIntakeResult> {
  const owned = await requireOwnedIntake(intakeId, actorUser);
  if (!owned.ok) {
    return { status: "not-found" };
  }

  const intake = owned.resource;
  if (intake.status !== "COMPLETED") {
    return {
      status: "intake-not-ready",
      message: "Please review and confirm your intake before building a roadmap.",
    };
  }

  const content = generateDeterministicRoadmap({
    caseType: intake.caseType,
    jurisdiction: intake.jurisdiction,
    proceduralStage: intake.proceduralStage,
    researchGoals: intake.researchGoals as string[],
    documentTypes: intake.documentTypes as string[],
  });

  const validated = ResearchRoadmapContentSchema.safeParse(content);
  if (!validated.success) {
    return { status: "generation-failed", message: "Could not build a valid roadmap right now." };
  }

  const roadmap = await prisma.researchRoadmap.create({
    data: {
      userId: actorUser.id,
      matterId: intake.matterId,
      intakeSessionId: intake.id,
      institutionId: actorUser.institutionId,
      title: validated.data.title,
      summary: validated.data.summary,
      sourceKind: "DETERMINISTIC_FALLBACK",
      content: validated.data as unknown as Prisma.InputJsonValue,
    },
  });

  await recordUserActivity({
    userId: actorUser.id,
    type: "ROADMAP_GENERATED",
    title: "Research roadmap generated",
    href: `/dashboard/roadmaps/${roadmap.id}`,
  });

  return { status: "created", roadmapId: roadmap.id };
}
