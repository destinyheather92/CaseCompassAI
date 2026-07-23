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

async function signInAsNewUser(prefix: string) {
  const user = await prisma.user.create({
    data: { clerkUserId: `clerk-${prefix}-${Date.now()}-${Math.random()}`, role: "INDIVIDUAL", accountStatus: "ACTIVE" },
  });
  createdUserIds.push(user.id);
  mockClerkUserId = user.clerkUserId;
  return user;
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

  it("rejects a guest (unauthenticated) request — intake now always requires a real account", async () => {
    const response = await GET(getRequest(), ctx("s1"));
    expect(response.status).toBe(401);
    expect(getIntakeSession).not.toHaveBeenCalled();
  });

  it("allows an authenticated request and maps found -> 200", async () => {
    const user = await signInAsNewUser("intake-get");
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
    expect(getIntakeSession).toHaveBeenCalledWith("s1", expect.objectContaining({ id: user.id }));
  });

  it("maps not-found -> 404 and forbidden -> 403", async () => {
    await signInAsNewUser("intake-get-status");
    vi.mocked(getIntakeSession).mockResolvedValueOnce({ status: "not-found" });
    let response = await GET(getRequest(), ctx("missing"));
    expect(response.status).toBe(404);

    vi.mocked(getIntakeSession).mockResolvedValueOnce({ status: "forbidden" });
    response = await GET(getRequest(), ctx("s1"));
    expect(response.status).toBe(403);
  });

  it("rejects a disabled signed-in user before calling the service", async () => {
    const user = await prisma.user.create({
      data: { clerkUserId: `clerk-intake-get-disabled-${Date.now()}`, role: "INDIVIDUAL", accountStatus: "DISABLED" },
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

  afterEach(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    createdUserIds.length = 0;
  });

  it("rejects a guest (unauthenticated) request", async () => {
    const response = await completePOST(completeRequest({ acknowledged: true }), ctx("s1"));
    expect(response.status).toBe(401);
    expect(completeIntakeSession).not.toHaveBeenCalled();
  });

  it("passes acknowledged through and maps completed -> 200", async () => {
    const user = await signInAsNewUser("intake-complete");
    vi.mocked(completeIntakeSession).mockResolvedValueOnce({ status: "completed", sessionId: "s1" });
    const response = await completePOST(completeRequest({ acknowledged: true }), ctx("s1"));
    expect(response.status).toBe(200);
    expect(completeIntakeSession).toHaveBeenCalledWith("s1", true, expect.objectContaining({ id: user.id }));
  });

  it("rejects a request missing the acknowledged field", async () => {
    await signInAsNewUser("intake-complete-missing-ack");
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
    await signInAsNewUser("intake-complete-map");
    vi.mocked(completeIntakeSession).mockResolvedValueOnce({ status, message: "x" } as never);
    const response = await completePOST(completeRequest({ acknowledged: true }), ctx("s1"));
    expect(response.status).toBe(expectedCode);
  });
});
