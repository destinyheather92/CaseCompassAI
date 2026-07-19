import { afterAll, afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { updateRoadmapProgress } from "@/lib/roadmap/update-roadmap-progress";
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
    data: { clerkUserId: `clerk-update-progress-${Date.now()}-${Math.random()}`, role: "INDIVIDUAL" },
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
          { id: "step-1", order: 1, title: "Step One", description: "d", whyItMatters: "w", suggestedActions: [], relatedTerms: [] },
          { id: "step-2", order: 2, title: "Step Two", description: "d", whyItMatters: "w", suggestedActions: [], relatedTerms: [] },
        ],
        legalTerms: [],
        sourceSuggestions: [],
        safetyNotes: [],
        confidence: { level: "low", explanation: "e" },
        disclaimer: "Not legal advice.",
        generatedAt: new Date().toISOString(),
      },
    },
  });
  createdRoadmapIds.push(roadmap.id);
  return roadmap;
}

describe("updateRoadmapProgress", () => {
  afterEach(async () => {
    await prisma.roadmapProgress.deleteMany({ where: { roadmapId: { in: createdRoadmapIds } } });
    await prisma.researchRoadmap.deleteMany({ where: { id: { in: createdRoadmapIds } } });
    createdRoadmapIds.length = 0;
  });

  afterAll(async () => {
    await prisma.userActivity.deleteMany({ where: { userId: { in: createdUserIds } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.$disconnect();
  });

  it("creates a progress row on first update and sets startedAt", async () => {
    const user = await makeUser();
    const roadmap = await makeRoadmap(user.id);

    const result = await updateRoadmapProgress(roadmap.id, { stepId: "step-1", status: "in-progress" }, asAppUser(user));

    expect(result.status).toBe("updated");
    if (result.status === "updated") {
      expect(result.progress.status).toBe("in-progress");
      expect(result.progress.startedAt).not.toBeNull();
      expect(result.progress.completedAt).toBeNull();
    }
  });

  it("sets completedAt when marked completed", async () => {
    const user = await makeUser();
    const roadmap = await makeRoadmap(user.id);

    const result = await updateRoadmapProgress(roadmap.id, { stepId: "step-1", status: "completed" }, asAppUser(user));

    expect(result.status).toBe("updated");
    if (result.status === "updated") {
      expect(result.progress.completedAt).not.toBeNull();
    }
  });

  it("clears startedAt/completedAt when reset back to not-started", async () => {
    const user = await makeUser();
    const roadmap = await makeRoadmap(user.id);
    await updateRoadmapProgress(roadmap.id, { stepId: "step-1", status: "completed" }, asAppUser(user));

    const result = await updateRoadmapProgress(roadmap.id, { stepId: "step-1", status: "not-started" }, asAppUser(user));

    expect(result.status).toBe("updated");
    if (result.status === "updated") {
      expect(result.progress.startedAt).toBeNull();
      expect(result.progress.completedAt).toBeNull();
    }
  });

  it("preserves an existing note when a later update omits it", async () => {
    const user = await makeUser();
    const roadmap = await makeRoadmap(user.id);
    await updateRoadmapProgress(roadmap.id, { stepId: "step-1", status: "in-progress", note: "My private note" }, asAppUser(user));

    const result = await updateRoadmapProgress(roadmap.id, { stepId: "step-1", status: "completed" }, asAppUser(user));

    expect(result.status).toBe("updated");
    if (result.status === "updated") {
      expect(result.progress.note).toBe("My private note");
    }
  });

  it("returns not-found for a roadmap owned by a different user", async () => {
    const owner = await makeUser();
    const intruder = await makeUser();
    const roadmap = await makeRoadmap(owner.id);

    const result = await updateRoadmapProgress(roadmap.id, { stepId: "step-1", status: "completed" }, asAppUser(intruder));
    expect(result.status).toBe("not-found");
  });

  it("returns not-found for a nonexistent roadmap id", async () => {
    const user = await makeUser();
    const result = await updateRoadmapProgress("nonexistent-id", { stepId: "step-1", status: "completed" }, asAppUser(user));
    expect(result.status).toBe("not-found");
  });

  it("rejects a stepId that doesn't exist on this roadmap's content", async () => {
    const user = await makeUser();
    const roadmap = await makeRoadmap(user.id);
    const result = await updateRoadmapProgress(roadmap.id, { stepId: "step-does-not-exist", status: "completed" }, asAppUser(user));
    expect(result.status).toBe("invalid-step");
  });

  it("rejects malformed input", async () => {
    const user = await makeUser();
    const roadmap = await makeRoadmap(user.id);
    const result = await updateRoadmapProgress(roadmap.id, { stepId: "step-1", status: "not-a-real-status" }, asAppUser(user));
    expect(result.status).toBe("invalid-request");
  });

  it("records a ROADMAP_STEP_STARTED activity event exactly once when moving into in-progress", async () => {
    const user = await makeUser();
    const roadmap = await makeRoadmap(user.id);
    await updateRoadmapProgress(roadmap.id, { stepId: "step-1", status: "in-progress" }, asAppUser(user));
    await updateRoadmapProgress(roadmap.id, { stepId: "step-1", status: "in-progress" }, asAppUser(user));

    const events = await prisma.userActivity.findMany({ where: { userId: user.id, type: "ROADMAP_STEP_STARTED" } });
    expect(events).toHaveLength(1);
  });

  it("records a ROADMAP_STEP_COMPLETED activity event when moving into completed", async () => {
    const user = await makeUser();
    const roadmap = await makeRoadmap(user.id);
    await updateRoadmapProgress(roadmap.id, { stepId: "step-1", status: "completed" }, asAppUser(user));

    const events = await prisma.userActivity.findMany({ where: { userId: user.id, type: "ROADMAP_STEP_COMPLETED" } });
    expect(events).toHaveLength(1);
  });

  it("tracks progress independently per step", async () => {
    const user = await makeUser();
    const roadmap = await makeRoadmap(user.id);
    await updateRoadmapProgress(roadmap.id, { stepId: "step-1", status: "completed" }, asAppUser(user));
    await updateRoadmapProgress(roadmap.id, { stepId: "step-2", status: "in-progress" }, asAppUser(user));

    const rows = await prisma.roadmapProgress.findMany({ where: { roadmapId: roadmap.id }, orderBy: { stepId: "asc" } });
    expect(rows).toHaveLength(2);
    expect(rows[0].status).toBe("COMPLETED");
    expect(rows[1].status).toBe("IN_PROGRESS");
  });
});
