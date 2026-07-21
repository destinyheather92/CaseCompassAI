export const CASE_RESEARCH_DISCLAIMER =
  "This case is provided for educational research purposes only. It does not constitute legal advice, does not guarantee any outcome, and CaseCompass has not confirmed how — or whether — it applies to your specific situation.";

/** Shown whenever laterHistoryStatus is "not-checked" — never claim a case is still good law without a real citator check. */
export const LATER_HISTORY_NOT_CHECKED_NOTICE =
  "CaseCompass located and verified this opinion, but has not independently confirmed its complete subsequent history or current precedential status. Review later citing decisions and use an authorized citator when available.";

export const CASE_SEARCH_UNAVAILABLE_MESSAGE =
  "Verified case search is not available yet. Your roadmap and educational resources are still available.";

export const CASE_SEARCH_SAFE_ERROR_MESSAGE =
  "The legal source is temporarily unavailable. Your roadmap and saved educational resources remain available.";

/** Shown when a search/filter returns zero results — never falls back to an invented case. */
export const NO_CASES_FOUND_MESSAGE =
  "No verified cases were found for this research topic. Try a broader search or review the suggested legal issues.";

/** Shown when a citation-lookup call resolves to "not_verified". */
export const CITATION_NOT_VERIFIED_MESSAGE =
  "We could not verify this citation through the connected legal source. It may be incomplete, incorrect, unpublished, or unavailable.";

/** Shown in the Original Opinion view when metadata was verified but no opinion text is available. */
export const OPINION_TEXT_UNAVAILABLE_MESSAGE =
  "Case metadata was verified, but the full opinion text is not available from this source.";

/** Every AI-generated section on a case page must carry this label — never presented as part of the court's opinion. */
export const AI_EXPLANATION_LABEL = "CaseCompass educational explanation — AI-generated from the source opinion.";

/** Shown alongside every AI-generated section, distinct from the general research disclaimer. */
export const AI_EXPLANATION_DISCLAIMER =
  "This explanation is not part of the court's opinion and is not legal advice. Review the original opinion and confirm the current validity of the law.";

/** Historical cases whose metadata identifies the Caselaw Access Project as the original digitized source. */
export const CASELAW_ACCESS_PROJECT_NOTICE =
  "Historical case data originally digitized through the Caselaw Access Project and accessed through CourtListener.";
