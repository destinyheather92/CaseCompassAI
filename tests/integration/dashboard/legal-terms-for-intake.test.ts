import { describe, expect, it } from "vitest";
import { selectLegalTermsForIntake, getLegalTermsForIntake } from "@/lib/dashboard/legal-terms-for-intake";

describe("selectLegalTermsForIntake", () => {
  it("returns case-type-relevant terms for a known case type", () => {
    const terms = selectLegalTermsForIntake("post-conviction");
    expect(terms).toContain("Habeas Corpus");
  });

  it("falls back to the unsure set for an unrecognized case type", () => {
    expect(() => selectLegalTermsForIntake("made-up")).not.toThrow();
    expect(selectLegalTermsForIntake("made-up").length).toBeGreaterThan(0);
  });

  it("falls back to the unsure set for a null case type", () => {
    expect(selectLegalTermsForIntake(null).length).toBeGreaterThan(0);
  });
});

describe("getLegalTermsForIntake", () => {
  it("returns validated definitions from the curated glossary service, not generated inline", async () => {
    const terms = await getLegalTermsForIntake("post-conviction");
    expect(terms.length).toBeGreaterThan(0);
    for (const term of terms) {
      expect(term.plainLanguageDefinition.length).toBeGreaterThan(0);
      expect(term.href).toContain("/resources/legal-terms-glossary?term=");
    }
  });

  it("never throws for an intake-less (null) case type", async () => {
    await expect(getLegalTermsForIntake(null)).resolves.toBeDefined();
  });
});
