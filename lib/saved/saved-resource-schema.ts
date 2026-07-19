import { z } from "zod";

export const SavedResourceTypeSchema = z.enum(["RESOURCE", "LEGAL_TERM", "ROADMAP_STEP", "SOURCE", "NOTE"]);

/** Relative internal paths, or https-only external URLs — blocks javascript:/data: and other unsafe schemes at the boundary. */
const SAFE_HREF_PATTERN = /^(\/[a-zA-Z0-9\-_/?=&%.]*|https:\/\/[a-zA-Z0-9.-]+(?::\d+)?(\/[a-zA-Z0-9\-_/?=&%.#]*)?)$/;

export const saveResourceSchema = z.object({
  resourceType: SavedResourceTypeSchema,
  resourceKey: z.string().trim().min(1, "A resource key is required.").max(200),
  title: z.string().trim().min(1, "A title is required.").max(200),
  href: z.string().trim().max(500).regex(SAFE_HREF_PATTERN, "href must be a relative path or an https URL").optional(),
  metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
});

export type SaveResourceInput = z.infer<typeof saveResourceSchema>;
