import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/institution/register-institution", () => ({
  registerInstitution: vi.fn(),
}));

const { registerInstitution } = await import("@/lib/institution/register-institution");
const { POST } = await import("@/app/api/institution/register/route");

function postRequest(body: unknown) {
  return new NextRequest("https://example.com/api/institution/register", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": `198.51.100.${Math.floor(Math.random() * 200)}` },
    body: JSON.stringify(body),
  });
}

const validBody = {
  facilityName: "Ridgeview Correctional",
  institutionType: "STATE_PRISON",
  contactName: "J. Rivera",
  contactEmail: "j.rivera@example.com",
};

describe("POST /api/institution/register", () => {
  beforeEach(() => {
    vi.mocked(registerInstitution).mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("registers an institution and returns the issued credentials once", async () => {
    vi.mocked(registerInstitution).mockResolvedValueOnce({
      status: "registered",
      institutionId: "inst-1",
      adminUsername: "ridgeview-p52x91",
      temporaryPassword: "temp-pw-abc123",
    });

    const response = await POST(postRequest(validBody));
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.status).toBe("registered");
    expect(body.adminUsername).toBe("ridgeview-p52x91");
    expect(body.temporaryPassword).toBe("temp-pw-abc123");
  });

  it("rejects an invalid request (missing required fields) without calling the service", async () => {
    const response = await POST(postRequest({ facilityName: "X" }));
    expect(response.status).toBe(400);
    expect(registerInstitution).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON", async () => {
    const request = new NextRequest("https://example.com/api/institution/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not json",
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("maps a service error to a 500 without leaking internal detail", async () => {
    vi.mocked(registerInstitution).mockResolvedValueOnce({ status: "error", message: "Could not create the account. Please try again." });
    const response = await POST(postRequest(validBody));
    expect(response.status).toBe(500);
  });

  it("rate-limits repeated requests from the same client", async () => {
    vi.mocked(registerInstitution).mockResolvedValue({
      status: "registered",
      institutionId: "inst-1",
      adminUsername: "u",
      temporaryPassword: "p",
    });

    const clientIp = "203.0.113.77";
    const request = () =>
      new NextRequest("https://example.com/api/institution/register", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": clientIp },
        body: JSON.stringify(validBody),
      });

    let sawRateLimited = false;
    for (let i = 0; i < 10; i++) {
      const response = await POST(request());
      if (response.status === 429) {
        sawRateLimited = true;
        break;
      }
    }
    expect(sawRateLimited).toBe(true);
  });
});
