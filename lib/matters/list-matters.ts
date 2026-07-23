import { prisma } from "@/lib/db";
import { computeResearchStatus, primaryActionFor, type ResearchStatus, type PrimaryAction } from "@/lib/dashboard/research-status";
import type { MatterStatus } from "@/lib/generated/prisma/enums";
import type { ResearchRoadmapContent } from "@/types/roadmap";

export interface MatterSummary {
  id: string;
  title: string;
  caseNumber: string | null;
  court: string | null;
  jurisdiction: string | null;
  matterType: string | null;
  status: MatterStatus;
  researchStatus: ResearchStatus;
  primaryAction: PrimaryAction;
  intakeProgressPercent: number | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * One row per matter belonging to the user — never another user's data,
 * since every query below is scoped to `userId` directly. Each matter's
 * status/next-action is computed from that matter's own most recent
 * intake and roadmap only, the same logic the old single-thread
 * dashboard overview used, just applied per matter instead of per
 * account — so a matter never shows another matter's progress.
 */
export async function listMattersForUser(userId: string): Promise<MatterSummary[]> {
  const matters = await prisma.matter.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });

  return Promise.all(
    matters.map(async (matter) => {
      const [intake, roadmap] = await Promise.all([
        prisma.intakeSession.findFirst({ where: { matterId: matter.id }, orderBy: { updatedAt: "desc" } }),
        prisma.researchRoadmap.findFirst({
          where: { matterId: matter.id },
          orderBy: { updatedAt: "desc" },
          include: { progress: { where: { userId } } },
        }),
      ]);

      const content = roadmap ? (roadmap.content as unknown as ResearchRoadmapContent) : null;
      const stepIds = new Set(content?.steps.map((step) => step.id) ?? []);
      const relevantProgress = roadmap?.progress.filter((p) => stepIds.has(p.stepId)) ?? [];
      const totalSteps = content?.steps.length ?? 0;
      const completedSteps = relevantProgress.filter((p) => p.status === "COMPLETED").length;
      const startedSteps = relevantProgress.filter((p) => p.status === "IN_PROGRESS").length;

      const researchStatus = computeResearchStatus({
        intakeStatus: intake?.status ?? null,
        totalSteps,
        completedSteps,
        startedSteps,
      });
      const primaryAction = primaryActionFor(researchStatus, {
        intakeId: intake?.id ?? null,
        roadmapId: roadmap?.id ?? null,
        matterId: matter.id,
      });

      return {
        id: matter.id,
        title: matter.title,
        caseNumber: matter.caseNumber,
        court: matter.court,
        jurisdiction: matter.jurisdiction,
        matterType: matter.matterType,
        status: matter.status,
        researchStatus,
        primaryAction,
        intakeProgressPercent: intake ? intakePercentFor(intake.status) : null,
        createdAt: matter.createdAt,
        updatedAt: matter.updatedAt,
      };
    }),
  );
}

function intakePercentFor(status: string): number {
  switch (status) {
    case "DRAFT":
      return 10;
    case "INTERVIEWING":
    case "NEEDS_CLARIFICATION":
      return 50;
    case "READY_FOR_REVIEW":
      return 80;
    case "COMPLETED":
      return 100;
    default:
      return 0;
  }
}
