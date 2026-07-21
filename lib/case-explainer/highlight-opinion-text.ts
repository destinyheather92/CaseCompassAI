export interface OpinionTextSegment {
  text: string;
  highlighted: boolean;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Splits opinion text into plain/highlighted segments for rendering,
 * without ever injecting raw HTML — the caller renders each segment as
 * plain text (optionally inside a <mark>), so this can never introduce
 * an XSS vector the way string-concatenated HTML would. Quotes are
 * matched case-insensitively but the segment always preserves the
 * source text's original casing/whitespace.
 */
export function highlightOpinionText(opinionText: string, quotes: string[]): OpinionTextSegment[] {
  const nonEmptyQuotes = quotes.map((q) => q.trim()).filter((q) => q.length > 0);
  if (nonEmptyQuotes.length === 0) {
    return [{ text: opinionText, highlighted: false }];
  }

  // Longest first, so a longer quote wins over a shorter quote it contains.
  const sorted = [...nonEmptyQuotes].sort((a, b) => b.length - a.length);
  const pattern = new RegExp(`(${sorted.map(escapeRegExp).join("|")})`, "gi");

  const parts = opinionText.split(pattern);
  return parts
    .filter((part) => part.length > 0)
    .map((part) => ({
      text: part,
      highlighted: sorted.some((quote) => quote.toLowerCase() === part.toLowerCase()),
    }));
}
