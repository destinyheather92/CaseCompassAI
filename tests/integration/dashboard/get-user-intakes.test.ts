import { afterAll, afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { getUserIntakes } from "@/lib/dashboard/get-user-intakes";

const createdUserIds: string[] = [];
const createdSessionIds: string[] = [];

async function makeUser() {
  const user = await prisma.user.create({
    data: { clerkUserId: `clerk-get-user-intakes-${Date.now()}-${Math.random()}`, role: "INDIVIDUAL" },
  });
  createdUserIds.push(user.id);
  return user;
}

describe("getUserIntakes", () => {
  afterEach(async () => {
    await prisma.intakeSession.deleteMany({ where: { id: { in: createdSessionIds } } });
    createdSessionIds.length = 0;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.$disconnect();
  });

  it("returns only the calling user's intakes, most recently updated first", async () => {
    const user = await makeUser();
    const other = await makeUser();

    const older = await prisma.intakeSession.create({
      data: {
        userId: user.id,
        caseType: "criminal",
        jurisdiction: "SC",
        proceduralStage: "pre-trial",
        researchGoals: ["understand-case"],
        documentTypes: ["none"],
      },
    });
    createdSessionIds.push(older.id);
    const newer = await prisma.intakeSession.create({
      data: {
        userId: user.id,
        caseType: "civil",
        jurisdiction: "SC",
        proceduralStage: "pre-trial",
        researchGoals: ["understand-case"],
        documentTypes: ["none"],
      },
    });
    createdSessionIds.push(newer.id);
    const othersSession = await prisma.intakeSession.create({
      data: {
        userId: other.id,
        caseType: "family",
        jurisdiction: "SC",
        proceduralStage: "pre-trial",
        researchGoals: ["understand-case"],
        documentTypes: ["none"],
      },
    });
    createdSessionIds.push(othersSession.id);

    const results = await getUserIntakes(user.id);

    expect(results.map((r) => r.id)).toEqual([newer.id, older.id]);
    expect(results.every((r) => r.id !== othersSession.id)).toBe(true);
  });

  it("returns an empty array for a user with no intakes", async () => {
    const user = await makeUser();
    const results = await getUserIntakes(user.id);
    expect(results).toEqual([]);
  });

  it("maps status to the API-facing lowercase form", async () => {
    const user = await makeUser();
    const session = await prisma.intakeSession.create({
      data: {
        userId: user.id,
        status: "COMPLETED",
        caseType: "criminal",
        jurisdiction: "SC",
        proceduralStage: "pre-trial",
        researchGoals: ["understand-case"],
        documentTypes: ["none"],
      },
    });
    createdSessionIds.push(session.id);

    const results = await getUserIntakes(user.id);
    expect(results[0].status).toBe("completed");
  });
});
