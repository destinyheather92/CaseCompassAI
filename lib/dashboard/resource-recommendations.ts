import { resourcesRegistry, type ResourceMeta, type ResourceSlug } from "@/lib/resources-data";

export interface ResourceRecommendationInput {
  caseType: string | null;
  jurisdiction: string | null;
  documentTypes: readonly string[];
}

const MAX_RECOMMENDATIONS = 3;
const DEFAULT_SLUGS: ResourceSlug[] = ["legal-research-basics", "research-safety"];
const NO_INTAKE_SLUGS: ResourceSlug[] = [
  "legal-research-basics",
  "legal-terms-glossary",
  "what-casecompass-can-and-cannot-do",
];

/**
 * Deterministic recommendation rules only — no AI, no personalization
 * claims. See docs/behavior/user-dashboard.md. Reuses the existing
 * `resourcesRegistry` (lib/resources-data.ts) as the single source of
 * truth for resource metadata/routes, rather than duplicating it.
 */
export function recommendResources(input: ResourceRecommendationInput | null): ResourceMeta[] {
  if (!input) {
    return NO_INTAKE_SLUGS.map((slug) => resourcesRegistry[slug]);
  }

  const slugs: ResourceSlug[] = [];
  const add = (slug: ResourceSlug) => {
    if (!slugs.includes(slug)) slugs.push(slug);
  };

  if (input.caseType === "appeal" || input.caseType === "post-conviction") {
    add("how-to-read-a-court-opinion");
    add("legal-citations");
    add("research-safety");
  }

  if (input.caseType === "unsure" || input.jurisdiction === "UNKNOWN" || input.jurisdiction === null) {
    add("legal-research-basics");
    add("legal-terms-glossary");
    add("what-casecompass-can-and-cannot-do");
  }

  if (input.documentTypes.includes("court-opinion")) {
    add("how-to-read-a-court-opinion");
    add("legal-citations");
    add("legal-terms-glossary");
  }

  if (slugs.length === 0) {
    for (const slug of DEFAULT_SLUGS) add(slug);
  }

  return slugs.slice(0, MAX_RECOMMENDATIONS).map((slug) => resourcesRegistry[slug]);
}
