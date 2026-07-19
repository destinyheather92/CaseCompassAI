import { z } from "zod";

export const RoadmapStepStatusSchema = z.enum(["not-started", "in-progress", "completed"]);

export const updateRoadmapProgressSchema = z.object({
  stepId: z.string().trim().min(1, "A step id is required."),
  status: RoadmapStepStatusSchema,
  note: z.string().trim().max(1000, "Notes are limited to 1000 characters.").optional(),
});

export type UpdateRoadmapProgressInput = z.infer<typeof updateRoadmapProgressSchema>;
