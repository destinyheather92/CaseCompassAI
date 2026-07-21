import { describe, expect, it } from "vitest";
import { buildSearchAttempts, MAX_SEARCH_ATTEMPTS } from "@/lib/case-search/pipeline/build-search-attempts";

describe("buildSearchAttempts", () => {
  it("tries the selected jurisdiction before broadening to federal and all jurisdictions", () => {
    const attempts = buildSearchAttempts({ jurisdiction: "SC", topics: ["ineffective assistance of counsel"], legalTerms: [] });
    const courts = attempts.map((a) => a.court);
    const scIndex = courts.indexOf("sc");
    const federalIndex = courts.findIndex((c) => c?.includes("ca4"));
    const allIndex = courts.indexOf(null);
    expect(scIndex).toBeGreaterThanOrEqual(0);
    expect(federalIndex).toBeGreaterThan(scIndex);
    expect(allIndex).toBeGreaterThan(federalIndex);
  });

  it("ends with a landmark-precedent attempt restricted to scotus", () => {
    const attempts = buildSearchAttempts({ jurisdiction: "SC", topics: ["ineffective assistance of counsel"], legalTerms: [] });
    const last = attempts[attempts.length - 1];
    expect(last.stageName).toBe("landmark-precedent");
    expect(last.court).toBe("scotus");
  });

  it("uses the exact UI labels from the product spec for jurisdiction-broadening stages", () => {
    const attempts = buildSearchAttempts({ jurisdiction: "SC", topics: ["ineffective assistance of counsel"], legalTerms: [] });
    const labels = attempts.map((a) => a.label);
    expect(labels).toContain("Searching South Carolina…");
    expect(labels).toContain("Searching federal courts…");
    expect(labels).toContain("Searching all jurisdictions…");
    expect(labels).toContain("Searching landmark cases…");
  });

  it("never exceeds the configured attempt ceiling", () => {
    const attempts = buildSearchAttempts({
      jurisdiction: "SC",
      topics: ["ineffective assistance", "guilty plea", "immigration consequences"],
      legalTerms: ["Due Process", "Sixth Amendment"],
      summary: "My attorney did not explain the immigration consequences of my guilty plea.",
    });
    expect(attempts.length).toBeLessThanOrEqual(MAX_SEARCH_ATTEMPTS);
  });

  it("marks every all-jurisdictions and landmark attempt as out of jurisdiction", () => {
    const attempts = buildSearchAttempts({ jurisdiction: "SC", topics: ["due process"], legalTerms: [] });
    const outOfJurisdictionStages = attempts.filter((a) => a.stageName === "all-jurisdictions" || a.stageName === "landmark-precedent");
    expect(outOfJurisdictionStages.length).toBeGreaterThan(0);
    for (const attempt of outOfJurisdictionStages) {
      expect(attempt.isOutOfJurisdiction).toBe(true);
    }
  });
});
