import { CASE_TYPE_TEMPLATES } from "@/lib/roadmap/roadmap-step-templates";
import { curatedGlossary } from "@/lib/legal-sources/curated-glossary-provider";
import { JURISDICTION_OPTIONS } from "@/lib/jurisdictions-data";
import type { ResearchRoadmapContent } from "@/lib/roadmap/roadmap-schema";
import type { CaseType } from "@/types/intake";

export interface GenerateRoadmapInput {
  caseType: string;
  jurisdiction: string;
  proceduralStage: string;
  researchGoals: readonly string[];
  documentTypes: readonly string[];
}

function jurisdictionLabel(code: string): string {
  return JURISDICTION_OPTIONS.find((option) => option.value === code)?.label ?? code;
}

function definitionFor(term: string): string {
  return (
    curatedGlossary.find((entry) => entry.term === term)?.plainLanguageDefinition ??
    "See the Legal Terms Glossary for a plain-language definition."
  );
}

const DISCLAIMER =
  "CaseCompass provides general legal education and research guidance. It does not provide legal advice, predict outcomes, or replace an attorney.";

/**
 * Deterministic, template-based roadmap generation — no AI call, no
 * invented citations, always `confidence.level: "low"`. This is the
 * fallback path used whenever no AI roadmap-generation provider is
 * configured (currently: always, since none exists yet — see
 * docs/behavior/roadmap-generation.md). Every related term is a real,
 * lookupable curated glossary entry, never invented.
 */
export function generateDeterministicRoadmap(input: GenerateRoadmapInput): ResearchRoadmapContent {
  const template = CASE_TYPE_TEMPLATES[input.caseType as CaseType] ?? CASE_TYPE_TEMPLATES.unsure;

  const steps = template.steps.map((step, index) => ({
    id: `step-${index + 1}`,
    order: index + 1,
    title: step.title,
    description: step.description,
    whyItMatters: step.whyItMatters,
    suggestedActions: step.suggestedActions,
    relatedTerms: step.relatedTerms,
    category: step.category,
    priority: step.priority,
    difficulty: step.difficulty,
    estimatedMinutes: step.estimatedMinutes,
  }));

  return {
    title: template.roadmapTitle,
    summary: template.summary,
    jurisdiction: {
      label: jurisdictionLabel(input.jurisdiction),
      code: input.jurisdiction,
      limitationNote:
        "This is general information only. Laws and procedures vary by jurisdiction, and this roadmap does not reflect a case-specific legal determination.",
    },
    steps,
    legalTerms: template.legalTerms.map((term) => ({ term, plainLanguageDefinition: definitionFor(term) })),
    sourceSuggestions: [
      {
        name: "Official court self-help resources",
        sourceType: "official-guide",
        reasonToReview: "Court websites often publish plain-language guides for the procedures relevant to your case type.",
      },
      {
        name: "CaseCompass Legal Terms Glossary",
        sourceType: "secondary-source",
        reasonToReview: "Review definitions for terms that come up as you research.",
      },
    ],
    safetyNotes: [
      "This roadmap is a general educational starting point, not a case-specific legal determination.",
      "It does not identify whether any legal claim or defense applies to your situation.",
    ],
    confidence: {
      level: "low",
      explanation:
        "This roadmap was generated from general case-type information only, without case-specific AI analysis or verified legal sources.",
    },
    disclaimer: DISCLAIMER,
    generatedAt: new Date().toISOString(),
  };
}
