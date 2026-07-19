import { afterAll, afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { createRoadmapFromIntake } from "@/lib/roadmap/create-roadmap-from-intake";
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
    data: { clerkUserId: `clerk-create-roadmap-${Date.now()}-${Math.random()}`, role: "INDIVIDUAL" },
  });
  createdUserIds.push(user.id);
  return user;
}

async function makeIntake(userId: string, status: "COMPLETED" | "READY_FOR_REVIEW" | "INTERVIEWING" = "COMPLETED") {
  const session = await prisma.intakeSession.create({
    data: {
      userId,
      status,
      caseType: "criminal",
      jurisdiction: "SC",
      proceduralStage: "post-conviction",
      researchGoals: ["understand-case"],
      documentTypes: ["court-opinion"],
    },
  });
  createdSessionIds.push(session.id);
  return session;
}

describe("createRoadmapFromIntake", () => {
  afterEach(async () => {
    await prisma.researchRoadmap.deleteMany({ where: { id: { in: createdRoadmapIds } } });
    createdRoadmapIds.length = 0;
    await prisma.intakeSession.deleteMany({ where: { id: { in: createdSessionIds } } });
    createdSessionIds.length = 0;
  });

  afterAll(async () => {
    await prisma.userActivity.deleteMany({ where: { userId: { in: createdUserIds } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.$disconnect();
  });

  it("creates a valid, schema-conformant roadmap from a completed intake", async () => {
    const user = await makeUser();
    const intake = await makeIntake(user.id, "COMPLETED");

    const result = await createRoadmapFromIntake(intake.id, asAppUser(user));
    expect(result.status).toBe("created");
    if (result.status === "created") {
      createdRoadmapIds.push(result.roadmapId);
      const row = await prisma.researchRoadmap.findUnique({ where: { id: result.roadmapId } });
      expect(row?.userId).toBe(user.id);
      expect(row?.intakeSessionId).toBe(intake.id);
      expect(row?.sourceKind).toBe("DETERMINISTIC_FALLBACK");
    }
  });

  it("rejects generation for an intake that hasn't been confirmed yet", async () => {
    const user = await makeUser();
    const intake = await makeIntake(user.id, "READY_FOR_REVIEW");

    const result = await createRoadmapFromIntake(intake.id, asAppUser(user));
    expect(result.status).toBe("intake-not-ready");
    const roadmaps = await prisma.researchRoadmap.findMany({ where: { intakeSessionId: intake.id } });
    expect(roadmaps).toHaveLength(0);
  });

  it("returns not-found for an intake owned by a different user", async () => {
    const owner = await makeUser();
    const intruder = await makeUser();
    const intake = await makeIntake(owner.id, "COMPLETED");

    const result = await createRoadmapFromIntake(intake.id, asAppUser(intruder));
    expect(result.status).toBe("not-found");
  });

  it("returns not-found for a nonexistent intake id", async () => {
    const user = await makeUser();
    const result = await createRoadmapFromIntake("nonexistent-id", asAppUser(user));
    expect(result.status).toBe("not-found");
  });

  it("records a ROADMAP_GENERATED activity event", async () => {
    const user = await makeUser();
    const intake = await makeIntake(user.id, "COMPLETED");

    const result = await createRoadmapFromIntake(intake.id, asAppUser(user));
    if (result.status === "created") createdRoadmapIds.push(result.roadmapId);

    const events = await prisma.userActivity.findMany({ where: { userId: user.id, type: "ROADMAP_GENERATED" } });
    expect(events).toHaveLength(1);
  });
});
