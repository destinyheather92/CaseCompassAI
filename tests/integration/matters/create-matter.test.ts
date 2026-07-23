import { afterAll, afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { createMatter } from "@/lib/matters/create-matter";
import type { AppUser } from "@/lib/auth/authorization";

const createdUserIds: string[] = [];
const createdMatterIds: string[] = [];

function asAppUser(user: { id: string; clerkUserId: string }): AppUser {
  return {
    id: user.id,
    clerkUserId: user.clerkUserId,
    role: "INDIVIDUAL",
    accountStatus: "ACTIVE",
    institutionId: null,
    facilityId: null,
    mustChangePassword: false,
  };
}

async function makeUser() {
  const user = await prisma.user.create({
    data: { clerkUserId: `clerk-create-matter-${Date.now()}-${Math.random()}`, role: "INDIVIDUAL" },
  });
  createdUserIds.push(user.id);
  return user;
}

describe("createMatter", () => {
  afterEach(async () => {
    await prisma.matter.deleteMany({ where: { id: { in: createdMatterIds } } });
    createdMatterIds.length = 0;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.$disconnect();
  });

  it("creates a matter owned by the acting user with a default title", async () => {
    const user = await makeUser();
    const result = await createMatter({}, asAppUser(user));
    expect(result.status).toBe("created");
    if (result.status === "created") {
      createdMatterIds.push(result.matterId);
      expect(result.title).toBe("Matter 1");
    }

    const row = await prisma.matter.findUnique({ where: { id: (result as { matterId: string }).matterId } });
    expect(row?.userId).toBe(user.id);
    expect(row?.status).toBe("ACTIVE");
  });

  it("numbers sequential default titles per user", async () => {
    const user = await makeUser();
    const first = await createMatter({}, asAppUser(user));
    const second = await createMatter({}, asAppUser(user));
    if (first.status === "created") createdMatterIds.push(first.matterId);
    if (second.status === "created") createdMatterIds.push(second.matterId);
    expect(first.status === "created" && first.title).toBe("Matter 1");
    expect(second.status === "created" && second.title).toBe("Matter 2");
  });

  it("uses a caller-supplied title instead of the default when given", async () => {
    const user = await makeUser();
    const result = await createMatter({ title: "My Appeal" }, asAppUser(user));
    if (result.status === "created") createdMatterIds.push(result.matterId);
    expect(result.status === "created" && result.title).toBe("My Appeal");
  });

  it("rejects malformed input without creating a row", async () => {
    const user = await makeUser();
    const before = await prisma.matter.count({ where: { userId: user.id } });
    const result = await createMatter({ title: 12345 }, asAppUser(user));
    expect(result.status).toBe("invalid-request");
    const after = await prisma.matter.count({ where: { userId: user.id } });
    expect(after).toBe(before);
  });

  it("never creates a matter for anyone but the authenticated caller", async () => {
    const userA = await makeUser();
    const userB = await makeUser();
    const result = await createMatter({}, asAppUser(userA));
    if (result.status === "created") createdMatterIds.push(result.matterId);
    const bMatters = await prisma.matter.count({ where: { userId: userB.id } });
    expect(bMatters).toBe(0);
  });
});
