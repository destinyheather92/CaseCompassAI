import { prisma } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import { getServerEnv } from "@/lib/env";
import { recordAuditEvent } from "@/lib/security/audit-log";
import { submitIntakeAnswerSchema } from "@/lib/intake/intake-deterministic-schema";
import { checkIntakeSessionAccess } from "@/lib/intake/intake-access";
import { toPrismaIntakeStatus, fromAiInterviewStatus } from "@/lib/intake/intake-status";
import { defaultOpenAIInterviewerProvider } from "@/lib/ai/providers/openai-intake-interviewer";
import type { IntakeInterviewerProvider } from "@/lib/ai/providers/intake-interviewer-provider";
import type { AppUser } from "@/lib/auth/authorization";
import type { IntakeInterviewContext, IntakeQuestion, IntakeStatus } from "@/types/intake-interview";

export interface SubmitIntakeAnswerDeps {
  interviewerProvider?: IntakeInterviewerProvider;
}

export type SubmitIntakeAnswerResult =
  | {
      status: "answered";
      intakeStatus: IntakeStatus;
      question: IntakeQuestion | null;
      factualSummary: string;
      unresolvedInformation: string[];
      topicsCovered: string[];
      questionCount: number;
      limitReached: boolean;
    }
  | { status: "invalid-request"; message: string }
  | { status: "not-found" }
  | { status: "forbidden" }
  | { status: "already-completed"; message: string }
  | { status: "question-mismatch"; message: string }
  | { status: "provider-unavailable"; message: string };

const SAFE_UNAVAILABLE_MESSAGE =
  "CaseCompass could not prepare the next question right now. Your answer is saved, so you can try again.";

const TERMINAL_STATUSES = new Set(["COMPLETED", "ABANDONED", "READY_FOR_REVIEW"]);

/**
 * Submits one answer to the currently pending question. Persists the
 * answer before ever calling the AI provider again, so a provider
 * failure never loses what the user already typed — retrying with the
 * same questionId is idempotent (it won't insert a duplicate answer).
 */
export async function submitIntakeAnswer(
  rawInput: unknown,
  actorUser: AppUser | null,
  deps: SubmitIntakeAnswerDeps = {},
): Promise<SubmitIntakeAnswerResult> {
  const parsed = submitIntakeAnswerSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { status: "invalid-request", message: parsed.error.issues[0]?.message ?? "Invalid request." };
  }

  const session = await prisma.intakeSession.findUnique({ where: { id: parsed.data.sessionId } });
  if (!session) {
    return { status: "not-found" };
  }

  const access = checkIntakeSessionAccess({ userId: session.userId }, actorUser);
  if (!access.ok) {
    return { status: "forbidden" };
  }

  if (TERMINAL_STATUSES.has(session.status)) {
    return { status: "already-completed", message: "This intake session is already finished." };
  }

  const currentQuestion = session.currentQuestion as unknown as IntakeQuestion | null;
  if (!currentQuestion) {
    return { status: "question-mismatch", message: "There is no pending question for this session." };
  }

  const alreadyAnswered = await prisma.intakeAnswer.findFirst({
    where: { intakeSessionId: session.id, questionId: parsed.data.questionId },
  });

  if (!alreadyAnswered) {
    if (currentQuestion.id !== parsed.data.questionId) {
      return { status: "question-mismatch", message: "That question is no longer current for this session." };
    }

    await prisma.intakeAnswer.create({
      data: {
        intakeSessionId: session.id,
        questionId: currentQuestion.id,
        questionText: currentQuestion.text,
        answerText: parsed.data.answerText,
        answerType: currentQuestion.answerType,
        sequence: session.questionCount,
      },
    });
  }

  const { INTAKE_MAX_AI_QUESTIONS } = getServerEnv();
  const priorAnswers = await prisma.intakeAnswer.findMany({
    where: { intakeSessionId: session.id },
    orderBy: { sequence: "asc" },
  });

  // Server-enforced ceiling: the model never gets a vote on this. Once
  // reached, force a review state without another provider call.
  if (priorAnswers.length >= INTAKE_MAX_AI_QUESTIONS) {
    const updated = await prisma.intakeSession.update({
      where: { id: session.id },
      data: {
        status: "READY_FOR_REVIEW",
        questionCount: priorAnswers.length,
        currentQuestion: Prisma.DbNull,
      },
    });
    await recordAuditEvent({
      actorUserId: actorUser?.id ?? null,
      institutionId: session.institutionId,
      facilityId: session.facilityId,
      action: "intake_interview_question_limit_reached",
      outcome: "success",
      metadata: { questionCount: priorAnswers.length },
    });
    return {
      status: "answered",
      intakeStatus: "ready-for-review",
      question: null,
      factualSummary: updated.factualSummary,
      unresolvedInformation: updated.unresolvedInformation as string[],
      topicsCovered: updated.topicsCovered as string[],
      questionCount: updated.questionCount,
      limitReached: true,
    };
  }

  const context: IntakeInterviewContext = {
    caseType: session.caseType,
    jurisdiction: session.jurisdiction,
    proceduralStage: session.proceduralStage,
    researchGoals: session.researchGoals as string[],
    documentTypes: session.documentTypes as string[],
    factualSummary: session.factualSummary,
    unresolvedInformation: session.unresolvedInformation as string[],
    topicsCovered: session.topicsCovered as string[],
    priorTurns: priorAnswers.map((answer) => ({
      questionId: answer.questionId,
      questionText: answer.questionText,
      answerText: answer.answerText,
      answerType: answer.answerType,
      sequence: answer.sequence,
    })),
    questionCount: priorAnswers.length,
    maxQuestions: INTAKE_MAX_AI_QUESTIONS,
  };

  const provider = deps.interviewerProvider ?? defaultOpenAIInterviewerProvider;
  const aiResult = await provider.getNextStep(context);

  if (aiResult.status !== "ok") {
    await recordAuditEvent({
      actorUserId: actorUser?.id ?? null,
      institutionId: session.institutionId,
      facilityId: session.facilityId,
      action: "intake_interview_answer_failed",
      outcome: "failure",
      metadata: { reason: aiResult.status },
    });
    return { status: "provider-unavailable", message: SAFE_UNAVAILABLE_MESSAGE };
  }

  const { response } = aiResult;
  const intakeStatus = fromAiInterviewStatus(response.status);
  const newQuestionCount = priorAnswers.length + (response.question ? 1 : 0);

  const updated = await prisma.intakeSession.update({
    where: { id: session.id },
    data: {
      status: toPrismaIntakeStatus(intakeStatus),
      factualSummary: response.collectedFactsSummary,
      unresolvedInformation: response.unresolvedInformation as Prisma.InputJsonValue,
      topicsCovered: response.topicsCovered as Prisma.InputJsonValue,
      questionCount: newQuestionCount,
      currentQuestion: response.question ? (response.question as unknown as Prisma.InputJsonValue) : Prisma.DbNull,
    },
  });

  await recordAuditEvent({
    actorUserId: actorUser?.id ?? null,
    institutionId: session.institutionId,
    facilityId: session.facilityId,
    action: "intake_interview_answer_submitted",
    outcome: "success",
    metadata: { intakeStatus, questionCount: newQuestionCount },
  });

  return {
    status: "answered",
    intakeStatus,
    question: response.question,
    factualSummary: response.collectedFactsSummary,
    unresolvedInformation: response.unresolvedInformation,
    topicsCovered: response.topicsCovered,
    questionCount: updated.questionCount,
    limitReached: false,
  };
}
