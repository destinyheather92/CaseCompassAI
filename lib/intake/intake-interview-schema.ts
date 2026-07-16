import { z } from "zod";

export const answerTypeSchema = z.enum([
  "short-text",
  "long-text",
  "date",
  "yes-no",
  "single-choice",
  "multiple-choice",
]);

const CHOICE_ANSWER_TYPES = new Set(["single-choice", "multiple-choice"]);

/** A single adaptive-interview question. Never more than one is returned per AI turn (structural — `question` is a single nullable object, not an array). */
export const IntakeQuestionSchema = z
  .object({
    id: z.string().min(1).max(100),
    text: z.string().min(1).max(500),
    purpose: z.string().min(1).max(300),
    answerType: answerTypeSchema,
    // OpenAI's Structured Outputs strict mode doesn't support optional
    // properties — every field must be present, so "no choices" is
    // represented as `choices: null`, not an omitted key.
    choices: z.array(z.string().min(1).max(150)).min(1).max(10).nullable(),
    required: z.boolean(),
    sensitiveInformationWarning: z.string().max(300).nullable(),
  })
  .strict()
  .superRefine((data, ctx) => {
    const needsChoices = CHOICE_ANSWER_TYPES.has(data.answerType);
    if (needsChoices && data.choices === null) {
      ctx.addIssue({
        code: "custom",
        message: "choices are required for single-choice and multiple-choice questions",
        path: ["choices"],
      });
    }
    if (!needsChoices && data.choices !== null) {
      ctx.addIssue({
        code: "custom",
        message: "choices must be null for this answer type",
        path: ["choices"],
      });
    }
  });

export type IntakeQuestion = z.infer<typeof IntakeQuestionSchema>;

const interviewStatusSchema = z.enum(["needs-more-information", "needs-clarification", "intake-complete"]);

const safetyFlagSchema = z.enum([
  "contains-sensitive-data",
  "asks-for-legal-advice",
  "possible-emergency",
  "possible-deadline",
  "unclear-jurisdiction",
  "none",
]);

export const IntakeInterviewResponseSchema = z
  .object({
    status: interviewStatusSchema,
    question: IntakeQuestionSchema.nullable(),
    collectedFactsSummary: z.string().max(4000),
    unresolvedInformation: z.array(z.string().max(300)).max(20),
    topicsCovered: z.array(z.string().max(100)).max(30),
    completionReason: z.string().max(500).nullable(),
    safetyFlags: z.array(safetyFlagSchema).max(6),
  })
  .strict()
  .superRefine((data, ctx) => {
    const questionRequired = data.status === "needs-more-information" || data.status === "needs-clarification";
    if (questionRequired && data.question === null) {
      ctx.addIssue({
        code: "custom",
        message: "question is required when more information or clarification is needed",
        path: ["question"],
      });
    }
    if (data.status === "intake-complete" && data.question !== null) {
      ctx.addIssue({
        code: "custom",
        message: "question must be null when the intake is complete",
        path: ["question"],
      });
    }
    if (data.safetyFlags.includes("none") && data.safetyFlags.length > 1) {
      ctx.addIssue({
        code: "custom",
        message: "'none' cannot be combined with another safety flag",
        path: ["safetyFlags"],
      });
    }
  });

export type IntakeInterviewResponse = z.infer<typeof IntakeInterviewResponseSchema>;
