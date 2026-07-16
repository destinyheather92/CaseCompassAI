import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { completeFirstLogin } from "@/lib/auth/first-login-password";

const createdUserIds: string[] = [];

async function makeUser(overrides: Record<string, unknown> = {}) {
  const user = await prisma.user.create({
    data: {
      clerkUserId: `clerk-firstlogin-${Date.now()}-${Math.random()}`,
      role: "INCARCERATED_USER",
      accountStatus: "PENDING_FIRST_LOGIN",
      mustChangePassword: true,
      temporaryPasswordExpiresAt: new Date(Date.now() + 1000 * 60 * 60),
      ...overrides,
    },
  });
  createdUserIds.push(user.id);
  return user;
}

function deps(overrides: { verifyPassword?: boolean; setPasswordThrows?: boolean } = {}) {
  const verifyPassword = vi.fn(async () => overrides.verifyPassword ?? true);
  const setPassword = vi.fn(async () => {
    if (overrides.setPasswordThrows) throw new Error("clerk error");
  });
  return { verifyPassword, setPassword };
}

describe("completeFirstLogin", () => {
  afterEach(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    createdUserIds.length = 0;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("verifies the current (temporary) password before changing anything", async () => {
    const user = await makeUser();
    const d = deps({ verifyPassword: true });

    await completeFirstLogin(
      {
        appUserId: user.id,
        clerkUserId: user.clerkUserId,
        mustChangePassword: user.mustChangePassword,
        currentPassword: "the-temp-password",
        newPassword: "correct horse battery staple",
      },
      d,
    );

    expect(d.verifyPassword).toHaveBeenCalledWith(user.clerkUserId, "the-temp-password");
  });

  it("rejects an incorrect current password and never calls setPassword or flips Prisma flags", async () => {
    const user = await makeUser();
    const d = deps({ verifyPassword: false });

    const result = await completeFirstLogin(
      {
        appUserId: user.id,
        clerkUserId: user.clerkUserId,
        mustChangePassword: user.mustChangePassword,
        currentPassword: "wrong-password",
        newPassword: "correct horse battery staple",
      },
      d,
    );

    expect(result.status).toBe("incorrect-current-password");
    expect(d.setPassword).not.toHaveBeenCalled();

    const stillPending = await prisma.user.findUnique({ where: { id: user.id } });
    expect(stillPending?.mustChangePassword).toBe(true);
    expect(stillPending?.accountStatus).toBe("PENDING_FIRST_LOGIN");
  });

  it("on success: sets the new password, activates the account, clears the password-change requirement", async () => {
    const user = await makeUser();
    const d = deps({ verifyPassword: true });

    const result = await completeFirstLogin(
      {
        appUserId: user.id,
        clerkUserId: user.clerkUserId,
        mustChangePassword: user.mustChangePassword,
        currentPassword: "the-temp-password",
        newPassword: "correct horse battery staple",
      },
      d,
    );

    expect(result.status).toBe("changed");
    expect(d.setPassword).toHaveBeenCalledWith(user.clerkUserId, "correct horse battery staple");

    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    expect(updated?.mustChangePassword).toBe(false);
    expect(updated?.accountStatus).toBe("ACTIVE");
    expect(updated?.passwordChangedAt).not.toBeNull();
    expect(updated?.temporaryPasswordExpiresAt).toBeNull();
  });

  it("is a safe no-op (not-required) for a user who has already completed first login", async () => {
    const user = await makeUser({ mustChangePassword: false, accountStatus: "ACTIVE" });
    const d = deps({ verifyPassword: true });

    const result = await completeFirstLogin(
      {
        appUserId: user.id,
        clerkUserId: user.clerkUserId,
        mustChangePassword: user.mustChangePassword,
        currentPassword: "whatever",
        newPassword: "correct horse battery staple",
      },
      d,
    );

    expect(result.status).toBe("not-required");
    expect(d.verifyPassword).not.toHaveBeenCalled();
    expect(d.setPassword).not.toHaveBeenCalled();
  });

  it("fails safely and does not flip Prisma flags if the identity provider errors while setting the new password", async () => {
    const user = await makeUser();
    const d = deps({ verifyPassword: true, setPasswordThrows: true });

    const result = await completeFirstLogin(
      {
        appUserId: user.id,
        clerkUserId: user.clerkUserId,
        mustChangePassword: user.mustChangePassword,
        currentPassword: "the-temp-password",
        newPassword: "correct horse battery staple",
      },
      d,
    );

    expect(result.status).toBe("error");
    const stillPending = await prisma.user.findUnique({ where: { id: user.id } });
    expect(stillPending?.mustChangePassword).toBe(true);
  });

  it("writes an audit event for both success and rejection, excluding both passwords", async () => {
    const user = await makeUser();

    await completeFirstLogin(
      {
        appUserId: user.id,
        clerkUserId: user.clerkUserId,
        mustChangePassword: user.mustChangePassword,
        currentPassword: "wrong",
        newPassword: "correct horse battery staple",
      },
      deps({ verifyPassword: false }),
    );

    const rejectedEvents = await prisma.auditLog.findMany({ where: { targetUserId: user.id, action: "first_login_password_rejected" } });
    expect(rejectedEvents).toHaveLength(1);
    expect(JSON.stringify(rejectedEvents[0].metadata)).not.toContain("wrong");
    expect(JSON.stringify(rejectedEvents[0].metadata)).not.toContain("correct horse battery staple");
  });
});
