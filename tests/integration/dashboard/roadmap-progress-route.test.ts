import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

let mockClerkUserId: string | null = null;

vi.mock("@clerk/nextjs/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@clerk/nextjs/server")>();
  return { ...actual, auth: vi.fn(async () => ({ userId: mockClerkUserId })) };
});

vi.mock("@/lib/roadmap/update-roadmap-progress", () => ({
  updateRoadmapProgress: vi.fn(),
}));

const { updateRoadmapProgress } = await import("@/lib/roadmap/update-roadmap-progress");
const { PATCH } = await import("@/app/api/dashboard/roadmap-progress/[roadmapId]/route");

const createdUserIds: string[] = [];

function patchRequest(body: unknown) {
  return new NextRequest("https://example.com/api/dashboard/roadmap-progress/r1", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function paramsFor(roadmapId: string) {
  return { params: Promise.resolve({ roadmapId }) };
}

async function makeActiveUser() {
  const user = await prisma.user.create({
    data: { clerkUserId: `clerk-roadmap-progress-route-${Date.now()}-${Math.random()}`, role: "INDIVIDUAL", accountStatus: "ACTIVE" },
  });
  createdUserIds.push(user.id);
  return user;
}

const progressResult = {
  status: "updated" as const,
  progress: { stepId: "step-1", status: "in-progress" as const, note: null, startedAt: new Date(), completedAt: null },
};

describe("PATCH /api/dashboard/roadmap-progress/[roadmapId]", () => {
  beforeEach(() => {
    mockClerkUserId = null;
    vi.mocked(updateRoadmapProgress).mockReset();
  });

  afterEach(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    createdUserIds.length = 0;
  });

  it("rejects an unauthenticated request without calling the service", async () => {
    const response = await PATCH(patchRequest({ stepId: "step-1", status: "in-progress" }), paramsFor("r1"));
    expect(response.status).toBe(401);
    expect(updateRoadmapProgress).not.toHaveBeenCalled();
  });

  it("delegates to the service for an authenticated user", async () => {
    const user = await makeActiveUser();
    mockClerkUserId = user.clerkUserId;
    vi.mocked(updateRoadmapProgress).mockResolvedValueOnce(progressResult);

    const response = await PATCH(patchRequest({ stepId: "step-1", status: "in-progress" }), paramsFor("r1"));
    expect(response.status).toBe(200);
    expect(updateRoadmapProgress).toHaveBeenCalledWith("r1", { stepId: "step-1", status: "in-progress" }, expect.objectContaining({ id: user.id }));
  });

  it("rejects malformed JSON without calling the service", async () => {
    const user = await makeActiveUser();
    mockClerkUserId = user.clerkUserId;
    const response = await PATCH(
      new NextRequest("https://example.com/api/dashboard/roadmap-progress/r1", { method: "PATCH", body: "{not json" }),
      paramsFor("r1"),
    );
    expect(response.status).toBe(400);
    expect(updateRoadmapProgress).not.toHaveBeenCalled();
  });

  it.each([
    ["invalid-request", 400],
    ["not-found", 404],
    ["invalid-step", 400],
  ] as const)("maps service status %s to HTTP %d", async (status, expectedCode) => {
    const user = await makeActiveUser();
    mockClerkUserId = user.clerkUserId;
    vi.mocked(updateRoadmapProgress).mockResolvedValueOnce({ status, message: "x" } as never);
    const response = await PATCH(patchRequest({ stepId: "step-1", status: "in-progress" }), paramsFor("r1"));
    expect(response.status).toBe(expectedCode);
  });
});
