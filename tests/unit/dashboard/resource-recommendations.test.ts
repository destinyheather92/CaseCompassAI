import { describe, expect, it } from "vitest";
import { recommendResources } from "@/lib/dashboard/resource-recommendations";

describe("recommendResources", () => {
  it("recommends court-opinion/citation/safety resources for an appeal", () => {
    const slugs = recommendResources({ caseType: "appeal", jurisdiction: "SC", documentTypes: ["none"] }).map(
      (r) => r.slug,
    );
    expect(slugs).toContain("how-to-read-a-court-opinion");
    expect(slugs).toContain("legal-citations");
    expect(slugs).toContain("research-safety");
  });

  it("recommends court-opinion/citation/safety resources for post-conviction", () => {
    const slugs = recommendResources({
      caseType: "post-conviction",
      jurisdiction: "SC",
      documentTypes: ["none"],
    }).map((r) => r.slug);
    expect(slugs).toContain("how-to-read-a-court-opinion");
    expect(slugs).toContain("legal-citations");
    expect(slugs).toContain("research-safety");
  });

  it("recommends foundational resources for an unsure case type", () => {
    const slugs = recommendResources({ caseType: "unsure", jurisdiction: "SC", documentTypes: ["none"] }).map(
      (r) => r.slug,
    );
    expect(slugs).toContain("legal-research-basics");
    expect(slugs).toContain("legal-terms-glossary");
    expect(slugs).toContain("what-casecompass-can-and-cannot-do");
  });

  it("recommends foundational resources for an unknown jurisdiction", () => {
    const slugs = recommendResources({ caseType: "criminal", jurisdiction: "UNKNOWN", documentTypes: ["none"] }).map(
      (r) => r.slug,
    );
    expect(slugs).toContain("legal-research-basics");
    expect(slugs).toContain("legal-terms-glossary");
  });

  it("recommends court-opinion-reading resources when a court opinion document was selected", () => {
    const slugs = recommendResources({
      caseType: "civil",
      jurisdiction: "SC",
      documentTypes: ["court-opinion"],
    }).map((r) => r.slug);
    expect(slugs).toContain("how-to-read-a-court-opinion");
    expect(slugs).toContain("legal-citations");
  });

  it("returns a sensible default set for a criminal case with a known jurisdiction and no special documents", () => {
    const slugs = recommendResources({ caseType: "criminal", jurisdiction: "SC", documentTypes: ["none"] }).map(
      (r) => r.slug,
    );
    expect(slugs.length).toBeGreaterThan(0);
  });

  it("returns a sensible default set for a civil case", () => {
    const slugs = recommendResources({ caseType: "civil", jurisdiction: "SC", documentTypes: ["none"] }).map(
      (r) => r.slug,
    );
    expect(slugs.length).toBeGreaterThan(0);
  });

  it("returns a sensible default set for a family case", () => {
    const slugs = recommendResources({ caseType: "family", jurisdiction: "SC", documentTypes: ["none"] }).map(
      (r) => r.slug,
    );
    expect(slugs.length).toBeGreaterThan(0);
  });

  it("returns a default recommendation set when there is no intake at all", () => {
    const result = recommendResources(null);
    expect(result.length).toBeGreaterThan(0);
  });

  it("never returns more than 3 recommendations", () => {
    const result = recommendResources({ caseType: "appeal", jurisdiction: "UNKNOWN", documentTypes: ["court-opinion"] });
    expect(result.length).toBeLessThanOrEqual(3);
  });

  it("never returns a duplicate resource even when multiple rules match", () => {
    const slugs = recommendResources({
      caseType: "appeal",
      jurisdiction: "SC",
      documentTypes: ["court-opinion"],
    }).map((r) => r.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("is deterministic — the same input always produces the same output", () => {
    const input = { caseType: "appeal" as const, jurisdiction: "SC", documentTypes: ["court-opinion"] };
    expect(recommendResources(input)).toEqual(recommendResources(input));
  });
});
