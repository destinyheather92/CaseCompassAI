import { z } from "zod";

export const saveCaseSchema = z.object({
  roadmapId: z.string().trim().min(1).optional(),
  providerName: z.string().trim().min(1).max(50),
  providerCaseId: z.string().trim().min(1).max(200),
  caseName: z.string().trim().min(1, "A case name is required.").max(300),
  citation: z.string().trim().max(200).optional(),
  court: z.string().trim().min(1, "A court is required.").max(200),
  jurisdiction: z.string().trim().min(1, "A jurisdiction is required.").max(50),
  decisionDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "decisionDate must be in YYYY-MM-DD format.").optional(),
  docketNumber: z.string().trim().max(100).optional(),
  sourceUrl: z
    .string()
    .trim()
    .max(500)
    .regex(/^https:\/\//, "sourceUrl must be an https URL."),
  sourceName: z.string().trim().min(1, "A source name is required.").max(200),
  matchedTopic: z.string().trim().max(200).optional(),
  note: z.string().trim().max(1000, "Notes are limited to 1000 characters.").optional(),
});

export type SaveCaseInput = z.infer<typeof saveCaseSchema>;

export const updateSavedCaseNoteSchema = z.object({
  note: z.string().trim().max(1000, "Notes are limited to 1000 characters."),
});
