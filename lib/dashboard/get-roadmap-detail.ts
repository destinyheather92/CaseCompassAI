import { prisma } from "@/lib/db";
import { requireOwnedRoadmap } from "@/lib/auth/dashboard-authorization";
import { fromPrismaStepStatus } from "@/lib/roadmap/roadmap-step-status";
import type { AppUser } from "@/lib/auth/authorization";
import type { ResearchRoadmapContent, RoadmapStepStatus } from "@/types/roadmap";

export interface RoadmapDetailStep {
  id: string;
  order: number;
  title: string;
  description: string;
  whyItMatters: string;
  suggestedActions: string[];
  relatedTerms: string[];
  category: ResearchRoadmapContent["steps"][number]["category"];
  priority: ResearchRoadmapContent["steps"][number]["priority"];
  difficulty: ResearchRoadmapContent["steps"][number]["difficulty"];
  estimatedMinutes: number;
  status: RoadmapStepStatus;
  note: string | null;
}

export interface RoadmapDetail {
  id: string;
  title: string;
  summary: string;
  jurisdiction: ResearchRoadmapContent["jurisdiction"];
  steps: RoadmapDetailStep[];
  legalTerms: ResearchRoadmapContent["legalTerms"];
  sourceSuggestions: ResearchRoadmapContent["sourceSuggestions"];
  safetyNotes: string[];
  confidence: ResearchRoadmapContent["confidence"];
  disclaimer: string;
}

export type GetRoadmapDetailResult = { status: "found"; roadmap: RoadmapDetail } | { status: "not-found" };

/** Uses requireOwnedRoadmap so another user's roadmap resolves to `not-found`. Progress/notes are always the calling user's own — never another user's, even for a shared institutional roadmap concept (there is none; roadmaps are per-user). */
export async function getRoadmapDetail(roadmapId: string, actorUser: AppUser): Promise<GetRoadmapDetailResult> {
  const owned = await requireOwnedRoadmap(roadmapId, actorUser);
  if (!owned.ok) {
    return { status: "not-found" };
  }

  const content = owned.resource.content as unknown as ResearchRoadmapContent;
  const progressRows = await prisma.roadmapProgress.findMany({ where: { userId: actorUser.id, roadmapId } });
  const progressByStep = new Map(progressRows.map((row) => [row.stepId, row]));

  return {
    status: "found",
    roadmap: {
      id: owned.resource.id,
      title: content.title,
      summary: content.summary,
      jurisdiction: content.jurisdiction,
      steps: content.steps.map((step) => {
        const progress = progressByStep.get(step.id);
        return {
          ...step,
          status: progress ? fromPrismaStepStatus(progress.status) : "not-started",
          note: progress?.note ?? null,
        };
      }),
      legalTerms: content.legalTerms,
      sourceSuggestions: content.sourceSuggestions,
      safetyNotes: content.safetyNotes,
      confidence: content.confidence,
      disclaimer: content.disclaimer,
    },
  };
}
