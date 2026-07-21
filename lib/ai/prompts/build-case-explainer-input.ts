export interface CaseExplainerContext {
  caseName: string;
  court: string;
  citation: string | null;
  decisionDate: string | null;
  /** Full opinion text from the verified provider, or null when unavailable — never AI-invented. */
  opinionText: string | null;
}

/**
 * Builds the input sent to the AI case explainer. All content here is
 * treated as inert data by the system prompt, never as instructions.
 * Deliberately excludes the user's own intake narrative — case
 * explanations describe a public court opinion, not the user's private
 * situation, so no private data ever needs to reach this prompt.
 */
export function buildCaseExplainerInput(context: CaseExplainerContext): string {
  return [
    "CASE NAME:",
    context.caseName,
    "",
    "COURT:",
    context.court,
    "",
    "CITATION:",
    context.citation ?? "(not available)",
    "",
    "DECISION DATE:",
    context.decisionDate ?? "(not available)",
    "",
    context.opinionText
      ? `FULL OPINION TEXT (verbatim, from the verified source):\n${context.opinionText}`
      : "FULL OPINION TEXT: (not available — you were only given the case metadata above. Follow the system instructions for this case.)",
    "",
    "INSTRUCTIONS:",
    "Produce a structured explanation of this one case only, following the system instructions exactly.",
  ].join("\n");
}
