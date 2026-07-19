import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";

let mockClerkUserId: string | null = null;

vi.mock("@clerk/nextjs/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@clerk/nextjs/server")>();
  return { ...actual, auth: vi.fn(async () => ({ userId: mockClerkUserId })) };
});

const { POST } = await import("@/app/api/dashboard/clear-session/route");

const createdUserIds: string[] = [];

async function makeActiveUser() {
  const user = await prisma.user.create({
    data: { clerkUserId: `clerk-clear-session-route-${Date.now()}-${Math.random()}`, role: "INDIVIDUAL", accountStatus: "ACTIVE" },
  });
  createdUserIds.push(user.id);
  return user;
}

describe("POST /api/dashboard/clear-session", () => {
  beforeEach(() => {
    mockClerkUserId = null;
  });

  afterEach(async () => {
    await prisma.auditLog.deleteMany({ where: { actorUserId: { in: createdUserIds } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    createdUserIds.length = 0;
  });

  it("rejects an unauthenticated request", async () => {
    const response = await POST();
    expect(response.status).toBe(401);
  });

  it("records an audit event and returns cleared for an authenticated user", async () => {
    const user = await makeActiveUser();
    mockClerkUserId = user.clerkUserId;

    const response = await POST();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("cleared");

    const events = await prisma.auditLog.findMany({ where: { actorUserId: user.id, action: "dashboard_session_cleared" } });
    expect(events).toHaveLength(1);
  });

  it("never includes secret-shaped data in the audit metadata", async () => {
    const user = await makeActiveUser();
    mockClerkUserId = user.clerkUserId;
    await POST();

    const events = await prisma.auditLog.findMany({ where: { actorUserId: user.id, action: "dashboard_session_cleared" } });
    expect(JSON.stringify(events[0].metadata ?? {})).not.toMatch(/password|token|secret/i);
  });
});
