import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

let mockClerkUserId: string | null = null;

vi.mock("@clerk/nextjs/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@clerk/nextjs/server")>();
  return { ...actual, auth: vi.fn(async () => ({ userId: mockClerkUserId })) };
});

vi.mock("@/lib/intake/get-intake-session", () => ({
  getIntakeSession: vi.fn(),
}));
vi.mock("@/lib/intake/complete-intake-session", () => ({
  completeIntakeSession: vi.fn(),
}));

const { getIntakeSession } = await import("@/lib/intake/get-intake-session");
const { completeIntakeSession } = await import("@/lib/intake/complete-intake-session");
const { GET } = await import("@/app/api/intake/interview/[sessionId]/route");
const { POST: completePOST } = await import("@/app/api/intake/interview/[sessionId]/complete/route");

const createdUserIds: string[] = [];

function ctx(sessionId: string) {
  return { params: Promise.resolve({ sessionId }) };
}

function getRequest() {
  return new NextRequest("https://example.com/api/intake/interview/s1");
}

function completeRequest(body: unknown) {
  return new NextRequest("https://example.com/api/intake/interview/s1/complete", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/intake/interview/[sessionId]", () => {
  beforeEach(() => {
    mockClerkUserId = null;
    vi.mocked(getIntakeSession).mockReset();
  });

  afterEach(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    createdUserIds.length = 0;
  });

  it("allows a guest request and maps found -> 200", async () => {
    vi.mocked(getIntakeSession).mockResolvedValueOnce({
      status: "found",
      session: {
        id: "s1",
        status: "interviewing",
        caseType: "criminal",
        jurisdiction: "SC",
        proceduralStage: "post-conviction",
        researchGoals: [],
        documentTypes: [],
        factualSummary: "",
        unresolvedInformation: [],
        topicsCovered: [],
        currentQuestion: null,
        questionCount: 0,
        answers: [],
      },
    });
    const response = await GET(getRequest(), ctx("s1"));
    expect(response.status).toBe(200);
    expect(getIntakeSession).toHaveBeenCalledWith("s1", null);
  });

  it("maps not-found -> 404 and forbidden -> 403", async () => {
    vi.mocked(getIntakeSession).mockResolvedValueOnce({ status: "not-found" });
    let response = await GET(getRequest(), ctx("missing"));
    expect(response.status).toBe(404);

    vi.mocked(getIntakeSession).mockResolvedValueOnce({ status: "forbidden" });
    response = await GET(getRequest(), ctx("s1"));
    expect(response.status).toBe(403);
  });

  it("rejects a disabled signed-in user before calling the service", async () => {
    const user = await prisma.user.create({
      data: { clerkUserId: `clerk-intake-get-${Date.now()}`, role: "INDIVIDUAL", accountStatus: "DISABLED" },
    });
    createdUserIds.push(user.id);
    mockClerkUserId = user.clerkUserId;

    const response = await GET(getRequest(), ctx("s1"));
    expect(response.status).toBe(403);
    expect(getIntakeSession).not.toHaveBeenCalled();
  });
});

describe("POST /api/intake/interview/[sessionId]/complete", () => {
  beforeEach(() => {
    mockClerkUserId = null;
    vi.mocked(completeIntakeSession).mockReset();
  });

  it("passes acknowledged through and maps completed -> 200", async () => {
    vi.mocked(completeIntakeSession).mockResolvedValueOnce({ status: "completed", sessionId: "s1" });
    const response = await completePOST(completeRequest({ acknowledged: true }), ctx("s1"));
    expect(response.status).toBe(200);
    expect(completeIntakeSession).toHaveBeenCalledWith("s1", true, null);
  });

  it("rejects a request missing the acknowledged field", async () => {
    const response = await completePOST(completeRequest({}), ctx("s1"));
    expect(response.status).toBe(400);
    expect(completeIntakeSession).not.toHaveBeenCalled();
  });

  it.each([
    ["not-found", 404],
    ["forbidden", 403],
    ["not-ready", 400],
    ["acknowledgement-required", 400],
  ] as const)("maps service status %s to HTTP %d", async (status, expectedCode) => {
    vi.mocked(completeIntakeSession).mockResolvedValueOnce({ status, message: "x" } as never);
    const response = await completePOST(completeRequest({ acknowledged: true }), ctx("s1"));
    expect(response.status).toBe(expectedCode);
  });
});
