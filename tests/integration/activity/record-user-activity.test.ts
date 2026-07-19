import { afterAll, afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { recordUserActivity } from "@/lib/activity/record-user-activity";

const createdUserIds: string[] = [];

async function makeUser() {
  const user = await prisma.user.create({
    data: { clerkUserId: `clerk-activity-${Date.now()}-${Math.random()}`, role: "INDIVIDUAL" },
  });
  createdUserIds.push(user.id);
  return user;
}

describe("recordUserActivity", () => {
  afterEach(async () => {
    await prisma.userActivity.deleteMany({ where: { userId: { in: createdUserIds } } });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.$disconnect();
  });

  it("records an approved event", async () => {
    const user = await makeUser();
    await recordUserActivity({ userId: user.id, type: "INTAKE_CONFIRMED", title: "Intake confirmed" });
    const rows = await prisma.userActivity.findMany({ where: { userId: user.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0].type).toBe("INTAKE_CONFIRMED");
  });

  it("silently rejects an unapproved event type without throwing or creating a row", async () => {
    const user = await makeUser();
    await expect(
      recordUserActivity({
        userId: user.id,
        // @ts-expect-error -- intentionally invalid to prove the runtime guard, not just the type system
        type: "SOMETHING_MADE_UP",
        title: "x",
      }),
    ).resolves.not.toThrow();
    const rows = await prisma.userActivity.findMany({ where: { userId: user.id } });
    expect(rows).toHaveLength(0);
  });

  it("truncates an oversized title/description so a full case narrative can never be stored", async () => {
    const user = await makeUser();
    const longNarrative = "The user described their entire case in detail. ".repeat(50);
    await recordUserActivity({
      userId: user.id,
      type: "INTAKE_CONFIRMED",
      title: longNarrative,
      description: longNarrative,
    });
    const rows = await prisma.userActivity.findMany({ where: { userId: user.id } });
    expect(rows[0].title.length).toBeLessThan(longNarrative.length);
    expect(rows[0].title.length).toBeLessThanOrEqual(200);
    expect(rows[0].description?.length).toBeLessThanOrEqual(300);
  });

  it("redacts password-like keys from metadata", async () => {
    const user = await makeUser();
    await recordUserActivity({
      userId: user.id,
      type: "INTAKE_CONFIRMED",
      title: "Intake confirmed",
      metadata: { caseType: "criminal", password: "hunter2" },
    });
    const rows = await prisma.userActivity.findMany({ where: { userId: user.id } });
    const metadata = rows[0].metadata as Record<string, unknown>;
    expect(metadata.caseType).toBe("criminal");
    expect(metadata.password).toBe("[REDACTED]");
  });

  it("redacts token-like keys from metadata", async () => {
    const user = await makeUser();
    await recordUserActivity({
      userId: user.id,
      type: "INTAKE_CONFIRMED",
      title: "Intake confirmed",
      metadata: { sessionToken: "abc123" },
    });
    const rows = await prisma.userActivity.findMany({ where: { userId: user.id } });
    const metadata = rows[0].metadata as Record<string, unknown>;
    expect(metadata.sessionToken).toBe("[REDACTED]");
  });

  it("never stores the full intake description/narrative field even if a caller mistakenly passes it in metadata", async () => {
    const user = await makeUser();
    await recordUserActivity({
      userId: user.id,
      type: "INTAKE_CONFIRMED",
      title: "Intake confirmed",
      metadata: { description: "the user's full private narrative goes here" },
    });
    const rows = await prisma.userActivity.findMany({ where: { userId: user.id } });
    const metadata = rows[0].metadata as Record<string, unknown>;
    expect(metadata.description).toBe("[REDACTED]");
  });
});
