import { z } from "zod";

/**
 * Non-sensitive UI/display preferences only — never an authorization
 * control (see User.preferences in prisma/schema.prisma). Kept
 * deliberately small: accessibility/display/session-cleanup choices
 * only, nothing that touches credentials or account status.
 */
export const userPreferencesSchema = z.object({
  reducedMotion: z.boolean().optional(),
  textSize: z.enum(["default", "large"]).optional(),
});

export type UserPreferences = z.infer<typeof userPreferencesSchema>;
