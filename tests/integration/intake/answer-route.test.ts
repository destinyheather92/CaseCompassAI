import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

let mockClerkUserId: string | null = null;

vi.mock("@clerk/nextjs/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@clerk/nextjs/server")>();
  return { ...actual, auth: vi.fn(async () => ({ userId: mockClerkUserId })) };
});

vi.mock("@/lib/intake/submit-intake-answer", () => ({
  submitIntakeAnswer: vi.fn(),
}));

const { submitIntakeAnswer } = await import("@/lib/intake/submit-intake-answer");
const { POST } = await import("@/app/api/intake/interview/answer/route");

const createdUserIds: string[] = [];

function postRequest(body: unknown) {
  return new NextRequest("https://example.com/api/intake/interview/answer", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validInput = { sessionId: "s1", questionId: "q1", answerText: "Richland County Circuit Court" };

const answeredResult = {
  status: "answered" as const,
  intakeStatus: "interviewing" as const,
  question: null,
  factualSummary: "",
  unresolvedInformation: [],
  topicsCovered: [],
  questionCount: 2,
  limitReached: false,
};

describe("POST /api/intake/interview/answer", () => {
  beforeEach(() => {
    mockClerkUserId = null;
    vi.mocked(submitIntakeAnswer).mockReset();
  });

  afterEach(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    createdUserIds.length = 0;
  });

  it("allows a guest request", async () => {
    vi.mocked(submitIntakeAnswer).mockResolvedValueOnce(answeredResult);
    const response = await POST(postRequest(validInput));
    expect(response.status).toBe(200);
    expect(submitIntakeAnswer).toHaveBeenCalledWith(validInput, null);
  });

  it("passes the authenticated AppUser through to the service", async () => {
    const user = await prisma.user.create({
      data: { clerkUserId: `clerk-intake-answer-${Date.now()}`, role: "INDIVIDUAL", accountStatus: "ACTIVE" },
    });
    createdUserIds.push(user.id);
    mockClerkUserId = user.clerkUserId;

    vi.mocked(submitIntakeAnswer).mockResolvedValueOnce(answeredResult);
    const response = await POST(postRequest(validInput));
    expect(response.status).toBe(200);
    expect(submitIntakeAnswer).toHaveBeenCalledWith(validInput, expect.objectContaining({ id: user.id }));
  });

  it("rejects a disabled signed-in user before calling the service", async () => {
    const user = await prisma.user.create({
      data: { clerkUserId: `clerk-intake-answer-disabled-${Date.now()}`, role: "INDIVIDUAL", accountStatus: "DISABLED" },
    });
    createdUserIds.push(user.id);
    mockClerkUserId = user.clerkUserId;

    const response = await POST(postRequest(validInput));
    expect(response.status).toBe(403);
    expect(submitIntakeAnswer).not.toHaveBeenCalled();
  });

  it.each([
    ["not-found", 404],
    ["forbidden", 403],
    ["already-completed", 409],
    ["question-mismatch", 400],
    ["invalid-request", 400],
    ["provider-unavailable", 503],
  ] as const)("maps service status %s to HTTP %d", async (status, expectedCode) => {
    vi.mocked(submitIntakeAnswer).mockResolvedValueOnce({ status, message: "x" } as never);
    const response = await POST(postRequest(validInput));
    expect(response.status).toBe(expectedCode);
  });

  it("rejects a malformed JSON body", async () => {
    const response = await POST(
      new NextRequest("https://example.com/api/intake/interview/answer", { method: "POST", body: "{not json" }),
    );
    expect(response.status).toBe(400);
    expect(submitIntakeAnswer).not.toHaveBeenCalled();
  });
});
