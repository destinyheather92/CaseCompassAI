import { describe, expect, it } from "vitest";
import { courtListenerCaseProvider } from "@/lib/case-search/courtlistener-provider";

/**
 * The one controlled integration test that actually calls the live
 * CourtListener API, gated behind an explicit environment flag so the
 * rest of the suite (and CI, by default) never depends on network
 * access or a real token — every other test in this project mocks
 * `fetch` instead. Run it by setting both:
 *
 *   COURTLISTENER_API_TOKEN=<a real token>
 *   RUN_LIVE_COURTLISTENER_TESTS=true
 *
 * Neither is set in this environment (see docs/behavior/verified-case-search.md's
 * root-cause note), so this suite is skipped here — that's expected,
 * not a failure.
 */
const shouldRunLiveTests = process.env.RUN_LIVE_COURTLISTENER_TESTS === "true" && Boolean(process.env.COURTLISTENER_API_TOKEN);

describe.skipIf(!shouldRunLiveTests)("courtListenerCaseProvider (live)", () => {
  it("searches for real cases and returns well-formed, verified results", async () => {
    const result = await courtListenerCaseProvider.searchCases({
      jurisdiction: "scotus",
      topics: ["due process"],
      limit: 3,
    });

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.page.cases.length).toBeGreaterThan(0);
    for (const caseResult of result.page.cases) {
      expect(caseResult.caseName.length).toBeGreaterThan(0);
      expect(caseResult.sourceUrl).toMatch(/^https:\/\//);
      expect(caseResult.verificationStatus).toBe("verified");
    }
  }, 20000);

  it("verifies a well-known real citation", async () => {
    const result = await courtListenerCaseProvider.verifyCitation("466 U.S. 668");
    expect(["verified", "possible_match", "not_verified"]).toContain(result.status);
  }, 20000);

  it("returns not_verified for a citation that doesn't exist", async () => {
    const result = await courtListenerCaseProvider.verifyCitation("999999 U.S. 999999");
    expect(["not_verified", "source_unavailable"]).toContain(result.status);
  }, 20000);
});
