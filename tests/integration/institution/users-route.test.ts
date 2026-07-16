import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

let mockClerkUserId: string | null = null;

vi.mock("@clerk/nextjs/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@clerk/nextjs/server")>();
  return {
    ...actual,
    auth: vi.fn(async () => ({ userId: mockClerkUserId })),
  };
});

// The route's own responsibility is auth/validation/status-mapping — the
// business logic of createInstitutionUser (including its real Clerk
// call) is already fully covered by
// tests/integration/institution/create-user.test.ts. Mocking it here
// keeps this suite from ever touching the live Clerk API, and lets us
// assert precisely what the route passed in.
vi.mock("@/lib/institution/create-user", () => ({
  createInstitutionUser: vi.fn(),
}));

const { createInstitutionUser } = await import("@/lib/institution/create-user");
const { POST } = await import("@/app/api/institution/users/route");

const createdUserIds: string[] = [];
const createdInstitutionIds: string[] = [];

async function makeInstitution() {
  const institution = await prisma.institution.create({
    data: { name: "Users Route Test Institution", code: `route-test-${Date.now()}-${Math.random()}` },
  });
  createdInstitutionIds.push(institution.id);
  return institution;
}

async function makeUser(overrides: Partial<Parameters<typeof prisma.user.create>[0]["data"]>) {
  const user = await prisma.user.create({
    data: { clerkUserId: `clerk-route-${Date.now()}-${Math.random()}`, role: "INCARCERATED_USER", ...overrides },
  });
  createdUserIds.push(user.id);
  return user;
}

function postRequest(body: unknown) {
  return new NextRequest("https://example.com/api/institution/users", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/institution/users", () => {
  beforeEach(() => {
    mockClerkUserId = null;
    vi.mocked(createInstitutionUser).mockReset();
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
    mockClerkUserId = null;
    const response = await POST(postRequest({ role: "incarcerated-user" }));
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.status).toBe("unauthenticated");
    expect(createInstitutionUser).not.toHaveBeenCalled();
  });

  it("returns 403 for an authenticated user who is not an institution-admin", async () => {
    const incarceratedUser = await makeUser({ role: "INCARCERATED_USER" });
    mockClerkUserId = incarceratedUser.clerkUserId;

    const response = await POST(postRequest({ role: "incarcerated-user" }));
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.status).toBe("forbidden");
    expect(createInstitutionUser).not.toHaveBeenCalled();
  });

  it("returns 403 for an institution-admin who must still change their own password", async () => {
    const institution = await makeInstitution();
    const admin = await makeUser({ role: "INSTITUTION_ADMIN", institutionId: institution.id, mustChangePassword: true });
    mockClerkUserId = admin.clerkUserId;

    const response = await POST(postRequest({ role: "incarcerated-user" }));
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.status).toBe("must-change-password");
    expect(createInstitutionUser).not.toHaveBeenCalled();
  });

  it("rejects a malformed JSON body with 400", async () => {
    const institution = await makeInstitution();
    const admin = await makeUser({ role: "INSTITUTION_ADMIN", institutionId: institution.id });
    mockClerkUserId = admin.clerkUserId;

    const response = await POST(
      new NextRequest("https://example.com/api/institution/users", { method: "POST", body: "{not json" }),
    );
    expect(response.status).toBe(400);
    expect(createInstitutionUser).not.toHaveBeenCalled();
  });

  it("rejects an invalid role with 400 and never calls createInstitutionUser", async () => {
    const institution = await makeInstitution();
    const admin = await makeUser({ role: "INSTITUTION_ADMIN", institutionId: institution.id });
    mockClerkUserId = admin.clerkUserId;

    const response = await POST(postRequest({ role: "system-admin" }));
    expect(response.status).toBe(400);
    expect(createInstitutionUser).not.toHaveBeenCalled();
  });

  it("derives institutionId from the authenticated staff member, ignoring any institutionId in the request body", async () => {
    const institution = await makeInstitution();
    const otherInstitution = await makeInstitution();
    const admin = await makeUser({ role: "INSTITUTION_ADMIN", institutionId: institution.id });
    mockClerkUserId = admin.clerkUserId;

    vi.mocked(createInstitutionUser).mockResolvedValueOnce({
      status: "created",
      user: { id: "new-user-id", username: "fac-abc123", role: "INCARCERATED_USER", accountStatus: "PENDING_FIRST_LOGIN" },
      temporaryPassword: "generated-temp-password",
    });

    const response = await POST(postRequest({ role: "incarcerated-user", institutionId: otherInstitution.id }));

    expect(response.status).toBe(201);
    expect(createInstitutionUser).toHaveBeenCalledWith(
      expect.objectContaining({ institutionId: institution.id, actorUserId: admin.id }),
    );
    // The attacker-supplied institutionId in the body must never reach createInstitutionUser.
    const callArgs = vi.mocked(createInstitutionUser).mock.calls[0][0];
    expect(callArgs.institutionId).not.toBe(otherInstitution.id);
  });

  it("maps a successful creation to 201 with the temporary password returned exactly once", async () => {
    const institution = await makeInstitution();
    const admin = await makeUser({ role: "INSTITUTION_ADMIN", institutionId: institution.id });
    mockClerkUserId = admin.clerkUserId;

    vi.mocked(createInstitutionUser).mockResolvedValueOnce({
      status: "created",
      user: { id: "new-user-id", username: "fac-abc123", role: "EDUCATOR", accountStatus: "PENDING_FIRST_LOGIN" },
      temporaryPassword: "generated-temp-password",
    });

    const response = await POST(postRequest({ role: "educator" }));
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.temporaryPassword).toBe("generated-temp-password");
    expect(body.user.role).toBe("EDUCATOR");
    expect(body.user.passwordHash).toBeUndefined();
  });

  it("maps username-taken to 409", async () => {
    const institution = await makeInstitution();
    const admin = await makeUser({ role: "INSTITUTION_ADMIN", institutionId: institution.id });
    mockClerkUserId = admin.clerkUserId;

    vi.mocked(createInstitutionUser).mockResolvedValueOnce({ status: "username-taken" });

    const response = await POST(postRequest({ role: "incarcerated-user", username: "already-taken" }));
    expect(response.status).toBe(409);
  });

  it("maps invalid-facility to 400", async () => {
    const institution = await makeInstitution();
    const admin = await makeUser({ role: "INSTITUTION_ADMIN", institutionId: institution.id });
    mockClerkUserId = admin.clerkUserId;

    vi.mocked(createInstitutionUser).mockResolvedValueOnce({ status: "invalid-facility" });

    const response = await POST(postRequest({ role: "incarcerated-user", facilityId: "not-mine" }));
    expect(response.status).toBe(400);
  });
});
