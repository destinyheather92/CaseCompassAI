import { describe, expect, it } from "vitest";
import { verifyQuotesAgainstSource } from "@/lib/case-explainer/verify-quotes";

const sourceText = "The Court held that officers may   seize evidence in plain view during a lawful stop.";

describe("verifyQuotesAgainstSource", () => {
  it("keeps a quote that appears verbatim in the source", () => {
    const result = verifyQuotesAgainstSource(
      [{ quote: "officers may seize evidence in plain view", whyItMatters: "x" }],
      sourceText,
    );
    expect(result).toHaveLength(1);
  });

  it("keeps a quote that matches modulo whitespace differences", () => {
    const result = verifyQuotesAgainstSource(
      [{ quote: "officers may   seize evidence", whyItMatters: "x" }],
      sourceText,
    );
    expect(result).toHaveLength(1);
  });

  it("is case-insensitive", () => {
    const result = verifyQuotesAgainstSource([{ quote: "THE COURT HELD", whyItMatters: "x" }], sourceText);
    expect(result).toHaveLength(1);
  });

  it("drops a quote that does not appear in the source (fabrication defense)", () => {
    const result = verifyQuotesAgainstSource(
      [{ quote: "the defendant is guilty beyond all doubt", whyItMatters: "x" }],
      sourceText,
    );
    expect(result).toHaveLength(0);
  });

  it("returns an empty array when there is no source text at all", () => {
    const result = verifyQuotesAgainstSource([{ quote: "anything", whyItMatters: "x" }], null);
    expect(result).toEqual([]);
  });

  it("filters independently across multiple quotes, keeping only the valid ones", () => {
    const result = verifyQuotesAgainstSource(
      [
        { quote: "officers may seize evidence in plain view", whyItMatters: "real" },
        { quote: "this quote does not exist anywhere", whyItMatters: "fake" },
      ],
      sourceText,
    );
    expect(result).toHaveLength(1);
    expect(result[0].whyItMatters).toBe("real");
  });

  it("attaches a character offset for where the quote was found", () => {
    const result = verifyQuotesAgainstSource([{ quote: "officers may seize evidence", whyItMatters: "x" }], sourceText);
    expect(result[0].location.characterOffset).toBeGreaterThan(0);
    expect(sourceText.toLowerCase().slice(result[0].location.characterOffset).replace(/\s+/g, " ")).toContain(
      "officers may seize evidence",
    );
  });

  it("reports paragraph 1 for text with no paragraph breaks", () => {
    const result = verifyQuotesAgainstSource([{ quote: "officers may seize evidence", whyItMatters: "x" }], sourceText);
    expect(result[0].location.paragraphNumber).toBe(1);
  });

  it("counts paragraph breaks (blank lines) before the quote", () => {
    const multiParagraphText = "First paragraph text here.\n\nSecond paragraph has the quote we want to find.\n\nThird paragraph.";
    const result = verifyQuotesAgainstSource(
      [{ quote: "the quote we want to find", whyItMatters: "x" }],
      multiParagraphText,
    );
    expect(result[0].location.paragraphNumber).toBe(2);
  });

  it("never invents a location for a quote that doesn't verify", () => {
    const result = verifyQuotesAgainstSource([{ quote: "not in the source at all", whyItMatters: "x" }], sourceText);
    expect(result).toHaveLength(0);
  });
});
