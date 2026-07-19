import { prisma } from "@/lib/db";
import { RESOURCE_DISCLAIMER } from "@/lib/resources-constants";
import { computeResearchStatus, primaryActionFor, type ResearchStatus, type PrimaryAction } from "@/lib/dashboard/research-status";
import { buildIntakeTimeline, type IntakeTimelineItem } from "@/lib/dashboard/timeline-mapper";
import { getUserRoadmaps, type UserRoadmapSummary } from "@/lib/dashboard/get-user-roadmaps";
import { getUserActivity, type UserActivityItem } from "@/lib/dashboard/get-user-activity";
import { getLegalTermsForIntake, type DashboardLegalTerm } from "@/lib/dashboard/legal-terms-for-intake";
import { recommendResources } from "@/lib/dashboard/resource-recommendations";
import { fromPrismaIntakeStatus } from "@/lib/intake/intake-status";
import type { IntakeStatus } from "@/types/intake-interview";
import type { ResourceMeta } from "@/lib/resources-data";

export interface DashboardActiveIntake {
  id: string;
  status: IntakeStatus;
  caseType: string;
  jurisdiction: string;
  proceduralStage: string;
}

export interface DashboardOverview {
  researchStatus: ResearchStatus;
  primaryAction: PrimaryAction;
  activeIntake: DashboardActiveIntake | null;
  activeRoadmap: UserRoadmapSummary | null;
  timeline: IntakeTimelineItem[];
  unresolvedInformation: string[];
  legalTerms: DashboardLegalTerm[];
  recommendedResources: ResourceMeta[];
  recentActivity: UserActivityItem[];
  disclaimer: string;
}

/**
 * The single read model backing the dashboard overview page. Every query
 * is scoped to `userId` directly — never a post-filter — so this can
 * never leak another user's intake, roadmap, or activity. Only the most
 * recently updated intake and roadmap are treated as "active"; older
 * ones are reachable from their own detail pages/history, not this
 * summary.
 */
export async function getDashboardOverview(userId: string): Promise<DashboardOverview> {
  const [intakeRow, roadmaps, recentActivity] = await Promise.all([
    prisma.intakeSession.findFirst({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: { answers: { orderBy: { sequence: "asc" } } },
    }),
    getUserRoadmaps(userId),
    getUserActivity(userId, 10),
  ]);

  const activeRoadmap = roadmaps[0] ?? null;

  const activeIntake: DashboardActiveIntake | null = intakeRow
    ? {
        id: intakeRow.id,
        status: fromPrismaIntakeStatus(intakeRow.status),
        caseType: intakeRow.caseType,
        jurisdiction: intakeRow.jurisdiction,
        proceduralStage: intakeRow.proceduralStage,
      }
    : null;

  const researchStatus = computeResearchStatus({
    intakeStatus: intakeRow?.status ?? null,
    totalSteps: activeRoadmap?.totalSteps ?? 0,
    completedSteps: activeRoadmap?.completedSteps ?? 0,
    startedSteps: activeRoadmap?.startedSteps ?? 0,
  });

  const primaryAction = primaryActionFor(researchStatus, {
    intakeId: intakeRow?.id ?? null,
    roadmapId: activeRoadmap?.id ?? null,
  });

  const [legalTerms, recommendedResources] = await Promise.all([
    getLegalTermsForIntake(intakeRow?.caseType ?? null),
    Promise.resolve(
      recommendResources(
        intakeRow
          ? {
              caseType: intakeRow.caseType,
              jurisdiction: intakeRow.jurisdiction,
              documentTypes: intakeRow.documentTypes as string[],
            }
          : null,
      ),
    ),
  ]);

  return {
    researchStatus,
    primaryAction,
    activeIntake,
    activeRoadmap,
    timeline: intakeRow ? buildIntakeTimeline(intakeRow.answers) : [],
    unresolvedInformation: intakeRow ? (intakeRow.unresolvedInformation as string[]) : [],
    legalTerms,
    recommendedResources,
    recentActivity,
    disclaimer: RESOURCE_DISCLAIMER,
  };
}
