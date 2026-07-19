import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

let mockClerkUserId: string | null = null;

vi.mock("@clerk/nextjs/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@clerk/nextjs/server")>();
  return { ...actual, auth: vi.fn(async () => ({ userId: mockClerkUserId })) };
});

vi.mock("@/lib/saved/save-case", () => ({ saveCase: vi.fn() }));
vi.mock("@/lib/saved/remove-saved-case", () => ({ removeSavedCase: vi.fn() }));
vi.mock("@/lib/saved/update-saved-case-note", () => ({ updateSavedCaseNote: vi.fn() }));
vi.mock("@/lib/dashboard/get-user-saved-cases", () => ({ getUserSavedCases: vi.fn() }));

const { saveCase } = await import("@/lib/saved/save-case");
const { removeSavedCase } = await import("@/lib/saved/remove-saved-case");
const { updateSavedCaseNote } = await import("@/lib/saved/update-saved-case-note");
const { getUserSavedCases } = await import("@/lib/dashboard/get-user-saved-cases");
const { POST, GET } = await import("@/app/api/saved-cases/route");
const { DELETE, PATCH } = await import("@/app/api/saved-cases/[savedCaseId]/route");

const createdUserIds: string[] = [];

function postRequest(body: unknown) {
  return new NextRequest("https://example.com/api/saved-cases", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function getRequest() {
  return new NextRequest("https://example.com/api/saved-cases");
}

function deleteRequest() {
  return new NextRequest("https://example.com/api/saved-cases/s1", { method: "DELETE" });
}

function paramsFor(savedCaseId: string) {
  return { params: Promise.resolve({ savedCaseId }) };
}

async function makeActiveUser() {
  const user = await prisma.user.create({
    data: { clerkUserId: `clerk-saved-cases-route-${Date.now()}-${Math.random()}`, role: "INDIVIDUAL", accountStatus: "ACTIVE" },
  });
  createdUserIds.push(user.id);
  return user;
}

describe("POST /api/saved-cases", () => {
  beforeEach(() => {
    mockClerkUserId = null;
    vi.mocked(saveCase).mockReset();
  });

  afterEach(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    createdUserIds.length = 0;
  });

  it("rejects an unauthenticated request without calling the service", async () => {
    const response = await POST(postRequest({}));
    expect(response.status).toBe(401);
    expect(saveCase).not.toHaveBeenCalled();
  });

  it("delegates to the service for an authenticated user", async () => {
    const user = await makeActiveUser();
    mockClerkUserId = user.clerkUserId;
    vi.mocked(saveCase).mockResolvedValueOnce({ status: "saved", id: "sc1" });

    const body = { providerName: "courtlistener", providerCaseId: "1", caseName: "x", court: "sc", jurisdiction: "sc", sourceUrl: "https://x", sourceName: "x" };
    const response = await POST(postRequest(body));
    expect(response.status).toBe(201);
    expect(saveCase).toHaveBeenCalledWith(body, expect.objectContaining({ id: user.id }));
  });

  it("returns 200 for already-saved", async () => {
    const user = await makeActiveUser();
    mockClerkUserId = user.clerkUserId;
    vi.mocked(saveCase).mockResolvedValueOnce({ status: "already-saved", id: "sc1" });
    const response = await POST(postRequest({}));
    expect(response.status).toBe(200);
  });

  it("returns 400 for invalid-roadmap", async () => {
    const user = await makeActiveUser();
    mockClerkUserId = user.clerkUserId;
    vi.mocked(saveCase).mockResolvedValueOnce({ status: "invalid-roadmap" });
    const response = await POST(postRequest({}));
    expect(response.status).toBe(400);
  });
});

describe("GET /api/saved-cases", () => {
  beforeEach(() => {
    mockClerkUserId = null;
    vi.mocked(getUserSavedCases).mockReset();
  });

  afterEach(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    createdUserIds.length = 0;
  });

  it("rejects an unauthenticated request", async () => {
    const response = await GET(getRequest());
    expect(response.status).toBe(401);
    expect(getUserSavedCases).not.toHaveBeenCalled();
  });

  it("returns the caller's own saved cases", async () => {
    const user = await makeActiveUser();
    mockClerkUserId = user.clerkUserId;
    vi.mocked(getUserSavedCases).mockResolvedValueOnce([]);

    const response = await GET(getRequest());
    expect(response.status).toBe(200);
    expect(getUserSavedCases).toHaveBeenCalledWith(user.id, undefined);
  });
});

describe("DELETE /api/saved-cases/[savedCaseId]", () => {
  beforeEach(() => {
    mockClerkUserId = null;
    vi.mocked(removeSavedCase).mockReset();
  });

  afterEach(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    createdUserIds.length = 0;
  });

  it("rejects an unauthenticated request without calling the service", async () => {
    const response = await DELETE(deleteRequest(), paramsFor("s1"));
    expect(response.status).toBe(401);
    expect(removeSavedCase).not.toHaveBeenCalled();
  });

  it("delegates to the service for an authenticated user", async () => {
    const user = await makeActiveUser();
    mockClerkUserId = user.clerkUserId;
    vi.mocked(removeSavedCase).mockResolvedValueOnce({ status: "removed" });

    const response = await DELETE(deleteRequest(), paramsFor("s1"));
    expect(response.status).toBe(200);
    expect(removeSavedCase).toHaveBeenCalledWith("s1", expect.objectContaining({ id: user.id }));
  });

  it("returns 404 for not-found", async () => {
    const user = await makeActiveUser();
    mockClerkUserId = user.clerkUserId;
    vi.mocked(removeSavedCase).mockResolvedValueOnce({ status: "not-found" });
    const response = await DELETE(deleteRequest(), paramsFor("s1"));
    expect(response.status).toBe(404);
  });
});

describe("PATCH /api/saved-cases/[savedCaseId]", () => {
  beforeEach(() => {
    mockClerkUserId = null;
    vi.mocked(updateSavedCaseNote).mockReset();
  });

  afterEach(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    createdUserIds.length = 0;
  });

  function patchRequest(body: unknown) {
    return new NextRequest("https://example.com/api/saved-cases/s1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("rejects an unauthenticated request without calling the service", async () => {
    const response = await PATCH(patchRequest({ note: "x" }), paramsFor("s1"));
    expect(response.status).toBe(401);
    expect(updateSavedCaseNote).not.toHaveBeenCalled();
  });

  it("delegates to the service for an authenticated user", async () => {
    const user = await makeActiveUser();
    mockClerkUserId = user.clerkUserId;
    vi.mocked(updateSavedCaseNote).mockResolvedValueOnce({ status: "updated" });

    const response = await PATCH(patchRequest({ note: "Called the clerk." }), paramsFor("s1"));
    expect(response.status).toBe(200);
    expect(updateSavedCaseNote).toHaveBeenCalledWith("s1", { note: "Called the clerk." }, expect.objectContaining({ id: user.id }));
  });

  it("returns 404 for not-found", async () => {
    const user = await makeActiveUser();
    mockClerkUserId = user.clerkUserId;
    vi.mocked(updateSavedCaseNote).mockResolvedValueOnce({ status: "not-found" });
    const response = await PATCH(patchRequest({ note: "x" }), paramsFor("s1"));
    expect(response.status).toBe(404);
  });
});
