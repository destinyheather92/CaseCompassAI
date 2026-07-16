import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { listInstitutionUsers } from "@/lib/institution/list-users";

const createdUserIds: string[] = [];
const createdInstitutionIds: string[] = [];

async function makeInstitution(name: string) {
  const institution = await prisma.institution.create({
    data: { name, code: `list-users-${name}-${Date.now()}-${Math.random()}` },
  });
  createdInstitutionIds.push(institution.id);
  return institution;
}

async function makeUser(institutionId: string, overrides: Record<string, unknown> = {}) {
  const user = await prisma.user.create({
    data: {
      clerkUserId: `clerk-list-${Date.now()}-${Math.random()}`,
      role: "INCARCERATED_USER",
      accountStatus: "ACTIVE",
      institutionId,
      ...overrides,
    },
  });
  createdUserIds.push(user.id);
  return user;
}

describe("listInstitutionUsers", () => {
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.institution.deleteMany({ where: { id: { in: createdInstitutionIds } } });
    await prisma.$disconnect();
  });

  it("only returns users scoped to the given institution, never another institution's users", async () => {
    const institutionA = await makeInstitution("A");
    const institutionB = await makeInstitution("B");
    const userA1 = await makeUser(institutionA.id, { username: `alice-${Date.now()}` });
    const userA2 = await makeUser(institutionA.id, { username: `bob-${Date.now()}` });
    await makeUser(institutionB.id, { username: `carol-${Date.now()}` });

    const result = await listInstitutionUsers({ institutionId: institutionA.id });

    expect(result.total).toBe(2);
    expect(result.users.map((u) => u.id).sort()).toEqual([userA1.id, userA2.id].sort());
  });

  it("filters by role", async () => {
    const institution = await makeInstitution("RoleFilter");
    await makeUser(institution.id, { role: "INCARCERATED_USER" });
    const educator = await makeUser(institution.id, { role: "EDUCATOR" });

    const result = await listInstitutionUsers({ institutionId: institution.id, role: "EDUCATOR" });
    expect(result.users.map((u) => u.id)).toEqual([educator.id]);
  });

  it("filters by account status", async () => {
    const institution = await makeInstitution("StatusFilter");
    await makeUser(institution.id, { accountStatus: "ACTIVE" });
    const disabled = await makeUser(institution.id, { accountStatus: "DISABLED" });

    const result = await listInstitutionUsers({ institutionId: institution.id, status: "DISABLED" });
    expect(result.users.map((u) => u.id)).toEqual([disabled.id]);
  });

  it("filters by facility", async () => {
    const institution = await makeInstitution("FacilityFilter");
    const facility = await prisma.facility.create({ data: { institutionId: institution.id, name: "Unit A", code: "unit-a" } });
    const inFacility = await makeUser(institution.id, { facilityId: facility.id });
    await makeUser(institution.id, {});

    const result = await listInstitutionUsers({ institutionId: institution.id, facilityId: facility.id });
    expect(result.users.map((u) => u.id)).toEqual([inFacility.id]);
    await prisma.facility.delete({ where: { id: facility.id } });
  });

  it("searches by username", async () => {
    const institution = await makeInstitution("SearchFilter");
    const unique = `zephyr-${Date.now()}`;
    const target = await makeUser(institution.id, { username: unique });
    await makeUser(institution.id, { username: `other-${Date.now()}` });

    const result = await listInstitutionUsers({ institutionId: institution.id, search: "zephyr" });
    expect(result.users.map((u) => u.id)).toEqual([target.id]);
  });

  it("paginates results", async () => {
    const institution = await makeInstitution("Paginate");
    for (let i = 0; i < 5; i++) {
      await makeUser(institution.id, {});
    }

    const page1 = await listInstitutionUsers({ institutionId: institution.id, page: 1, pageSize: 2 });
    const page2 = await listInstitutionUsers({ institutionId: institution.id, page: 2, pageSize: 2 });

    expect(page1.users).toHaveLength(2);
    expect(page2.users).toHaveLength(2);
    expect(page1.total).toBe(5);
    expect(page1.users.map((u) => u.id)).not.toEqual(page2.users.map((u) => u.id));
  });

  it("never includes a clerkUserId or any credential-adjacent field in the projection", async () => {
    const institution = await makeInstitution("Projection");
    await makeUser(institution.id, {});

    const result = await listInstitutionUsers({ institutionId: institution.id });
    expect(Object.keys(result.users[0])).not.toContain("clerkUserId");
  });
});
