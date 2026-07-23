import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

let mockClerkUserId: string | null = null;

vi.mock("@clerk/nextjs/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@clerk/nextjs/server")>();
  return {
    ...actual,
    auth: vi.fn(async () => ({ userId: mockClerkUserId })),
  };
});

vi.mock("@/lib/intake/start-intake-session", () => ({
  startIntakeSession: vi.fn(),
}));

const { startIntakeSession } = await import("@/lib/intake/start-intake-session");
const { POST } = await import("@/app/api/intake/interview/start/route");

const createdUserIds: string[] = [];

function postRequest(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("https://example.com/api/intake/interview/start", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

const validInput = {
  caseType: "criminal",
  jurisdiction: "SC",
  proceduralStage: "post-conviction",
  researchGoals: ["understand-case"],
  documentTypes: ["court-opinion"],
};

describe("POST /api/intake/interview/start", () => {
  beforeEach(() => {
    mockClerkUserId = null;
    vi.mocked(startIntakeSession).mockReset();
  });

  afterEach(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    createdUserIds.length = 0;
  });

  it("rejects a guest (unauthenticated) request — intake now always requires a real account", async () => {
    const response = await POST(postRequest(validInput));
    expect(response.status).toBe(401);
    expect(startIntakeSession).not.toHaveBeenCalled();
  });

  it("allows an active, password-complete authenticated user and passes their scope", async () => {
    const user = await prisma.user.create({
      data: { clerkUserId: `clerk-intake-start-${Date.now()}`, role: "INDIVIDUAL", accountStatus: "ACTIVE" },
    });
    createdUserIds.push(user.id);
    mockClerkUserId = user.clerkUserId;

    vi.mocked(startIntakeSession).mockResolvedValueOnce({
      status: "started",
      sessionId: "s2",
      matterId: "m2",
      intakeStatus: "interviewing",
      question: null,
      factualSummary: "",
      unresolvedInformation: [],
      topicsCovered: [],
      questionCount: 0,
    });

    const response = await POST(postRequest(validInput));
    expect(response.status).toBe(201);
    expect(startIntakeSession).toHaveBeenCalledWith(validInput, expect.objectContaining({ userId: user.id }));
  });

  it("rejects a signed-in institution-managed user who must still change their password, before calling the service", async () => {
    const user = await prisma.user.create({
      data: {
        clerkUserId: `clerk-intake-start-pending-${Date.now()}`,
        role: "INCARCERATED_USER",
        accountStatus: "PENDING_FIRST_LOGIN",
        mustChangePassword: true,
      },
    });
    createdUserIds.push(user.id);
    mockClerkUserId = user.clerkUserId;

    const response = await POST(postRequest(validInput));
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.status).toBe("must-change-password");
    expect(startIntakeSession).not.toHaveBeenCalled();
  });

  it("never blocks an individual user on mustChangePassword — that lifecycle is institution-only", async () => {
    vi.mocked(startIntakeSession).mockResolvedValueOnce({
      status: "started",
      sessionId: "s3",
      matterId: "m3",
      intakeStatus: "interviewing",
      question: null,
      factualSummary: "",
      unresolvedInformation: [],
      topicsCovered: [],
      questionCount: 0,
    });
    const user = await prisma.user.create({
      data: {
        clerkUserId: `clerk-intake-start-individual-mcp-${Date.now()}`,
        role: "INDIVIDUAL",
        accountStatus: "ACTIVE",
        mustChangePassword: true,
      },
    });
    createdUserIds.push(user.id);
    mockClerkUserId = user.clerkUserId;

    const response = await POST(postRequest(validInput));
    expect(response.status).not.toBe(403);
    expect(startIntakeSession).toHaveBeenCalled();
  });

  it("rejects an institution admin — a legal roadmap belongs only to an individual or inmate user, never the institution's administrator", async () => {
    const user = await prisma.user.create({
      data: { clerkUserId: `clerk-intake-start-inst-admin-${Date.now()}`, role: "INSTITUTION_ADMIN", accountStatus: "ACTIVE" },
    });
    createdUserIds.push(user.id);
    mockClerkUserId = user.clerkUserId;

    const response = await POST(postRequest(validInput));
    expect(response.status).toBe(403);
    expect(startIntakeSession).not.toHaveBeenCalled();
  });


  it("rejects a disabled signed-in user", async () => {
    const user = await prisma.user.create({
      data: { clerkUserId: `clerk-intake-start-disabled-${Date.now()}`, role: "INDIVIDUAL", accountStatus: "DISABLED" },
    });
    createdUserIds.push(user.id);
    mockClerkUserId = user.clerkUserId;

    const response = await POST(postRequest(validInput));
    expect(response.status).toBe(403);
    expect(startIntakeSession).not.toHaveBeenCalled();
  });

  it("rejects a malformed JSON body with 400 and never calls the service", async () => {
    const user = await prisma.user.create({
      data: { clerkUserId: `clerk-intake-start-badjson-${Date.now()}`, role: "INDIVIDUAL", accountStatus: "ACTIVE" },
    });
    createdUserIds.push(user.id);
    mockClerkUserId = user.clerkUserId;

    const response = await POST(
      new NextRequest("https://example.com/api/intake/interview/start", { method: "POST", body: "{not json" }),
    );
    expect(response.status).toBe(400);
    expect(startIntakeSession).not.toHaveBeenCalled();
  });

  it("rejects an oversized request via Content-Length before parsing the body", async () => {
    const user = await prisma.user.create({
      data: { clerkUserId: `clerk-intake-start-oversized-${Date.now()}`, role: "INDIVIDUAL", accountStatus: "ACTIVE" },
    });
    createdUserIds.push(user.id);
    mockClerkUserId = user.clerkUserId;

    const response = await POST(postRequest(validInput, { "content-length": "999999" }));
    expect(response.status).toBe(413);
    expect(startIntakeSession).not.toHaveBeenCalled();
  });

  it("maps invalid-request to 400 and provider-unavailable to 503", async () => {
    const user = await prisma.user.create({
      data: { clerkUserId: `clerk-intake-start-mapstatus-${Date.now()}`, role: "INDIVIDUAL", accountStatus: "ACTIVE" },
    });
    createdUserIds.push(user.id);
    mockClerkUserId = user.clerkUserId;

    vi.mocked(startIntakeSession).mockResolvedValueOnce({ status: "invalid-request", message: "bad" });
    let response = await POST(postRequest(validInput));
    expect(response.status).toBe(400);

    vi.mocked(startIntakeSession).mockResolvedValueOnce({ status: "provider-unavailable", message: "unavailable" });
    response = await POST(postRequest(validInput));
    expect(response.status).toBe(503);
  });

  it("enforces rate limiting per authenticated user", async () => {
    const user = await prisma.user.create({
      data: { clerkUserId: `clerk-intake-start-ratelimit-${Date.now()}`, role: "INDIVIDUAL", accountStatus: "ACTIVE" },
    });
    createdUserIds.push(user.id);
    mockClerkUserId = user.clerkUserId;

    vi.mocked(startIntakeSession).mockResolvedValue({
      status: "started",
      sessionId: "s4",
      matterId: "m4",
      intakeStatus: "interviewing",
      question: null,
      factualSummary: "",
      unresolvedInformation: [],
      topicsCovered: [],
      questionCount: 0,
    });

    let lastResponse;
    for (let i = 0; i < 11; i++) {
      lastResponse = await POST(postRequest(validInput));
    }
    expect(lastResponse?.status).toBe(429);
  });
});
