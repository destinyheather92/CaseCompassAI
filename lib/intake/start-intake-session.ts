import { prisma } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import { getServerEnv } from "@/lib/env";
import { recordAuditEvent } from "@/lib/security/audit-log";
import { startIntakeSessionSchema } from "@/lib/intake/intake-deterministic-schema";
import { toPrismaIntakeStatus, fromAiInterviewStatus } from "@/lib/intake/intake-status";
import { defaultOpenAIInterviewerProvider } from "@/lib/ai/providers/openai-intake-interviewer";
import type { IntakeInterviewerProvider } from "@/lib/ai/providers/intake-interviewer-provider";
import type { IntakeInterviewContext, IntakeQuestion, IntakeStatus } from "@/types/intake-interview";

export interface StartIntakeSessionActor {
  /** AppUser.id (not clerkUserId) — null for guests. */
  userId: string | null;
  institutionId: string | null;
  facilityId: string | null;
}

export interface StartIntakeSessionDeps {
  interviewerProvider?: IntakeInterviewerProvider;
}

export type StartIntakeSessionResult =
  | {
      status: "started";
      sessionId: string;
      intakeStatus: IntakeStatus;
      question: IntakeQuestion | null;
      factualSummary: string;
      unresolvedInformation: string[];
      topicsCovered: string[];
      questionCount: number;
    }
  | { status: "invalid-request"; message: string }
  | { status: "provider-unavailable"; message: string };

const SAFE_UNAVAILABLE_MESSAGE =
  "CaseCompass could not start the interview right now. Your answers are still here, so you can try again.";

/**
 * Validates the deterministic (Layer 1) intake answers, gets the first
 * adaptive question from the AI interviewer, and only then persists the
 * session — a failed AI call never creates a half-started row (the
 * client's already-typed Layer-1 answers stay in its own state and can
 * simply be resubmitted).
 */
export async function startIntakeSession(
  rawInput: unknown,
  actor: StartIntakeSessionActor,
  deps: StartIntakeSessionDeps = {},
): Promise<StartIntakeSessionResult> {
  const parsed = startIntakeSessionSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { status: "invalid-request", message: parsed.error.issues[0]?.message ?? "Invalid request." };
  }

  const provider = deps.interviewerProvider ?? defaultOpenAIInterviewerProvider;
  const { INTAKE_MAX_AI_QUESTIONS } = getServerEnv();

  const context: IntakeInterviewContext = {
    caseType: parsed.data.caseType,
    jurisdiction: parsed.data.jurisdiction,
    proceduralStage: parsed.data.proceduralStage,
    researchGoals: parsed.data.researchGoals,
    documentTypes: parsed.data.documentTypes,
    factualSummary: "",
    unresolvedInformation: [],
    topicsCovered: [],
    priorTurns: [],
    questionCount: 0,
    maxQuestions: INTAKE_MAX_AI_QUESTIONS,
  };

  const aiResult = await provider.getNextStep(context);
  if (aiResult.status !== "ok") {
    await recordAuditEvent({
      actorUserId: actor.userId,
      institutionId: actor.institutionId,
      facilityId: actor.facilityId,
      action: "intake_interview_start_failed",
      outcome: "failure",
      metadata: { reason: aiResult.status },
    });
    return { status: "provider-unavailable", message: SAFE_UNAVAILABLE_MESSAGE };
  }

  const { response } = aiResult;
  const intakeStatus = fromAiInterviewStatus(response.status);

  const session = await prisma.intakeSession.create({
    data: {
      userId: actor.userId,
      institutionId: actor.institutionId,
      facilityId: actor.facilityId,
      status: toPrismaIntakeStatus(intakeStatus),
      caseType: parsed.data.caseType,
      jurisdiction: parsed.data.jurisdiction,
      proceduralStage: parsed.data.proceduralStage,
      researchGoals: parsed.data.researchGoals as Prisma.InputJsonValue,
      documentTypes: parsed.data.documentTypes as Prisma.InputJsonValue,
      factualSummary: response.collectedFactsSummary,
      unresolvedInformation: response.unresolvedInformation as Prisma.InputJsonValue,
      topicsCovered: response.topicsCovered as Prisma.InputJsonValue,
      questionCount: response.question ? 1 : 0,
      currentQuestion: response.question ? (response.question as unknown as Prisma.InputJsonValue) : undefined,
    },
  });

  await recordAuditEvent({
    actorUserId: actor.userId,
    institutionId: actor.institutionId,
    facilityId: actor.facilityId,
    action: "intake_interview_started",
    outcome: "success",
    metadata: { caseType: parsed.data.caseType, intakeStatus },
  });

  return {
    status: "started",
    sessionId: session.id,
    intakeStatus,
    question: response.question,
    factualSummary: response.collectedFactsSummary,
    unresolvedInformation: response.unresolvedInformation,
    topicsCovered: response.topicsCovered,
    questionCount: session.questionCount,
  };
}
