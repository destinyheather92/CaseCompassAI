import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { clientIdFor } from "@/lib/security/request-identity";

function makeRequest(headers: Record<string, string>): NextRequest {
  return new NextRequest("http://localhost/api/whatever", { headers });
}

describe("clientIdFor", () => {
  it("uses the first entry of x-forwarded-for when present", () => {
    const request = makeRequest({ "x-forwarded-for": "203.0.113.5, 70.41.3.18, 150.172.238.178" });
    expect(clientIdFor(request)).toBe("203.0.113.5");
  });

  it("falls back to x-real-ip when x-forwarded-for is absent", () => {
    const request = makeRequest({ "x-real-ip": "203.0.113.9" });
    expect(clientIdFor(request)).toBe("203.0.113.9");
  });

  it("falls back to 'unknown' when neither header is present", () => {
    const request = makeRequest({});
    expect(clientIdFor(request)).toBe("unknown");
  });

  it("trims whitespace around the extracted IP", () => {
    const request = makeRequest({ "x-forwarded-for": "  203.0.113.5  , 70.41.3.18" });
    expect(clientIdFor(request)).toBe("203.0.113.5");
  });
});
