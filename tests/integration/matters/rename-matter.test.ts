import { afterAll, afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { createMatter } from "@/lib/matters/create-matter";
import { renameMatter } from "@/lib/matters/rename-matter";
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
    data: { clerkUserId: `clerk-rename-matter-${Date.now()}-${Math.random()}`, role: "INDIVIDUAL" },
  });
  createdUserIds.push(user.id);
  return user;
}

async function makeMatter(user: { id: string; clerkUserId: string }) {
  const result = await createMatter({}, asAppUser(user));
  if (result.status !== "created") throw new Error("failed to create matter fixture");
  createdMatterIds.push(result.matterId);
  return result.matterId;
}

describe("renameMatter", () => {
  afterEach(async () => {
    await prisma.matter.deleteMany({ where: { id: { in: createdMatterIds } } });
    createdMatterIds.length = 0;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.$disconnect();
  });

  it("renames a matter owned by the caller", async () => {
    const user = await makeUser();
    const matterId = await makeMatter(user);

    const result = await renameMatter(matterId, { title: "Federal Sentencing Appeal" }, asAppUser(user));
    expect(result).toEqual({ status: "renamed", title: "Federal Sentencing Appeal" });

    const row = await prisma.matter.findUnique({ where: { id: matterId } });
    expect(row?.title).toBe("Federal Sentencing Appeal");
  });

  it("persists the new name (a fresh read reflects it, not just the in-memory result)", async () => {
    const user = await makeUser();
    const matterId = await makeMatter(user);

    await renameMatter(matterId, { title: "Immigration Consequences Motion" }, asAppUser(user));
    const reread = await prisma.matter.findUnique({ where: { id: matterId } });
    expect(reread?.title).toBe("Immigration Consequences Motion");
  });

  it("never changes the matter id, so nothing linked to it is disconnected", async () => {
    const user = await makeUser();
    const matterId = await makeMatter(user);

    await renameMatter(matterId, { title: "Renamed Matter" }, asAppUser(user));
    const row = await prisma.matter.findUnique({ where: { id: matterId } });
    expect(row?.id).toBe(matterId);
  });

  it("renaming one matter never renames another matter belonging to the same user", async () => {
    const user = await makeUser();
    const matterA = await makeMatter(user);
    const matterB = await makeMatter(user);

    await renameMatter(matterA, { title: "Matter A Renamed" }, asAppUser(user));

    const rowA = await prisma.matter.findUnique({ where: { id: matterA } });
    const rowB = await prisma.matter.findUnique({ where: { id: matterB } });
    expect(rowA?.title).toBe("Matter A Renamed");
    expect(rowB?.title).toBe("Matter 2");
  });

  it("rejects an empty/whitespace-only name without changing the stored title", async () => {
    const user = await makeUser();
    const matterId = await makeMatter(user);

    const result = await renameMatter(matterId, { title: "   " }, asAppUser(user));
    expect(result.status).toBe("invalid-request");

    const row = await prisma.matter.findUnique({ where: { id: matterId } });
    expect(row?.title).toBe("Matter 1");
  });

  it("rejects a name longer than the maximum length", async () => {
    const user = await makeUser();
    const matterId = await makeMatter(user);

    const result = await renameMatter(matterId, { title: "x".repeat(121) }, asAppUser(user));
    expect(result.status).toBe("invalid-request");
  });

  it("trims surrounding whitespace from an otherwise valid name", async () => {
    const user = await makeUser();
    const matterId = await makeMatter(user);

    const result = await renameMatter(matterId, { title: "  Trimmed Name  " }, asAppUser(user));
    expect(result).toEqual({ status: "renamed", title: "Trimmed Name" });
  });

  it("one user can never rename another user's matter", async () => {
    const owner = await makeUser();
    const intruder = await makeUser();
    const matterId = await makeMatter(owner);

    const result = await renameMatter(matterId, { title: "Hijacked Title" }, asAppUser(intruder));
    expect(result).toEqual({ status: "not-found" });

    const row = await prisma.matter.findUnique({ where: { id: matterId } });
    expect(row?.title).toBe("Matter 1");
  });

  it("returns not-found for a matterId that does not exist", async () => {
    const user = await makeUser();
    const result = await renameMatter("does-not-exist", { title: "Anything" }, asAppUser(user));
    expect(result).toEqual({ status: "not-found" });
  });
});
