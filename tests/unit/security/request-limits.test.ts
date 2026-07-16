import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { isRequestTooLarge } from "@/lib/security/request-limits";

function makeRequest(contentLength?: string) {
  const headers: Record<string, string> = {};
  if (contentLength !== undefined) headers["content-length"] = contentLength;
  return new NextRequest("http://localhost/api/whatever", { headers });
}

describe("isRequestTooLarge", () => {
  it("returns false when content-length is missing", () => {
    expect(isRequestTooLarge(makeRequest())).toBe(false);
  });

  it("returns false when under the limit", () => {
    expect(isRequestTooLarge(makeRequest("100"), 20_000)).toBe(false);
  });

  it("returns true when over the limit", () => {
    expect(isRequestTooLarge(makeRequest("50000"), 20_000)).toBe(true);
  });
});
