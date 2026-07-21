import { describe, expect, it } from "vitest";
import { simplifyQuery, extractPrimaryLegalIssue, expandSynonyms } from "@/lib/case-search/pipeline/legal-issue-lexicon";

describe("simplifyQuery", () => {
  it("strips filler words while keeping the legal nouns", () => {
    const result = simplifyQuery("ineffective assistance of counsel guilty plea immigration consequences");
    expect(result).toBe("ineffective assistance counsel guilty plea immigration");
  });

  it("returns an empty string for an all-filler input", () => {
    expect(simplifyQuery("the of for and")).toBe("");
  });
});

describe("extractPrimaryLegalIssue", () => {
  it("finds ineffective assistance of counsel", () => {
    expect(extractPrimaryLegalIssue("ineffective assistance of counsel during plea")).toBe("ineffective assistance of counsel");
  });

  it("finds Miranda", () => {
    expect(extractPrimaryLegalIssue("failure to give a Miranda warning")).toBe("Miranda");
  });

  it("finds Fourth Amendment search and seizure", () => {
    expect(extractPrimaryLegalIssue("unlawful search and seizure of the vehicle")).toBe("Fourth Amendment search and seizure");
  });

  it("finds double jeopardy", () => {
    expect(extractPrimaryLegalIssue("double jeopardy claim after retrial")).toBe("double jeopardy");
  });

  it("returns null when no known legal issue phrase appears", () => {
    expect(extractPrimaryLegalIssue("understand your charges and prepare for arraignment")).toBeNull();
  });

  it("prefers the more specific match when multiple phrases could apply", () => {
    // "ineffective assistance" should win over the more generic "guilty plea" match.
    expect(extractPrimaryLegalIssue("ineffective assistance of counsel guilty plea")).toBe("ineffective assistance of counsel");
  });
});

describe("expandSynonyms", () => {
  it("expands DUI into its common variants", () => {
    expect(expandSynonyms("DUI arrest")).toBe("(DUI OR DWI OR driving under the influence)");
  });

  it("expands attorney and plea together", () => {
    const result = expandSynonyms("attorney failed to explain the plea");
    expect(result).toContain("(attorney OR counsel OR lawyer)");
    expect(result).toContain("(guilty plea OR plea agreement OR plea bargain)");
  });

  it("returns null when no known synonym group applies", () => {
    expect(expandSynonyms("habitual offender sentence enhancement")).not.toBeNull();
    expect(expandSynonyms("double jeopardy")).toBeNull();
  });
});
