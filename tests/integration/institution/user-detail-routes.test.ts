import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

let mockClerkUserId: string | null = null;

vi.mock("@clerk/nextjs/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@clerk/nextjs/server")>();
  return { ...actual, auth: vi.fn(async () => ({ userId: mockClerkUserId })) };
});

vi.mock("@/lib/institution/change-user-status", () => ({
  changeInstitutionUserStatus: vi.fn(),
}));
vi.mock("@/lib/institution/reset-user-password", () => ({
  resetInstitutionUserPassword: vi.fn(),
}));

const { changeInstitutionUserStatus } = await import("@/lib/institution/change-user-status");
const { resetInstitutionUserPassword } = await import("@/lib/institution/reset-user-password");
const { PATCH } = await import("@/app/api/institution/users/[id]/route");
const { POST: resetPasswordPOST } = await import("@/app/api/institution/users/[id]/reset-password/route");

const createdUserIds: string[] = [];
const createdInstitutionIds: string[] = [];

async function makeInstitution() {
  const institution = await prisma.institution.create({
    data: { name: "Detail Route Test Institution", code: `detail-route-${Date.now()}-${Math.random()}` },
  });
  createdInstitutionIds.push(institution.id);
  return institution;
}

async function makeUser(overrides: Partial<Parameters<typeof prisma.user.create>[0]["data"]>) {
  const user = await prisma.user.create({
    data: { clerkUserId: `clerk-detail-${Date.now()}-${Math.random()}`, role: "INCARCERATED_USER", ...overrides },
  });
  createdUserIds.push(user.id);
  return user;
}

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("PATCH /api/institution/users/[id]", () => {
  beforeEach(() => {
    mockClerkUserId = null;
    vi.mocked(changeInstitutionUserStatus).mockReset();
  });

  afterEach(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    createdUserIds.length = 0;
  });

  afterAll(async () => {
    await prisma.institution.deleteMany({ where: { id: { in: createdInstitutionIds } } });
    await prisma.$disconnect();
  });

  it("returns 401 for an unauthenticated caller", async () => {
    const response = await PATCH(
      new NextRequest("https://example.com/api/institution/users/target", { method: "PATCH", body: JSON.stringify({ action: "deactivate" }) }),
      ctx("target"),
    );
    expect(response.status).toBe(401);
    expect(changeInstitutionUserStatus).not.toHaveBeenCalled();
  });

  it("returns 403 for a non-admin caller", async () => {
    const user = await makeUser({ role: "INCARCERATED_USER" });
    mockClerkUserId = user.clerkUserId;

    const response = await PATCH(
      new NextRequest("https://example.com/api/institution/users/target", { method: "PATCH", body: JSON.stringify({ action: "deactivate" }) }),
      ctx("target"),
    );
    expect(response.status).toBe(403);
  });

  it("derives institutionId from the caller and passes the route param id as targetUserId", async () => {
    const institution = await makeInstitution();
    const admin = await makeUser({ role: "INSTITUTION_ADMIN", institutionId: institution.id });
    mockClerkUserId = admin.clerkUserId;
    vi.mocked(changeInstitutionUserStatus).mockResolvedValueOnce({ status: "updated", accountStatus: "DISABLED" });

    const response = await PATCH(
      new NextRequest("https://example.com/api/institution/users/target-id", {
        method: "PATCH",
        body: JSON.stringify({ action: "deactivate" }),
      }),
      ctx("target-id"),
    );

    expect(response.status).toBe(200);
    expect(changeInstitutionUserStatus).toHaveBeenCalledWith({
      actorUserId: admin.id,
      institutionId: institution.id,
      targetUserId: "target-id",
      action: "deactivate",
    });
  });

  it("rejects an invalid action value with 400", async () => {
    const institution = await makeInstitution();
    const admin = await makeUser({ role: "INSTITUTION_ADMIN", institutionId: institution.id });
    mockClerkUserId = admin.clerkUserId;

    const response = await PATCH(
      new NextRequest("https://example.com/api/institution/users/target", {
        method: "PATCH",
        body: JSON.stringify({ action: "delete-forever" }),
      }),
      ctx("target"),
    );
    expect(response.status).toBe(400);
    expect(changeInstitutionUserStatus).not.toHaveBeenCalled();
  });

  it("maps forbidden-institution from the service layer to 403", async () => {
    const institution = await makeInstitution();
    const admin = await makeUser({ role: "INSTITUTION_ADMIN", institutionId: institution.id });
    mockClerkUserId = admin.clerkUserId;
    vi.mocked(changeInstitutionUserStatus).mockResolvedValueOnce({ status: "forbidden-institution" });

    const response = await PATCH(
      new NextRequest("https://example.com/api/institution/users/other-inst-user", {
        method: "PATCH",
        body: JSON.stringify({ action: "deactivate" }),
      }),
      ctx("other-inst-user"),
    );
    expect(response.status).toBe(403);
  });
});

describe("POST /api/institution/users/[id]/reset-password", () => {
  beforeEach(() => {
    mockClerkUserId = null;
    vi.mocked(resetInstitutionUserPassword).mockReset();
  });

  afterEach(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    createdUserIds.length = 0;
  });

  it("returns 401 for an unauthenticated caller", async () => {
    const response = await resetPasswordPOST(
      new NextRequest("https://example.com/api/institution/users/target/reset-password", { method: "POST" }),
      ctx("target"),
    );
    expect(response.status).toBe(401);
    expect(resetInstitutionUserPassword).not.toHaveBeenCalled();
  });

  it("returns the new temporary password exactly once on success, scoped to the caller's institution", async () => {
    const institution = await makeInstitution();
    const admin = await makeUser({ role: "INSTITUTION_ADMIN", institutionId: institution.id });
    mockClerkUserId = admin.clerkUserId;
    vi.mocked(resetInstitutionUserPassword).mockResolvedValueOnce({ status: "reset", temporaryPassword: "new-temp-pw" });

    const response = await resetPasswordPOST(
      new NextRequest("https://example.com/api/institution/users/target-id/reset-password", { method: "POST" }),
      ctx("target-id"),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.temporaryPassword).toBe("new-temp-pw");
    expect(resetInstitutionUserPassword).toHaveBeenCalledWith({
      actorUserId: admin.id,
      institutionId: institution.id,
      targetUserId: "target-id",
    });
  });

  it("maps not-found to 404", async () => {
    const institution = await makeInstitution();
    const admin = await makeUser({ role: "INSTITUTION_ADMIN", institutionId: institution.id });
    mockClerkUserId = admin.clerkUserId;
    vi.mocked(resetInstitutionUserPassword).mockResolvedValueOnce({ status: "not-found" });

    const response = await resetPasswordPOST(
      new NextRequest("https://example.com/api/institution/users/missing/reset-password", { method: "POST" }),
      ctx("missing"),
    );
    expect(response.status).toBe(404);
  });
});
