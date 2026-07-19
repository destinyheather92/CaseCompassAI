import { z } from "zod";

export const generateRoadmapRequestSchema = z.object({
  intakeId: z.string().trim().min(1, "An intake id is required."),
});
