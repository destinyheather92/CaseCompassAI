import { describe, expect, it } from "vitest";
import { startIntakeSessionSchema, submitIntakeAnswerSchema } from "@/lib/intake/intake-deterministic-schema";

const validInput = {
  caseType: "criminal" as const,
  jurisdiction: "SC",
  proceduralStage: "post-conviction" as const,
  researchGoals: ["understand-case" as const],
  documentTypes: ["court-opinion" as const],
};

describe("startIntakeSessionSchema", () => {
  it("accepts a valid Layer-1 submission", () => {
    expect(startIntakeSessionSchema.safeParse(validInput).success).toBe(true);
  });

  it("rejects an unsupported caseType enum value", () => {
    const result = startIntakeSessionSchema.safeParse({ ...validInput, caseType: "tax" });
    expect(result.success).toBe(false);
  });

  it("rejects a missing jurisdiction", () => {
    const result = startIntakeSessionSchema.safeParse({ ...validInput, jurisdiction: "" });
    expect(result.success).toBe(false);
  });

  it("requires at least one research goal", () => {
    const result = startIntakeSessionSchema.safeParse({ ...validInput, researchGoals: [] });
    expect(result.success).toBe(false);
  });

  it("requires at least one document type", () => {
    const result = startIntakeSessionSchema.safeParse({ ...validInput, documentTypes: [] });
    expect(result.success).toBe(false);
  });

  it("rejects 'none' combined with another document type", () => {
    const result = startIntakeSessionSchema.safeParse({
      ...validInput,
      documentTypes: ["none", "court-opinion"],
    });
    expect(result.success).toBe(false);
  });

  it("accepts 'none' alone", () => {
    const result = startIntakeSessionSchema.safeParse({ ...validInput, documentTypes: ["none"] });
    expect(result.success).toBe(true);
  });

  it("strips/rejects unknown keys (strict mode)", () => {
    const result = startIntakeSessionSchema.safeParse({ ...validInput, unexpectedField: "x" });
    expect(result.success).toBe(false);
  });
});

describe("submitIntakeAnswerSchema", () => {
  it("accepts a valid answer submission", () => {
    const result = submitIntakeAnswerSchema.safeParse({
      sessionId: "session-1",
      questionId: "q1",
      answerText: "Richland County Circuit Court",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty answerText", () => {
    const result = submitIntakeAnswerSchema.safeParse({ sessionId: "s1", questionId: "q1", answerText: "  " });
    expect(result.success).toBe(false);
  });

  it("rejects an oversized answerText", () => {
    const result = submitIntakeAnswerSchema.safeParse({
      sessionId: "s1",
      questionId: "q1",
      answerText: "a".repeat(4001),
    });
    expect(result.success).toBe(false);
  });
});
