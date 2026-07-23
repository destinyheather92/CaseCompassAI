import { JURISDICTION_OPTIONS } from "@/lib/jurisdictions-data";

/**
 * A recognizable default title for a matter the user didn't name
 * themselves — never left blank in the UI. Prefers a case number, then a
 * jurisdiction-derived label, then a plain sequential fallback.
 */
export function generateDefaultMatterTitle(input: { existingMatterCount: number; caseNumber?: string | null; jurisdiction?: string | null }): string {
  if (input.caseNumber && input.caseNumber.trim().length > 0) {
    return `Matter #${input.caseNumber.trim()}`;
  }
  if (input.jurisdiction) {
    const label = JURISDICTION_OPTIONS.find((option) => option.value === input.jurisdiction)?.label;
    if (label && label !== "Not Sure") {
      return `${label} Matter`;
    }
  }
  return `Matter ${input.existingMatterCount + 1}`;
}
