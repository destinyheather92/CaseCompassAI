import { afterAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { registerInstitution } from "@/lib/institution/register-institution";
import type { ClerkUserCreator } from "@/lib/institution/create-user";

const createdInstitutionIds: string[] = [];
const createdUserIds: string[] = [];

function fakeClerkCreator(): ClerkUserCreator & { calls: Array<{ username: string; password: string }> } {
  const calls: Array<{ username: string; password: string }> = [];
  const fn = vi.fn(async ({ username, password }: { username: string; password: string }) => {
    calls.push({ username, password });
    return { clerkUserId: `clerk-generated-${username}` };
  }) as unknown as ClerkUserCreator & { calls: typeof calls };
  fn.calls = calls;
  return fn;
}

const baseInput = {
  facilityName: `Test Registration Facility ${Date.now()}`,
  institutionType: "STATE_PRISON" as const,
  contactName: "J. Rivera",
  contactEmail: "j.rivera@example.com",
};

describe("registerInstitution", () => {
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.institution.deleteMany({ where: { id: { in: createdInstitutionIds } } });
    await prisma.$disconnect();
  });

  it("creates an active Institution and an INSTITUTION_ADMIN account pending first login", async () => {
    const clerkCreator = fakeClerkCreator();
    const result = await registerInstitution(baseInput, { clerkUserCreator: clerkCreator });

    expect(result.status).toBe("registered");
    if (result.status !== "registered") return;
    createdInstitutionIds.push(result.institutionId);

    const institution = await prisma.institution.findUnique({ where: { id: result.institutionId } });
    expect(institution?.name).toBe(baseInput.facilityName);
    expect(institution?.contactEmail).toBe(baseInput.contactEmail);
    expect(institution?.active).toBe(true);

    const admin = await prisma.user.findFirst({ where: { institutionId: result.institutionId, role: "INSTITUTION_ADMIN" } });
    createdUserIds.push(admin!.id);
    expect(admin?.accountStatus).toBe("PENDING_FIRST_LOGIN");
    expect(admin?.mustChangePassword).toBe(true);
    expect(admin?.username).toBe(result.adminUsername);
  });

  it("never sends the contact email to the identity provider — only username + password", async () => {
    const clerkCreator = fakeClerkCreator();
    const result = await registerInstitution(
      { ...baseInput, facilityName: `${baseInput.facilityName}-2` },
      { clerkUserCreator: clerkCreator },
    );
    expect(result.status).toBe("registered");
    if (result.status !== "registered") return;
    createdInstitutionIds.push(result.institutionId);
    const admin = await prisma.user.findFirst({ where: { institutionId: result.institutionId, role: "INSTITUTION_ADMIN" } });
    createdUserIds.push(admin!.id);

    expect(clerkCreator.calls).toHaveLength(1);
    expect(clerkCreator.calls[0]).toEqual({ username: result.adminUsername, password: result.temporaryPassword });
  });

  it("writes an audit event that excludes the temporary password", async () => {
    const clerkCreator = fakeClerkCreator();
    const result = await registerInstitution(
      { ...baseInput, facilityName: `${baseInput.facilityName}-3` },
      { clerkUserCreator: clerkCreator },
    );
    expect(result.status).toBe("registered");
    if (result.status !== "registered") return;
    createdInstitutionIds.push(result.institutionId);
    const admin = await prisma.user.findFirst({ where: { institutionId: result.institutionId, role: "INSTITUTION_ADMIN" } });
    createdUserIds.push(admin!.id);

    const events = await prisma.auditLog.findMany({ where: { institutionId: result.institutionId, action: "institution_registered" } });
    expect(events).toHaveLength(1);
    expect(JSON.stringify(events[0].metadata)).not.toContain(result.temporaryPassword);
  });

  it("stores institutionTypeOther only when institutionType is OTHER", async () => {
    const clerkCreator = fakeClerkCreator();
    const result = await registerInstitution(
      { ...baseInput, facilityName: `${baseInput.facilityName}-4`, institutionType: "OTHER", institutionTypeOther: "Tribal Court Facility" },
      { clerkUserCreator: clerkCreator },
    );
    expect(result.status).toBe("registered");
    if (result.status !== "registered") return;
    createdInstitutionIds.push(result.institutionId);
    const admin = await prisma.user.findFirst({ where: { institutionId: result.institutionId, role: "INSTITUTION_ADMIN" } });
    createdUserIds.push(admin!.id);

    const institution = await prisma.institution.findUnique({ where: { id: result.institutionId } });
    expect(institution?.institutionTypeOther).toBe("Tribal Court Facility");
  });
});
