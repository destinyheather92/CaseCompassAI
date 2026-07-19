import { afterAll, afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { updateUserPreferences } from "@/lib/dashboard/update-user-preferences";

const createdUserIds: string[] = [];

async function makeUser() {
  const user = await prisma.user.create({
    data: { clerkUserId: `clerk-update-prefs-${Date.now()}-${Math.random()}`, role: "INDIVIDUAL" },
  });
  createdUserIds.push(user.id);
  return user;
}

describe("updateUserPreferences", () => {
  afterEach(async () => {
    await prisma.user.updateMany({ where: { id: { in: createdUserIds } }, data: { preferences: undefined } });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.$disconnect();
  });

  it("sets preferences for a user with none yet", async () => {
    const user = await makeUser();
    const result = await updateUserPreferences(user.id, { reducedMotion: true });
    expect(result.status).toBe("updated");
    const row = await prisma.user.findUnique({ where: { id: user.id } });
    expect(row?.preferences).toEqual({ reducedMotion: true });
  });

  it("merges with existing preferences rather than overwriting them", async () => {
    const user = await makeUser();
    await updateUserPreferences(user.id, { reducedMotion: true });
    const result = await updateUserPreferences(user.id, { textSize: "large" });
    expect(result.status).toBe("updated");
    const row = await prisma.user.findUnique({ where: { id: user.id } });
    expect(row?.preferences).toEqual({ reducedMotion: true, textSize: "large" });
  });

  it("rejects an invalid textSize value", async () => {
    const user = await makeUser();
    const result = await updateUserPreferences(user.id, { textSize: "huge" });
    expect(result.status).toBe("invalid-request");
  });
});
