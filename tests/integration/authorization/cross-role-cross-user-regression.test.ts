import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

let mockClerkUserId: string | null = null;

vi.mock("@clerk/nextjs/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@clerk/nextjs/server")>();
  return { ...actual, auth: vi.fn(async () => ({ userId: mockClerkUserId })) };
});

const { GET: getInstitutionUsers } = await import("@/app/api/institution/users/route");
const { GET: getRoadmapCases } = await import("@/app/api/roadmaps/[roadmapId]/cases/route");
const { DELETE: deleteSavedCase } = await import("@/app/api/saved-cases/[savedCaseId]/route");

const createdUserIds: string[] = [];
const createdRoadmapIds: string[] = [];
const createdSavedCaseIds: string[] = [];
const createdInstitutionIds: string[] = [];

async function makeIncarceratedUser(institutionId?: string) {
  const user = await prisma.user.create({
    data: {
      clerkUserId: `clerk-regression-${Date.now()}-${Math.random()}`,
      role: "INCARCERATED_USER",
      accountStatus: "ACTIVE",
      institutionId,
    },
  });
  createdUserIds.push(user.id);
  return user;
}

describe("Cross-role and cross-user authorization regressions", () => {
  afterEach(async () => {
    await prisma.savedCase.deleteMany({ where: { id: { in: createdSavedCaseIds } } });
    createdSavedCaseIds.length = 0;
    await prisma.researchRoadmap.deleteMany({ where: { id: { in: createdRoadmapIds } } });
    createdRoadmapIds.length = 0;
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    createdUserIds.length = 0;
    await prisma.institution.deleteMany({ where: { id: { in: createdInstitutionIds } } });
    createdInstitutionIds.length = 0;
    mockClerkUserId = null;
  });

  it("an institution-managed (incarcerated) user hitting /api/institution/users gets 403, never staff data", async () => {
    const institution = await prisma.institution.create({
      data: { name: "Regression Test Institution", code: `regression-${Date.now()}` },
    });
    createdInstitutionIds.push(institution.id);
    const incarceratedUser = await makeIncarceratedUser(institution.id);
    mockClerkUserId = incarceratedUser.clerkUserId;

    const response = await getInstitutionUsers(new NextRequest("https://example.com/api/institution/users"));
    expect(response.status).toBe(403);
  });

  it("manually changing a roadmap id in the URL never exposes another user's Cases to Research", async () => {
    const owner = await makeIncarceratedUser();
    const intruder = await makeIncarceratedUser();
    const roadmap = await prisma.researchRoadmap.create({
      data: {
        userId: owner.id,
        title: "x",
        summary: "x",
        sourceKind: "DETERMINISTIC_FALLBACK",
        content: {
          title: "x",
          summary: "x",
          jurisdiction: { label: "South Carolina", code: "SC", limitationNote: "n" },
          steps: [],
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

    mockClerkUserId = intruder.clerkUserId;
    const response = await getRoadmapCases(
      new NextRequest(`https://example.com/api/roadmaps/${roadmap.id}/cases`),
      { params: Promise.resolve({ roadmapId: roadmap.id }) },
    );
    expect(response.status).toBe(404);
  });

  it("manually changing a saved-case id in the URL never lets another user delete it", async () => {
    const owner = await makeIncarceratedUser();
    const intruder = await makeIncarceratedUser();
    const savedCase = await prisma.savedCase.create({
      data: {
        userId: owner.id,
        providerName: "courtlistener",
        providerCaseId: "1",
        caseName: "Smith v. State",
        court: "sc",
        jurisdiction: "sc",
        sourceUrl: "https://www.courtlistener.com/opinion/1/smith-v-state/",
        sourceName: "CourtListener (Free Law Project)",
      },
    });
    createdSavedCaseIds.push(savedCase.id);

    mockClerkUserId = intruder.clerkUserId;
    const response = await deleteSavedCase(
      new NextRequest(`https://example.com/api/saved-cases/${savedCase.id}`, { method: "DELETE" }),
      { params: Promise.resolve({ savedCaseId: savedCase.id }) },
    );
    expect(response.status).toBe(404);

    const stillExists = await prisma.savedCase.findUnique({ where: { id: savedCase.id } });
    expect(stillExists).not.toBeNull();
  });
});
