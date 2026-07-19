import { afterAll, afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { getUserSavedItems } from "@/lib/dashboard/get-user-saved-items";

const createdUserIds: string[] = [];

async function makeUser() {
  const user = await prisma.user.create({
    data: { clerkUserId: `clerk-get-user-saved-items-${Date.now()}-${Math.random()}`, role: "INDIVIDUAL" },
  });
  createdUserIds.push(user.id);
  return user;
}

describe("getUserSavedItems", () => {
  afterEach(async () => {
    await prisma.savedResource.deleteMany({ where: { userId: { in: createdUserIds } } });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.$disconnect();
  });

  it("returns only the calling user's saved items, most recent first", async () => {
    const user = await makeUser();
    const other = await makeUser();

    await prisma.savedResource.create({
      data: { userId: user.id, resourceType: "RESOURCE", resourceKey: "legal-research-basics", title: "Legal Research Basics" },
    });
    await prisma.savedResource.create({
      data: { userId: user.id, resourceType: "LEGAL_TERM", resourceKey: "Arraignment", title: "Arraignment" },
    });
    await prisma.savedResource.create({
      data: { userId: other.id, resourceType: "RESOURCE", resourceKey: "legal-research-basics", title: "Not mine" },
    });

    const results = await getUserSavedItems(user.id);
    expect(results).toHaveLength(2);
    expect(results[0].resourceKey).toBe("Arraignment");
    expect(results.every((r) => r.title !== "Not mine")).toBe(true);
  });

  it("filters by resourceType when provided", async () => {
    const user = await makeUser();
    await prisma.savedResource.create({
      data: { userId: user.id, resourceType: "RESOURCE", resourceKey: "legal-research-basics", title: "Legal Research Basics" },
    });
    await prisma.savedResource.create({
      data: { userId: user.id, resourceType: "LEGAL_TERM", resourceKey: "Arraignment", title: "Arraignment" },
    });

    const results = await getUserSavedItems(user.id, "LEGAL_TERM");
    expect(results).toHaveLength(1);
    expect(results[0].resourceType).toBe("LEGAL_TERM");
  });

  it("returns an empty array for a user with no saved items", async () => {
    const user = await makeUser();
    const results = await getUserSavedItems(user.id);
    expect(results).toEqual([]);
  });
});
