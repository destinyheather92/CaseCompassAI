import { prisma } from "@/lib/db";
import { checkIntakeSessionAccess } from "@/lib/intake/intake-access";
import { fromPrismaIntakeStatus } from "@/lib/intake/intake-status";
import type { AppUser } from "@/lib/auth/authorization";
import type { IntakeQuestion, IntakeStatus } from "@/types/intake-interview";

export interface IntakeSessionAnswerView {
  questionId: string;
  questionText: string;
  answerText: string;
  answerType: string;
  sequence: number;
}

export interface IntakeSessionView {
  id: string;
  status: IntakeStatus;
  caseType: string;
  jurisdiction: string;
  proceduralStage: string;
  researchGoals: string[];
  documentTypes: string[];
  factualSummary: string;
  unresolvedInformation: string[];
  topicsCovered: string[];
  currentQuestion: IntakeQuestion | null;
  questionCount: number;
  answers: IntakeSessionAnswerView[];
}

export type GetIntakeSessionResult =
  | { status: "found"; session: IntakeSessionView }
  | { status: "not-found" }
  | { status: "forbidden" };

export async function getIntakeSession(sessionId: string, actorUser: AppUser | null): Promise<GetIntakeSessionResult> {
  const session = await prisma.intakeSession.findUnique({
    where: { id: sessionId },
    include: { answers: { orderBy: { sequence: "asc" } } },
  });

  if (!session) {
    return { status: "not-found" };
  }

  const access = checkIntakeSessionAccess({ userId: session.userId }, actorUser);
  if (!access.ok) {
    return { status: "forbidden" };
  }

  return {
    status: "found",
    session: {
      id: session.id,
      status: fromPrismaIntakeStatus(session.status),
      caseType: session.caseType,
      jurisdiction: session.jurisdiction,
      proceduralStage: session.proceduralStage,
      researchGoals: session.researchGoals as string[],
      documentTypes: session.documentTypes as string[],
      factualSummary: session.factualSummary,
      unresolvedInformation: session.unresolvedInformation as string[],
      topicsCovered: session.topicsCovered as string[],
      currentQuestion: session.currentQuestion as unknown as IntakeQuestion | null,
      questionCount: session.questionCount,
      answers: session.answers.map((answer) => ({
        questionId: answer.questionId,
        questionText: answer.questionText,
        answerText: answer.answerText,
        answerType: answer.answerType,
        sequence: answer.sequence,
      })),
    },
  };
}
