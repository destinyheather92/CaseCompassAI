import { afterEach, afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

let mockClerkUserId: string | null = null;

vi.mock("@clerk/nextjs/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@clerk/nextjs/server")>();
  return { ...actual, auth: vi.fn(async () => ({ userId: mockClerkUserId })) };
});

vi.mock("@/lib/case-search/case-search-service", () => ({
  verifyCaseCitation: vi.fn(),
}));

const { verifyCaseCitation } = await import("@/lib/case-search/case-search-service");
const { POST } = await import("@/app/api/cases/verify-citation/route");

const createdUserIds: string[] = [];

function postRequest(body: unknown) {
  return new NextRequest("https://example.com/api/cases/verify-citation", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function makeActiveUser() {
  const user = await prisma.user.create({
    data: { clerkUserId: `clerk-verify-citation-${Date.now()}-${Math.random()}`, role: "INDIVIDUAL", accountStatus: "ACTIVE" },
  });
  createdUserIds.push(user.id);
  return user;
}

describe("POST /api/cases/verify-citation", () => {
  beforeEach(() => {
    mockClerkUserId = null;
    vi.mocked(verifyCaseCitation).mockReset();
  });

  afterEach(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    createdUserIds.length = 0;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("rejects an unauthenticated request", async () => {
    const response = await POST(postRequest({ citation: "466 U.S. 668" }));
    expect(response.status).toBe(401);
    expect(verifyCaseCitation).not.toHaveBeenCalled();
  });

  it("returns the service result for an authenticated user", async () => {
    const user = await makeActiveUser();
    mockClerkUserId = user.clerkUserId;
    vi.mocked(verifyCaseCitation).mockResolvedValueOnce({ status: "not_verified", message: "not found" });

    const response = await POST(postRequest({ citation: "999 U.S. 999" }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("not_verified");
  });

  it("rejects malformed JSON", async () => {
    const user = await makeActiveUser();
    mockClerkUserId = user.clerkUserId;
    const request = new NextRequest("https://example.com/api/cases/verify-citation", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not json",
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(verifyCaseCitation).not.toHaveBeenCalled();
  });

  it("rate-limits repeated requests from the same user", async () => {
    const user = await makeActiveUser();
    mockClerkUserId = user.clerkUserId;
    vi.mocked(verifyCaseCitation).mockResolvedValue({ status: "not_verified", message: "x" });

    let lastResponse;
    for (let i = 0; i < 31; i++) {
      lastResponse = await POST(postRequest({ citation: "466 U.S. 668" }));
    }
    expect(lastResponse?.status).toBe(429);
  });
});
