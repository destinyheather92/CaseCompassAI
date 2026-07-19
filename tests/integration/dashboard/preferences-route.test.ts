import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

let mockClerkUserId: string | null = null;

vi.mock("@clerk/nextjs/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@clerk/nextjs/server")>();
  return { ...actual, auth: vi.fn(async () => ({ userId: mockClerkUserId })) };
});

vi.mock("@/lib/dashboard/update-user-preferences", () => ({ updateUserPreferences: vi.fn() }));

const { updateUserPreferences } = await import("@/lib/dashboard/update-user-preferences");
const { PATCH } = await import("@/app/api/dashboard/preferences/route");

const createdUserIds: string[] = [];

function patchRequest(body: unknown) {
  return new NextRequest("https://example.com/api/dashboard/preferences", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function makeActiveUser() {
  const user = await prisma.user.create({
    data: { clerkUserId: `clerk-preferences-route-${Date.now()}-${Math.random()}`, role: "INDIVIDUAL", accountStatus: "ACTIVE" },
  });
  createdUserIds.push(user.id);
  return user;
}

describe("PATCH /api/dashboard/preferences", () => {
  beforeEach(() => {
    mockClerkUserId = null;
    vi.mocked(updateUserPreferences).mockReset();
  });

  afterEach(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    createdUserIds.length = 0;
  });

  it("rejects an unauthenticated request without calling the service", async () => {
    const response = await PATCH(patchRequest({ reducedMotion: true }));
    expect(response.status).toBe(401);
    expect(updateUserPreferences).not.toHaveBeenCalled();
  });

  it("delegates to the service, scoped to the caller's own id", async () => {
    const user = await makeActiveUser();
    mockClerkUserId = user.clerkUserId;
    vi.mocked(updateUserPreferences).mockResolvedValueOnce({ status: "updated", preferences: { reducedMotion: true } });

    const response = await PATCH(patchRequest({ reducedMotion: true }));
    expect(response.status).toBe(200);
    expect(updateUserPreferences).toHaveBeenCalledWith(user.id, { reducedMotion: true });
  });

  it("returns 400 for invalid-request", async () => {
    const user = await makeActiveUser();
    mockClerkUserId = user.clerkUserId;
    vi.mocked(updateUserPreferences).mockResolvedValueOnce({ status: "invalid-request", message: "x" });
    const response = await PATCH(patchRequest({ textSize: "huge" }));
    expect(response.status).toBe(400);
  });
});
