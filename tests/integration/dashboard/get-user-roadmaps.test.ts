import { afterAll, afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { getUserRoadmaps } from "@/lib/dashboard/get-user-roadmaps";
import type { ResearchRoadmapContent } from "@/types/roadmap";

const createdUserIds: string[] = [];
const createdRoadmapIds: string[] = [];
const createdProgressIds: string[] = [];

async function makeUser() {
  const user = await prisma.user.create({
    data: { clerkUserId: `clerk-get-user-roadmaps-${Date.now()}-${Math.random()}`, role: "INDIVIDUAL" },
  });
  createdUserIds.push(user.id);
  return user;
}

function makeContent(stepCount: number): ResearchRoadmapContent {
  return {
    title: "Understanding Your Criminal Case",
    summary: "A general starting point.",
    jurisdiction: { label: "South Carolina", code: "SC", limitationNote: "General info only." },
    steps: Array.from({ length: stepCount }, (_, i) => ({
      id: `step-${i + 1}`,
      order: i + 1,
      title: `Step ${i + 1}`,
      description: "Description",
      whyItMatters: "Matters",
      suggestedActions: ["Do a thing"],
      relatedTerms: [],
    })),
    legalTerms: [],
    sourceSuggestions: [],
    safetyNotes: [],
    confidence: { level: "low", explanation: "General only." },
    disclaimer: "Not legal advice.",
    generatedAt: new Date().toISOString(),
  };
}

describe("getUserRoadmaps", () => {
  afterEach(async () => {
    await prisma.roadmapProgress.deleteMany({ where: { id: { in: createdProgressIds } } });
    createdProgressIds.length = 0;
    await prisma.researchRoadmap.deleteMany({ where: { id: { in: createdRoadmapIds } } });
    createdRoadmapIds.length = 0;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.$disconnect();
  });

  it("returns only the calling user's roadmaps with step-count rollups", async () => {
    const user = await makeUser();
    const other = await makeUser();

    const roadmap = await prisma.researchRoadmap.create({
      data: {
        userId: user.id,
        title: "My Roadmap",
        summary: "Summary",
        sourceKind: "DETERMINISTIC_FALLBACK",
        content: JSON.parse(JSON.stringify(makeContent(3))),
      },
    });
    createdRoadmapIds.push(roadmap.id);

    const othersRoadmap = await prisma.researchRoadmap.create({
      data: {
        userId: other.id,
        title: "Not Mine",
        summary: "Summary",
        sourceKind: "DETERMINISTIC_FALLBACK",
        content: JSON.parse(JSON.stringify(makeContent(2))),
      },
    });
    createdRoadmapIds.push(othersRoadmap.id);

    const progress = await prisma.roadmapProgress.create({
      data: { userId: user.id, roadmapId: roadmap.id, stepId: "step-1", status: "COMPLETED" },
    });
    createdProgressIds.push(progress.id);
    const progress2 = await prisma.roadmapProgress.create({
      data: { userId: user.id, roadmapId: roadmap.id, stepId: "step-2", status: "IN_PROGRESS" },
    });
    createdProgressIds.push(progress2.id);

    const results = await getUserRoadmaps(user.id);

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe(roadmap.id);
    expect(results[0].totalSteps).toBe(3);
    expect(results[0].completedSteps).toBe(1);
    expect(results[0].startedSteps).toBe(1);
  });

  it("returns an empty array for a user with no roadmaps", async () => {
    const user = await makeUser();
    const results = await getUserRoadmaps(user.id);
    expect(results).toEqual([]);
  });

  it("reports zero progress for a roadmap with no RoadmapProgress rows yet", async () => {
    const user = await makeUser();
    const roadmap = await prisma.researchRoadmap.create({
      data: {
        userId: user.id,
        title: "Fresh Roadmap",
        summary: "Summary",
        sourceKind: "DETERMINISTIC_FALLBACK",
        content: JSON.parse(JSON.stringify(makeContent(4))),
      },
    });
    createdRoadmapIds.push(roadmap.id);

    const results = await getUserRoadmaps(user.id);
    expect(results[0].totalSteps).toBe(4);
    expect(results[0].completedSteps).toBe(0);
    expect(results[0].startedSteps).toBe(0);
  });
});
