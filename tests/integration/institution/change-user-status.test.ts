import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { changeInstitutionUserStatus } from "@/lib/institution/change-user-status";

const createdUserIds: string[] = [];
const createdInstitutionIds: string[] = [];

async function makeInstitution() {
  const institution = await prisma.institution.create({
    data: { name: "Status Test Institution", code: `status-test-${Date.now()}-${Math.random()}` },
  });
  createdInstitutionIds.push(institution.id);
  return institution;
}

async function makeStaffUser(institutionId: string) {
  const staff = await prisma.user.create({
    data: { clerkUserId: `clerk-status-staff-${Date.now()}-${Math.random()}`, role: "INSTITUTION_ADMIN", institutionId },
  });
  createdUserIds.push(staff.id);
  return staff;
}

async function makeTargetUser(institutionId: string, overrides: Record<string, unknown> = {}) {
  const user = await prisma.user.create({
    data: {
      clerkUserId: `clerk-status-target-${Date.now()}-${Math.random()}`,
      role: "INCARCERATED_USER",
      accountStatus: "ACTIVE",
      institutionId,
      ...overrides,
    },
  });
  createdUserIds.push(user.id);
  return user;
}

function fakeBanSetter() {
  const calls: Array<{ clerkUserId: string; banned: boolean }> = [];
  const fn = vi.fn(async (clerkUserId: string, banned: boolean) => {
    calls.push({ clerkUserId, banned });
  });
  return Object.assign(fn, { calls });
}

describe("changeInstitutionUserStatus", () => {
  afterEach(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    createdUserIds.length = 0;
  });

  afterAll(async () => {
    await prisma.institution.deleteMany({ where: { id: { in: createdInstitutionIds } } });
    await prisma.$disconnect();
  });

  it("deactivates a user and bans them at the identity-provider level (defense in depth)", async () => {
    const institution = await makeInstitution();
    const staff = await makeStaffUser(institution.id);
    const target = await makeTargetUser(institution.id, { accountStatus: "ACTIVE" });
    const setter = fakeBanSetter();

    const result = await changeInstitutionUserStatus(
      { actorUserId: staff.id, institutionId: institution.id, targetUserId: target.id, action: "deactivate" },
      { clerkBanSetter: setter },
    );

    expect(result).toEqual({ status: "updated", accountStatus: "DISABLED" });
    expect(setter.calls[0]).toEqual({ clerkUserId: target.clerkUserId, banned: true });

    const updated = await prisma.user.findUnique({ where: { id: target.id } });
    expect(updated?.accountStatus).toBe("DISABLED");
  });

  it("reactivates a disabled user and unbans them", async () => {
    const institution = await makeInstitution();
    const staff = await makeStaffUser(institution.id);
    const target = await makeTargetUser(institution.id, { accountStatus: "DISABLED", mustChangePassword: false });
    const setter = fakeBanSetter();

    const result = await changeInstitutionUserStatus(
      { actorUserId: staff.id, institutionId: institution.id, targetUserId: target.id, action: "reactivate" },
      { clerkBanSetter: setter },
    );

    expect(result).toEqual({ status: "updated", accountStatus: "ACTIVE" });
    expect(setter.calls[0]).toEqual({ clerkUserId: target.clerkUserId, banned: false });
  });

  it("reactivating a user who still owes a password change returns them to pending-first-login, not active", async () => {
    const institution = await makeInstitution();
    const staff = await makeStaffUser(institution.id);
    const target = await makeTargetUser(institution.id, { accountStatus: "DISABLED", mustChangePassword: true });

    const result = await changeInstitutionUserStatus(
      { actorUserId: staff.id, institutionId: institution.id, targetUserId: target.id, action: "reactivate" },
      { clerkBanSetter: fakeBanSetter() },
    );

    expect(result).toEqual({ status: "updated", accountStatus: "PENDING_FIRST_LOGIN" });
  });

  it("rejects changing the status of a user outside the acting institution", async () => {
    const institutionA = await makeInstitution();
    const institutionB = await makeInstitution();
    const staff = await makeStaffUser(institutionA.id);
    const target = await makeTargetUser(institutionB.id);

    const result = await changeInstitutionUserStatus(
      { actorUserId: staff.id, institutionId: institutionA.id, targetUserId: target.id, action: "deactivate" },
      { clerkBanSetter: fakeBanSetter() },
    );

    expect(result).toEqual({ status: "forbidden-institution" });
  });

  it("writes a distinct audit action for deactivate vs reactivate", async () => {
    const institution = await makeInstitution();
    const staff = await makeStaffUser(institution.id);
    const target = await makeTargetUser(institution.id);

    await changeInstitutionUserStatus(
      { actorUserId: staff.id, institutionId: institution.id, targetUserId: target.id, action: "deactivate" },
      { clerkBanSetter: fakeBanSetter() },
    );
    await changeInstitutionUserStatus(
      { actorUserId: staff.id, institutionId: institution.id, targetUserId: target.id, action: "reactivate" },
      { clerkBanSetter: fakeBanSetter() },
    );

    const events = await prisma.auditLog.findMany({
      where: { institutionId: institution.id, targetUserId: target.id },
      orderBy: { createdAt: "asc" },
    });
    expect(events.map((e) => e.action)).toEqual(["account_deactivated", "account_reactivated"]);
  });
});
