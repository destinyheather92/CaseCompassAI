import { afterAll, afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { listInstitutionRoadmaps } from "@/lib/institution/list-institution-roadmaps";

const createdInstitutionIds: string[] = [];
const createdUserIds: string[] = [];
const createdRoadmapIds: string[] = [];

async function makeInstitution() {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const institution = await prisma.institution.create({
    data: { name: `Test Facility ${suffix}`, code: `test-facility-${suffix}` },
  });
  createdInstitutionIds.push(institution.id);
  return institution;
}

describe("listInstitutionRoadmaps", () => {
  afterEach(async () => {
    await prisma.researchRoadmap.deleteMany({ where: { id: { in: createdRoadmapIds } } });
    createdRoadmapIds.length = 0;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.institution.deleteMany({ where: { id: { in: createdInstitutionIds } } });
    await prisma.$disconnect();
  });

  it("lists roadmaps scoped to the institution, most recent first, with an owner label", async () => {
    const institution = await makeInstitution();
    const user = await prisma.user.create({
      data: { clerkUserId: `clerk-inst-roadmaps-${Date.now()}-${Math.random()}`, role: "INCARCERATED_USER", institutionId: institution.id, displayName: "J. Rivera" },
    });
    createdUserIds.push(user.id);

    const roadmap = await prisma.researchRoadmap.create({
      data: { institutionId: institution.id, userId: user.id, title: "Post-Conviction Roadmap", summary: "x", sourceKind: "DETERMINISTIC_FALLBACK", content: {} },
    });
    createdRoadmapIds.push(roadmap.id);

    const results = await listInstitutionRoadmaps(institution.id);
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe("Post-Conviction Roadmap");
    expect(results[0].ownerLabel).toBe("J. Rivera");
  });

  it("never includes another institution's roadmaps", async () => {
    const institutionA = await makeInstitution();
    const institutionB = await makeInstitution();
    const roadmap = await prisma.researchRoadmap.create({
      data: { institutionId: institutionB.id, title: "Other Institution Roadmap", summary: "x", sourceKind: "DETERMINISTIC_FALLBACK", content: {} },
    });
    createdRoadmapIds.push(roadmap.id);

    const results = await listInstitutionRoadmaps(institutionA.id);
    expect(results).toEqual([]);
  });
});
