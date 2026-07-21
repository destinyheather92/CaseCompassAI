import { z } from "zod";

/**
 * Structured, plain-language breakdown of a verified court opinion. Every
 * field must be grounded in the opinion text actually provided to the
 * model (or, when no full text is available, in the case's verified
 * metadata only) — the system prompt instructs the model never to invent
 * facts, holdings, or quotes, and importantQuotes are independently
 * re-verified server-side against the real opinion text before this
 * response is trusted (see lib/case-explainer/explain-case.ts).
 */
export const ImportantQuoteSchema = z
  .object({
    quote: z.string().min(1).max(600),
    whyItMatters: z.string().min(1).max(300),
  })
  .strict();

export const CaseKeyTermSchema = z
  .object({
    term: z.string().min(1).max(100),
    definition: z.string().min(1).max(400),
  })
  .strict();

export const CaseExplanationSchema = z
  .object({
    caseSummary: z.string().min(1).max(1200),
    keyFacts: z.array(z.string().min(1).max(400)).max(12),
    legalIssues: z.array(z.string().min(1).max(400)).min(1).max(8),
    holding: z.string().min(1).max(600),
    courtsReasoning: z.string().min(1).max(1500),
    ruleOfLaw: z.string().min(1).max(600),
    whyThisCaseMatters: z.string().min(1).max(600),
    howItMightRelate: z.string().min(1).max(600),
    importantQuotes: z.array(ImportantQuoteSchema).max(8),
    keyTerms: z.array(CaseKeyTermSchema).max(12),
    /** True only when the model was given the actual opinion text, not just case metadata — the UI must tell the user which kind of summary this is. */
    basedOnFullOpinionText: z.boolean(),
  })
  .strict();

export type CaseExplanation = z.infer<typeof CaseExplanationSchema>;
export type ImportantQuote = z.infer<typeof ImportantQuoteSchema>;
export type CaseKeyTerm = z.infer<typeof CaseKeyTermSchema>;

/**
 * The explanation actually shown to users, after
 * lib/case-explainer/verify-quotes.ts has independently confirmed every
 * quote and attached where it was found. Distinct from `CaseExplanation`
 * (the AI's raw structured-output shape) because the AI is never asked
 * for — and could never truthfully supply — a quote's location; that's
 * computed after the fact, only for quotes that survive verification.
 */
export type VerifiedCaseExplanation = Omit<CaseExplanation, "importantQuotes"> & {
  importantQuotes: import("@/lib/case-explainer/verify-quotes").VerifiedQuote[];
};
