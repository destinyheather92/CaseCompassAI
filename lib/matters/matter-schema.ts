import { z } from "zod";

export const createMatterSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
});

export type CreateMatterInput = z.infer<typeof createMatterSchema>;

export const renameMatterSchema = z.object({
  title: z.string().trim().min(1, "Please enter a matter name.").max(120, "Matter names must be 120 characters or fewer."),
});

export type RenameMatterInput = z.infer<typeof renameMatterSchema>;
