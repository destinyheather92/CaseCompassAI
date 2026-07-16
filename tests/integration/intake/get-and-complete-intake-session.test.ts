import { afterAll, afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import { getIntakeSession } from "@/lib/intake/get-intake-session";
import { completeIntakeSession } from "@/lib/intake/complete-intake-session";
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
      status: "READY_FOR_REVIEW",
      caseType: "criminal",
      jurisdiction: "SC",
      proceduralStage: "post-conviction",
      researchGoals: ["understand-case"] as Prisma.InputJsonValue,
      documentTypes: ["court-opinion"] as Prisma.InputJsonValue,
      factualSummary: "Summary.",
      unresolvedInformation: [] as Prisma.InputJsonValue,
      topicsCovered: ["case-type"] as Prisma.InputJsonValue,
      questionCount: 2,
      ...overrides,
    },
  });
  createdSessionIds.push(session.id);
  return session;
}

describe("getIntakeSession", () => {
  afterEach(async () => {
    await prisma.intakeAnswer.deleteMany({ where: { intakeSessionId: { in: createdSessionIds } } });
    await prisma.intakeSession.deleteMany({ where: { id: { in: createdSessionIds } } });
    createdSessionIds.length = 0;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.$disconnect();
  });

  it("returns the session with its ordered answers for the owning guest (no auth)", async () => {
    const session = await makeSession();
    await prisma.intakeAnswer.create({
      data: {
        intakeSessionId: session.id,
        questionId: "q0",
        questionText: "What state?",
        answerText: "SC",
        answerType: "short-text",
        sequence: 0,
      },
    });

    const result = await getIntakeSession(session.id, null);
    expect(result.status).toBe("found");
    if (result.status === "found") {
      expect(result.session.id).toBe(session.id);
      expect(result.session.answers).toHaveLength(1);
      expect(result.session.answers[0].answerText).toBe("SC");
    }
  });

  it("returns not-found for a nonexistent session", async () => {
    const result = await getIntakeSession("does-not-exist", null);
    expect(result.status).toBe("not-found");
  });

  it("rejects a different authenticated user from reading someone else's owned session", async () => {
    const owner = await prisma.user.create({ data: { clerkUserId: `clerk-owner-${Date.now()}`, role: "INDIVIDUAL" } });
    createdUserIds.push(owner.id);
    const session = await makeSession({ userId: owner.id });
    const result = await getIntakeSession(session.id, makeUser({ id: "someone-else" }));
    expect(result.status).toBe("forbidden");
  });

  it("never includes the AI system prompt or provider request internals in the returned shape", async () => {
    const session = await makeSession();
    const result = await getIntakeSession(session.id, null);
    expect(JSON.stringify(result)).not.toContain("You are the structured intake interviewer");
  });
});

describe("completeIntakeSession", () => {
  afterEach(async () => {
    await prisma.intakeSession.deleteMany({ where: { id: { in: createdSessionIds } } });
    createdSessionIds.length = 0;
  });

  it("completes a ready-for-review session once acknowledged", async () => {
    const session = await makeSession({ status: "READY_FOR_REVIEW" });
    const result = await completeIntakeSession(session.id, true, null);
    expect(result.status).toBe("completed");

    const updated = await prisma.intakeSession.findUnique({ where: { id: session.id } });
    expect(updated?.status).toBe("COMPLETED");
    expect(updated?.completedAt).not.toBeNull();
  });

  it("rejects completion without acknowledgement", async () => {
    const session = await makeSession({ status: "READY_FOR_REVIEW" });
    const result = await completeIntakeSession(session.id, false, null);
    expect(result.status).toBe("acknowledgement-required");

    const updated = await prisma.intakeSession.findUnique({ where: { id: session.id } });
    expect(updated?.status).toBe("READY_FOR_REVIEW");
  });

  it("rejects completing a session that isn't ready-for-review yet", async () => {
    const session = await makeSession({ status: "INTERVIEWING" });
    const result = await completeIntakeSession(session.id, true, null);
    expect(result.status).toBe("not-ready");
  });

  it("rejects completion by a non-owning authenticated user", async () => {
    const owner = await prisma.user.create({ data: { clerkUserId: `clerk-owner2-${Date.now()}`, role: "INDIVIDUAL" } });
    createdUserIds.push(owner.id);
    const session = await makeSession({ userId: owner.id, status: "READY_FOR_REVIEW" });
    const result = await completeIntakeSession(session.id, true, makeUser({ id: "someone-else" }));
    expect(result.status).toBe("forbidden");
  });

  it("returns not-found for a nonexistent session", async () => {
    const result = await completeIntakeSession("does-not-exist", true, null);
    expect(result.status).toBe("not-found");
  });
});
