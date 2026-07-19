import { afterAll, afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { getDashboardNavContext } from "@/lib/dashboard/get-dashboard-nav-context";

const createdUserIds: string[] = [];
const createdSessionIds: string[] = [];
const createdRoadmapIds: string[] = [];

async function makeUser() {
  const user = await prisma.user.create({
    data: { clerkUserId: `clerk-nav-context-${Date.now()}-${Math.random()}`, role: "INDIVIDUAL" },
  });
  createdUserIds.push(user.id);
  return user;
}

describe("getDashboardNavContext", () => {
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

  it("returns null ids for a user with no intakes or roadmaps", async () => {
    const user = await makeUser();
    const context = await getDashboardNavContext(user.id);
    expect(context).toEqual({ latestIntakeId: null, latestRoadmapId: null });
  });

  it("returns the most recently updated intake and roadmap, scoped to the user", async () => {
    const user = await makeUser();
    const other = await makeUser();

    const olderSession = await prisma.intakeSession.create({
      data: { userId: user.id, caseType: "criminal", jurisdiction: "SC", proceduralStage: "pre-trial", researchGoals: [], documentTypes: [] },
    });
    createdSessionIds.push(olderSession.id);
    const newerSession = await prisma.intakeSession.create({
      data: { userId: user.id, caseType: "civil", jurisdiction: "SC", proceduralStage: "pre-trial", researchGoals: [], documentTypes: [] },
    });
    createdSessionIds.push(newerSession.id);
    const othersSession = await prisma.intakeSession.create({
      data: { userId: other.id, caseType: "family", jurisdiction: "SC", proceduralStage: "pre-trial", researchGoals: [], documentTypes: [] },
    });
    createdSessionIds.push(othersSession.id);

    const roadmap = await prisma.researchRoadmap.create({
      data: { userId: user.id, title: "x", summary: "x", sourceKind: "DETERMINISTIC_FALLBACK", content: {} },
    });
    createdRoadmapIds.push(roadmap.id);

    const context = await getDashboardNavContext(user.id);
    expect(context.latestIntakeId).toBe(newerSession.id);
    expect(context.latestRoadmapId).toBe(roadmap.id);
  });
});
