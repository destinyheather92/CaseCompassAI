import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

let mockClerkUserId: string | null = null;

vi.mock("@clerk/nextjs/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@clerk/nextjs/server")>();
  return { ...actual, auth: vi.fn(async () => ({ userId: mockClerkUserId })) };
});

vi.mock("@/lib/case-search/case-search-service", () => ({
  getVerifiedCaseById: vi.fn(),
}));

const { getVerifiedCaseById } = await import("@/lib/case-search/case-search-service");
const { GET } = await import("@/app/api/cases/[caseId]/route");

const createdUserIds: string[] = [];

function paramsFor(caseId: string) {
  return { params: Promise.resolve({ caseId }) };
}

function getRequest(caseId: string) {
  return new NextRequest(`https://example.com/api/cases/${caseId}`);
}

async function makeActiveUser() {
  const user = await prisma.user.create({
    data: { clerkUserId: `clerk-case-detail-route-${Date.now()}-${Math.random()}`, role: "INDIVIDUAL", accountStatus: "ACTIVE" },
  });
  createdUserIds.push(user.id);
  return user;
}

const sampleCase = {
  providerName: "courtlistener",
  providerCaseId: "1",
  caseName: "Smith v. State",
  citation: null,
  court: "sc",
  jurisdiction: "sc",
  decisionDate: null,
  docketNumber: null,
  sourceUrl: "https://www.courtlistener.com/opinion/1/smith-v-state/",
  sourceName: "CourtListener (Free Law Project)",
  publicationStatus: "published" as const,
  matchedTopics: [],
  relevanceSummary: "x",
  laterHistoryStatus: "not-checked" as const,
  verificationStatus: "verified" as const,
  dateVerified: new Date().toISOString(),
  disclaimer: "x",
};

describe("GET /api/cases/[caseId]", () => {
  beforeEach(() => {
    mockClerkUserId = null;
    vi.mocked(getVerifiedCaseById).mockReset();
  });

  afterEach(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    createdUserIds.length = 0;
  });

  it("rejects an unauthenticated request", async () => {
    const response = await GET(getRequest("1"), paramsFor("1"));
    expect(response.status).toBe(401);
    expect(getVerifiedCaseById).not.toHaveBeenCalled();
  });

  it("returns the verified case for an authenticated user", async () => {
    const user = await makeActiveUser();
    mockClerkUserId = user.clerkUserId;
    vi.mocked(getVerifiedCaseById).mockResolvedValueOnce(sampleCase);

    const response = await GET(getRequest("1"), paramsFor("1"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("found");
    expect(body.case.caseName).toBe("Smith v. State");
  });

  it("returns 404 when the provider has nothing for that id", async () => {
    const user = await makeActiveUser();
    mockClerkUserId = user.clerkUserId;
    vi.mocked(getVerifiedCaseById).mockResolvedValueOnce(null);

    const response = await GET(getRequest("does-not-exist"), paramsFor("does-not-exist"));
    expect(response.status).toBe(404);
  });
});
