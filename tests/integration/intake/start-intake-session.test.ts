import { afterAll, afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { startIntakeSession } from "@/lib/intake/start-intake-session";
import { createStaticInterviewerProvider } from "../../helpers/fake-intake-interviewer-provider";

const validInput = {
  caseType: "criminal",
  jurisdiction: "SC",
  proceduralStage: "post-conviction",
  researchGoals: ["understand-case"],
  documentTypes: ["court-opinion"],
};

const followUpResponse = {
  status: "ok" as const,
  response: {
    status: "needs-more-information" as const,
    question: {
      id: "q1",
      text: "What court handled your case?",
      purpose: "Establish jurisdiction.",
      answerType: "short-text" as const,
      choices: null,
      required: true,
      sensitiveInformationWarning: null,
    },
    collectedFactsSummary: "The user has a pending post-conviction matter.",
    unresolvedInformation: ["Exact court name"],
    topicsCovered: ["case-type", "jurisdiction"],
    completionReason: null,
    safetyFlags: ["none" as const],
  },
};

const createdSessionIds: string[] = [];
const createdUserIds: string[] = [];
const createdInstitutionIds: string[] = [];

describe("startIntakeSession", () => {
  afterEach(async () => {
    await prisma.intakeSession.deleteMany({ where: { id: { in: createdSessionIds } } });
    createdSessionIds.length = 0;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.institution.deleteMany({ where: { id: { in: createdInstitutionIds } } });
    await prisma.$disconnect();
  });

  it("creates a session and returns the first AI question for a guest", async () => {
    const provider = createStaticInterviewerProvider(followUpResponse);
    const result = await startIntakeSession(
      validInput,
      { userId: null, institutionId: null, facilityId: null },
      { interviewerProvider: provider },
    );

    expect(result.status).toBe("started");
    if (result.status === "started") {
      createdSessionIds.push(result.sessionId);
      expect(result.question?.text).toBe("What court handled your case?");
      expect(result.intakeStatus).toBe("interviewing");
    }

    // Verify what was actually persisted, not just the returned result.
    const row = await prisma.intakeSession.findUnique({ where: { id: (result as { sessionId: string }).sessionId } });
    expect(row?.userId).toBeNull();
    expect(row?.caseType).toBe("criminal");
    expect(row?.questionCount).toBe(1);
    expect(row?.currentQuestion).toMatchObject({ id: "q1" });
    expect(row?.status).toBe("INTERVIEWING");
  });

  it("scopes the session to the acting user/institution/facility when authenticated", async () => {
    const institution = await prisma.institution.create({
      data: { name: "Start Session Test Institution", code: `start-session-${Date.now()}` },
    });
    createdInstitutionIds.push(institution.id);
    const facility = await prisma.facility.create({
      data: { institutionId: institution.id, name: "Unit A", code: "unit-a" },
    });
    const user = await prisma.user.create({
      data: {
        clerkUserId: `clerk-start-session-${Date.now()}`,
        role: "INCARCERATED_USER",
        institutionId: institution.id,
        facilityId: facility.id,
      },
    });
    createdUserIds.push(user.id);

    const provider = createStaticInterviewerProvider(followUpResponse);
    const result = await startIntakeSession(
      validInput,
      { userId: user.id, institutionId: institution.id, facilityId: facility.id },
      { interviewerProvider: provider },
    );
    expect(result.status).toBe("started");
    if (result.status === "started") {
      createdSessionIds.push(result.sessionId);
      const row = await prisma.intakeSession.findUnique({ where: { id: result.sessionId } });
      expect(row?.userId).toBe(user.id);
      expect(row?.institutionId).toBe(institution.id);
      expect(row?.facilityId).toBe(facility.id);
    }
  });

  it("rejects malformed input without creating a session or calling the AI provider", async () => {
    const provider = createStaticInterviewerProvider(followUpResponse);
    const result = await startIntakeSession(
      { ...validInput, caseType: "not-a-real-case-type" },
      { userId: null, institutionId: null, facilityId: null },
      { interviewerProvider: provider },
    );
    expect(result.status).toBe("invalid-request");
    expect(provider.calls).toHaveLength(0);
  });

  it("returns a safe provider-unavailable result (not a raw error) and creates no session when the AI call fails", async () => {
    // Unique jurisdiction value so this assertion can't collide with
    // fixtures created concurrently by other test files sharing the DB.
    const uniqueInput = { ...validInput, jurisdiction: `SC-provider-fail-${Date.now()}-${Math.random()}` };
    const provider = createStaticInterviewerProvider({ status: "provider-error", message: "boom" });
    const result = await startIntakeSession(
      uniqueInput,
      { userId: null, institutionId: null, facilityId: null },
      { interviewerProvider: provider },
    );
    expect(result.status).toBe("provider-unavailable");
    if (result.status === "provider-unavailable") {
      expect(result.message).not.toContain("boom");
    }
    const sessions = await prisma.intakeSession.findMany({ where: { jurisdiction: uniqueInput.jurisdiction } });
    expect(sessions).toHaveLength(0);
  });

  it("maps an immediate intake-complete first response to ready-for-review status", async () => {
    const provider = createStaticInterviewerProvider({
      status: "ok",
      response: {
        ...followUpResponse.response,
        status: "intake-complete",
        question: null,
        completionReason: "The user provided all necessary facts immediately.",
      },
    });
    const result = await startIntakeSession(
      validInput,
      { userId: null, institutionId: null, facilityId: null },
      { interviewerProvider: provider },
    );
    expect(result.status).toBe("started");
    if (result.status === "started") {
      createdSessionIds.push(result.sessionId);
      expect(result.intakeStatus).toBe("ready-for-review");
      expect(result.question).toBeNull();
    }
  });

  it("sends the deterministic Layer-1 answers as the initial AI context", async () => {
    const provider = createStaticInterviewerProvider(followUpResponse);
    await startIntakeSession(
      validInput,
      { userId: null, institutionId: null, facilityId: null },
      { interviewerProvider: provider },
    ).then((r) => {
      if (r.status === "started") createdSessionIds.push(r.sessionId);
    });
    expect(provider.calls[0]).toMatchObject({
      caseType: "criminal",
      jurisdiction: "SC",
      proceduralStage: "post-conviction",
      questionCount: 0,
    });
    expect(provider.calls[0].priorTurns).toHaveLength(0);
  });
});
