import { prisma } from "@/lib/db";
import type { RoadmapSourceKind } from "@/lib/generated/prisma/enums";
import type { ResearchRoadmapContent } from "@/types/roadmap";

export interface UserRoadmapSummary {
  id: string;
  title: string;
  summary: string;
  sourceKind: RoadmapSourceKind;
  totalSteps: number;
  completedSteps: number;
  startedSteps: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Scoped to `userId` directly. Step-count rollups are computed from the
 * roadmap's own `content.steps` (never fabricated) joined against the
 * user's `RoadmapProgress` rows — a step never in `content.steps` cannot
 * be counted as complete even if a stray progress row existed for it.
 */
export async function getUserRoadmaps(userId: string): Promise<UserRoadmapSummary[]> {
  const roadmaps = await prisma.researchRoadmap.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: { progress: { where: { userId } } },
  });

  return roadmaps.map((roadmap) => {
    const content = roadmap.content as unknown as ResearchRoadmapContent;
    const stepIds = new Set(content.steps.map((step) => step.id));
    const relevantProgress = roadmap.progress.filter((p) => stepIds.has(p.stepId));

    return {
      id: roadmap.id,
      title: roadmap.title,
      summary: roadmap.summary,
      sourceKind: roadmap.sourceKind,
      totalSteps: content.steps.length,
      completedSteps: relevantProgress.filter((p) => p.status === "COMPLETED").length,
      startedSteps: relevantProgress.filter((p) => p.status === "IN_PROGRESS").length,
      createdAt: roadmap.createdAt,
      updatedAt: roadmap.updatedAt,
    };
  });
}
