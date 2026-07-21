import { describe, expect, it } from "vitest";
import { highlightOpinionText } from "@/lib/case-explainer/highlight-opinion-text";

describe("highlightOpinionText", () => {
  it("returns the whole text as one unhighlighted segment when there are no quotes", () => {
    const segments = highlightOpinionText("The court held that X.", []);
    expect(segments).toEqual([{ text: "The court held that X.", highlighted: false }]);
  });

  it("marks a single matching quote as highlighted and preserves surrounding text", () => {
    const segments = highlightOpinionText("Before text. Officers may seize evidence. After text.", ["Officers may seize evidence"]);
    expect(segments.map((s) => s.text).join("")).toBe("Before text. Officers may seize evidence. After text.");
    const highlighted = segments.filter((s) => s.highlighted);
    expect(highlighted).toHaveLength(1);
    expect(highlighted[0].text).toBe("Officers may seize evidence");
  });

  it("matches case-insensitively while preserving the source's original casing in the segment", () => {
    const segments = highlightOpinionText("The COURT HELD that X.", ["court held"]);
    const highlighted = segments.filter((s) => s.highlighted);
    expect(highlighted[0].text).toBe("COURT HELD");
  });

  it("prefers the longer quote when one quote is a substring of another", () => {
    const segments = highlightOpinionText("plain view doctrine applies here", ["view", "plain view doctrine"]);
    const highlighted = segments.filter((s) => s.highlighted);
    expect(highlighted).toHaveLength(1);
    expect(highlighted[0].text).toBe("plain view doctrine");
  });

  it("highlights multiple non-overlapping quotes independently", () => {
    const segments = highlightOpinionText("First quote here. Middle. Second quote here.", ["First quote", "Second quote"]);
    const highlighted = segments.filter((s) => s.highlighted).map((s) => s.text);
    expect(highlighted).toEqual(["First quote", "Second quote"]);
  });

  it("never throws on regex special characters in a quote", () => {
    expect(() => highlightOpinionText("Cost was $5.00 (approx).", ["$5.00 (approx)"])).not.toThrow();
    const segments = highlightOpinionText("Cost was $5.00 (approx).", ["$5.00 (approx)"]);
    expect(segments.some((s) => s.highlighted && s.text === "$5.00 (approx)")).toBe(true);
  });
});
