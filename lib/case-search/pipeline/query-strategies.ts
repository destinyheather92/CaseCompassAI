import { simplifyQuery, extractPrimaryLegalIssue, expandSynonyms } from "@/lib/case-search/pipeline/legal-issue-lexicon";
import type { QueryStrategy } from "@/lib/case-search/pipeline/types";

export function buildFullQuery(topics: string[], legalTerms: string[]): string {
  return [...topics, ...legalTerms].join(" ").trim();
}

/**
 * Builds the ordered list of query rewrites the pipeline will try, from
 * most specific (the roadmap's full topic/term set) to most broad
 * (a synonym-expanded or plain-language version of the primary legal
 * issue). Every stage is deduplicated against the ones before it so the
 * same query is never sent to the provider twice. `summary` must be the
 * roadmap's own generated, non-private summary text — never the user's
 * private intake narrative (see docs/behavior/verified-case-search.md).
 */
export function generateQueryStrategies(input: { topics: string[]; legalTerms: string[]; summary?: string }): QueryStrategy[] {
  const fullQuery = buildFullQuery(input.topics, input.legalTerms);
  const combinedText = [fullQuery, input.summary ?? ""].join(" ");

  const strategies: QueryStrategy[] = [];
  const seen = new Set<string>();

  function add(strategy: QueryStrategy) {
    const key = strategy.query.trim().toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    strategies.push(strategy);
  }

  add({ stageName: "primary-query", label: "Searching your research topics…", query: fullQuery });

  const simplified = simplifyQuery(fullQuery);
  add({ stageName: "simplified-query", label: "Searching a simplified version of your research topics…", query: simplified });

  const primaryIssue = extractPrimaryLegalIssue(combinedText);
  if (primaryIssue) {
    add({ stageName: "primary-legal-issue", label: "Searching similar legal issues…", query: primaryIssue });
  }

  const expanded = expandSynonyms(primaryIssue ?? simplified);
  if (expanded) {
    add({ stageName: "synonym-expanded", label: "Searching related legal terminology…", query: expanded });
  }

  if (input.summary && input.summary.trim().length > 0) {
    add({ stageName: "natural-language", label: "Searching related case descriptions…", query: input.summary.trim(), semantic: true });
  }

  return strategies;
}
