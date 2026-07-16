import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { syncIndividualUserFromClerk } from "@/lib/auth/sync-clerk-user";

const createdUserIds: string[] = [];

describe("syncIndividualUserFromClerk", () => {
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.$disconnect();
  });

  it("creates a Prisma User row for a new Clerk individual signup", async () => {
    const clerkUserId = `clerk-individual-${Date.now()}`;
    const user = await syncIndividualUserFromClerk({ clerkUserId });
    createdUserIds.push(user.id);

    expect(user.clerkUserId).toBe(clerkUserId);
    expect(user.role).toBe("INDIVIDUAL");
    expect(user.accountStatus).toBe("ACTIVE");
    expect(user.mustChangePassword).toBe(false);
  });

  it("is a no-op when a Prisma row already exists for that Clerk id (idempotent on webhook retries)", async () => {
    const clerkUserId = `clerk-individual-${Date.now()}`;
    const first = await syncIndividualUserFromClerk({ clerkUserId });
    createdUserIds.push(first.id);

    const second = await syncIndividualUserFromClerk({ clerkUserId });

    expect(second.id).toBe(first.id);
    const rows = await prisma.user.findMany({ where: { clerkUserId } });
    expect(rows).toHaveLength(1);
  });

  it("does not overwrite an institution-created user's role/institution/mustChangePassword when the delayed webhook arrives", async () => {
    const institution = await prisma.institution.create({
      data: { name: "Sync Test Institution", code: `sync-test-${Date.now()}` },
    });

    const clerkUserId = `clerk-institutional-${Date.now()}`;
    const preCreated = await prisma.user.create({
      data: {
        clerkUserId,
        role: "INCARCERATED_USER",
        accountStatus: "PENDING_FIRST_LOGIN",
        institutionId: institution.id,
        mustChangePassword: true,
        username: `fac-${Date.now()}`,
      },
    });
    createdUserIds.push(preCreated.id);

    // Simulate Clerk's user.created webhook arriving after the
    // institution's own synchronous creation already wrote the row.
    const synced = await syncIndividualUserFromClerk({ clerkUserId });

    expect(synced.id).toBe(preCreated.id);
    expect(synced.role).toBe("INCARCERATED_USER");
    expect(synced.institutionId).toBe(institution.id);
    expect(synced.mustChangePassword).toBe(true);

    await prisma.institution.delete({ where: { id: institution.id } });
  });
});
