import { describe, expect, it } from "vitest";
import { federalCourtIdsFor, STATE_TO_FEDERAL_CIRCUIT, ALL_FEDERAL_COURT_IDS } from "@/lib/case-search/pipeline/federal-circuits";

describe("federalCourtIdsFor", () => {
  it("returns SCOTUS plus the known circuit for a mapped state", () => {
    expect(federalCourtIdsFor("SC")).toEqual(["scotus", "ca4"]);
  });

  it("is case-insensitive", () => {
    expect(federalCourtIdsFor("sc")).toEqual(["scotus", "ca4"]);
  });

  it("falls back to SCOTUS alone for an unmapped code", () => {
    expect(federalCourtIdsFor("ZZ")).toEqual(["scotus"]);
  });

  it("covers every state and DC with a real circuit id", () => {
    const validIds = new Set(["ca1", "ca2", "ca3", "ca4", "ca5", "ca6", "ca7", "ca8", "ca9", "ca10", "ca11", "cadc"]);
    for (const circuit of Object.values(STATE_TO_FEDERAL_CIRCUIT)) {
      expect(validIds.has(circuit)).toBe(true);
    }
  });
});

describe("ALL_FEDERAL_COURT_IDS", () => {
  it("includes SCOTUS and every circuit", () => {
    expect(ALL_FEDERAL_COURT_IDS).toContain("scotus");
    expect(ALL_FEDERAL_COURT_IDS).toContain("ca9");
    expect(ALL_FEDERAL_COURT_IDS).toContain("cadc");
  });
});
