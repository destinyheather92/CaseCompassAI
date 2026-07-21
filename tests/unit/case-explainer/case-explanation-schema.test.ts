import { describe, expect, it } from "vitest";
import { CaseExplanationSchema } from "@/lib/case-explainer/case-explanation-schema";

function validExplanation() {
  return {
    caseSummary: "A brief summary.",
    keyFacts: ["Fact one.", "Fact two."],
    legalIssues: ["Was the search lawful?"],
    holding: "The search was lawful.",
    courtsReasoning: "Because of the plain-view exception.",
    ruleOfLaw: "Officers may seize items in plain view during a lawful stop.",
    whyThisCaseMatters: "It clarifies the plain-view exception.",
    howItMightRelate: "If your case involves a similar stop, this case may be relevant background.",
    importantQuotes: [{ quote: "Officers may seize evidence in plain view.", whyItMatters: "States the core rule." }],
    keyTerms: [{ term: "plain view", definition: "A doctrine allowing seizure of visible evidence during a lawful stop." }],
    basedOnFullOpinionText: true,
  };
}

describe("CaseExplanationSchema", () => {
  it("accepts a fully valid explanation", () => {
    expect(CaseExplanationSchema.safeParse(validExplanation()).success).toBe(true);
  });

  it("rejects an explanation with zero legal issues", () => {
    const result = CaseExplanationSchema.safeParse({ ...validExplanation(), legalIssues: [] });
    expect(result.success).toBe(false);
  });

  it("rejects unknown extra fields (strict mode)", () => {
    const result = CaseExplanationSchema.safeParse({ ...validExplanation(), extraField: "not allowed" });
    expect(result.success).toBe(false);
  });

  it("requires basedOnFullOpinionText to be a boolean", () => {
    const result = CaseExplanationSchema.safeParse({ ...validExplanation(), basedOnFullOpinionText: "yes" });
    expect(result.success).toBe(false);
  });

  it("allows an empty importantQuotes and keyTerms array (no quotes/terms is honest, not an error)", () => {
    const result = CaseExplanationSchema.safeParse({ ...validExplanation(), importantQuotes: [], keyTerms: [] });
    expect(result.success).toBe(true);
  });

  it("rejects a quote object missing whyItMatters", () => {
    const result = CaseExplanationSchema.safeParse({
      ...validExplanation(),
      importantQuotes: [{ quote: "text only" }],
    });
    expect(result.success).toBe(false);
  });

  it("caps caseSummary length", () => {
    const result = CaseExplanationSchema.safeParse({ ...validExplanation(), caseSummary: "a".repeat(1201) });
    expect(result.success).toBe(false);
  });
});
