import { afterAll, afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import { submitIntakeAnswer } from "@/lib/intake/submit-intake-answer";
import { createScriptedInterviewerProvider, createStaticInterviewerProvider } from "../../helpers/fake-intake-interviewer-provider";
import type { AppUser } from "@/lib/auth/authorization";

const createdSessionIds: string[] = [];
const createdUserIds: string[] = [];

function makeUser(overrides: Partial<AppUser> = {}): AppUser {
  return {
    id: "user-1",
    clerkUserId: "clerk-1",
    role: "INDIVIDUAL",
    accountStatus: "ACTIVE",
    institutionId: null,
    facilityId: null,
    mustChangePassword: false,
    ...overrides,
  };
}

async function makeSession(overrides: Partial<Parameters<typeof prisma.intakeSession.create>[0]["data"]> = {}) {
  const session = await prisma.intakeSession.create({
    data: {
      status: "INTERVIEWING",
      caseType: "criminal",
      jurisdiction: "SC",
      proceduralStage: "post-conviction",
      researchGoals: ["understand-case"] as Prisma.InputJsonValue,
      documentTypes: ["court-opinion"] as Prisma.InputJsonValue,
      factualSummary: "Initial summary.",
      unresolvedInformation: [] as Prisma.InputJsonValue,
      topicsCovered: ["case-type"] as Prisma.InputJsonValue,
      questionCount: 1,
      currentQuestion: {
        id: "q1",
        text: "What court handled your case?",
        purpose: "Establish jurisdiction.",
        answerType: "short-text",
        choices: null,
        required: true,
        sensitiveInformationWarning: null,
      } as Prisma.InputJsonValue,
      ...overrides,
    },
  });
  createdSessionIds.push(session.id);
  return session;
}

const nextQuestionResponse = {
  status: "ok" as const,
  response: {
    status: "needs-more-information" as const,
    question: {
      id: "q2",
      text: "When did the trial take place?",
      purpose: "Establish timeline.",
      answerType: "date" as const,
      choices: null,
      required: true,
      sensitiveInformationWarning: null,
    },
    collectedFactsSummary: "The user's case was handled by Richland County Circuit Court.",
    unresolvedInformation: [],
    topicsCovered: ["case-type", "court"],
    completionReason: null,
    safetyFlags: ["none" as const],
  },
};

describe("submitIntakeAnswer", () => {
  afterEach(async () => {
    await prisma.intakeAnswer.deleteMany({ where: { intakeSessionId: { in: createdSessionIds } } });
    await prisma.intakeSession.deleteMany({ where: { id: { in: createdSessionIds } } });
    createdSessionIds.length = 0;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.$disconnect();
  });

  it("saves the answer, advances to the next question, and updates session state", async () => {
    const session = await makeSession();
    const provider = createStaticInterviewerProvider(nextQuestionResponse);

    const result = await submitIntakeAnswer(
      { sessionId: session.id, questionId: "q1", answerText: "Richland County Circuit Court" },
      null,
      { interviewerProvider: provider },
    );

    expect(result.status).toBe("answered");
    if (result.status === "answered") {
      expect(result.question?.id).toBe("q2");
      expect(result.intakeStatus).toBe("interviewing");
    }

    const savedAnswer = await prisma.intakeAnswer.findFirst({ where: { intakeSessionId: session.id } });
    expect(savedAnswer?.answerText).toBe("Richland County Circuit Court");
    expect(savedAnswer?.sequence).toBe(1);

    const updatedSession = await prisma.intakeSession.findUnique({ where: { id: session.id } });
    expect(updatedSession?.questionCount).toBe(2);
    expect(updatedSession?.currentQuestion).toMatchObject({ id: "q2" });
  });

  it("returns not-found for a nonexistent session", async () => {
    const provider = createStaticInterviewerProvider(nextQuestionResponse);
    const result = await submitIntakeAnswer(
      { sessionId: "does-not-exist", questionId: "q1", answerText: "answer" },
      null,
      { interviewerProvider: provider },
    );
    expect(result.status).toBe("not-found");
  });

  it("rejects a different authenticated user from answering someone else's owned session", async () => {
    const owner = await prisma.user.create({ data: { clerkUserId: `clerk-owner-${Date.now()}`, role: "INDIVIDUAL" } });
    createdUserIds.push(owner.id);
    const session = await makeSession({ userId: owner.id });
    const provider = createStaticInterviewerProvider(nextQuestionResponse);

    const result = await submitIntakeAnswer(
      { sessionId: session.id, questionId: "q1", answerText: "answer" },
      makeUser({ id: "someone-else" }),
      { interviewerProvider: provider },
    );
    expect(result.status).toBe("forbidden");
  });

  it("rejects a questionId that doesn't match the currently pending question", async () => {
    const session = await makeSession();
    const provider = createStaticInterviewerProvider(nextQuestionResponse);
    const result = await submitIntakeAnswer(
      { sessionId: session.id, questionId: "wrong-question-id", answerText: "answer" },
      null,
      { interviewerProvider: provider },
    );
    expect(result.status).toBe("question-mismatch");
    expect(provider.calls).toHaveLength(0);
  });

  it("rejects answering an already-completed session", async () => {
    const session = await makeSession({ status: "COMPLETED", currentQuestion: undefined });
    const provider = createStaticInterviewerProvider(nextQuestionResponse);
    const result = await submitIntakeAnswer(
      { sessionId: session.id, questionId: "q1", answerText: "answer" },
      null,
      { interviewerProvider: provider },
    );
    expect(result.status).toBe("already-completed");
  });

  it("preserves the saved answer and lets a retry succeed when the AI call fails after the answer was saved", async () => {
    const session = await makeSession();
    const failThenSucceed = createScriptedInterviewerProvider([
      { status: "provider-error", message: "boom" },
      nextQuestionResponse,
    ]);

    const firstAttempt = await submitIntakeAnswer(
      { sessionId: session.id, questionId: "q1", answerText: "Richland County Circuit Court" },
      null,
      { interviewerProvider: failThenSucceed },
    );
    expect(firstAttempt.status).toBe("provider-unavailable");

    // The answer must already be saved even though the AI call failed.
    const savedAfterFailure = await prisma.intakeAnswer.findMany({ where: { intakeSessionId: session.id } });
    expect(savedAfterFailure).toHaveLength(1);

    // Retry with the SAME questionId — must not create a duplicate answer.
    const retry = await submitIntakeAnswer(
      { sessionId: session.id, questionId: "q1", answerText: "Richland County Circuit Court" },
      null,
      { interviewerProvider: failThenSucceed },
    );
    expect(retry.status).toBe("answered");

    const savedAfterRetry = await prisma.intakeAnswer.findMany({ where: { intakeSessionId: session.id } });
    expect(savedAfterRetry).toHaveLength(1);
  });

  it("forces ready-for-review once the server-enforced question limit is reached, regardless of what the model wants", async () => {
    const session = await makeSession({ questionCount: 11 });
    // Seed 11 already-answered turns (sequence 0-10) so this submission —
    // answering the pending 12th question — is the one that reaches the
    // INTAKE_MAX_AI_QUESTIONS=12 default ceiling.
    await prisma.intakeAnswer.createMany({
      data: Array.from({ length: 11 }, (_, i) => ({
        intakeSessionId: session.id,
        questionId: `seed-q${i}`,
        questionText: `Question ${i}`,
        answerText: `Answer ${i}`,
        answerType: "short-text",
        sequence: i,
      })),
    });
    // Even if the (fake, misbehaving) provider tries to keep asking
    // questions, the server must not call it once the ceiling is hit.
    const provider = createStaticInterviewerProvider(nextQuestionResponse);

    const result = await submitIntakeAnswer(
      { sessionId: session.id, questionId: "q1", answerText: "Richland County Circuit Court" },
      null,
      { interviewerProvider: provider },
    );

    expect(result.status).toBe("answered");
    if (result.status === "answered") {
      expect(result.intakeStatus).toBe("ready-for-review");
      expect(result.question).toBeNull();
      expect(result.limitReached).toBe(true);
    }
    expect(provider.calls).toHaveLength(0);

    const updatedSession = await prisma.intakeSession.findUnique({ where: { id: session.id } });
    expect(updatedSession?.status).toBe("READY_FOR_REVIEW");
    expect(updatedSession?.currentQuestion).toBeNull();
  });

  it("sends the full prior-turn history to the AI provider on subsequent turns", async () => {
    const session = await makeSession();
    await prisma.intakeAnswer.create({
      data: {
        intakeSessionId: session.id,
        questionId: "q0",
        questionText: "What state is your case in?",
        answerText: "South Carolina",
        answerType: "short-text",
        sequence: 0,
      },
    });
    const provider = createStaticInterviewerProvider(nextQuestionResponse);

    await submitIntakeAnswer(
      { sessionId: session.id, questionId: "q1", answerText: "Richland County Circuit Court" },
      null,
      { interviewerProvider: provider },
    );

    expect(provider.calls[0].priorTurns).toHaveLength(2);
    expect(provider.calls[0].priorTurns[0].answerText).toBe("South Carolina");
    expect(provider.calls[0].priorTurns[1].answerText).toBe("Richland County Circuit Court");
  });

  it("rejects malformed input", async () => {
    const provider = createStaticInterviewerProvider(nextQuestionResponse);
    const result = await submitIntakeAnswer(
      { sessionId: "", questionId: "q1", answerText: "" },
      null,
      { interviewerProvider: provider },
    );
    expect(result.status).toBe("invalid-request");
  });
});
