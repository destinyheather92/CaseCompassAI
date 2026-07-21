import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { createInstitutionUser, type ClerkUserCreator } from "@/lib/institution/create-user";

const createdUserIds: string[] = [];
const createdInstitutionIds: string[] = [];

async function makeInstitution() {
  const institution = await prisma.institution.create({
    data: { name: "Create-User Test Institution", code: `create-user-${Date.now()}-${Math.random()}` },
  });
  createdInstitutionIds.push(institution.id);
  return institution;
}

async function makeStaff(institutionId: string) {
  const staff = await prisma.user.create({
    data: { clerkUserId: `clerk-staff-${Date.now()}-${Math.random()}`, role: "INSTITUTION_ADMIN", institutionId },
  });
  createdUserIds.push(staff.id);
  return staff;
}

function fakeClerkCreator(): ClerkUserCreator & { calls: Array<{ username: string; password: string }> } {
  const calls: Array<{ username: string; password: string }> = [];
  const fn = vi.fn(async ({ username, password }: { username: string; password: string }) => {
    calls.push({ username, password });
    return { clerkUserId: `clerk-generated-${username}` };
  }) as unknown as ClerkUserCreator & { calls: typeof calls };
  fn.calls = calls;
  return fn;
}

describe("createInstitutionUser", () => {
  afterEach(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    createdUserIds.length = 0;
  });

  afterAll(async () => {
    await prisma.institution.deleteMany({ where: { id: { in: createdInstitutionIds } } });
    await prisma.$disconnect();
  });

  it("creates a Clerk identity (username+password, no email) and a matching Prisma row pending first login", async () => {
    const institution = await makeInstitution();
    const staff = await makeStaff(institution.id);
    const clerkCreator = fakeClerkCreator();

    const result = await createInstitutionUser(
      { actorUserId: staff.id, institutionId: institution.id, role: "incarcerated-user" },
      { clerkUserCreator: clerkCreator },
    );

    expect(result.status).toBe("created");
    if (result.status !== "created") return;

    expect(clerkCreator.calls).toHaveLength(1);
    expect(clerkCreator.calls[0].username).toBe(result.user.username);
    expect(clerkCreator.calls[0].password).toBe(result.temporaryPassword);
    expect(clerkCreator.calls[0].password.length).toBeGreaterThanOrEqual(10);

    const dbUser = await prisma.user.findUnique({ where: { id: result.user.id } });
    createdUserIds.push(result.user.id);
    expect(dbUser?.role).toBe("INCARCERATED_USER");
    expect(dbUser?.accountStatus).toBe("PENDING_FIRST_LOGIN");
    expect(dbUser?.mustChangePassword).toBe(true);
    expect(dbUser?.institutionId).toBe(institution.id);
    expect(dbUser?.createdById).toBe(staff.id);
    expect(dbUser?.temporaryPasswordExpiresAt).not.toBeNull();
  });

  it("never sends an email or phone to Clerk — only username and password", async () => {
    const institution = await makeInstitution();
    const staff = await makeStaff(institution.id);
    const clerkCreator = fakeClerkCreator();

    const result = await createInstitutionUser(
      { actorUserId: staff.id, institutionId: institution.id, role: "incarcerated-user" },
      { clerkUserCreator: clerkCreator },
    );
    if (result.status === "created") createdUserIds.push(result.user.id);

    expect(Object.keys(clerkCreator.calls[0])).toEqual(["username", "password"]);
  });

  it("rejects a role outside the institution-assignable set even if the type system is bypassed", async () => {
    const institution = await makeInstitution();
    const staff = await makeStaff(institution.id);
    const clerkCreator = fakeClerkCreator();

    const result = await createInstitutionUser(
      {
        actorUserId: staff.id,
        institutionId: institution.id,
        // @ts-expect-error -- intentionally bypassing the type to prove the runtime guard
        role: "system-admin",
      },
      { clerkUserCreator: clerkCreator },
    );

    expect(result.status).toBe("invalid-role");
    expect(clerkCreator.calls).toHaveLength(0);
  });

  it("rejects a staff-supplied username that's already taken", async () => {
    const institution = await makeInstitution();
    const staff = await makeStaff(institution.id);
    const takenUsername = `taken-${Date.now()}`;
    const existing = await prisma.user.create({
      data: { clerkUserId: `clerk-existing-${Date.now()}`, role: "INCARCERATED_USER", username: takenUsername },
    });
    createdUserIds.push(existing.id);

    const result = await createInstitutionUser(
      { actorUserId: staff.id, institutionId: institution.id, role: "incarcerated-user", username: takenUsername },
      { clerkUserCreator: fakeClerkCreator() },
    );

    expect(result.status).toBe("username-taken");
  });

  it("rejects a facility that does not belong to the acting institution", async () => {
    const institutionA = await makeInstitution();
    const institutionB = await makeInstitution();
    const staff = await makeStaff(institutionA.id);
    const facilityInB = await prisma.facility.create({
      data: { institutionId: institutionB.id, name: "Facility B1", code: "b1" },
    });

    const result = await createInstitutionUser(
      {
        actorUserId: staff.id,
        institutionId: institutionA.id,
        role: "incarcerated-user",
        facilityId: facilityInB.id,
      },
      { clerkUserCreator: fakeClerkCreator() },
    );

    expect(result.status).toBe("invalid-facility");
    await prisma.facility.delete({ where: { id: facilityInB.id } });
  });

  it("writes an audit event that excludes the temporary password", async () => {
    const institution = await makeInstitution();
    const staff = await makeStaff(institution.id);

    const result = await createInstitutionUser(
      { actorUserId: staff.id, institutionId: institution.id, role: "educator" },
      { clerkUserCreator: fakeClerkCreator() },
    );
    if (result.status === "created") createdUserIds.push(result.user.id);

    const events = await prisma.auditLog.findMany({ where: { institutionId: institution.id, action: "institution_user_created" } });
    expect(events).toHaveLength(1);
    const metadataString = JSON.stringify(events[0].metadata);
    if (result.status === "created") {
      expect(metadataString).not.toContain(result.temporaryPassword);
    }
    expect(events[0].outcome).toBe("SUCCESS");
    expect(events[0].targetUserId).toBe(result.status === "created" ? result.user.id : undefined);
  });

  it("stores firstName, lastName, docNumber, and housingUnit when provided", async () => {
    const institution = await makeInstitution();
    const staff = await makeStaff(institution.id);

    const result = await createInstitutionUser(
      {
        actorUserId: staff.id,
        institutionId: institution.id,
        role: "incarcerated-user",
        firstName: "Jordan",
        lastName: "Rivera",
        docNumber: "SC-00012345",
        housingUnit: "Block C",
      },
      { clerkUserCreator: fakeClerkCreator() },
    );

    expect(result.status).toBe("created");
    if (result.status !== "created") return;
    createdUserIds.push(result.user.id);

    const stored = await prisma.user.findUnique({ where: { id: result.user.id } });
    expect(stored?.firstName).toBe("Jordan");
    expect(stored?.lastName).toBe("Rivera");
    expect(stored?.docNumber).toBe("SC-00012345");
    expect(stored?.housingUnit).toBe("Block C");
  });
});
