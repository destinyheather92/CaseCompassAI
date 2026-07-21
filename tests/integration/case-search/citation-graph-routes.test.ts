import { afterEach, afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

let mockClerkUserId: string | null = null;

vi.mock("@clerk/nextjs/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@clerk/nextjs/server")>();
  return { ...actual, auth: vi.fn(async () => ({ userId: mockClerkUserId })) };
});

vi.mock("@/lib/case-search/case-search-service", () => ({
  getCaseCitationGraph: vi.fn(),
}));

const { getCaseCitationGraph } = await import("@/lib/case-search/case-search-service");
const { GET: getCiting } = await import("@/app/api/cases/[caseId]/citing/route");
const { GET: getCited } = await import("@/app/api/cases/[caseId]/cited/route");

const createdUserIds: string[] = [];

function getRequest(caseId: string, path: string) {
  return new NextRequest(`https://example.com/api/cases/${caseId}/${path}`);
}

function paramsFor(caseId: string) {
  return { params: Promise.resolve({ caseId }) };
}

async function makeActiveUser() {
  const user = await prisma.user.create({
    data: { clerkUserId: `clerk-citation-graph-${Date.now()}-${Math.random()}`, role: "INDIVIDUAL", accountStatus: "ACTIVE" },
  });
  createdUserIds.push(user.id);
  return user;
}

describe("GET /api/cases/[caseId]/citing", () => {
  beforeEach(() => {
    mockClerkUserId = null;
    vi.mocked(getCaseCitationGraph).mockReset();
  });

  afterEach(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    createdUserIds.length = 0;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("rejects an unauthenticated request", async () => {
    const response = await getCiting(getRequest("100", "citing"), paramsFor("100"));
    expect(response.status).toBe(401);
    expect(getCaseCitationGraph).not.toHaveBeenCalled();
  });

  it("calls the service with direction 'citing'", async () => {
    const user = await makeActiveUser();
    mockClerkUserId = user.clerkUserId;
    vi.mocked(getCaseCitationGraph).mockResolvedValueOnce({ status: "ok", cases: [] });

    const response = await getCiting(getRequest("100", "citing"), paramsFor("100"));
    expect(response.status).toBe(200);
    expect(getCaseCitationGraph).toHaveBeenCalledWith("100", "citing");
  });

  it("returns 400 for invalid-request", async () => {
    const user = await makeActiveUser();
    mockClerkUserId = user.clerkUserId;
    vi.mocked(getCaseCitationGraph).mockResolvedValueOnce({ status: "invalid-request", message: "Invalid case id." });

    const response = await getCiting(getRequest("../../etc", "citing"), paramsFor("../../etc"));
    expect(response.status).toBe(400);
  });
});

describe("GET /api/cases/[caseId]/cited", () => {
  beforeEach(() => {
    mockClerkUserId = null;
    vi.mocked(getCaseCitationGraph).mockReset();
  });

  afterEach(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    createdUserIds.length = 0;
  });

  it("rejects an unauthenticated request", async () => {
    const response = await getCited(getRequest("100", "cited"), paramsFor("100"));
    expect(response.status).toBe(401);
    expect(getCaseCitationGraph).not.toHaveBeenCalled();
  });

  it("calls the service with direction 'cited'", async () => {
    const user = await makeActiveUser();
    mockClerkUserId = user.clerkUserId;
    vi.mocked(getCaseCitationGraph).mockResolvedValueOnce({ status: "ok", cases: [] });

    const response = await getCited(getRequest("100", "cited"), paramsFor("100"));
    expect(response.status).toBe(200);
    expect(getCaseCitationGraph).toHaveBeenCalledWith("100", "cited");
  });
});
