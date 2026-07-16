import { describe, expect, it } from "vitest";
import { IntakeQuestionSchema, IntakeInterviewResponseSchema } from "@/lib/intake/intake-interview-schema";

const validQuestion = {
  id: "jurisdiction-confirm",
  text: "What court handled your case?",
  purpose: "Confirm the exact court for jurisdiction accuracy.",
  answerType: "short-text" as const,
  choices: null,
  required: true,
  sensitiveInformationWarning: null,
};

const validChoiceQuestion = {
  id: "case-status",
  text: "Has a judgment been entered in your case?",
  purpose: "Establish procedural posture.",
  answerType: "single-choice" as const,
  choices: ["Yes", "No", "Not sure"],
  required: true,
  sensitiveInformationWarning: null,
};

describe("IntakeQuestionSchema", () => {
  it("accepts a valid short-text question with choices: null", () => {
    expect(IntakeQuestionSchema.safeParse(validQuestion).success).toBe(true);
  });

  it("accepts a valid single-choice question with choices", () => {
    expect(IntakeQuestionSchema.safeParse(validChoiceQuestion).success).toBe(true);
  });

  it("requires choices (non-null) for a single-choice question", () => {
    const result = IntakeQuestionSchema.safeParse({ ...validChoiceQuestion, choices: null });
    expect(result.success).toBe(false);
  });

  it("requires choices (non-null) for a multiple-choice question", () => {
    const result = IntakeQuestionSchema.safeParse({
      ...validChoiceQuestion,
      answerType: "multiple-choice",
      choices: null,
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty choices array for a choice question", () => {
    const result = IntakeQuestionSchema.safeParse({ ...validChoiceQuestion, choices: [] });
    expect(result.success).toBe(false);
  });

  it("rejects choices being present (non-null) for an ordinary short-text question", () => {
    const result = IntakeQuestionSchema.safeParse({ ...validQuestion, choices: ["a", "b"] });
    expect(result.success).toBe(false);
  });

  it("rejects choices being present (non-null) for a date question", () => {
    const result = IntakeQuestionSchema.safeParse({
      ...validQuestion,
      answerType: "date",
      choices: ["a", "b"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing (omitted) choices field — strict mode requires it present as null", () => {
    const { choices, ...withoutChoices } = validQuestion;
    void choices;
    const result = IntakeQuestionSchema.safeParse(withoutChoices);
    expect(result.success).toBe(false);
  });

  it("rejects more than 10 choices", () => {
    const result = IntakeQuestionSchema.safeParse({
      ...validChoiceQuestion,
      choices: Array.from({ length: 11 }, (_, i) => `choice ${i}`),
    });
    expect(result.success).toBe(false);
  });

  it("rejects an oversized question text", () => {
    const result = IntakeQuestionSchema.safeParse({ ...validQuestion, text: "a".repeat(501) });
    expect(result.success).toBe(false);
  });

  it("rejects an unsupported answerType", () => {
    const result = IntakeQuestionSchema.safeParse({ ...validQuestion, answerType: "essay" });
    expect(result.success).toBe(false);
  });

  it("accepts a non-null sensitiveInformationWarning", () => {
    const result = IntakeQuestionSchema.safeParse({
      ...validQuestion,
      sensitiveInformationWarning: "Please don't include your Social Security number.",
    });
    expect(result.success).toBe(true);
  });
});

function response(overrides: Record<string, unknown> = {}) {
  return {
    status: "needs-more-information",
    question: validQuestion,
    collectedFactsSummary: "The user described a pending criminal case in state court.",
    unresolvedInformation: [],
    topicsCovered: ["case-type", "jurisdiction"],
    completionReason: null,
    safetyFlags: ["none"],
    ...overrides,
  };
}

describe("IntakeInterviewResponseSchema", () => {
  it("accepts a valid follow-up question response", () => {
    const result = IntakeInterviewResponseSchema.safeParse(response({ status: "needs-more-information" }));
    expect(result.success).toBe(true);
  });

  it("accepts a valid clarification question response", () => {
    const result = IntakeInterviewResponseSchema.safeParse(response({ status: "needs-clarification" }));
    expect(result.success).toBe(true);
  });

  it("accepts a valid intake-complete response with a null question", () => {
    const result = IntakeInterviewResponseSchema.safeParse(
      response({ status: "intake-complete", question: null, completionReason: "Enough information was gathered." }),
    );
    expect(result.success).toBe(true);
  });

  it("rejects a needs-more-information response with a null question", () => {
    const result = IntakeInterviewResponseSchema.safeParse(
      response({ status: "needs-more-information", question: null }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects a needs-clarification response with a null question", () => {
    const result = IntakeInterviewResponseSchema.safeParse(
      response({ status: "needs-clarification", question: null }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects an intake-complete response that still includes a question", () => {
    const result = IntakeInterviewResponseSchema.safeParse(response({ status: "intake-complete" }));
    expect(result.success).toBe(false);
  });

  it("rejects a response whose 'question' field is an array (only one question may ever be returned)", () => {
    const result = IntakeInterviewResponseSchema.safeParse(response({ question: [validQuestion, validQuestion] }));
    expect(result.success).toBe(false);
  });

  it("rejects an invalid safety flag not in the allowed enum", () => {
    const result = IntakeInterviewResponseSchema.safeParse(response({ safetyFlags: ["made-up-flag"] }));
    expect(result.success).toBe(false);
  });

  it("rejects 'none' combined with another safety flag", () => {
    const result = IntakeInterviewResponseSchema.safeParse(
      response({ safetyFlags: ["none", "asks-for-legal-advice"] }),
    );
    expect(result.success).toBe(false);
  });

  it("accepts multiple non-'none' safety flags together", () => {
    const result = IntakeInterviewResponseSchema.safeParse(
      response({ safetyFlags: ["asks-for-legal-advice", "possible-deadline"] }),
    );
    expect(result.success).toBe(true);
  });

  it("rejects more than 6 safety flags", () => {
    const result = IntakeInterviewResponseSchema.safeParse(
      response({
        safetyFlags: [
          "contains-sensitive-data",
          "asks-for-legal-advice",
          "possible-emergency",
          "possible-deadline",
          "unclear-jurisdiction",
          "contains-sensitive-data",
          "asks-for-legal-advice",
        ],
      }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects an oversized collectedFactsSummary", () => {
    const result = IntakeInterviewResponseSchema.safeParse(response({ collectedFactsSummary: "a".repeat(4001) }));
    expect(result.success).toBe(false);
  });

  it("rejects more than 20 unresolvedInformation entries", () => {
    const result = IntakeInterviewResponseSchema.safeParse(
      response({ unresolvedInformation: Array.from({ length: 21 }, (_, i) => `gap ${i}`) }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects more than 30 topicsCovered entries", () => {
    const result = IntakeInterviewResponseSchema.safeParse(
      response({ topicsCovered: Array.from({ length: 31 }, (_, i) => `topic ${i}`) }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects malformed JSON-shaped input gracefully (safeParse never throws)", () => {
    expect(() => IntakeInterviewResponseSchema.safeParse("not an object")).not.toThrow();
    expect(IntakeInterviewResponseSchema.safeParse("not an object").success).toBe(false);
    expect(IntakeInterviewResponseSchema.safeParse(null).success).toBe(false);
    expect(IntakeInterviewResponseSchema.safeParse(undefined).success).toBe(false);
  });
});

describe("zodTextFormat compatibility (OpenAI Structured Outputs)", () => {
  it("converts the schema to a JSON-schema text format without throwing", async () => {
    const { zodTextFormat } = await import("openai/helpers/zod");
    expect(() => zodTextFormat(IntakeInterviewResponseSchema, "casecompass_intake_interview")).not.toThrow();
    const format = zodTextFormat(IntakeInterviewResponseSchema, "casecompass_intake_interview");
    expect(format.name).toBe("casecompass_intake_interview");
    expect(format.type).toBe("json_schema");
  });
});
