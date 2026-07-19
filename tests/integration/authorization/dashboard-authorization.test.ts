import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import {
  requireOwnedIntake,
  requireOwnedRoadmap,
  requireOwnedSavedItem,
  requireOwnedSavedCase,
} from "@/lib/auth/dashboard-authorization";
import type { AppUser } from "@/lib/auth/authorization";

const createdUserIds: string[] = [];
const createdIntakeIds: string[] = [];
const createdRoadmapIds: string[] = [];
const createdSavedIds: string[] = [];
const createdSavedCaseIds: string[] = [];

function makeAppUser(id: string): AppUser {
  return {
    id,
    clerkUserId: `clerk-${id}`,
    role: "INDIVIDUAL",
    accountStatus: "ACTIVE",
    institutionId: null,
    facilityId: null,
    mustChangePassword: false,
  };
}

async function makeUser() {
  const user = await prisma.user.create({
    data: { clerkUserId: `clerk-dashauth-${Date.now()}-${Math.random()}`, role: "INDIVIDUAL" },
  });
  createdUserIds.push(user.id);
  return user;
}

describe("requireOwnedIntake", () => {
  afterAll(async () => {
    await prisma.intakeSession.deleteMany({ where: { id: { in: createdIntakeIds } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.$disconnect();
  });

  it("returns the intake when the caller owns it", async () => {
    const owner = await makeUser();
    const intake = await prisma.intakeSession.create({
      data: {
        userId: owner.id,
        status: "COMPLETED",
        caseType: "criminal",
        jurisdiction: "SC",
        proceduralStage: "post-conviction",
        researchGoals: ["understand-case"] as Prisma.InputJsonValue,
        documentTypes: ["none"] as Prisma.InputJsonValue,
      },
    });
    createdIntakeIds.push(intake.id);

    const result = await requireOwnedIntake(intake.id, makeAppUser(owner.id));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.resource.id).toBe(intake.id);
  });

  it("returns not-found (never forbidden) for a different user's intake", async () => {
    const owner = await makeUser();
    const intake = await prisma.intakeSession.create({
      data: {
        userId: owner.id,
        status: "COMPLETED",
        caseType: "criminal",
        jurisdiction: "SC",
        proceduralStage: "post-conviction",
        researchGoals: ["understand-case"] as Prisma.InputJsonValue,
        documentTypes: ["none"] as Prisma.InputJsonValue,
      },
    });
    createdIntakeIds.push(intake.id);

    const result = await requireOwnedIntake(intake.id, makeAppUser("someone-else"));
    expect(result).toEqual({ ok: false, reason: "not-found" });
  });

  it("returns not-found for a nonexistent intake id (URL manipulation)", async () => {
    const result = await requireOwnedIntake("does-not-exist", makeAppUser("some-user"));
    expect(result).toEqual({ ok: false, reason: "not-found" });
  });
});

describe("requireOwnedRoadmap", () => {
  afterAll(async () => {
    await prisma.researchRoadmap.deleteMany({ where: { id: { in: createdRoadmapIds } } });
  });

  it("returns the roadmap when the caller owns it", async () => {
    const owner = await makeUser();
    const roadmap = await prisma.researchRoadmap.create({
      data: {
        userId: owner.id,
        title: "Test Roadmap",
        summary: "summary",
        sourceKind: "DETERMINISTIC_FALLBACK",
        content: { steps: [] } as Prisma.InputJsonValue,
      },
    });
    createdRoadmapIds.push(roadmap.id);

    const result = await requireOwnedRoadmap(roadmap.id, makeAppUser(owner.id));
    expect(result.ok).toBe(true);
  });

  it("returns not-found for a different user's roadmap", async () => {
    const owner = await makeUser();
    const roadmap = await prisma.researchRoadmap.create({
      data: {
        userId: owner.id,
        title: "Test Roadmap",
        summary: "summary",
        sourceKind: "DETERMINISTIC_FALLBACK",
        content: { steps: [] } as Prisma.InputJsonValue,
      },
    });
    createdRoadmapIds.push(roadmap.id);

    const result = await requireOwnedRoadmap(roadmap.id, makeAppUser("someone-else"));
    expect(result).toEqual({ ok: false, reason: "not-found" });
  });
});

describe("requireOwnedSavedItem", () => {
  afterAll(async () => {
    await prisma.savedResource.deleteMany({ where: { id: { in: createdSavedIds } } });
  });

  it("returns the saved item when the caller owns it", async () => {
    const owner = await makeUser();
    const saved = await prisma.savedResource.create({
      data: {
        userId: owner.id,
        resourceType: "RESOURCE",
        resourceKey: "legal-research-basics",
        title: "Legal Research Basics",
      },
    });
    createdSavedIds.push(saved.id);

    const result = await requireOwnedSavedItem(saved.id, makeAppUser(owner.id));
    expect(result.ok).toBe(true);
  });

  it("returns not-found for a different user's saved item", async () => {
    const owner = await makeUser();
    const saved = await prisma.savedResource.create({
      data: {
        userId: owner.id,
        resourceType: "RESOURCE",
        resourceKey: "legal-research-basics-2",
        title: "Legal Research Basics",
      },
    });
    createdSavedIds.push(saved.id);

    const result = await requireOwnedSavedItem(saved.id, makeAppUser("someone-else"));
    expect(result).toEqual({ ok: false, reason: "not-found" });
  });
});

describe("requireOwnedSavedCase", () => {
  afterAll(async () => {
    await prisma.savedCase.deleteMany({ where: { id: { in: createdSavedCaseIds } } });
  });

  it("returns the saved case when the caller owns it", async () => {
    const owner = await makeUser();
    const saved = await prisma.savedCase.create({
      data: {
        userId: owner.id,
        providerName: "courtlistener",
        providerCaseId: "1",
        caseName: "Smith v. State",
        court: "sc",
        jurisdiction: "sc",
        sourceUrl: "https://www.courtlistener.com/opinion/1/smith-v-state/",
        sourceName: "CourtListener (Free Law Project)",
      },
    });
    createdSavedCaseIds.push(saved.id);

    const result = await requireOwnedSavedCase(saved.id, makeAppUser(owner.id));
    expect(result.ok).toBe(true);
  });

  it("returns not-found for a different user's saved case", async () => {
    const owner = await makeUser();
    const saved = await prisma.savedCase.create({
      data: {
        userId: owner.id,
        providerName: "courtlistener",
        providerCaseId: "2",
        caseName: "Doe v. Roe",
        court: "sc",
        jurisdiction: "sc",
        sourceUrl: "https://www.courtlistener.com/opinion/2/doe-v-roe/",
        sourceName: "CourtListener (Free Law Project)",
      },
    });
    createdSavedCaseIds.push(saved.id);

    const result = await requireOwnedSavedCase(saved.id, makeAppUser("someone-else"));
    expect(result).toEqual({ ok: false, reason: "not-found" });
  });

  it("returns not-found for a nonexistent saved case id (URL manipulation)", async () => {
    const result = await requireOwnedSavedCase("does-not-exist", makeAppUser("some-user"));
    expect(result).toEqual({ ok: false, reason: "not-found" });
  });
});
