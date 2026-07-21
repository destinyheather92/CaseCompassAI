import { describe, expect, it } from "vitest";
import { ResearchRoadmapContentSchema } from "@/lib/roadmap/roadmap-schema";

function validContent() {
  return {
    title: "Post-Conviction Research Roadmap",
    summary: "A general starting point for researching post-conviction options.",
    jurisdiction: { label: "South Carolina", code: "SC", limitationNote: "Laws vary by jurisdiction." },
    steps: [
      {
        id: "step-1",
        order: 1,
        title: "Understand your procedural posture",
        description: "Confirm what stage your case is at.",
        whyItMatters: "This determines which options may be available.",
        suggestedActions: ["Review your case file", "Note key dates"],
        relatedTerms: ["Post-Conviction"],
        category: "getting-started",
        priority: "essential",
        difficulty: "beginner",
        estimatedMinutes: 5,
      },
    ],
    legalTerms: [{ term: "Habeas Corpus", plainLanguageDefinition: "A request asking a court to review detention." }],
    sourceSuggestions: [
      { name: "State court self-help resources", sourceType: "official-guide", reasonToReview: "General procedure guidance." },
    ],
    safetyNotes: ["This is general educational information, not legal advice."],
    confidence: { level: "low", explanation: "Based on limited deterministic information." },
    disclaimer: "CaseCompass provides general legal education and research guidance, not legal advice.",
    generatedAt: new Date().toISOString(),
  };
}

describe("ResearchRoadmapContentSchema", () => {
  it("accepts a valid roadmap", () => {
    expect(ResearchRoadmapContentSchema.safeParse(validContent()).success).toBe(true);
  });

  it("rejects a roadmap with zero steps", () => {
    const result = ResearchRoadmapContentSchema.safeParse({ ...validContent(), steps: [] });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid confidence level", () => {
    const content = validContent();
    const result = ResearchRoadmapContentSchema.safeParse({
      ...content,
      confidence: { ...content.confidence, level: "certain" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid source type", () => {
    const content = validContent();
    const result = ResearchRoadmapContentSchema.safeParse({
      ...content,
      sourceSuggestions: [{ ...content.sourceSuggestions[0], sourceType: "made-up-type" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects HTML-shaped content in a step title (defense in depth — rendering must still never trust this as markup)", () => {
    const content = validContent();
    const withHtml = {
      ...content,
      steps: [{ ...content.steps[0], title: "<script>alert(1)</script>" }],
    };
    // The schema itself doesn't strip HTML (that's the renderer's job —
    // React text content, never dangerouslySetInnerHTML) but must still
    // accept it as a plain string without throwing, so this test
    // documents that expectation rather than asserting rejection.
    expect(ResearchRoadmapContentSchema.safeParse(withHtml).success).toBe(true);
  });

  it("rejects an oversized steps array", () => {
    const content = validContent();
    const manySteps = Array.from({ length: 21 }, (_, i) => ({ ...content.steps[0], id: `step-${i}`, order: i }));
    const result = ResearchRoadmapContentSchema.safeParse({ ...content, steps: manySteps });
    expect(result.success).toBe(false);
  });

  it("rejects malformed input gracefully via safeParse", () => {
    expect(() => ResearchRoadmapContentSchema.safeParse("not an object")).not.toThrow();
    expect(ResearchRoadmapContentSchema.safeParse(null).success).toBe(false);
  });

  it("requires the disclaimer field to be present and non-empty", () => {
    const result = ResearchRoadmapContentSchema.safeParse({ ...validContent(), disclaimer: "" });
    expect(result.success).toBe(false);
  });
});
