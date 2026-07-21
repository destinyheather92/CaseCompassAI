export type AuthorityType = "binding" | "persuasive";

const SCOTUS_MARKERS = ["scotus", "supreme court of the united states", "u.s. supreme court"];

/**
 * Classifies a case's authority relative to the user's own roadmap
 * jurisdiction — conservatively. Only two outcomes are ever produced:
 * "binding" when the case is from the exact same court/jurisdiction as
 * the roadmap, or from the U.S. Supreme Court (binding nationally on
 * federal questions); "persuasive" for everything else with known
 * jurisdiction metadata. Returns null — no label at all — whenever the
 * jurisdictional relationship can't be reliably determined from
 * available metadata, rather than guessing. Never infers "binding" just
 * because a case discusses the same legal issue.
 */
export function classifyAuthority(input: {
  roadmapJurisdiction: string;
  caseJurisdiction: string | null;
  caseCourtId: string | null;
}): AuthorityType | null {
  const roadmapJurisdiction = input.roadmapJurisdiction.trim().toLowerCase();
  if (!roadmapJurisdiction) return null;

  const caseJurisdiction = (input.caseJurisdiction ?? "").trim().toLowerCase();
  const caseCourtId = (input.caseCourtId ?? "").trim().toLowerCase();

  if (!caseJurisdiction && !caseCourtId) return null;

  if (SCOTUS_MARKERS.some((marker) => caseJurisdiction.includes(marker) || caseCourtId.includes(marker))) {
    return "binding";
  }

  if (caseJurisdiction === roadmapJurisdiction || caseCourtId === roadmapJurisdiction) {
    return "binding";
  }

  return "persuasive";
}
