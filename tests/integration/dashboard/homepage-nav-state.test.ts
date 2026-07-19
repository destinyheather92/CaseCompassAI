import { afterAll, afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { resolveHomepageNavState } from "@/lib/dashboard/homepage-nav-state";

const createdUserIds: string[] = [];
const createdSessionIds: string[] = [];

async function makeUser() {
  const user = await prisma.user.create({
    data: { clerkUserId: `clerk-homepage-nav-${Date.now()}-${Math.random()}`, role: "INDIVIDUAL" },
  });
  createdUserIds.push(user.id);
  return user;
}

describe("resolveHomepageNavState", () => {
  afterEach(async () => {
    await prisma.intakeSession.deleteMany({ where: { id: { in: createdSessionIds } } });
    createdSessionIds.length = 0;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.$disconnect();
  });

  it("returns Start Intake for a user with no intake yet", async () => {
    const user = await makeUser();
    const state = await resolveHomepageNavState(user.id);
    expect(state.ctaLabel).toBe("Start Intake");
    expect(state.ctaHref).toBe("/get-started");
    expect(state.dashboardHref).toBe("/dashboard");
  });

  it("returns Continue Intake for an in-progress intake", async () => {
    const user = await makeUser();
    const session = await prisma.intakeSession.create({
      data: {
        userId: user.id,
        status: "INTERVIEWING",
        caseType: "criminal",
        jurisdiction: "SC",
        proceduralStage: "pre-trial",
        researchGoals: [],
        documentTypes: [],
      },
    });
    createdSessionIds.push(session.id);

    const state = await resolveHomepageNavState(user.id);
    expect(state.ctaLabel).toBe("Continue Intake");
  });

  it("returns Continue Research once the intake is confirmed", async () => {
    const user = await makeUser();
    const session = await prisma.intakeSession.create({
      data: {
        userId: user.id,
        status: "COMPLETED",
        caseType: "criminal",
        jurisdiction: "SC",
        proceduralStage: "pre-trial",
        researchGoals: [],
        documentTypes: [],
      },
    });
    createdSessionIds.push(session.id);

    const state = await resolveHomepageNavState(user.id);
    expect(state.ctaLabel).toBe("Continue Research");
  });
});
