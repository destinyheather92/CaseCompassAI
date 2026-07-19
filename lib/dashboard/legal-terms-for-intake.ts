import { lookupLegalTerm } from "@/lib/legal-sources/legal-term-service";
import type { CaseType } from "@/types/intake";

const CASE_TYPE_TERMS: Record<CaseType, string[]> = {
  criminal: ["Arraignment", "Burden of Proof"],
  civil: ["Complaint", "Summary Judgment"],
  family: ["Jurisdiction", "Due Process"],
  appeal: ["Appellant", "Brief"],
  "post-conviction": ["Habeas Corpus", "Exhaustion of Remedies"],
  unsure: ["Jurisdiction", "Statute"],
};

const MAX_TERMS = 4;

export function selectLegalTermsForIntake(caseType: string | null, max: number = MAX_TERMS): string[] {
  const terms = CASE_TYPE_TERMS[caseType as CaseType] ?? CASE_TYPE_TERMS.unsure;
  return terms.slice(0, max);
}

export interface DashboardLegalTerm {
  term: string;
  plainLanguageDefinition: string;
  category: string;
  href: string;
}

/**
 * Looks up definitions through the existing, retrieval-first legal-term
 * service (never generates a definition inline) — see
 * lib/legal-sources/legal-term-service.ts. A term that isn't found is
 * silently omitted rather than surfaced as an error; this section is a
 * bonus, not a critical path.
 */
export async function getLegalTermsForIntake(caseType: string | null): Promise<DashboardLegalTerm[]> {
  const termNames = selectLegalTermsForIntake(caseType);
  const results = await Promise.all(termNames.map((term) => lookupLegalTerm({ term })));

  const terms: DashboardLegalTerm[] = [];
  for (const result of results) {
    if (result.status === "found") {
      terms.push({
        term: result.definition.term,
        plainLanguageDefinition: result.definition.plainLanguageDefinition,
        category: result.definition.category,
        href: `/resources/legal-terms-glossary?term=${encodeURIComponent(result.definition.term)}`,
      });
    }
  }
  return terms;
}
