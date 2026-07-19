import { afterAll, afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { getRoadmapDetail } from "@/lib/dashboard/get-roadmap-detail";
import type { AppUser } from "@/lib/auth/authorization";

const createdUserIds: string[] = [];
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
    data: { clerkUserId: `clerk-get-roadmap-detail-${Date.now()}-${Math.random()}`, role: "INDIVIDUAL" },
  });
  createdUserIds.push(user.id);
  return user;
}

async function makeRoadmap(userId: string) {
  const roadmap = await prisma.researchRoadmap.create({
    data: {
      userId,
      title: "My Roadmap",
      summary: "Summary",
      sourceKind: "DETERMINISTIC_FALLBACK",
      content: {
        title: "My Roadmap",
        summary: "Summary",
        jurisdiction: { label: "South Carolina", code: "SC", limitationNote: "General only." },
        steps: [
          { id: "step-1", order: 1, title: "Step One", description: "d", whyItMatters: "w", suggestedActions: ["a"], relatedTerms: [] },
        ],
        legalTerms: [],
        sourceSuggestions: [],
        safetyNotes: ["Note"],
        confidence: { level: "low", explanation: "e" },
        disclaimer: "Not legal advice.",
        generatedAt: new Date().toISOString(),
      },
    },
  });
  createdRoadmapIds.push(roadmap.id);
  return roadmap;
}

describe("getRoadmapDetail", () => {
  afterEach(async () => {
    await prisma.roadmapProgress.deleteMany({ where: { roadmapId: { in: createdRoadmapIds } } });
    await prisma.researchRoadmap.deleteMany({ where: { id: { in: createdRoadmapIds } } });
    createdRoadmapIds.length = 0;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.$disconnect();
  });

  it("returns roadmap content with default not-started status for steps with no progress row", async () => {
    const user = await makeUser();
    const roadmap = await makeRoadmap(user.id);

    const result = await getRoadmapDetail(roadmap.id, asAppUser(user));
    expect(result.status).toBe("found");
    if (result.status === "found") {
      expect(result.roadmap.steps).toHaveLength(1);
      expect(result.roadmap.steps[0].status).toBe("not-started");
      expect(result.roadmap.steps[0].note).toBeNull();
    }
  });

  it("merges in the user's own progress and note per step", async () => {
    const user = await makeUser();
    const roadmap = await makeRoadmap(user.id);
    await prisma.roadmapProgress.create({
      data: { userId: user.id, roadmapId: roadmap.id, stepId: "step-1", status: "IN_PROGRESS", note: "Called the clerk." },
    });

    const result = await getRoadmapDetail(roadmap.id, asAppUser(user));
    expect(result.status).toBe("found");
    if (result.status === "found") {
      expect(result.roadmap.steps[0].status).toBe("in-progress");
      expect(result.roadmap.steps[0].note).toBe("Called the clerk.");
    }
  });

  it("returns not-found for a roadmap owned by a different user", async () => {
    const owner = await makeUser();
    const intruder = await makeUser();
    const roadmap = await makeRoadmap(owner.id);

    const result = await getRoadmapDetail(roadmap.id, asAppUser(intruder));
    expect(result.status).toBe("not-found");
  });

  it("returns not-found for a nonexistent roadmap id", async () => {
    const user = await makeUser();
    const result = await getRoadmapDetail("nonexistent-id", asAppUser(user));
    expect(result.status).toBe("not-found");
  });
});
