import { z } from "zod";

export const CourtLevelSchema = z.enum(["trial", "appellate", "supreme", "unknown"]);

export const caseSearchRequestSchema = z.object({
  jurisdiction: z.string().trim().min(1, "A jurisdiction is required.").max(20),
  courtLevel: CourtLevelSchema.optional(),
  topics: z.array(z.string().trim().min(1).max(200)).min(1, "At least one research topic is required.").max(10),
  legalTerms: z.array(z.string().trim().min(1).max(100)).max(10).optional(),
  proceduralStage: z.string().trim().max(100).optional(),
  dateRange: z
    .object({
      from: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Dates must be in YYYY-MM-DD format.").optional(),
      to: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Dates must be in YYYY-MM-DD format.").optional(),
    })
    .optional(),
  publishedOnly: z.boolean().optional(),
  limit: z.number().int().min(1).max(50).optional(),
  cursor: z.string().trim().min(1).nullable().optional(),
});

export type CaseSearchRequestInput = z.infer<typeof caseSearchRequestSchema>;
