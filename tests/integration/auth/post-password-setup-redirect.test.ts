import { afterAll, afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { getPostPasswordSetupRoute } from "@/lib/auth/post-password-setup-redirect";

const createdUserIds: string[] = [];
const createdSessionIds: string[] = [];
const createdRoadmapIds: string[] = [];

async function makeUser(role: "INSTITUTION_ADMIN" | "INCARCERATED_USER" | "EDUCATOR" | "LEGAL_AID_STAFF") {
  const user = await prisma.user.create({
    data: { clerkUserId: `clerk-redirect-${Date.now()}-${Math.random()}`, role },
  });
  createdUserIds.push(user.id);
  return user;
}

describe("getPostPasswordSetupRoute", () => {
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

  it("routes an institution admin straight to the institution dashboard", async () => {
    const user = await makeUser("INSTITUTION_ADMIN");
    expect(await getPostPasswordSetupRoute(user)).toBe("/institution/dashboard");
  });

  it("never routes an institution admin into the intake flow, even if they somehow have an orphaned intake session", async () => {
    const user = await makeUser("INSTITUTION_ADMIN");
    const session = await prisma.intakeSession.create({
      data: { userId: user.id, caseType: "criminal", jurisdiction: "SC", proceduralStage: "trial", researchGoals: [], documentTypes: [], status: "COMPLETED" },
    });
    createdSessionIds.push(session.id);
    expect(await getPostPasswordSetupRoute(user)).toBe("/institution/dashboard");
  });

  it("routes an incarcerated user with no intake at all to /get-started", async () => {
    const user = await makeUser("INCARCERATED_USER");
    expect(await getPostPasswordSetupRoute(user)).toBe("/get-started");
  });

  it("routes an incarcerated user with only an in-progress (unconfirmed) intake to /get-started to resume it", async () => {
    const user = await makeUser("INCARCERATED_USER");
    const session = await prisma.intakeSession.create({
      data: { userId: user.id, caseType: "criminal", jurisdiction: "SC", proceduralStage: "trial", researchGoals: [], documentTypes: [], status: "INTERVIEWING" },
    });
    createdSessionIds.push(session.id);
    expect(await getPostPasswordSetupRoute(user)).toBe("/get-started");
  });

  it("routes an incarcerated user with a confirmed intake (no roadmap yet) to /dashboard", async () => {
    const user = await makeUser("INCARCERATED_USER");
    const session = await prisma.intakeSession.create({
      data: { userId: user.id, caseType: "criminal", jurisdiction: "SC", proceduralStage: "trial", researchGoals: [], documentTypes: [], status: "COMPLETED" },
    });
    createdSessionIds.push(session.id);
    expect(await getPostPasswordSetupRoute(user)).toBe("/dashboard");
  });

  it("routes an incarcerated user with an existing roadmap to /dashboard", async () => {
    const user = await makeUser("INCARCERATED_USER");
    const roadmap = await prisma.researchRoadmap.create({
      data: { userId: user.id, title: "t", summary: "s", sourceKind: "DETERMINISTIC_FALLBACK", content: {} },
    });
    createdRoadmapIds.push(roadmap.id);
    expect(await getPostPasswordSetupRoute(user)).toBe("/dashboard");
  });

  it("leaves educator/legal-aid-staff behavior unchanged at /get-started (no product decision distinguishes them)", async () => {
    const educator = await makeUser("EDUCATOR");
    const legalAid = await makeUser("LEGAL_AID_STAFF");
    expect(await getPostPasswordSetupRoute(educator)).toBe("/get-started");
    expect(await getPostPasswordSetupRoute(legalAid)).toBe("/get-started");
  });
});
