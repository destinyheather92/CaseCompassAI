/**
 * Deterministic legal-research vocabulary used to broaden a search when
 * the roadmap's own topics/terms return nothing. Nothing here invents
 * case law — it only reshapes the query text sent to the real provider,
 * the same way an experienced researcher would try a narrower or a
 * synonym-expanded phrase before giving up.
 */

/** Filler words stripped when simplifying a query — legal nouns are never on this list. */
const STOPWORDS = new Set([
  "a",
  "an",
  "the",
  "of",
  "for",
  "to",
  "and",
  "or",
  "your",
  "our",
  "this",
  "that",
  "these",
  "those",
  "involving",
  "regarding",
  "related",
  "about",
  "issue",
  "issues",
  "matter",
  "case",
  "understand",
  "understanding",
  "prepare",
  "preparing",
  "request",
  "requesting",
  "file",
  "filing",
  "review",
  "reviewing",
  "consequences",
  "your case",
]);

export function simplifyQuery(query: string): string {
  const words = query
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);
  const kept = words.filter((word) => !STOPWORDS.has(word.toLowerCase()));
  return kept.join(" ").trim();
}

/**
 * Canonical legal-issue phrases, checked in priority order (most specific
 * first) against the roadmap's own topics/legal terms. The first match
 * wins — this never guesses beyond what the roadmap's own generated
 * content already names.
 */
const PRIMARY_LEGAL_ISSUES: { pattern: RegExp; canonical: string }[] = [
  { pattern: /ineffective assistance/i, canonical: "ineffective assistance of counsel" },
  { pattern: /miranda/i, canonical: "Miranda" },
  { pattern: /brady/i, canonical: "Brady violation" },
  { pattern: /double jeopardy/i, canonical: "double jeopardy" },
  { pattern: /habitual offender/i, canonical: "habitual offender" },
  { pattern: /sentence enhancement|sentencing enhancement/i, canonical: "sentence enhancement" },
  { pattern: /speedy trial/i, canonical: "speedy trial" },
  { pattern: /search and seizure|fourth amendment/i, canonical: "Fourth Amendment search and seizure" },
  { pattern: /self.incrimination|fifth amendment/i, canonical: "Fifth Amendment self-incrimination" },
  { pattern: /right to counsel|sixth amendment/i, canonical: "Sixth Amendment right to counsel" },
  { pattern: /due process/i, canonical: "due process" },
  { pattern: /guilty plea|plea agreement|plea bargain/i, canonical: "guilty plea" },
  { pattern: /habeas corpus/i, canonical: "habeas corpus" },
  { pattern: /discovery/i, canonical: "discovery" },
];

/** Returns the first canonical legal-issue phrase found in the given text, or null if none of the known phrases appear. */
export function extractPrimaryLegalIssue(text: string): string | null {
  for (const { pattern, canonical } of PRIMARY_LEGAL_ISSUES) {
    if (pattern.test(text)) return canonical;
  }
  return null;
}

/**
 * Common legal-terminology synonym groups. When the query text contains
 * a trigger word, that word is expanded into an OR group of real
 * alternate phrasings — improving recall without changing the legal
 * meaning of the search.
 */
const SYNONYM_GROUPS: { trigger: RegExp; variants: string[] }[] = [
  { trigger: /\bdui\b/i, variants: ["DUI", "DWI", "driving under the influence"] },
  { trigger: /\battorney\b/i, variants: ["attorney", "counsel", "lawyer"] },
  { trigger: /\bplea\b/i, variants: ["guilty plea", "plea agreement", "plea bargain"] },
  { trigger: /\bsentence\b/i, variants: ["sentencing", "punishment", "sentence enhancement"] },
];

/** Returns a synonym-expanded OR query for every matched term, or null when no known synonym group applies. */
export function expandSynonyms(query: string): string | null {
  const groups: string[] = [];
  for (const { trigger, variants } of SYNONYM_GROUPS) {
    if (trigger.test(query)) {
      groups.push(`(${variants.join(" OR ")})`);
    }
  }
  return groups.length > 0 ? groups.join(" ") : null;
}
