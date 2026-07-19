import { describe, expect, it } from "vitest";
import { generateDeterministicRoadmap } from "@/lib/roadmap/generate-roadmap";
import { ResearchRoadmapContentSchema } from "@/lib/roadmap/roadmap-schema";
import { curatedGlossary } from "@/lib/legal-sources/curated-glossary-provider";
import type { CaseType } from "@/types/intake";

const CASE_TYPES: CaseType[] = ["criminal", "civil", "family", "appeal", "post-conviction", "unsure"];

function baseInput(caseType: CaseType) {
  return {
    caseType,
    jurisdiction: "SC",
    proceduralStage: "pretrial" as const,
    researchGoals: ["find-starting-point"] as const,
    documentTypes: ["none"] as const,
  };
}

const curatedTermNames = new Set(curatedGlossary.map((entry) => entry.term));

describe("generateDeterministicRoadmap", () => {
  it.each(CASE_TYPES)("produces a schema-valid roadmap for caseType=%s", (caseType) => {
    const roadmap = generateDeterministicRoadmap(baseInput(caseType));
    const result = ResearchRoadmapContentSchema.safeParse(roadmap);
    expect(result.success).toBe(true);
  });

  it("always reports low confidence, since it never used AI or verified sources", () => {
    const roadmap = generateDeterministicRoadmap(baseInput("criminal"));
    expect(roadmap.confidence.level).toBe("low");
  });

  it("includes the jurisdiction the user provided", () => {
    const roadmap = generateDeterministicRoadmap({ ...baseInput("criminal"), jurisdiction: "TX" });
    expect(roadmap.jurisdiction.code).toBe("TX");
  });

  it("never invents a case citation — no sourceSuggestion has a court-opinion sourceType with a specific url", () => {
    for (const caseType of CASE_TYPES) {
      const roadmap = generateDeterministicRoadmap(baseInput(caseType));
      for (const source of roadmap.sourceSuggestions) {
        expect(source.sourceType).not.toBe("court-opinion");
      }
    }
  });

  it("never fabricates a URL — no sourceSuggestion includes a url field at all in the deterministic path", () => {
    const roadmap = generateDeterministicRoadmap(baseInput("appeal"));
    expect(roadmap.sourceSuggestions.every((source) => source.url === undefined)).toBe(true);
  });

  it("only references real, lookupable curated glossary terms", () => {
    for (const caseType of CASE_TYPES) {
      const roadmap = generateDeterministicRoadmap(baseInput(caseType));
      for (const step of roadmap.steps) {
        for (const term of step.relatedTerms) {
          expect(curatedTermNames.has(term)).toBe(true);
        }
      }
    }
  });

  it("always includes the standard educational disclaimer", () => {
    const roadmap = generateDeterministicRoadmap(baseInput("civil"));
    expect(roadmap.disclaimer.toLowerCase()).toContain("does not provide legal advice");
  });

  it("produces the same steps for the same input (deterministic, not random)", () => {
    const a = generateDeterministicRoadmap(baseInput("post-conviction"));
    const b = generateDeterministicRoadmap(baseInput("post-conviction"));
    expect(a.steps.map((s) => s.title)).toEqual(b.steps.map((s) => s.title));
    expect(a.title).toBe(b.title);
  });

  it("produces different step content for different case types", () => {
    const criminal = generateDeterministicRoadmap(baseInput("criminal"));
    const family = generateDeterministicRoadmap(baseInput("family"));
    expect(criminal.steps.map((s) => s.title)).not.toEqual(family.steps.map((s) => s.title));
  });

  it("falls back to the 'unsure' template for an unrecognized case type rather than throwing", () => {
    expect(() =>
      generateDeterministicRoadmap({ ...baseInput("criminal"), caseType: "made-up-type" as CaseType }),
    ).not.toThrow();
  });

  it("does not calculate or state a deadline anywhere in the generated text", () => {
    const roadmap = generateDeterministicRoadmap(baseInput("appeal"));
    const allText = JSON.stringify(roadmap).toLowerCase();
    expect(allText).not.toMatch(/\bdeadline is\b|\bmust file by\b|\bdue on\b/);
  });
});
