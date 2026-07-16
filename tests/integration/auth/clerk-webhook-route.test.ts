import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { Webhook } from "svix";
import { prisma } from "@/lib/db";
import { POST } from "@/app/api/webhooks/clerk/route";

const TEST_SECRET = "whsec_dGVzdC1zaWduaW5nLXNlY3JldC1mb3ItdW5pdC10ZXN0cw==";
const WEBHOOK_URL = "https://example.com/api/webhooks/clerk";
const createdUserIds: string[] = [];

function signedRequest(body: Record<string, unknown>) {
  const payload = JSON.stringify(body);
  const wh = new Webhook(TEST_SECRET);
  const svixId = `msg_${Date.now()}`;
  const timestamp = new Date();
  const signature = wh.sign(svixId, timestamp, payload);

  return new NextRequest(WEBHOOK_URL, {
    method: "POST",
    headers: {
      "svix-id": svixId,
      "svix-timestamp": Math.floor(timestamp.getTime() / 1000).toString(),
      "svix-signature": signature,
      "content-type": "application/json",
    },
    body: payload,
  });
}

describe("POST /api/webhooks/clerk", () => {
  beforeAll(() => {
    process.env.CLERK_WEBHOOK_SIGNING_SECRET = TEST_SECRET;
  });

  afterEach(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    createdUserIds.length = 0;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("rejects a request with an invalid/forged signature", async () => {
    const payload = JSON.stringify({
      type: "user.created",
      object: "event",
      data: { id: "clerk-forged-user", email_addresses: [], username: null },
    });

    const forged = new NextRequest(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "svix-id": "msg_forged",
        "svix-timestamp": Math.floor(Date.now() / 1000).toString(),
        "svix-signature": "v1,not-a-real-signature",
        "content-type": "application/json",
      },
      body: payload,
    });

    const response = await POST(forged);
    expect(response.status).toBe(400);

    const found = await prisma.user.findUnique({ where: { clerkUserId: "clerk-forged-user" } });
    expect(found).toBeNull();
  });

  it("rejects a request with no signature headers at all", async () => {
    const response = await POST(
      new NextRequest(WEBHOOK_URL, {
        method: "POST",
        body: JSON.stringify({ type: "user.created", data: { id: "no-headers" } }),
      }),
    );
    expect(response.status).toBe(400);
  });

  it("creates a Prisma User for a validly-signed user.created event", async () => {
    const clerkUserId = `clerk-webhook-valid-${Date.now()}`;
    const request = signedRequest({
      type: "user.created",
      object: "event",
      data: { id: clerkUserId, email_addresses: [{ email_address: "person@example.com" }], username: null },
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const created = await prisma.user.findUnique({ where: { clerkUserId } });
    expect(created).not.toBeNull();
    expect(created?.role).toBe("INDIVIDUAL");
    if (created) createdUserIds.push(created.id);
  });

  it("ignores event types other than user.created without erroring", async () => {
    const request = signedRequest({
      type: "session.created",
      object: "event",
      data: { id: "sess_123" },
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
  });
});
