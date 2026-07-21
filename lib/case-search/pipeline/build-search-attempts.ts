import { generateQueryStrategies } from "@/lib/case-search/pipeline/query-strategies";
import { buildJurisdictionLadder } from "@/lib/case-search/pipeline/jurisdiction-ladder";
import type { SearchAttempt } from "@/lib/case-search/pipeline/types";

/** Hard ceiling on how many real provider calls a single progressive search can make — keeps worst-case latency bounded. */
export const MAX_SEARCH_ATTEMPTS = 10;

/**
 * Assembles the full ordered list of search attempts a "Cases to
 * Research" request will try, broadest-first within the user's own
 * (binding) jurisdiction, then broadening jurisdiction, then a final
 * landmark-precedent fallback — an experienced researcher's own
 * escalation order, not a blind grid search. The runner (see
 * run-progressive-search.ts) executes these in order and stops at the
 * first one that returns results, so most requests only ever make one
 * or two of these calls.
 */
export function buildSearchAttempts(input: { jurisdiction: string; topics: string[]; legalTerms: string[]; summary?: string }): SearchAttempt[] {
  const strategies = generateQueryStrategies({ topics: input.topics, legalTerms: input.legalTerms, summary: input.summary });
  const ladder = buildJurisdictionLadder(input.jurisdiction);
  const primaryStrategy = strategies[0];
  const issueStrategy = strategies.find((s) => s.stageName === "primary-legal-issue") ?? strategies.find((s) => s.stageName === "simplified-query") ?? primaryStrategy;

  const attempts: SearchAttempt[] = [];
  const [selectedTier, federalTier, allTier] = ladder;

  if (selectedTier) {
    for (const strategy of strategies) {
      attempts.push({
        stageName: strategy.stageName,
        label: selectedTier.label,
        query: strategy.query,
        court: selectedTier.court,
        semantic: strategy.semantic ?? false,
        isOutOfJurisdiction: selectedTier.isOutOfJurisdiction,
      });
    }
  }

  if (federalTier && primaryStrategy) {
    attempts.push({
      stageName: "federal-jurisdiction",
      label: federalTier.label,
      query: primaryStrategy.query,
      court: federalTier.court,
      semantic: false,
      isOutOfJurisdiction: federalTier.isOutOfJurisdiction,
    });
    if (issueStrategy && issueStrategy.query !== primaryStrategy.query) {
      attempts.push({
        stageName: "federal-jurisdiction",
        label: federalTier.label,
        query: issueStrategy.query,
        court: federalTier.court,
        semantic: false,
        isOutOfJurisdiction: federalTier.isOutOfJurisdiction,
      });
    }
  }

  if (allTier && primaryStrategy) {
    attempts.push({
      stageName: "all-jurisdictions",
      label: allTier.label,
      query: primaryStrategy.query,
      court: allTier.court,
      semantic: false,
      isOutOfJurisdiction: true,
    });
    if (issueStrategy && issueStrategy.query !== primaryStrategy.query) {
      attempts.push({
        stageName: "all-jurisdictions",
        label: "Searching persuasive authority…",
        query: issueStrategy.query,
        court: allTier.court,
        semantic: false,
        isOutOfJurisdiction: true,
      });
    }
  }

  if (issueStrategy) {
    attempts.push({
      stageName: "landmark-precedent",
      label: "Searching landmark cases…",
      query: issueStrategy.query,
      court: "scotus",
      semantic: false,
      isOutOfJurisdiction: true,
    });
  }

  return attempts.slice(0, MAX_SEARCH_ATTEMPTS);
}
