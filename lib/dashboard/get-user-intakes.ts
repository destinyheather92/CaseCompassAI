import { prisma } from "@/lib/db";
import { fromPrismaIntakeStatus } from "@/lib/intake/intake-status";
import type { IntakeStatus } from "@/types/intake-interview";

export interface UserIntakeSummary {
  id: string;
  status: IntakeStatus;
  caseType: string;
  jurisdiction: string;
  proceduralStage: string;
  questionCount: number;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}

/**
 * Scoped to `userId` directly (a Prisma `WHERE`, not a post-filter) so a
 * caller can never accidentally see another user's intakes — the caller
 * is responsible for passing the authenticated actor's own id.
 */
export async function getUserIntakes(userId: string): Promise<UserIntakeSummary[]> {
  const sessions = await prisma.intakeSession.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });

  return sessions.map((session) => ({
    id: session.id,
    status: fromPrismaIntakeStatus(session.status),
    caseType: session.caseType,
    jurisdiction: session.jurisdiction,
    proceduralStage: session.proceduralStage,
    questionCount: session.questionCount,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    completedAt: session.completedAt,
  }));
}
