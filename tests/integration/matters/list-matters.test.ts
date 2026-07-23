import { afterAll, afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { listMattersForUser } from "@/lib/matters/list-matters";

const createdUserIds: string[] = [];
const createdMatterIds: string[] = [];
const createdIntakeIds: string[] = [];
const createdRoadmapIds: string[] = [];

async function makeUser() {
  const user = await prisma.user.create({
    data: { clerkUserId: `clerk-list-matters-${Date.now()}-${Math.random()}`, role: "INDIVIDUAL" },
  });
  createdUserIds.push(user.id);
  return user;
}

describe("listMattersForUser", () => {
  afterEach(async () => {
    await prisma.researchRoadmap.deleteMany({ where: { id: { in: createdRoadmapIds } } });
    createdRoadmapIds.length = 0;
    await prisma.intakeSession.deleteMany({ where: { id: { in: createdIntakeIds } } });
    createdIntakeIds.length = 0;
    await prisma.matter.deleteMany({ where: { id: { in: createdMatterIds } } });
    createdMatterIds.length = 0;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.$disconnect();
  });

  it("never returns another user's matters", async () => {
    const userA = await makeUser();
    const userB = await makeUser();
    const matterA = await prisma.matter.create({ data: { userId: userA.id, title: "A's Matter" } });
    createdMatterIds.push(matterA.id);
    const matterB = await prisma.matter.create({ data: { userId: userB.id, title: "B's Matter" } });
    createdMatterIds.push(matterB.id);

    const resultsForA = await listMattersForUser(userA.id);
    expect(resultsForA).toHaveLength(1);
    expect(resultsForA[0].id).toBe(matterA.id);
    expect(resultsForA.some((m) => m.id === matterB.id)).toBe(false);
  });

  it("keeps each matter's status independent — completing one matter's roadmap never affects another matter's status", async () => {
    const user = await makeUser();

    const matter1 = await prisma.matter.create({ data: { userId: user.id, title: "Matter 1" } });
    createdMatterIds.push(matter1.id);
    const intake1 = await prisma.intakeSession.create({
      data: { userId: user.id, matterId: matter1.id, status: "COMPLETED", caseType: "criminal", jurisdiction: "SC", proceduralStage: "pretrial", researchGoals: [], documentTypes: [] },
    });
    createdIntakeIds.push(intake1.id);
    const roadmap1 = await prisma.researchRoadmap.create({
      data: {
        userId: user.id,
        matterId: matter1.id,
        intakeSessionId: intake1.id,
        title: "Roadmap 1",
        summary: "x",
        sourceKind: "DETERMINISTIC_FALLBACK",
        content: { steps: [{ id: "step-1" }, { id: "step-2" }] },
      },
    });
    createdRoadmapIds.push(roadmap1.id);
    await prisma.roadmapProgress.create({ data: { userId: user.id, roadmapId: roadmap1.id, stepId: "step-1", status: "COMPLETED" } });
    await prisma.roadmapProgress.create({ data: { userId: user.id, roadmapId: roadmap1.id, stepId: "step-2", status: "COMPLETED" } });

    const matter2 = await prisma.matter.create({ data: { userId: user.id, title: "Matter 2" } });
    createdMatterIds.push(matter2.id);
    const intake2 = await prisma.intakeSession.create({
      data: { userId: user.id, matterId: matter2.id, status: "DRAFT", caseType: "civil", jurisdiction: "GA", proceduralStage: "pretrial", researchGoals: [], documentTypes: [] },
    });
    createdIntakeIds.push(intake2.id);

    const results = await listMattersForUser(user.id);
    const summary1 = results.find((m) => m.id === matter1.id);
    const summary2 = results.find((m) => m.id === matter2.id);

    expect(summary1?.researchStatus).toBe("roadmap-completed");
    expect(summary2?.researchStatus).toBe("intake-in-progress");
    // Matter 2 must never show Matter 1's progress or vice versa.
    expect(summary2?.intakeProgressPercent).not.toBe(100);
  });
});
