import { afterAll, afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { saveResource } from "@/lib/saved/save-resource";
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
    data: { clerkUserId: `clerk-save-resource-${Date.now()}-${Math.random()}`, role: "INDIVIDUAL" },
  });
  createdUserIds.push(user.id);
  return user;
}

describe("saveResource", () => {
  afterEach(async () => {
    await prisma.savedResource.deleteMany({ where: { userId: { in: createdUserIds } } });
    await prisma.userActivity.deleteMany({ where: { userId: { in: createdUserIds } } });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.$disconnect();
  });

  it("saves a resource for the acting user", async () => {
    const user = await makeUser();
    const result = await saveResource(
      { resourceType: "RESOURCE", resourceKey: "legal-research-basics", title: "Legal Research Basics", href: "/resources/legal-research-basics" },
      asAppUser(user),
    );
    expect(result.status).toBe("saved");

    const rows = await prisma.savedResource.findMany({ where: { userId: user.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0].resourceKey).toBe("legal-research-basics");
  });

  it("returns already-saved instead of creating a duplicate row", async () => {
    const user = await makeUser();
    await saveResource({ resourceType: "LEGAL_TERM", resourceKey: "Arraignment", title: "Arraignment" }, asAppUser(user));
    const second = await saveResource({ resourceType: "LEGAL_TERM", resourceKey: "Arraignment", title: "Arraignment" }, asAppUser(user));

    expect(second.status).toBe("already-saved");
    const rows = await prisma.savedResource.findMany({ where: { userId: user.id } });
    expect(rows).toHaveLength(1);
  });

  it("rejects malformed input without creating a row", async () => {
    const user = await makeUser();
    const result = await saveResource({ resourceType: "NOT_REAL", resourceKey: "x", title: "x" }, asAppUser(user));
    expect(result.status).toBe("invalid-request");
    const rows = await prisma.savedResource.findMany({ where: { userId: user.id } });
    expect(rows).toHaveLength(0);
  });

  it("records a RESOURCE_SAVED activity event", async () => {
    const user = await makeUser();
    await saveResource({ resourceType: "RESOURCE", resourceKey: "legal-research-basics", title: "Legal Research Basics" }, asAppUser(user));
    const events = await prisma.userActivity.findMany({ where: { userId: user.id, type: "RESOURCE_SAVED" } });
    expect(events).toHaveLength(1);
  });

  it("records a NOTE_SAVED activity event for NOTE-type saves", async () => {
    const user = await makeUser();
    await saveResource({ resourceType: "NOTE", resourceKey: "note-1", title: "My note title" }, asAppUser(user));
    const events = await prisma.userActivity.findMany({ where: { userId: user.id, type: "NOTE_SAVED" } });
    expect(events).toHaveLength(1);
  });

  it("scopes saved resources per user — two users can save the same key independently", async () => {
    const userA = await makeUser();
    const userB = await makeUser();
    await saveResource({ resourceType: "RESOURCE", resourceKey: "legal-research-basics", title: "x" }, asAppUser(userA));
    const result = await saveResource({ resourceType: "RESOURCE", resourceKey: "legal-research-basics", title: "x" }, asAppUser(userB));
    expect(result.status).toBe("saved");
  });
});
