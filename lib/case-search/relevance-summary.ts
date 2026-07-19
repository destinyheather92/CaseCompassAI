/**
 * Deterministic, cautious relevance text built only from the topics the
 * request actually matched against — never from case content a
 * provider didn't return, and never a claim of factual similarity,
 * strength, or likely outcome. See docs/behavior/verified-case-search.md.
 */
export function buildRelevanceSummary(matchedTopics: string[]): string {
  if (matchedTopics.length === 0) {
    return "This case may be useful to review as part of your research.";
  }
  const topicList = matchedTopics.join(", ");
  return `This case may be useful to review because it discusses a topic identified in your roadmap: ${topicList}.`;
}
