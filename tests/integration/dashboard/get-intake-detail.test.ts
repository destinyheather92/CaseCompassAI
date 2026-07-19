import { afterAll, afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { getIntakeDetail } from "@/lib/dashboard/get-intake-detail";
import type { AppUser } from "@/lib/auth/authorization";

const createdUserIds: string[] = [];
const createdSessionIds: string[] = [];
const createdRoadmapIds: string[] = [];

function asAppUser(user: { id: string; clerkUserId: string; role: string }): AppUser {
  return {
    id: user.id,
    clerkUserId: user.clerkUserId,
    role: user.role as AppUser["role"],
    accountStatus: "ACTIVE",
    institutionId: null,
    facilityId: null,
    mustChangePassword: false,
  };
}

async function makeUser() {
  const user = await prisma.user.create({
    data: { clerkUserId: `clerk-get-intake-detail-${Date.now()}-${Math.random()}`, role: "INDIVIDUAL" },
  });
  createdUserIds.push(user.id);
  return user;
}

describe("getIntakeDetail", () => {
  afterEach(async () => {
    await prisma.researchRoadmap.deleteMany({ where: { id: { in: createdRoadmapIds } } });
    createdRoadmapIds.length = 0;
    await prisma.intakeSession.deleteMany({ where: { id: { in: createdSessionIds } } });
    createdSessionIds.length = 0;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.$disconnect();
  });

  it("returns full detail including answers and timeline for the owner", async () => {
    const user = await makeUser();
    const session = await prisma.intakeSession.create({
      data: {
        userId: user.id,
        status: "COMPLETED",
        caseType: "criminal",
        jurisdiction: "SC",
        proceduralStage: "post-conviction",
        researchGoals: ["understand-case"],
        documentTypes: ["court-opinion"],
        unresolvedInformation: ["Exact sentencing date"],
        answers: {
          create: [
            { questionId: "q1", questionText: "When was your trial date?", answerText: "2024-03-01", answerType: "date", sequence: 1 },
          ],
        },
      },
    });
    createdSessionIds.push(session.id);

    const result = await getIntakeDetail(session.id, asAppUser(user));
    expect(result.status).toBe("found");
    if (result.status === "found") {
      expect(result.intake.answers).toHaveLength(1);
      expect(result.intake.timeline).toHaveLength(1);
      expect(result.intake.unresolvedInformation).toEqual(["Exact sentencing date"]);
      expect(result.intake.hasRoadmap).toBe(false);
    }
  });

  it("reports hasRoadmap true when a roadmap already exists for this intake", async () => {
    const user = await makeUser();
    const session = await prisma.intakeSession.create({
      data: {
        userId: user.id,
        status: "COMPLETED",
        caseType: "civil",
        jurisdiction: "SC",
        proceduralStage: "pre-trial",
        researchGoals: ["understand-case"],
        documentTypes: ["none"],
      },
    });
    createdSessionIds.push(session.id);
    const roadmap = await prisma.researchRoadmap.create({
      data: {
        userId: user.id,
        intakeSessionId: session.id,
        title: "x",
        summary: "x",
        sourceKind: "DETERMINISTIC_FALLBACK",
        content: {},
      },
    });
    createdRoadmapIds.push(roadmap.id);

    const result = await getIntakeDetail(session.id, asAppUser(user));
    expect(result.status).toBe("found");
    if (result.status === "found") {
      expect(result.intake.hasRoadmap).toBe(true);
    }
  });

  it("returns not-found for an intake owned by a different user", async () => {
    const owner = await makeUser();
    const intruder = await makeUser();
    const session = await prisma.intakeSession.create({
      data: {
        userId: owner.id,
        caseType: "criminal",
        jurisdiction: "SC",
        proceduralStage: "pre-trial",
        researchGoals: ["understand-case"],
        documentTypes: ["none"],
      },
    });
    createdSessionIds.push(session.id);

    const result = await getIntakeDetail(session.id, asAppUser(intruder));
    expect(result.status).toBe("not-found");
  });

  it("returns not-found for a nonexistent intake id", async () => {
    const user = await makeUser();
    const result = await getIntakeDetail("nonexistent-id", asAppUser(user));
    expect(result.status).toBe("not-found");
  });
});
