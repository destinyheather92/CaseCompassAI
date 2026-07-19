import { afterAll, afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { getDashboardOverview } from "@/lib/dashboard/get-dashboard-overview";

const createdUserIds: string[] = [];
const createdSessionIds: string[] = [];
const createdRoadmapIds: string[] = [];

async function makeUser() {
  const user = await prisma.user.create({
    data: { clerkUserId: `clerk-dashboard-overview-${Date.now()}-${Math.random()}`, role: "INDIVIDUAL" },
  });
  createdUserIds.push(user.id);
  return user;
}

describe("getDashboardOverview", () => {
  afterEach(async () => {
    await prisma.researchRoadmap.deleteMany({ where: { id: { in: createdRoadmapIds } } });
    createdRoadmapIds.length = 0;
    await prisma.intakeSession.deleteMany({ where: { id: { in: createdSessionIds } } });
    createdSessionIds.length = 0;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.$disconnect();
  });

  it("returns a not-started overview for a brand-new user with no intake", async () => {
    const user = await makeUser();
    const overview = await getDashboardOverview(user.id);

    expect(overview.researchStatus).toBe("not-started");
    expect(overview.primaryAction).toEqual({ label: "Start Intake", href: "/get-started" });
    expect(overview.activeIntake).toBeNull();
    expect(overview.activeRoadmap).toBeNull();
    expect(overview.timeline).toEqual([]);
    expect(overview.unresolvedInformation).toEqual([]);
    expect(overview.recentActivity).toEqual([]);
    expect(overview.disclaimer.length).toBeGreaterThan(0);
    expect(overview.recommendedResources.length).toBeGreaterThan(0);
  });

  it("surfaces the most recent intake's timeline and unresolved info when confirmed", async () => {
    const user = await makeUser();
    const session = await prisma.intakeSession.create({
      data: {
        userId: user.id,
        status: "COMPLETED",
        caseType: "criminal",
        jurisdiction: "SC",
        proceduralStage: "post-conviction",
        researchGoals: ["understand-case"],
        documentTypes: ["court-opinion"],
        unresolvedInformation: ["Exact sentencing date"],
        answers: {
          create: [
            {
              questionId: "q1",
              questionText: "When was your trial date?",
              answerText: "2024-03-01",
              answerType: "date",
              sequence: 1,
            },
          ],
        },
      },
    });
    createdSessionIds.push(session.id);

    const overview = await getDashboardOverview(user.id);

    expect(overview.researchStatus).toBe("intake-confirmed");
    expect(overview.activeIntake?.id).toBe(session.id);
    expect(overview.timeline).toHaveLength(1);
    expect(overview.timeline[0].title).toBe("When was your trial date?");
    expect(overview.unresolvedInformation).toEqual(["Exact sentencing date"]);
    expect(overview.legalTerms.length).toBeGreaterThan(0);
  });

  it("surfaces active roadmap progress rollups when a roadmap exists", async () => {
    const user = await makeUser();
    const session = await prisma.intakeSession.create({
      data: {
        userId: user.id,
        status: "COMPLETED",
        caseType: "civil",
        jurisdiction: "SC",
        proceduralStage: "pre-trial",
        researchGoals: ["understand-case"],
        documentTypes: ["none"],
      },
    });
    createdSessionIds.push(session.id);

    const roadmap = await prisma.researchRoadmap.create({
      data: {
        userId: user.id,
        intakeSessionId: session.id,
        title: "My Roadmap",
        summary: "Summary",
        sourceKind: "DETERMINISTIC_FALLBACK",
        content: {
          title: "My Roadmap",
          summary: "Summary",
          jurisdiction: { label: "South Carolina", code: "SC", limitationNote: "General only." },
          steps: [
            { id: "step-1", order: 1, title: "Step 1", description: "d", whyItMatters: "w", suggestedActions: [], relatedTerms: [] },
          ],
          legalTerms: [],
          sourceSuggestions: [],
          safetyNotes: [],
          confidence: { level: "low", explanation: "e" },
          disclaimer: "Not legal advice.",
          generatedAt: new Date().toISOString(),
        },
      },
    });
    createdRoadmapIds.push(roadmap.id);

    const overview = await getDashboardOverview(user.id);

    expect(overview.activeRoadmap?.id).toBe(roadmap.id);
    expect(overview.researchStatus).toBe("roadmap-generated");
    expect(overview.primaryAction.href).toBe(`/dashboard/roadmaps/${roadmap.id}`);
  });

  it("never surfaces another user's intake, roadmap, or activity", async () => {
    const user = await makeUser();
    const other = await makeUser();
    const othersSession = await prisma.intakeSession.create({
      data: {
        userId: other.id,
        caseType: "criminal",
        jurisdiction: "SC",
        proceduralStage: "pre-trial",
        researchGoals: ["understand-case"],
        documentTypes: ["none"],
      },
    });
    createdSessionIds.push(othersSession.id);

    const overview = await getDashboardOverview(user.id);
    expect(overview.activeIntake).toBeNull();
  });
});
