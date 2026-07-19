import { afterAll, afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { getUserActivity } from "@/lib/dashboard/get-user-activity";

const createdUserIds: string[] = [];

async function makeUser() {
  const user = await prisma.user.create({
    data: { clerkUserId: `clerk-get-user-activity-${Date.now()}-${Math.random()}`, role: "INDIVIDUAL" },
  });
  createdUserIds.push(user.id);
  return user;
}

describe("getUserActivity", () => {
  afterEach(async () => {
    await prisma.userActivity.deleteMany({ where: { userId: { in: createdUserIds } } });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.$disconnect();
  });

  it("returns only the calling user's activity, most recent first", async () => {
    const user = await makeUser();
    const other = await makeUser();

    await prisma.userActivity.create({
      data: { userId: user.id, type: "INTAKE_STARTED", title: "Started intake" },
    });
    await prisma.userActivity.create({
      data: { userId: user.id, type: "INTAKE_CONFIRMED", title: "Confirmed intake" },
    });
    await prisma.userActivity.create({
      data: { userId: other.id, type: "INTAKE_STARTED", title: "Someone else's activity" },
    });

    const results = await getUserActivity(user.id);
    expect(results).toHaveLength(2);
    expect(results[0].title).toBe("Confirmed intake");
    expect(results.every((r) => r.title !== "Someone else's activity")).toBe(true);
  });

  it("respects a limit", async () => {
    const user = await makeUser();
    for (let i = 0; i < 5; i++) {
      await prisma.userActivity.create({
        data: { userId: user.id, type: "INTAKE_STARTED", title: `Event ${i}` },
      });
    }
    const results = await getUserActivity(user.id, 3);
    expect(results).toHaveLength(3);
  });

  it("returns an empty array for a user with no activity", async () => {
    const user = await makeUser();
    const results = await getUserActivity(user.id);
    expect(results).toEqual([]);
  });
});
