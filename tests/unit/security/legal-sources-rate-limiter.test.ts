import { describe, expect, it } from "vitest";
import { isRateLimited } from "@/lib/legal-sources/rate-limiter";

describe("legal-sources rate limiter (regression after delegating to lib/security/rate-limit)", () => {
  it("allows the first 20 requests per client and blocks the 21st", () => {
    const clientId = `regression-client-${Date.now()}`;
    for (let i = 0; i < 20; i++) {
      expect(isRateLimited(clientId)).toBe(false);
    }
    expect(isRateLimited(clientId)).toBe(true);
  });
});
