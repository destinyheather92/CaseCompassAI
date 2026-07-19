import { describe, expect, it } from "vitest";
import { buildIntakeTimeline, type IntakeAnswerLike } from "@/lib/dashboard/timeline-mapper";

function answer(overrides: Partial<IntakeAnswerLike> = {}): IntakeAnswerLike {
  return {
    questionId: "q1",
    questionText: "When were you sentenced?",
    answerText: "2019-03-14",
    answerType: "date",
    sequence: 0,
    ...overrides,
  };
}

describe("buildIntakeTimeline", () => {
  it("produces an exact, non-approximate item for a valid date answer", () => {
    const items = buildIntakeTimeline([answer()]);
    expect(items).toHaveLength(1);
    expect(items[0].isApproximate).toBe(false);
    expect(items[0].dateLabel).toContain("2019");
    expect(items[0].source).toBe("user-provided");
  });

  it("labels a date-type answer with unparseable text as 'Date not provided' and approximate — never invents a date", () => {
    const items = buildIntakeTimeline([answer({ answerText: "sometime in spring" })]);
    expect(items).toHaveLength(1);
    expect(items[0].dateLabel).toBe("Date not provided");
    expect(items[0].isApproximate).toBe(true);
  });

  it("includes a temporally-relevant free-text answer as an approximate, undated event rather than guessing a date", () => {
    const items = buildIntakeTimeline([
      answer({
        questionText: "When was the trial?",
        answerText: "It was sometime after my arraignment, I don't remember exactly.",
        answerType: "short-text",
      }),
    ]);
    expect(items).toHaveLength(1);
    expect(items[0].dateLabel).toBe("Date not provided");
    expect(items[0].isApproximate).toBe(true);
    // The event description is preserved verbatim — no fabricated date is inserted into it.
    expect(items[0].description).toBe("It was sometime after my arraignment, I don't remember exactly.");
  });

  it("does not create a timeline entry for a non-temporal question", () => {
    const items = buildIntakeTimeline([
      answer({ questionText: "What is your research goal?", answerText: "Understand my case", answerType: "short-text" }),
    ]);
    expect(items).toHaveLength(0);
  });

  it("does not create a timeline entry for an 'I don't know' answer", () => {
    const items = buildIntakeTimeline([
      answer({ questionText: "When was the trial?", answerText: "I don't know", answerType: "short-text" }),
    ]);
    expect(items).toHaveLength(0);
  });

  it("only includes user-provided facts — every item's source is 'user-provided'", () => {
    const items = buildIntakeTimeline([
      answer(),
      answer({ questionId: "q2", questionText: "When was the appeal filed?", answerText: "2020-01-05" }),
    ]);
    expect(items.every((item) => item.source === "user-provided")).toBe(true);
  });

  it("orders items by the original answer sequence", () => {
    const items = buildIntakeTimeline([
      answer({ questionId: "q2", sequence: 1, questionText: "When was the appeal filed?", answerText: "2020-01-05" }),
      answer({ questionId: "q1", sequence: 0, answerText: "2019-03-14" }),
    ]);
    expect(items.map((item) => item.id)).toEqual(["q1", "q2"]);
  });

  it("gracefully skips malformed entries instead of throwing", () => {
    const malformed = [{ questionId: "q1" } as IntakeAnswerLike, answer({ questionId: "q2", sequence: 1 })];
    expect(() => buildIntakeTimeline(malformed)).not.toThrow();
    const items = buildIntakeTimeline(malformed);
    expect(items.some((item) => item.id === "q2")).toBe(true);
  });

  it("returns an empty array for an empty input", () => {
    expect(buildIntakeTimeline([])).toEqual([]);
  });

  it("preserves the raw description text as-is (safe rendering is the UI layer's responsibility, not this mapper's)", () => {
    const items = buildIntakeTimeline([answer({ answerText: "2019-03-14" })]);
    expect(items[0].description).toBe("2019-03-14");
  });
});
