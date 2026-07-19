import type { ResearchRoadmapContent } from "@/types/roadmap";
import type { CaseSearchRequestInput } from "@/lib/case-search/case-search-schema";

/**
 * Builds the default "Cases to Research" request for a roadmap: topics
 * and related legal terms come from the roadmap's own generated
 * content (step titles + relatedTerms), never the user's private
 * intake narrative. jurisdiction always comes from the roadmap itself
 * — never trusted from client input — so a caller can't spoof a
 * different jurisdiction's cases onto this roadmap.
 */
export function buildRoadmapCaseRequest(
  content: ResearchRoadmapContent,
  overrides: Partial<Omit<CaseSearchRequestInput, "jurisdiction">> = {},
): CaseSearchRequestInput {
  const stepTopics = content.steps.map((step) => step.title);
  const relatedTerms = content.steps.flatMap((step) => step.relatedTerms);

  return {
    jurisdiction: content.jurisdiction.code,
    topics: overrides.topics && overrides.topics.length > 0 ? overrides.topics : stepTopics.slice(0, 5),
    legalTerms: overrides.legalTerms ?? [...new Set(relatedTerms)].slice(0, 10),
    courtLevel: overrides.courtLevel,
    proceduralStage: overrides.proceduralStage,
    dateRange: overrides.dateRange,
    publishedOnly: overrides.publishedOnly,
    limit: overrides.limit,
    cursor: overrides.cursor,
  };
}
