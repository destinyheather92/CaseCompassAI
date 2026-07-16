import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { resetInstitutionUserPassword } from "@/lib/institution/reset-user-password";

const createdUserIds: string[] = [];
const createdInstitutionIds: string[] = [];

async function makeInstitution() {
  const institution = await prisma.institution.create({
    data: { name: "Reset Test Institution", code: `reset-test-${Date.now()}-${Math.random()}` },
  });
  createdInstitutionIds.push(institution.id);
  return institution;
}

async function makeStaffUser(institutionId: string) {
  const staff = await prisma.user.create({
    data: { clerkUserId: `clerk-reset-staff-${Date.now()}-${Math.random()}`, role: "INSTITUTION_ADMIN", institutionId },
  });
  createdUserIds.push(staff.id);
  return staff;
}

async function makeTargetUser(institutionId: string | null, overrides: Record<string, unknown> = {}) {
  const user = await prisma.user.create({
    data: {
      clerkUserId: `clerk-reset-target-${Date.now()}-${Math.random()}`,
      role: "INCARCERATED_USER",
      accountStatus: "ACTIVE",
      mustChangePassword: false,
      institutionId,
      ...overrides,
    },
  });
  createdUserIds.push(user.id);
  return user;
}

function fakePasswordSetter() {
  const calls: Array<{ clerkUserId: string; password: string }> = [];
  const fn = vi.fn(async (clerkUserId: string, password: string) => {
    calls.push({ clerkUserId, password });
  });
  return Object.assign(fn, { calls });
}

describe("resetInstitutionUserPassword", () => {
  afterEach(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    createdUserIds.length = 0;
  });

  afterAll(async () => {
    await prisma.institution.deleteMany({ where: { id: { in: createdInstitutionIds } } });
    await prisma.$disconnect();
  });

  it("generates a new temporary password, sets mustChangePassword, and returns to pending-first-login", async () => {
    const institution = await makeInstitution();
    const staff = await makeStaffUser(institution.id);
    const target = await makeTargetUser(institution.id);
    const setter = fakePasswordSetter();

    const result = await resetInstitutionUserPassword(
      { actorUserId: staff.id, institutionId: institution.id, targetUserId: target.id },
      { clerkPasswordSetter: setter },
    );

    expect(result.status).toBe("reset");
    if (result.status !== "reset") return;
    expect(result.temporaryPassword.length).toBeGreaterThanOrEqual(10);
    expect(setter.calls[0]).toEqual({ clerkUserId: target.clerkUserId, password: result.temporaryPassword });

    const updated = await prisma.user.findUnique({ where: { id: target.id } });
    expect(updated?.mustChangePassword).toBe(true);
    expect(updated?.accountStatus).toBe("PENDING_FIRST_LOGIN");
    expect(updated?.temporaryPasswordExpiresAt).not.toBeNull();
  });

  it("rejects resetting a user outside the acting institution", async () => {
    const institutionA = await makeInstitution();
    const institutionB = await makeInstitution();
    const staff = await makeStaffUser(institutionA.id);
    const target = await makeTargetUser(institutionB.id);

    const result = await resetInstitutionUserPassword(
      { actorUserId: staff.id, institutionId: institutionA.id, targetUserId: target.id },
      { clerkPasswordSetter: fakePasswordSetter() },
    );

    expect(result.status).toBe("forbidden-institution");
  });

  it("returns not-found for a nonexistent target", async () => {
    const institution = await makeInstitution();
    const staff = await makeStaffUser(institution.id);
    const result = await resetInstitutionUserPassword(
      { actorUserId: staff.id, institutionId: institution.id, targetUserId: "does-not-exist" },
      { clerkPasswordSetter: fakePasswordSetter() },
    );
    expect(result.status).toBe("not-found");
  });

  it("writes an audit event that never contains the new temporary password", async () => {
    const institution = await makeInstitution();
    const staff = await makeStaffUser(institution.id);
    const target = await makeTargetUser(institution.id);

    const result = await resetInstitutionUserPassword(
      { actorUserId: staff.id, institutionId: institution.id, targetUserId: target.id },
      { clerkPasswordSetter: fakePasswordSetter() },
    );

    const events = await prisma.auditLog.findMany({
      where: { institutionId: institution.id, action: "temporary_password_reset" },
    });
    expect(events).toHaveLength(1);
    if (result.status === "reset") {
      expect(JSON.stringify(events[0].metadata)).not.toContain(result.temporaryPassword);
    }
  });
});
