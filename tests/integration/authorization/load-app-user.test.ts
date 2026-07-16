import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { loadAppUserByClerkId, authorize } from "@/lib/auth/authorization";

const createdUserIds: string[] = [];
const createdInstitutionIds: string[] = [];

async function makeUser(overrides: Partial<Parameters<typeof prisma.user.create>[0]["data"]> = {}) {
  const user = await prisma.user.create({
    data: {
      clerkUserId: `clerk-${Date.now()}-${Math.random()}`,
      role: "INCARCERATED_USER",
      accountStatus: "ACTIVE",
      ...overrides,
    },
  });
  createdUserIds.push(user.id);
  return user;
}

describe("loadAppUserByClerkId", () => {
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.institution.deleteMany({ where: { id: { in: createdInstitutionIds } } });
    await prisma.$disconnect();
  });

  it("returns unauthenticated when there is no Clerk session", async () => {
    const result = await loadAppUserByClerkId(null);
    expect(result).toEqual({ ok: false, reason: "unauthenticated", redirectTo: "/sign-in" });
  });

  it("returns account-not-found when the Clerk user has no Prisma row yet", async () => {
    const result = await loadAppUserByClerkId("clerk-id-with-no-app-user");
    expect(result).toEqual({ ok: false, reason: "account-not-found", redirectTo: "/sign-in" });
  });

  it("loads the AppUser for a known Clerk id", async () => {
    const user = await makeUser({ role: "INDIVIDUAL" });
    const result = await loadAppUserByClerkId(user.clerkUserId);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.user.id).toBe(user.id);
      expect(result.user.role).toBe("INDIVIDUAL");
    }
  });

  it("never trusts a client-supplied role or institutionId — it only returns what Prisma has stored", async () => {
    const user = await makeUser({ role: "INCARCERATED_USER", institutionId: null });
    // Simulate a caller trying to smuggle in an elevated role via some
    // other channel — loadAppUserByClerkId takes only the verified Clerk
    // id and ignores everything else, so there's no parameter to smuggle
    // it through in the first place.
    const result = await loadAppUserByClerkId(user.clerkUserId);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.user.role).toBe("INCARCERATED_USER");
      expect(result.user.institutionId).toBeNull();
    }
  });
});

describe("authorize (composed check)", () => {
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  });

  it("passes a fully eligible institution-admin through every check", async () => {
    const institution = await prisma.institution.create({
      data: { name: "Authorize Test Institution", code: `authz-${Date.now()}` },
    });
    createdInstitutionIds.push(institution.id);
    const admin = await makeUser({ role: "INSTITUTION_ADMIN", institutionId: institution.id });

    const result = await authorize(admin.clerkUserId, {
      roles: ["INSTITUTION_ADMIN"],
      institutionId: institution.id,
    });

    expect(result.ok).toBe(true);
  });

  it("blocks a user who must still change their password before any role/institution check runs", async () => {
    const user = await makeUser({ mustChangePassword: true, role: "INCARCERATED_USER" });
    const result = await authorize(user.clerkUserId, { roles: ["INCARCERATED_USER"] });
    expect(result).toMatchObject({ ok: false, reason: "must-change-password" });
  });

  it("blocks a disabled account even though its role/institution would otherwise pass", async () => {
    const user = await makeUser({ accountStatus: "DISABLED", role: "INSTITUTION_ADMIN" });
    const result = await authorize(user.clerkUserId, { roles: ["INSTITUTION_ADMIN"] });
    expect(result).toMatchObject({ ok: false, reason: "account-disabled" });
  });

  it("blocks cross-institution access even for a correctly-roled admin", async () => {
    const institutionA = await prisma.institution.create({
      data: { name: "Institution A", code: `authz-a-${Date.now()}` },
    });
    const institutionB = await prisma.institution.create({
      data: { name: "Institution B", code: `authz-b-${Date.now()}` },
    });
    createdInstitutionIds.push(institutionA.id, institutionB.id);
    const admin = await makeUser({ role: "INSTITUTION_ADMIN", institutionId: institutionA.id });

    const result = await authorize(admin.clerkUserId, {
      roles: ["INSTITUTION_ADMIN"],
      institutionId: institutionB.id,
    });

    expect(result).toMatchObject({ ok: false, reason: "forbidden-institution" });
  });
});
