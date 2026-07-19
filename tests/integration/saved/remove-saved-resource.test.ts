import { afterAll, afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { removeSavedResource } from "@/lib/saved/remove-saved-resource";
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
    data: { clerkUserId: `clerk-remove-saved-${Date.now()}-${Math.random()}`, role: "INDIVIDUAL" },
  });
  createdUserIds.push(user.id);
  return user;
}

describe("removeSavedResource", () => {
  afterEach(async () => {
    await prisma.savedResource.deleteMany({ where: { userId: { in: createdUserIds } } });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.$disconnect();
  });

  it("removes an item owned by the acting user", async () => {
    const user = await makeUser();
    const item = await prisma.savedResource.create({
      data: { userId: user.id, resourceType: "RESOURCE", resourceKey: "legal-research-basics", title: "x" },
    });

    const result = await removeSavedResource(item.id, asAppUser(user));
    expect(result.status).toBe("removed");
    const row = await prisma.savedResource.findUnique({ where: { id: item.id } });
    expect(row).toBeNull();
  });

  it("returns not-found for an item owned by a different user, and does not delete it", async () => {
    const owner = await makeUser();
    const intruder = await makeUser();
    const item = await prisma.savedResource.create({
      data: { userId: owner.id, resourceType: "RESOURCE", resourceKey: "legal-research-basics", title: "x" },
    });

    const result = await removeSavedResource(item.id, asAppUser(intruder));
    expect(result.status).toBe("not-found");
    const row = await prisma.savedResource.findUnique({ where: { id: item.id } });
    expect(row).not.toBeNull();
  });

  it("returns not-found for a nonexistent id", async () => {
    const user = await makeUser();
    const result = await removeSavedResource("nonexistent-id", asAppUser(user));
    expect(result.status).toBe("not-found");
  });
});
