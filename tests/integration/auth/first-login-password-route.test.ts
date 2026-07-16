import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

let mockClerkUserId: string | null = null;

vi.mock("@clerk/nextjs/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@clerk/nextjs/server")>();
  return { ...actual, auth: vi.fn(async () => ({ userId: mockClerkUserId })) };
});

vi.mock("@/lib/auth/first-login-password", () => ({
  completeFirstLogin: vi.fn(),
}));

const { completeFirstLogin } = await import("@/lib/auth/first-login-password");
const { POST } = await import("@/app/api/auth/first-login-password/route");

const createdUserIds: string[] = [];

async function makeUser(overrides: Record<string, unknown> = {}) {
  const user = await prisma.user.create({
    data: {
      clerkUserId: `clerk-flp-route-${Date.now()}-${Math.random()}`,
      role: "INCARCERATED_USER",
      accountStatus: "PENDING_FIRST_LOGIN",
      mustChangePassword: true,
      ...overrides,
    },
  });
  createdUserIds.push(user.id);
  return user;
}

function postRequest(body: unknown) {
  return new NextRequest("https://example.com/api/auth/first-login-password", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/first-login-password", () => {
  beforeEach(() => {
    mockClerkUserId = null;
    vi.mocked(completeFirstLogin).mockReset();
  });

  afterEach(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    createdUserIds.length = 0;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns 401 for an unauthenticated request", async () => {
    const response = await POST(
      postRequest({ currentPassword: "temp", newPassword: "correct horse battery", confirmNewPassword: "correct horse battery" }),
    );
    expect(response.status).toBe(401);
    expect(completeFirstLogin).not.toHaveBeenCalled();
  });

  it("allows a DISABLED account to be correctly rejected rather than reaching completeFirstLogin", async () => {
    const user = await makeUser({ accountStatus: "DISABLED" });
    mockClerkUserId = user.clerkUserId;

    const response = await POST(
      postRequest({ currentPassword: "temp", newPassword: "correct horse battery", confirmNewPassword: "correct horse battery" }),
    );
    expect(response.status).toBe(403);
    expect(completeFirstLogin).not.toHaveBeenCalled();
  });

  it("rejects a request whose new password fails policy validation (e.g. too short) before calling completeFirstLogin", async () => {
    const user = await makeUser();
    mockClerkUserId = user.clerkUserId;

    const response = await POST(postRequest({ currentPassword: "temp", newPassword: "short", confirmNewPassword: "short" }));
    expect(response.status).toBe(400);
    expect(completeFirstLogin).not.toHaveBeenCalled();
  });

  it("rejects mismatched confirmation before calling completeFirstLogin", async () => {
    const user = await makeUser();
    mockClerkUserId = user.clerkUserId;

    const response = await POST(
      postRequest({ currentPassword: "temp", newPassword: "correct horse battery", confirmNewPassword: "different phrase" }),
    );
    expect(response.status).toBe(400);
    expect(completeFirstLogin).not.toHaveBeenCalled();
  });

  it("passes validated input through to completeFirstLogin using the server-verified clerkUserId", async () => {
    const user = await makeUser();
    mockClerkUserId = user.clerkUserId;
    vi.mocked(completeFirstLogin).mockResolvedValueOnce({ status: "changed" });

    const response = await POST(
      postRequest({ currentPassword: "temp", newPassword: "correct horse battery", confirmNewPassword: "correct horse battery" }),
    );

    expect(response.status).toBe(200);
    expect(completeFirstLogin).toHaveBeenCalledWith(
      expect.objectContaining({
        appUserId: user.id,
        clerkUserId: user.clerkUserId,
        currentPassword: "temp",
        newPassword: "correct horse battery",
      }),
    );
  });

  it("maps incorrect-current-password to 400", async () => {
    const user = await makeUser();
    mockClerkUserId = user.clerkUserId;
    vi.mocked(completeFirstLogin).mockResolvedValueOnce({ status: "incorrect-current-password" });

    const response = await POST(
      postRequest({ currentPassword: "wrong", newPassword: "correct horse battery", confirmNewPassword: "correct horse battery" }),
    );
    expect(response.status).toBe(400);
  });
});
