import { afterAll, afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { saveCase } from "@/lib/saved/save-case";
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
    data: { clerkUserId: `clerk-save-case-${Date.now()}-${Math.random()}`, role: "INDIVIDUAL" },
  });
  createdUserIds.push(user.id);
  return user;
}

const validCase = {
  providerName: "courtlistener",
  providerCaseId: "1",
  caseName: "Smith v. State",
  court: "sc",
  jurisdiction: "sc",
  sourceUrl: "https://www.courtlistener.com/opinion/1/smith-v-state/",
  sourceName: "CourtListener (Free Law Project)",
};

describe("saveCase", () => {
  afterEach(async () => {
    await prisma.savedCase.deleteMany({ where: { userId: { in: createdUserIds } } });
    await prisma.userActivity.deleteMany({ where: { userId: { in: createdUserIds } } });
    await prisma.researchRoadmap.deleteMany({ where: { id: { in: createdRoadmapIds } } });
    createdRoadmapIds.length = 0;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.$disconnect();
  });

  it("saves a case for the acting user", async () => {
    const user = await makeUser();
    const result = await saveCase(validCase, asAppUser(user));
    expect(result.status).toBe("saved");

    const rows = await prisma.savedCase.findMany({ where: { userId: user.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0].caseName).toBe("Smith v. State");
  });

  it("returns already-saved instead of creating a duplicate row for the same provider case", async () => {
    const user = await makeUser();
    await saveCase(validCase, asAppUser(user));
    const second = await saveCase(validCase, asAppUser(user));
    expect(second.status).toBe("already-saved");
    const rows = await prisma.savedCase.findMany({ where: { userId: user.id } });
    expect(rows).toHaveLength(1);
  });

  it("rejects malformed input without creating a row", async () => {
    const user = await makeUser();
    const result = await saveCase({ caseName: "x" }, asAppUser(user));
    expect(result.status).toBe("invalid-request");
    const rows = await prisma.savedCase.findMany({ where: { userId: user.id } });
    expect(rows).toHaveLength(0);
  });

  it("rejects a non-https sourceUrl", async () => {
    const user = await makeUser();
    const result = await saveCase({ ...validCase, sourceUrl: "http://example.com" }, asAppUser(user));
    expect(result.status).toBe("invalid-request");
  });

  it("links the saved case to a roadmap the user owns", async () => {
    const user = await makeUser();
    const roadmap = await prisma.researchRoadmap.create({
      data: { userId: user.id, title: "x", summary: "x", sourceKind: "DETERMINISTIC_FALLBACK", content: {} },
    });
    createdRoadmapIds.push(roadmap.id);

    const result = await saveCase({ ...validCase, roadmapId: roadmap.id, matchedTopic: "habeas corpus" }, asAppUser(user));
    expect(result.status).toBe("saved");
    const rows = await prisma.savedCase.findMany({ where: { userId: user.id } });
    expect(rows[0].roadmapId).toBe(roadmap.id);
    expect(rows[0].matchedTopic).toBe("habeas corpus");
  });

  it("rejects linking to a roadmap the user does not own", async () => {
    const owner = await makeUser();
    const intruder = await makeUser();
    const roadmap = await prisma.researchRoadmap.create({
      data: { userId: owner.id, title: "x", summary: "x", sourceKind: "DETERMINISTIC_FALLBACK", content: {} },
    });
    createdRoadmapIds.push(roadmap.id);

    const result = await saveCase({ ...validCase, roadmapId: roadmap.id }, asAppUser(intruder));
    expect(result.status).toBe("invalid-roadmap");
  });

  it("records a CASE_SAVED activity event", async () => {
    const user = await makeUser();
    await saveCase(validCase, asAppUser(user));
    const events = await prisma.userActivity.findMany({ where: { userId: user.id, type: "CASE_SAVED" } });
    expect(events).toHaveLength(1);
  });

  it("scopes saved cases per user — two users can save the same provider case independently", async () => {
    const userA = await makeUser();
    const userB = await makeUser();
    await saveCase(validCase, asAppUser(userA));
    const result = await saveCase(validCase, asAppUser(userB));
    expect(result.status).toBe("saved");
  });
});
