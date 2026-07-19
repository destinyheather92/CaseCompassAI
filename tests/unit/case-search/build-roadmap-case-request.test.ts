import { describe, expect, it } from "vitest";
import { buildRoadmapCaseRequest } from "@/lib/case-search/build-roadmap-case-request";
import type { ResearchRoadmapContent } from "@/types/roadmap";

const content: ResearchRoadmapContent = {
  title: "t",
  summary: "s",
  jurisdiction: { label: "South Carolina", code: "SC", limitationNote: "n" },
  steps: [
    { id: "step-1", order: 1, title: "Understand Habeas Corpus", description: "d", whyItMatters: "w", suggestedActions: [], relatedTerms: ["Habeas Corpus"] },
    { id: "step-2", order: 2, title: "Review Appeal Deadlines", description: "d", whyItMatters: "w", suggestedActions: [], relatedTerms: ["Appellant"] },
  ],
  legalTerms: [],
  sourceSuggestions: [],
  safetyNotes: [],
  confidence: { level: "low", explanation: "e" },
  disclaimer: "d",
  generatedAt: new Date().toISOString(),
};

describe("buildRoadmapCaseRequest", () => {
  it("always derives jurisdiction from the roadmap itself", () => {
    const request = buildRoadmapCaseRequest(content);
    expect(request.jurisdiction).toBe("SC");
  });

  it("ignores a client-supplied jurisdiction override", () => {
    // @ts-expect-error -- overrides intentionally excludes jurisdiction; this proves it can't be smuggled in via a widened cast
    const request = buildRoadmapCaseRequest(content, { jurisdiction: "CA" });
    expect(request.jurisdiction).toBe("SC");
  });

  it("derives default topics from step titles when none are provided", () => {
    const request = buildRoadmapCaseRequest(content);
    expect(request.topics).toContain("Understand Habeas Corpus");
    expect(request.topics).toContain("Review Appeal Deadlines");
  });

  it("derives default legal terms from step relatedTerms, deduplicated", () => {
    const request = buildRoadmapCaseRequest(content);
    expect(request.legalTerms).toContain("Habeas Corpus");
    expect(request.legalTerms).toContain("Appellant");
  });

  it("uses explicitly supplied topics instead of the derived default when provided", () => {
    const request = buildRoadmapCaseRequest(content, { topics: ["custom topic"] });
    expect(request.topics).toEqual(["custom topic"]);
  });

  it("never sends the user's private intake narrative — only step titles/terms", () => {
    const request = buildRoadmapCaseRequest(content);
    expect(JSON.stringify(request)).not.toContain("private");
  });
});
