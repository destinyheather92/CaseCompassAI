import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

let mockClerkUserId: string | null = null;

vi.mock("@clerk/nextjs/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@clerk/nextjs/server")>();
  return { ...actual, auth: vi.fn(async () => ({ userId: mockClerkUserId })) };
});

vi.mock("@/lib/case-search/case-search-service", () => ({
  searchCasesForRoadmap: vi.fn(),
}));

const { searchCasesForRoadmap } = await import("@/lib/case-search/case-search-service");
const { GET } = await import("@/app/api/roadmaps/[roadmapId]/cases/route");
const { POST } = await import("@/app/api/roadmaps/[roadmapId]/cases/search/route");

const createdUserIds: string[] = [];
const createdRoadmapIds: string[] = [];

function paramsFor(roadmapId: string) {
  return { params: Promise.resolve({ roadmapId }) };
}

function postRequest(roadmapId: string, body: unknown) {
  return new NextRequest(`https://example.com/api/roadmaps/${roadmapId}/cases/search`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function getRequest(roadmapId: string) {
  return new NextRequest(`https://example.com/api/roadmaps/${roadmapId}/cases`);
}

async function makeActiveUser() {
  const user = await prisma.user.create({
    data: { clerkUserId: `clerk-roadmap-cases-route-${Date.now()}-${Math.random()}`, role: "INDIVIDUAL", accountStatus: "ACTIVE" },
  });
  createdUserIds.push(user.id);
  return user;
}

async function makeRoadmap(userId: string) {
  const roadmap = await prisma.researchRoadmap.create({
    data: {
      userId,
      title: "x",
      summary: "x",
      sourceKind: "DETERMINISTIC_FALLBACK",
      content: {
        title: "x",
        summary: "x",
        jurisdiction: { label: "South Carolina", code: "SC", limitationNote: "n" },
        steps: [{ id: "step-1", order: 1, title: "Understand Habeas Corpus", description: "d", whyItMatters: "w", suggestedActions: [], relatedTerms: [] }],
        legalTerms: [],
        sourceSuggestions: [],
        safetyNotes: [],
        confidence: { level: "low", explanation: "e" },
        disclaimer: "d",
        generatedAt: new Date().toISOString(),
      },
    },
  });
  createdRoadmapIds.push(roadmap.id);
  return roadmap;
}

const okResult = { status: "ok" as const, page: { cases: [], nextCursor: null } };

describe("GET /api/roadmaps/[roadmapId]/cases", () => {
  beforeEach(() => {
    mockClerkUserId = null;
    vi.mocked(searchCasesForRoadmap).mockReset();
  });

  afterEach(async () => {
    await prisma.researchRoadmap.deleteMany({ where: { id: { in: createdRoadmapIds } } });
    createdRoadmapIds.length = 0;
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    createdUserIds.length = 0;
  });

  it("rejects an unauthenticated request", async () => {
    const response = await GET(getRequest("r1"), paramsFor("r1"));
    expect(response.status).toBe(401);
    expect(searchCasesForRoadmap).not.toHaveBeenCalled();
  });

  it("returns not-found for a roadmap the caller does not own", async () => {
    const owner = await makeActiveUser();
    const intruder = await makeActiveUser();
    mockClerkUserId = intruder.clerkUserId;
    const roadmap = await makeRoadmap(owner.id);

    const response = await GET(getRequest(roadmap.id), paramsFor(roadmap.id));
    expect(response.status).toBe(404);
    expect(searchCasesForRoadmap).not.toHaveBeenCalled();
  });

  it("derives the request from the roadmap's own jurisdiction/topics and delegates to the service", async () => {
    const user = await makeActiveUser();
    mockClerkUserId = user.clerkUserId;
    const roadmap = await makeRoadmap(user.id);
    vi.mocked(searchCasesForRoadmap).mockResolvedValueOnce(okResult);

    const response = await GET(getRequest(roadmap.id), paramsFor(roadmap.id));
    expect(response.status).toBe(200);
    expect(searchCasesForRoadmap).toHaveBeenCalledWith(
      expect.objectContaining({ jurisdiction: "SC", topics: expect.arrayContaining(["Understand Habeas Corpus"]) }),
    );
  });

  it("returns 503 when the service reports unavailable", async () => {
    const user = await makeActiveUser();
    mockClerkUserId = user.clerkUserId;
    const roadmap = await makeRoadmap(user.id);
    vi.mocked(searchCasesForRoadmap).mockResolvedValueOnce({ status: "unavailable", message: "Verified case search is not available yet." });

    const response = await GET(getRequest(roadmap.id), paramsFor(roadmap.id));
    expect(response.status).toBe(503);
  });
});

describe("POST /api/roadmaps/[roadmapId]/cases/search", () => {
  beforeEach(() => {
    mockClerkUserId = null;
    vi.mocked(searchCasesForRoadmap).mockReset();
  });

  afterEach(async () => {
    await prisma.researchRoadmap.deleteMany({ where: { id: { in: createdRoadmapIds } } });
    createdRoadmapIds.length = 0;
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    createdUserIds.length = 0;
  });

  it("rejects an unauthenticated request", async () => {
    const response = await POST(postRequest("r1", {}), paramsFor("r1"));
    expect(response.status).toBe(401);
    expect(searchCasesForRoadmap).not.toHaveBeenCalled();
  });

  it("returns not-found for a roadmap the caller does not own", async () => {
    const owner = await makeActiveUser();
    const intruder = await makeActiveUser();
    mockClerkUserId = intruder.clerkUserId;
    const roadmap = await makeRoadmap(owner.id);

    const response = await POST(postRequest(roadmap.id, { topics: ["x"] }), paramsFor(roadmap.id));
    expect(response.status).toBe(404);
  });

  it("ignores a client-supplied jurisdiction and always uses the roadmap's own", async () => {
    const user = await makeActiveUser();
    mockClerkUserId = user.clerkUserId;
    const roadmap = await makeRoadmap(user.id);
    vi.mocked(searchCasesForRoadmap).mockResolvedValueOnce(okResult);

    await POST(postRequest(roadmap.id, { jurisdiction: "CA", topics: ["custom topic"], publishedOnly: true }), paramsFor(roadmap.id));

    expect(searchCasesForRoadmap).toHaveBeenCalledWith(
      expect.objectContaining({ jurisdiction: "SC", topics: ["custom topic"], publishedOnly: true }),
    );
  });

  it("rejects malformed JSON without calling the service", async () => {
    const user = await makeActiveUser();
    mockClerkUserId = user.clerkUserId;
    const roadmap = await makeRoadmap(user.id);
    const response = await POST(
      new NextRequest(`https://example.com/api/roadmaps/${roadmap.id}/cases/search`, { method: "POST", body: "{not json" }),
      paramsFor(roadmap.id),
    );
    expect(response.status).toBe(400);
    expect(searchCasesForRoadmap).not.toHaveBeenCalled();
  });
});
