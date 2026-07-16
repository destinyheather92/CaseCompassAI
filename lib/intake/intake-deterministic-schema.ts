import { z } from "zod";

export const CASE_TYPES = ["criminal", "civil", "family", "appeal", "post-conviction", "unsure"] as const;
export const PROCEDURAL_STAGES = [
  "investigation-or-charges",
  "pretrial",
  "trial-completed",
  "sentencing",
  "direct-appeal",
  "post-conviction",
  "civil-case-pending",
  "judgment-entered",
  "unsure",
] as const;
export const RESEARCH_GOALS = [
  "find-starting-point",
  "understand-case",
  "understand-opinion",
  "research-issues",
  "understand-terms",
  "other",
] as const;
export const DOCUMENT_TYPES = [
  "none",
  "court-opinion",
  "motion",
  "order",
  "transcript",
  "appeal",
  "other",
] as const;

/** Layer 1 (deterministic) intake questions — validated the same way client and server, no AI call involved. */
export const startIntakeSessionSchema = z
  .object({
    caseType: z.enum(CASE_TYPES),
    jurisdiction: z.string().trim().min(2, "Please select a jurisdiction.").max(50),
    proceduralStage: z.enum(PROCEDURAL_STAGES),
    researchGoals: z.array(z.enum(RESEARCH_GOALS)).min(1, "Select at least one research goal.").max(6),
    documentTypes: z.array(z.enum(DOCUMENT_TYPES)).min(1, "Select at least one document option.").max(7),
  })
  .strict()
  .refine((data) => !(data.documentTypes.includes("none") && data.documentTypes.length > 1), {
    message: "\"Not yet\" cannot be combined with another document type.",
    path: ["documentTypes"],
  });

export type StartIntakeSessionInput = z.infer<typeof startIntakeSessionSchema>;

export const submitIntakeAnswerSchema = z
  .object({
    sessionId: z.string().trim().min(1),
    questionId: z.string().trim().min(1).max(100),
    answerText: z.string().trim().min(1, "Please provide an answer.").max(4000),
  })
  .strict();

export type SubmitIntakeAnswerInput = z.infer<typeof submitIntakeAnswerSchema>;

export const completeIntakeSessionRequestSchema = z.object({ acknowledged: z.boolean() }).strict();

export type CompleteIntakeSessionRequestInput = z.infer<typeof completeIntakeSessionRequestSchema>;
