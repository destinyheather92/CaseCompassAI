import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

let mockClerkUserId: string | null = null;

vi.mock("@clerk/nextjs/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@clerk/nextjs/server")>();
  return { ...actual, auth: vi.fn(async () => ({ userId: mockClerkUserId })) };
});

const { GET } = await import("@/app/api/institution/users/route");

const createdUserIds: string[] = [];
const createdInstitutionIds: string[] = [];

async function makeInstitution() {
  const institution = await prisma.institution.create({
    data: { name: "List Route Test Institution", code: `list-route-${Date.now()}-${Math.random()}` },
  });
  createdInstitutionIds.push(institution.id);
  return institution;
}

async function makeUser(overrides: Partial<Parameters<typeof prisma.user.create>[0]["data"]>) {
  const user = await prisma.user.create({
    data: { clerkUserId: `clerk-list-route-${Date.now()}-${Math.random()}`, role: "INCARCERATED_USER", ...overrides },
  });
  createdUserIds.push(user.id);
  return user;
}

describe("GET /api/institution/users", () => {
  beforeEach(() => {
    mockClerkUserId = null;
  });

  afterEach(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    createdUserIds.length = 0;
  });

  afterAll(async () => {
    await prisma.institution.deleteMany({ where: { id: { in: createdInstitutionIds } } });
    await prisma.$disconnect();
  });

  it("returns 401 for an unauthenticated request", async () => {
    const response = await GET(new NextRequest("https://example.com/api/institution/users"));
    expect(response.status).toBe(401);
  });

  it("returns 403 for a caller who is not an institution-admin", async () => {
    const user = await makeUser({ role: "INCARCERATED_USER" });
    mockClerkUserId = user.clerkUserId;
    const response = await GET(new NextRequest("https://example.com/api/institution/users"));
    expect(response.status).toBe(403);
  });

  it("scopes results to the caller's institution and ignores a query-string institutionId override", async () => {
    const institution = await makeInstitution();
    const otherInstitution = await makeInstitution();
    const admin = await makeUser({ role: "INSTITUTION_ADMIN", institutionId: institution.id });
    const inMine = await makeUser({ role: "INCARCERATED_USER", institutionId: institution.id, username: `mine-${Date.now()}` });
    await makeUser({ role: "INCARCERATED_USER", institutionId: otherInstitution.id, username: `theirs-${Date.now()}` });
    mockClerkUserId = admin.clerkUserId;

    const response = await GET(
      new NextRequest(
        `https://example.com/api/institution/users?institutionId=${otherInstitution.id}&role=incarcerated_user`,
      ),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.users.map((u: { id: string }) => u.id)).toEqual([inMine.id]);
  });
});
