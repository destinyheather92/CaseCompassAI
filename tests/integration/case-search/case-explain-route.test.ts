import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

let mockClerkUserId: string | null = null;

vi.mock("@clerk/nextjs/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@clerk/nextjs/server")>();
  return { ...actual, auth: vi.fn(async () => ({ userId: mockClerkUserId })) };
});

vi.mock("@/lib/case-explainer/explain-case", () => ({
  explainCase: vi.fn(),
}));

const { explainCase } = await import("@/lib/case-explainer/explain-case");
const { GET } = await import("@/app/api/cases/[caseId]/explain/route");

const createdUserIds: string[] = [];

function paramsFor(caseId: string) {
  return { params: Promise.resolve({ caseId }) };
}

function getRequest(caseId: string) {
  return new NextRequest(`https://example.com/api/cases/${caseId}/explain`);
}

async function makeActiveUser() {
  const user = await prisma.user.create({
    data: { clerkUserId: `clerk-case-explain-route-${Date.now()}-${Math.random()}`, role: "INDIVIDUAL", accountStatus: "ACTIVE" },
  });
  createdUserIds.push(user.id);
  return user;
}

const sampleExplanation = {
  caseSummary: "A brief summary.",
  keyFacts: [],
  legalIssues: ["issue"],
  holding: "holding",
  courtsReasoning: "reasoning",
  ruleOfLaw: "rule",
  whyThisCaseMatters: "matters",
  howItMightRelate: "relates",
  importantQuotes: [],
  keyTerms: [],
  basedOnFullOpinionText: true,
};

const sampleCase = {
  providerName: "courtlistener" as const,
  providerCaseId: "1",
  clusterId: null,
  caseName: "Smith v. State",
  citation: null,
  citations: [],
  court: "sc",
  courtId: "sc",
  jurisdiction: "sc",
  decisionDate: null,
  docketNumber: null,
  sourceUrl: "https://www.courtlistener.com/opinion/1/smith-v-state/",
  sourceName: "CourtListener (Free Law Project)",
  originalCollection: null,
  publicationStatus: "published" as const,
  matchedTopics: [],
  relevanceSummary: "x",
  laterHistoryStatus: "not-checked" as const,
  verificationStatus: "verified" as const,
  verificationMethod: "id-lookup" as const,
  dateVerified: new Date().toISOString(),
  disclaimer: "x",
};

describe("GET /api/cases/[caseId]/explain", () => {
  beforeEach(() => {
    mockClerkUserId = null;
    vi.mocked(explainCase).mockReset();
  });

  afterEach(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    createdUserIds.length = 0;
  });

  it("rejects an unauthenticated request", async () => {
    const response = await GET(getRequest("1"), paramsFor("1"));
    expect(response.status).toBe(401);
    expect(explainCase).not.toHaveBeenCalled();
  });

  it("returns the explanation for an authenticated user", async () => {
    const user = await makeActiveUser();
    mockClerkUserId = user.clerkUserId;
    vi.mocked(explainCase).mockResolvedValueOnce({
      status: "ok",
      caseResult: sampleCase,
      explanation: sampleExplanation,
      opinionText: "The court held that...",
    });

    const response = await GET(getRequest("1"), paramsFor("1"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("ok");
    expect(body.explanation.caseSummary).toBe("A brief summary.");
    expect(body.opinionText).toBe("The court held that...");
  });

  it("returns 404 when the case does not exist", async () => {
    const user = await makeActiveUser();
    mockClerkUserId = user.clerkUserId;
    vi.mocked(explainCase).mockResolvedValueOnce({ status: "not-found" });

    const response = await GET(getRequest("does-not-exist"), paramsFor("does-not-exist"));
    expect(response.status).toBe(404);
  });

  it("returns 200 with the case + opinion text (not an error page) when only the AI explanation is unavailable", async () => {
    const user = await makeActiveUser();
    mockClerkUserId = user.clerkUserId;
    vi.mocked(explainCase).mockResolvedValueOnce({
      status: "explanation-unavailable",
      caseResult: sampleCase,
      opinionText: "The court held that...",
      message: "not available right now",
    });

    const response = await GET(getRequest("1"), paramsFor("1"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("explanation-unavailable");
    expect(body.caseResult.caseName).toBe("Smith v. State");
    expect(body.opinionText).toBe("The court held that...");
  });
});
