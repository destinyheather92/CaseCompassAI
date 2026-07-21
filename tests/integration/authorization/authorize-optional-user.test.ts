import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { authorizeOptionalUser } from "@/lib/auth/authorization";

const createdUserIds: string[] = [];

async function makeUser(overrides: Partial<Parameters<typeof prisma.user.create>[0]["data"]> = {}) {
  const user = await prisma.user.create({
    data: {
      clerkUserId: `clerk-optional-${Date.now()}-${Math.random()}`,
      role: "INDIVIDUAL",
      accountStatus: "ACTIVE",
      ...overrides,
    },
  });
  createdUserIds.push(user.id);
  return user;
}

describe("authorizeOptionalUser", () => {
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.$disconnect();
  });

  it("treats no Clerk session as a valid guest — ok:true, user:null", async () => {
    const result = await authorizeOptionalUser(null);
    expect(result).toEqual({ ok: true, user: null });
  });

  it("returns the AppUser for an active, password-complete authenticated user", async () => {
    const user = await makeUser();
    const result = await authorizeOptionalUser(user.clerkUserId);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.user?.id).toBe(user.id);
    }
  });

  it("rejects (does not silently downgrade to guest) an institution-managed signed-in user who must still change their password", async () => {
    const user = await makeUser({ role: "INCARCERATED_USER", mustChangePassword: true, accountStatus: "PENDING_FIRST_LOGIN" });
    const result = await authorizeOptionalUser(user.clerkUserId);
    expect(result).toMatchObject({ ok: false, reason: "must-change-password", redirectTo: "/first-login" });
  });

  it("never blocks an individual account on mustChangePassword — that lifecycle is institution-only", async () => {
    const user = await makeUser({ mustChangePassword: true, accountStatus: "ACTIVE" });
    const result = await authorizeOptionalUser(user.clerkUserId);
    expect(result.ok).toBe(true);
  });

  it("rejects (does not silently downgrade to guest) a disabled signed-in user", async () => {
    const user = await makeUser({ accountStatus: "DISABLED" });
    const result = await authorizeOptionalUser(user.clerkUserId);
    expect(result).toMatchObject({ ok: false, reason: "account-disabled" });
  });

  it("rejects (does not silently downgrade to guest) a locked signed-in user", async () => {
    const user = await makeUser({ accountStatus: "LOCKED" });
    const result = await authorizeOptionalUser(user.clerkUserId);
    expect(result).toMatchObject({ ok: false, reason: "account-locked" });
  });

  it("lazily syncs a Clerk session with no matching Prisma row into a new INDIVIDUAL account, rather than treating a real signed-in user as unauthenticated", async () => {
    const clerkUserId = `clerk-optional-lazy-sync-${Date.now()}-${Math.random()}`;
    const result = await authorizeOptionalUser(clerkUserId);
    expect(result.ok).toBe(true);
    if (result.ok && result.user) {
      createdUserIds.push(result.user.id);
      expect(result.user.role).toBe("INDIVIDUAL");
    }
  });
});
