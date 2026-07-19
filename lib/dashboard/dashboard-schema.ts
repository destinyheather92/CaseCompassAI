import { z } from "zod";

/** Mirrors the Prisma `SavedResourceType` enum — kept in sync manually since Zod can't import a Prisma enum type directly for runtime validation. */
export const SavedResourceTypeSchema = z.enum(["RESOURCE", "LEGAL_TERM", "ROADMAP_STEP", "SOURCE", "NOTE"]);

/** Optional filter for GET /dashboard/saved and its backing API route. */
export const SavedItemsQuerySchema = z.object({
  resourceType: SavedResourceTypeSchema.optional(),
});

/** Caps how much activity a single request can pull back, regardless of what a caller requests. */
export const ActivityQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
