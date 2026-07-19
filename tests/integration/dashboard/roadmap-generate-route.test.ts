import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

let mockClerkUserId: string | null = null;

vi.mock("@clerk/nextjs/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@clerk/nextjs/server")>();
  return { ...actual, auth: vi.fn(async () => ({ userId: mockClerkUserId })) };
});

vi.mock("@/lib/roadmap/create-roadmap-from-intake", () => ({
  createRoadmapFromIntake: vi.fn(),
}));

const { createRoadmapFromIntake } = await import("@/lib/roadmap/create-roadmap-from-intake");
const { POST } = await import("@/app/api/dashboard/roadmap/generate/route");

const createdUserIds: string[] = [];

function postRequest(body: unknown) {
  return new NextRequest("https://example.com/api/dashboard/roadmap/generate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function makeActiveUser() {
  const user = await prisma.user.create({
    data: { clerkUserId: `clerk-roadmap-generate-route-${Date.now()}-${Math.random()}`, role: "INDIVIDUAL", accountStatus: "ACTIVE" },
  });
  createdUserIds.push(user.id);
  return user;
}

describe("POST /api/dashboard/roadmap/generate", () => {
  beforeEach(() => {
    mockClerkUserId = null;
    vi.mocked(createRoadmapFromIntake).mockReset();
  });

  afterEach(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    createdUserIds.length = 0;
  });

  it("rejects an unauthenticated (guest) request without calling the service", async () => {
    const response = await POST(postRequest({ intakeId: "intake-1" }));
    expect(response.status).toBe(401);
    expect(createRoadmapFromIntake).not.toHaveBeenCalled();
  });

  it("delegates to the service for an authenticated user", async () => {
    const user = await makeActiveUser();
    mockClerkUserId = user.clerkUserId;
    vi.mocked(createRoadmapFromIntake).mockResolvedValueOnce({ status: "created", roadmapId: "r1" });

    const response = await POST(postRequest({ intakeId: "intake-1" }));
    expect(response.status).toBe(201);
    expect(createRoadmapFromIntake).toHaveBeenCalledWith("intake-1", expect.objectContaining({ id: user.id }));
  });

  it("rejects malformed JSON without calling the service", async () => {
    const user = await makeActiveUser();
    mockClerkUserId = user.clerkUserId;
    const response = await POST(
      new NextRequest("https://example.com/api/dashboard/roadmap/generate", { method: "POST", body: "{not json" }),
    );
    expect(response.status).toBe(400);
    expect(createRoadmapFromIntake).not.toHaveBeenCalled();
  });

  it("rejects a missing intakeId without calling the service", async () => {
    const user = await makeActiveUser();
    mockClerkUserId = user.clerkUserId;
    const response = await POST(postRequest({}));
    expect(response.status).toBe(400);
    expect(createRoadmapFromIntake).not.toHaveBeenCalled();
  });

  it.each([
    ["not-found", 404],
    ["intake-not-ready", 400],
    ["generation-failed", 500],
  ] as const)("maps service status %s to HTTP %d", async (status, expectedCode) => {
    const user = await makeActiveUser();
    mockClerkUserId = user.clerkUserId;
    vi.mocked(createRoadmapFromIntake).mockResolvedValueOnce({ status, message: "x" } as never);
    const response = await POST(postRequest({ intakeId: "intake-1" }));
    expect(response.status).toBe(expectedCode);
  });
});
