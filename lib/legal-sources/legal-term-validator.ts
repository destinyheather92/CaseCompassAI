import { z } from "zod";

export const MAX_TERM_LENGTH = 100;

/** Letters, numbers, spaces, and the punctuation legal terms/citations actually use. */
const ALLOWED_CHARACTERS = /^[a-zA-Z0-9À-ÖØ-öø-ÿ\s\-'.,§&()]+$/;

export const legalTermRequestSchema = z.object({
  term: z
    .string()
    .trim()
    .min(1, "A legal term is required.")
    .max(MAX_TERM_LENGTH, `Terms must be ${MAX_TERM_LENGTH} characters or fewer.`)
    .refine((value) => ALLOWED_CHARACTERS.test(value), {
      message: "That term contains characters we don't support.",
    }),
  jurisdiction: z.string().trim().max(60).optional(),
});

export type LegalTermRequest = z.infer<typeof legalTermRequestSchema>;

const PROMPT_INJECTION_PATTERNS = [
  /ignore (all|previous|prior|the) instructions/i,
  /disregard (all|previous|prior|the) instructions/i,
  /system prompt/i,
  /you are now/i,
  /act as (a|an)/i,
  /\bjailbreak\b/i,
  /reveal your (prompt|instructions)/i,
  /<\s*script/i,
  /\{\{.*\}\}/,
];

export function looksLikePromptInjection(term: string): boolean {
  return PROMPT_INJECTION_PATTERNS.some((pattern) => pattern.test(term));
}

const QUESTION_STARTERS = [
  "what is",
  "what are",
  "what does",
  "how do",
  "how does",
  "how can",
  "why does",
  "why is",
  "can i",
  "should i",
  "is it",
  "does",
  "will i",
];

/**
 * The glossary endpoint accepts a legal word or short phrase, not a
 * question or a case narrative. This flags requests that read like a
 * question or full sentence so we can ask the user to rephrase instead of
 * quietly mishandling them.
 */
export function looksLikeQuestionOrNarrative(term: string): boolean {
  const trimmed = term.trim();
  if (trimmed.endsWith("?")) return true;

  const lower = trimmed.toLowerCase();
  if (QUESTION_STARTERS.some((starter) => lower.startsWith(starter))) return true;

  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  if (wordCount > 6) return true;

  return false;
}

export function normalizeTerm(term: string): string {
  return term
    .trim()
    .toLowerCase()
    .replace(/['".]/g, "")
    .replace(/\s+/g, "-");
}
