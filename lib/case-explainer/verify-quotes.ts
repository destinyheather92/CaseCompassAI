import type { ImportantQuote } from "@/lib/case-explainer/case-explanation-schema";

/**
 * Where a verified quote was found in the source opinion — computed by
 * this module after independently confirming the quote is really there,
 * never supplied by the AI (the model is never asked for a location, so
 * it can't invent one). `paragraphNumber` is best-effort: it counts line
 * breaks before the match, so it's only as meaningful as the newline
 * structure of the underlying text (CourtListener's `plain_text` usually
 * preserves real paragraph breaks; HTML-derived fallback text does not,
 * since it's already been flattened to single-spaced — in that case
 * every quote reports paragraph 1, which is honest rather than invented).
 */
export interface QuoteLocation {
  characterOffset: number;
  paragraphNumber: number;
}

export interface VerifiedQuote extends ImportantQuote {
  location: QuoteLocation;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function locateQuote(quote: string, sourceText: string): QuoteLocation | null {
  const normalizedSource = normalizeWhitespace(sourceText);
  const normalizedQuote = normalizeWhitespace(quote);
  const characterOffset = normalizedSource.indexOf(normalizedQuote);
  if (characterOffset === -1) return null;

  const precedingText = sourceText.slice(0, characterOffset);
  const paragraphBreaks = precedingText.match(/\n\s*\n/g)?.length ?? 0;
  const paragraphNumber = paragraphBreaks + 1;

  return { characterOffset, paragraphNumber };
}

/**
 * Defense in depth against fabricated quotes: keeps only quotes that
 * actually appear, verbatim (modulo whitespace normalization), as a
 * substring of the real opinion text — and attaches where in the text
 * each one was found. Never trusts the AI's own self-report — a quote
 * the model claims is verbatim but that cannot be found in the source is
 * dropped rather than shown to the user.
 */
export function verifyQuotesAgainstSource(quotes: ImportantQuote[], sourceText: string | null): VerifiedQuote[] {
  if (!sourceText) return [];
  const verified: VerifiedQuote[] = [];
  for (const quote of quotes) {
    const location = locateQuote(quote.quote, sourceText);
    if (location) {
      verified.push({ ...quote, location });
    }
  }
  return verified;
}
