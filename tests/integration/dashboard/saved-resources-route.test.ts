import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

let mockClerkUserId: string | null = null;

vi.mock("@clerk/nextjs/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@clerk/nextjs/server")>();
  return { ...actual, auth: vi.fn(async () => ({ userId: mockClerkUserId })) };
});

vi.mock("@/lib/saved/save-resource", () => ({
  saveResource: vi.fn(),
}));
vi.mock("@/lib/saved/remove-saved-resource", () => ({
  removeSavedResource: vi.fn(),
}));

const { saveResource } = await import("@/lib/saved/save-resource");
const { removeSavedResource } = await import("@/lib/saved/remove-saved-resource");
const { POST } = await import("@/app/api/dashboard/saved-resources/route");
const { DELETE } = await import("@/app/api/dashboard/saved-resources/[savedItemId]/route");

const createdUserIds: string[] = [];

function postRequest(body: unknown) {
  return new NextRequest("https://example.com/api/dashboard/saved-resources", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function deleteRequest() {
  return new NextRequest("https://example.com/api/dashboard/saved-resources/s1", { method: "DELETE" });
}

function paramsFor(savedItemId: string) {
  return { params: Promise.resolve({ savedItemId }) };
}

async function makeActiveUser() {
  const user = await prisma.user.create({
    data: { clerkUserId: `clerk-saved-resources-route-${Date.now()}-${Math.random()}`, role: "INDIVIDUAL", accountStatus: "ACTIVE" },
  });
  createdUserIds.push(user.id);
  return user;
}

describe("POST /api/dashboard/saved-resources", () => {
  beforeEach(() => {
    mockClerkUserId = null;
    vi.mocked(saveResource).mockReset();
  });

  afterEach(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    createdUserIds.length = 0;
  });

  it("rejects an unauthenticated request without calling the service", async () => {
    const response = await POST(postRequest({ resourceType: "RESOURCE", resourceKey: "x", title: "x" }));
    expect(response.status).toBe(401);
    expect(saveResource).not.toHaveBeenCalled();
  });

  it("delegates to the service for an authenticated user", async () => {
    const user = await makeActiveUser();
    mockClerkUserId = user.clerkUserId;
    vi.mocked(saveResource).mockResolvedValueOnce({ status: "saved", id: "sr1" });

    const body = { resourceType: "RESOURCE", resourceKey: "x", title: "x" };
    const response = await POST(postRequest(body));
    expect(response.status).toBe(201);
    expect(saveResource).toHaveBeenCalledWith(body, expect.objectContaining({ id: user.id }));
  });

  it("returns 200 for already-saved", async () => {
    const user = await makeActiveUser();
    mockClerkUserId = user.clerkUserId;
    vi.mocked(saveResource).mockResolvedValueOnce({ status: "already-saved", id: "sr1" });
    const response = await POST(postRequest({ resourceType: "RESOURCE", resourceKey: "x", title: "x" }));
    expect(response.status).toBe(200);
  });

  it("returns 400 for invalid-request", async () => {
    const user = await makeActiveUser();
    mockClerkUserId = user.clerkUserId;
    vi.mocked(saveResource).mockResolvedValueOnce({ status: "invalid-request", message: "x" });
    const response = await POST(postRequest({}));
    expect(response.status).toBe(400);
  });

  it("rejects malformed JSON without calling the service", async () => {
    const user = await makeActiveUser();
    mockClerkUserId = user.clerkUserId;
    const response = await POST(
      new NextRequest("https://example.com/api/dashboard/saved-resources", { method: "POST", body: "{not json" }),
    );
    expect(response.status).toBe(400);
    expect(saveResource).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/dashboard/saved-resources/[savedItemId]", () => {
  beforeEach(() => {
    mockClerkUserId = null;
    vi.mocked(removeSavedResource).mockReset();
  });

  afterEach(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    createdUserIds.length = 0;
  });

  it("rejects an unauthenticated request without calling the service", async () => {
    const response = await DELETE(deleteRequest(), paramsFor("s1"));
    expect(response.status).toBe(401);
    expect(removeSavedResource).not.toHaveBeenCalled();
  });

  it("delegates to the service for an authenticated user", async () => {
    const user = await makeActiveUser();
    mockClerkUserId = user.clerkUserId;
    vi.mocked(removeSavedResource).mockResolvedValueOnce({ status: "removed" });

    const response = await DELETE(deleteRequest(), paramsFor("s1"));
    expect(response.status).toBe(200);
    expect(removeSavedResource).toHaveBeenCalledWith("s1", expect.objectContaining({ id: user.id }));
  });

  it("returns 404 for not-found", async () => {
    const user = await makeActiveUser();
    mockClerkUserId = user.clerkUserId;
    vi.mocked(removeSavedResource).mockResolvedValueOnce({ status: "not-found" });
    const response = await DELETE(deleteRequest(), paramsFor("s1"));
    expect(response.status).toBe(404);
  });
});
