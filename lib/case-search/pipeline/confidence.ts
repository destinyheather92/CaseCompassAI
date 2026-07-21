import { classifyAuthority } from "@/lib/case-search/authority-classifier";
import type { SearchStageName, ConfidenceRating, RankedCaseResult } from "@/lib/case-search/pipeline/types";
import type { VerifiedCaseResult } from "@/lib/case-search/types";

/**
 * A deterministic, explainable confidence tier — derived only from which
 * search stage found the case and whether it's binding or persuasive
 * relative to the roadmap's own jurisdiction. This never claims a
 * "factual match": nothing in this pipeline compares the user's facts to
 * a case's facts, so the wording stays limited to what search stage and
 * jurisdiction data can actually support.
 */
export function computeConfidence(input: { stageName: SearchStageName; caseResult: VerifiedCaseResult; roadmapJurisdiction?: string }): ConfidenceRating {
  const { stageName, caseResult, roadmapJurisdiction } = input;
  const authority = roadmapJurisdiction
    ? classifyAuthority({ roadmapJurisdiction, caseJurisdiction: caseResult.jurisdiction, caseCourtId: caseResult.courtId })
    : null;

  if (stageName === "landmark-precedent") {
    return {
      stars: 1,
      label: "Foundational precedent",
      explanation: "A leading, widely cited precedent on this legal issue, though not from your own jurisdiction.",
    };
  }

  if (stageName === "all-jurisdictions") {
    return {
      stars: 2,
      label: "Persuasive authority",
      explanation: "Persuasive authority from another jurisdiction — not binding, but addresses the same legal issue.",
    };
  }

  if (stageName === "federal-jurisdiction") {
    return {
      stars: 3,
      label: "Related constitutional or federal issue",
      explanation: "A federal court decision on the same constitutional or legal issue identified in your roadmap.",
    };
  }

  if (stageName === "synonym-expanded" || stageName === "natural-language") {
    return {
      stars: 3,
      label: "Related legal issue",
      explanation: "Found through a broadened search of related terminology for the same legal issue.",
    };
  }

  if (stageName === "primary-legal-issue" || stageName === "simplified-query") {
    return {
      stars: 4,
      label: "Same legal issue",
      explanation:
        authority === "binding"
          ? "Same legal issue, from a court whose decisions bind your jurisdiction."
          : "Same legal issue identified in your roadmap.",
    };
  }

  // "primary-query" — the full, unmodified research query matched directly.
  return {
    stars: 5,
    label: "Strong match",
    explanation:
      authority === "binding"
        ? "Matches your research topics directly, from a court whose decisions bind your jurisdiction."
        : "Matches your research topics directly.",
  };
}

function isOutOfJurisdictionStage(stageName: SearchStageName): boolean {
  return stageName === "federal-jurisdiction" || stageName === "all-jurisdictions" || stageName === "landmark-precedent";
}

export function rankCase(input: { caseResult: VerifiedCaseResult; stageName: SearchStageName; roadmapJurisdiction?: string }): RankedCaseResult {
  return {
    case: input.caseResult,
    confidence: computeConfidence(input),
    isPersuasiveAuthority: isOutOfJurisdictionStage(input.stageName),
    foundVia: input.stageName,
  };
}

/** Highest confidence first; ties broken by the provider's own relevance ordering (stable sort preserves original order within a tier). */
export function rankCases(cases: RankedCaseResult[]): RankedCaseResult[] {
  return [...cases].sort((a, b) => b.confidence.stars - a.confidence.stars);
}
