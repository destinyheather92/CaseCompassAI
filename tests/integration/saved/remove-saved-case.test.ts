import { afterAll, afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { removeSavedCase } from "@/lib/saved/remove-saved-case";
import type { AppUser } from "@/lib/auth/authorization";

const createdUserIds: string[] = [];

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
    data: { clerkUserId: `clerk-remove-saved-case-${Date.now()}-${Math.random()}`, role: "INDIVIDUAL" },
  });
  createdUserIds.push(user.id);
  return user;
}

async function makeSavedCase(userId: string) {
  return prisma.savedCase.create({
    data: {
      userId,
      providerName: "courtlistener",
      providerCaseId: "1",
      caseName: "Smith v. State",
      court: "sc",
      jurisdiction: "sc",
      sourceUrl: "https://www.courtlistener.com/opinion/1/smith-v-state/",
      sourceName: "CourtListener (Free Law Project)",
    },
  });
}

describe("removeSavedCase", () => {
  afterEach(async () => {
    await prisma.savedCase.deleteMany({ where: { userId: { in: createdUserIds } } });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.$disconnect();
  });

  it("removes a saved case owned by the acting user", async () => {
    const user = await makeUser();
    const saved = await makeSavedCase(user.id);
    const result = await removeSavedCase(saved.id, asAppUser(user));
    expect(result.status).toBe("removed");
    expect(await prisma.savedCase.findUnique({ where: { id: saved.id } })).toBeNull();
  });

  it("returns not-found for another user's saved case, and does not delete it", async () => {
    const owner = await makeUser();
    const intruder = await makeUser();
    const saved = await makeSavedCase(owner.id);
    const result = await removeSavedCase(saved.id, asAppUser(intruder));
    expect(result.status).toBe("not-found");
    expect(await prisma.savedCase.findUnique({ where: { id: saved.id } })).not.toBeNull();
  });

  it("returns not-found for a nonexistent id", async () => {
    const user = await makeUser();
    const result = await removeSavedCase("nonexistent-id", asAppUser(user));
    expect(result.status).toBe("not-found");
  });
});
