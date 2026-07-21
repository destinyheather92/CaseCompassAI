import { afterAll, afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { getInstitutionDashboardOverview } from "@/lib/institution/get-institution-dashboard-overview";

const createdInstitutionIds: string[] = [];
const createdUserIds: string[] = [];
const createdSessionIds: string[] = [];
const createdRoadmapIds: string[] = [];

async function makeInstitution(overrides: Partial<Parameters<typeof prisma.institution.create>[0]["data"]> = {}) {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const institution = await prisma.institution.create({
    data: { name: `Test Facility ${suffix}`, code: `test-facility-${suffix}`, ...overrides },
  });
  createdInstitutionIds.push(institution.id);
  return institution;
}

interface MakeUserOverrides {
  accountStatus?: "ACTIVE" | "DISABLED" | "LOCKED" | "PENDING_FIRST_LOGIN" | "TEMPORARY_PASSWORD_EXPIRED" | "ARCHIVED";
  lastLoginAt?: Date | null;
  username?: string;
}

async function makeUser(institutionId: string, overrides: MakeUserOverrides = {}) {
  const user = await prisma.user.create({
    data: {
      clerkUserId: `clerk-inst-overview-${Date.now()}-${Math.random()}`,
      role: "INCARCERATED_USER",
      institutionId,
      ...overrides,
    },
  });
  createdUserIds.push(user.id);
  return user;
}

describe("getInstitutionDashboardOverview", () => {
  afterEach(async () => {
    await prisma.researchRoadmap.deleteMany({ where: { id: { in: createdRoadmapIds } } });
    createdRoadmapIds.length = 0;
    await prisma.intakeSession.deleteMany({ where: { id: { in: createdSessionIds } } });
    createdSessionIds.length = 0;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.institution.deleteMany({ where: { id: { in: createdInstitutionIds } } });
    await prisma.$disconnect();
  });

  it("counts accounts by status and aggregate research activity", async () => {
    const institution = await makeInstitution();
    await makeUser(institution.id, { accountStatus: "ACTIVE" });
    await makeUser(institution.id, { accountStatus: "PENDING_FIRST_LOGIN" });
    await makeUser(institution.id, { accountStatus: "ARCHIVED" });

    const session = await prisma.intakeSession.create({
      data: {
        institutionId: institution.id,
        caseType: "criminal",
        jurisdiction: "SC",
        proceduralStage: "post-conviction",
        researchGoals: [],
        documentTypes: [],
      },
    });
    createdSessionIds.push(session.id);

    const roadmap = await prisma.researchRoadmap.create({
      data: {
        institutionId: institution.id,
        title: "Test Roadmap",
        summary: "x",
        sourceKind: "DETERMINISTIC_FALLBACK",
        content: {},
      },
    });
    createdRoadmapIds.push(roadmap.id);

    const overview = await getInstitutionDashboardOverview(institution.id);

    expect(overview.institutionName).toBe(institution.name);
    expect(overview.totalManagedAccounts).toBe(3);
    expect(overview.activeUsers).toBe(1);
    expect(overview.pendingInvitations).toBe(1);
    expect(overview.archivedAccounts).toBe(1);
    expect(overview.intakesStarted).toBe(1);
    expect(overview.roadmapsGenerated).toBe(1);
  });

  it("surfaces a pending-first-login system notice when accounts are waiting", async () => {
    const institution = await makeInstitution();
    await makeUser(institution.id, { accountStatus: "PENDING_FIRST_LOGIN" });

    const overview = await getInstitutionDashboardOverview(institution.id);
    expect(overview.systemNotices.some((n) => n.id === "pending-first-login")).toBe(true);
  });

  it("returns no system notices when everything is nominal", async () => {
    const institution = await makeInstitution();
    await makeUser(institution.id, { accountStatus: "ACTIVE" });

    const overview = await getInstitutionDashboardOverview(institution.id);
    expect(overview.systemNotices).toEqual([]);
  });

  it("lists recent logins ordered most-recent-first, excluding users who have never logged in", async () => {
    const institution = await makeInstitution();
    await makeUser(institution.id, { lastLoginAt: null, username: "never-logged-in" });
    await makeUser(institution.id, { lastLoginAt: new Date("2026-07-01"), username: "older-login" });
    await makeUser(institution.id, { lastLoginAt: new Date("2026-07-15"), username: "newer-login" });

    const overview = await getInstitutionDashboardOverview(institution.id);

    expect(overview.recentLogins.map((l) => l.label)).toEqual(["newer-login", "older-login"]);
  });

  it("never surfaces another institution's accounts or activity", async () => {
    const institutionA = await makeInstitution();
    const institutionB = await makeInstitution();
    await makeUser(institutionA.id);
    await makeUser(institutionB.id);
    await makeUser(institutionB.id);

    const overview = await getInstitutionDashboardOverview(institutionA.id);
    expect(overview.totalManagedAccounts).toBe(1);
  });
});
