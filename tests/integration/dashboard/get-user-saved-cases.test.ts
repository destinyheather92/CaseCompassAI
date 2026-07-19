import { afterAll, afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { getUserSavedCases } from "@/lib/dashboard/get-user-saved-cases";

const createdUserIds: string[] = [];

async function makeUser() {
  const user = await prisma.user.create({
    data: { clerkUserId: `clerk-get-user-saved-cases-${Date.now()}-${Math.random()}`, role: "INDIVIDUAL" },
  });
  createdUserIds.push(user.id);
  return user;
}

describe("getUserSavedCases", () => {
  afterEach(async () => {
    await prisma.savedCase.deleteMany({ where: { userId: { in: createdUserIds } } });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.$disconnect();
  });

  it("returns only the calling user's saved cases, most recent first", async () => {
    const user = await makeUser();
    const other = await makeUser();

    await prisma.savedCase.create({
      data: { userId: user.id, providerName: "courtlistener", providerCaseId: "1", caseName: "Older Case", court: "sc", jurisdiction: "sc", sourceUrl: "https://www.courtlistener.com/opinion/1/x/", sourceName: "CourtListener" },
    });
    await prisma.savedCase.create({
      data: { userId: user.id, providerName: "courtlistener", providerCaseId: "2", caseName: "Newer Case", court: "sc", jurisdiction: "sc", sourceUrl: "https://www.courtlistener.com/opinion/2/y/", sourceName: "CourtListener" },
    });
    await prisma.savedCase.create({
      data: { userId: other.id, providerName: "courtlistener", providerCaseId: "3", caseName: "Not Mine", court: "sc", jurisdiction: "sc", sourceUrl: "https://www.courtlistener.com/opinion/3/z/", sourceName: "CourtListener" },
    });

    const results = await getUserSavedCases(user.id);
    expect(results).toHaveLength(2);
    expect(results[0].caseName).toBe("Newer Case");
    expect(results.every((r) => r.caseName !== "Not Mine")).toBe(true);
  });

  it("returns an empty array for a user with no saved cases", async () => {
    const user = await makeUser();
    expect(await getUserSavedCases(user.id)).toEqual([]);
  });
});
