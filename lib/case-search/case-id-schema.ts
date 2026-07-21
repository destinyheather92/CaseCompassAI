import { z } from "zod";

/**
 * A provider case id is an opaque identifier CourtListener assigns
 * (numeric today, but never assumed to stay that way) — this is the one
 * validation gate every id-based fetch (getCaseById, getOpinionText,
 * getCitingCases, getCitedCases) must pass through before the value is
 * ever embedded in a URL. Rejects anything that isn't a short
 * alphanumeric token — no slashes, dots, colons, or whitespace — so a
 * caller can never smuggle a path segment, a different host, or a query
 * string through an id parameter (SSRF/path-injection defense in depth;
 * `encodeURIComponent` alone only makes such a value inert, not absent).
 */
export const providerCaseIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[a-zA-Z0-9_-]+$/, "Invalid case id.");

export function isValidProviderCaseId(value: string): boolean {
  return providerCaseIdSchema.safeParse(value).success;
}

/**
 * A citation string a user might type or an AI might produce (e.g.
 * "466 U.S. 668"). Bounded and character-restricted — never passed
 * through to a URL unvalidated — but still permissive enough for real
 * reporter citations (periods, digits, letters, spaces, ampersands).
 */
export const citationTextSchema = z
  .string()
  .trim()
  .min(3, "Enter a citation to verify.")
  .max(300, "That citation is too long.")
  .regex(/^[a-zA-Z0-9 .,'&()§/-]+$/, "That doesn't look like a valid citation.");
