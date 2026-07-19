import { afterAll, afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { updateSavedCaseNote } from "@/lib/saved/update-saved-case-note";
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
    data: { clerkUserId: `clerk-update-saved-case-note-${Date.now()}-${Math.random()}`, role: "INDIVIDUAL" },
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

describe("updateSavedCaseNote", () => {
  afterEach(async () => {
    await prisma.savedCase.deleteMany({ where: { userId: { in: createdUserIds } } });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.$disconnect();
  });

  it("updates the note for a saved case owned by the caller", async () => {
    const user = await makeUser();
    const saved = await makeSavedCase(user.id);

    const result = await updateSavedCaseNote(saved.id, { note: "Relevant to step 2." }, asAppUser(user));
    expect(result.status).toBe("updated");
    const row = await prisma.savedCase.findUnique({ where: { id: saved.id } });
    expect(row?.note).toBe("Relevant to step 2.");
  });

  it("returns not-found for another user's saved case, and does not modify it", async () => {
    const owner = await makeUser();
    const intruder = await makeUser();
    const saved = await makeSavedCase(owner.id);

    const result = await updateSavedCaseNote(saved.id, { note: "hijacked" }, asAppUser(intruder));
    expect(result.status).toBe("not-found");
    const row = await prisma.savedCase.findUnique({ where: { id: saved.id } });
    expect(row?.note).toBeNull();
  });

  it("rejects a note over 1000 characters", async () => {
    const user = await makeUser();
    const saved = await makeSavedCase(user.id);
    const result = await updateSavedCaseNote(saved.id, { note: "x".repeat(1001) }, asAppUser(user));
    expect(result.status).toBe("invalid-request");
  });
});
