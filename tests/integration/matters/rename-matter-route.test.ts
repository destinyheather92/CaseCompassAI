import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

let mockClerkUserId: string | null = null;

vi.mock("@clerk/nextjs/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@clerk/nextjs/server")>();
  return { ...actual, auth: vi.fn(async () => ({ userId: mockClerkUserId })) };
});

vi.mock("@/lib/matters/rename-matter", () => ({ renameMatter: vi.fn() }));

const { renameMatter } = await import("@/lib/matters/rename-matter");
const { PATCH } = await import("@/app/api/matters/[matterId]/route");

const createdUserIds: string[] = [];

function patchRequest(body: unknown) {
  return new NextRequest("https://example.com/api/matters/m1", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function paramsFor(matterId: string) {
  return { params: Promise.resolve({ matterId }) };
}

async function makeActiveUser() {
  const user = await prisma.user.create({
    data: { clerkUserId: `clerk-rename-matter-route-${Date.now()}-${Math.random()}`, role: "INDIVIDUAL", accountStatus: "ACTIVE" },
  });
  createdUserIds.push(user.id);
  return user;
}

describe("PATCH /api/matters/[matterId]", () => {
  beforeEach(() => {
    mockClerkUserId = null;
    vi.mocked(renameMatter).mockReset();
  });

  afterEach(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    createdUserIds.length = 0;
  });

  it("rejects an unauthenticated request without calling the service", async () => {
    const response = await PATCH(patchRequest({ title: "New Name" }), paramsFor("m1"));
    expect(response.status).toBe(401);
    expect(renameMatter).not.toHaveBeenCalled();
  });

  it("delegates to the service for an authenticated user and returns 200 on success", async () => {
    const user = await makeActiveUser();
    mockClerkUserId = user.clerkUserId;
    vi.mocked(renameMatter).mockResolvedValueOnce({ status: "renamed", title: "New Name" });

    const response = await PATCH(patchRequest({ title: "New Name" }), paramsFor("m1"));
    expect(response.status).toBe(200);
    expect(renameMatter).toHaveBeenCalledWith("m1", { title: "New Name" }, expect.objectContaining({ id: user.id }));
    const body = await response.json();
    expect(body).toEqual({ status: "renamed", title: "New Name" });
  });

  it("returns 400 for invalid-request", async () => {
    const user = await makeActiveUser();
    mockClerkUserId = user.clerkUserId;
    vi.mocked(renameMatter).mockResolvedValueOnce({ status: "invalid-request", message: "Please enter a matter name." });

    const response = await PATCH(patchRequest({ title: "" }), paramsFor("m1"));
    expect(response.status).toBe(400);
  });

  it("returns 404 for not-found (including another user's matter)", async () => {
    const user = await makeActiveUser();
    mockClerkUserId = user.clerkUserId;
    vi.mocked(renameMatter).mockResolvedValueOnce({ status: "not-found" });

    const response = await PATCH(patchRequest({ title: "Hijacked" }), paramsFor("someone-elses-matter"));
    expect(response.status).toBe(404);
  });

  it("returns 400 for a malformed JSON body without calling the service", async () => {
    const user = await makeActiveUser();
    mockClerkUserId = user.clerkUserId;

    const request = new NextRequest("https://example.com/api/matters/m1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: "{not-json",
    });
    const response = await PATCH(request, paramsFor("m1"));
    expect(response.status).toBe(400);
    expect(renameMatter).not.toHaveBeenCalled();
  });
});
