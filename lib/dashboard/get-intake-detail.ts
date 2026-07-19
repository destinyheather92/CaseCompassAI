import { prisma } from "@/lib/db";
import { requireOwnedIntake } from "@/lib/auth/dashboard-authorization";
import { buildIntakeTimeline, type IntakeTimelineItem } from "@/lib/dashboard/timeline-mapper";
import { fromPrismaIntakeStatus } from "@/lib/intake/intake-status";
import type { AppUser } from "@/lib/auth/authorization";
import type { IntakeStatus } from "@/types/intake-interview";

export interface IntakeDetailAnswer {
  questionId: string;
  questionText: string;
  answerText: string;
  sequence: number;
}

export interface IntakeDetail {
  id: string;
  status: IntakeStatus;
  caseType: string;
  jurisdiction: string;
  proceduralStage: string;
  researchGoals: string[];
  documentTypes: string[];
  factualSummary: string;
  unresolvedInformation: string[];
  timeline: IntakeTimelineItem[];
  answers: IntakeDetailAnswer[];
  hasRoadmap: boolean;
}

export type GetIntakeDetailResult = { status: "found"; intake: IntakeDetail } | { status: "not-found" };

/** Uses requireOwnedIntake (not getIntakeSession) so another user's intake resolves to `not-found`, never `forbidden` — see lib/auth/dashboard-authorization.ts. */
export async function getIntakeDetail(intakeId: string, actorUser: AppUser): Promise<GetIntakeDetailResult> {
  const owned = await requireOwnedIntake(intakeId, actorUser);
  if (!owned.ok) {
    return { status: "not-found" };
  }

  const [answers, roadmapCount] = await Promise.all([
    prisma.intakeAnswer.findMany({ where: { intakeSessionId: intakeId }, orderBy: { sequence: "asc" } }),
    prisma.researchRoadmap.count({ where: { intakeSessionId: intakeId } }),
  ]);

  const intake = owned.resource;

  return {
    status: "found",
    intake: {
      id: intake.id,
      status: fromPrismaIntakeStatus(intake.status),
      caseType: intake.caseType,
      jurisdiction: intake.jurisdiction,
      proceduralStage: intake.proceduralStage,
      researchGoals: intake.researchGoals as string[],
      documentTypes: intake.documentTypes as string[],
      factualSummary: intake.factualSummary,
      unresolvedInformation: intake.unresolvedInformation as string[],
      timeline: buildIntakeTimeline(answers),
      answers: answers.map((answer) => ({
        questionId: answer.questionId,
        questionText: answer.questionText,
        answerText: answer.answerText,
        sequence: answer.sequence,
      })),
      hasRoadmap: roadmapCount > 0,
    },
  };
}
