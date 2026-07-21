import { federalCourtIdsFor, ALL_FEDERAL_COURT_IDS } from "@/lib/case-search/pipeline/federal-circuits";
import { JURISDICTION_OPTIONS } from "@/lib/jurisdictions-data";
import type { JurisdictionTier } from "@/lib/case-search/pipeline/types";

function jurisdictionLabel(code: string): string {
  return JURISDICTION_OPTIONS.find((option) => option.value === code)?.label ?? code;
}

/**
 * Builds the ordered jurisdiction tiers the pipeline searches through —
 * the roadmap's own (binding) jurisdiction first, then federal courts,
 * then every jurisdiction — so a search never stops just because the
 * user's own state/territory has no on-point case in the database.
 */
export function buildJurisdictionLadder(jurisdictionCode: string): JurisdictionTier[] {
  const code = jurisdictionCode.trim().toUpperCase();

  if (code === "UNKNOWN" || code === "") {
    return [{ tierName: "all-jurisdictions", label: "Searching all jurisdictions…", court: null, isOutOfJurisdiction: false }];
  }

  if (code === "FEDERAL") {
    return [
      {
        tierName: "federal-jurisdiction",
        label: "Searching federal courts…",
        court: ALL_FEDERAL_COURT_IDS.join(" "),
        isOutOfJurisdiction: false,
      },
      { tierName: "all-jurisdictions", label: "Searching all jurisdictions…", court: null, isOutOfJurisdiction: true },
    ];
  }

  return [
    {
      tierName: "selected-jurisdiction",
      label: `Searching ${jurisdictionLabel(code)}…`,
      court: code.toLowerCase(),
      isOutOfJurisdiction: false,
    },
    {
      tierName: "federal-jurisdiction",
      label: "Searching federal courts…",
      court: federalCourtIdsFor(code).join(" "),
      isOutOfJurisdiction: false,
    },
    { tierName: "all-jurisdictions", label: "Searching all jurisdictions…", court: null, isOutOfJurisdiction: true },
  ];
}
