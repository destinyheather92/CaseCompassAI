import type { LegalTermLookupResult, LegalTermDefinition } from "./types";
import { legalSourceProviders } from "./legal-source-provider";
import { getCachedTerm, setCachedTerm } from "./cache";
import { suggestGlossaryTerms } from "./curated-glossary-provider";
import {
  legalTermRequestSchema,
  looksLikePromptInjection,
  looksLikeQuestionOrNarrative,
  normalizeTerm,
} from "./legal-term-validator";

const NOT_VERIFIED_MESSAGE =
  "We could not verify a reliable definition for this term. Try another spelling or consult an official legal source.";

const QUESTION_MESSAGE =
  "This looks like a question rather than a legal term. Try searching for just the word or short phrase, such as \"habeas corpus\" or \"burden of proof.\"";

const INVALID_MESSAGE =
  "That request couldn't be processed. Please enter a single legal word or short phrase.";

/** A found definition must actually have a definition and a real source before we'll return it. */
function isWellFormed(definition: LegalTermDefinition): boolean {
  return (
    definition.plainLanguageDefinition.trim().length > 0 &&
    definition.sources.length > 0 &&
    definition.sources.every((source) => source.url.startsWith("https://"))
  );
}

/**
 * Retrieval-first term lookup: normalize, check the curated glossary,
 * fall through to any configured external providers, cache a hit, and
 * validate the shape before ever returning "found". Never asks a model to
 * recall a definition from memory — if nothing is retrieved, we say so
 * rather than generating one.
 */
export async function lookupLegalTerm(
  rawRequest: unknown,
): Promise<LegalTermLookupResult> {
  const parsed = legalTermRequestSchema.safeParse(rawRequest);
  if (!parsed.success) {
    return { status: "invalid-request", message: INVALID_MESSAGE };
  }

  const { term } = parsed.data;

  if (looksLikePromptInjection(term)) {
    return { status: "invalid-request", message: INVALID_MESSAGE };
  }

  if (looksLikeQuestionOrNarrative(term)) {
    return { status: "invalid-request", message: QUESTION_MESSAGE };
  }

  const normalized = normalizeTerm(term);

  const cached = getCachedTerm(normalized);
  if (cached) {
    return { status: "found", definition: cached };
  }

  for (const provider of legalSourceProviders) {
    const result = await provider.lookup(normalized);
    if (result && isWellFormed(result)) {
      setCachedTerm(normalized, result);
      return { status: "found", definition: result };
    }
  }

  const suggestions = suggestGlossaryTerms(term);
  return {
    status: "not-found",
    message: NOT_VERIFIED_MESSAGE,
    suggestions: suggestions.length > 0 ? suggestions : undefined,
  };
}
