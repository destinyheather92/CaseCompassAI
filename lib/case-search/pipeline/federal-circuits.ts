/**
 * U.S. federal judicial circuit boundaries, mapped to CourtListener's own
 * court ids — confirmed live against GET /api/rest/v4/courts/ (ca1..ca11,
 * cadc all exist with the expected full_name). Used only to broaden a
 * search from a single state to "federal" once the state court search
 * comes back empty — never to imply a circuit's ruling binds the state,
 * which lib/case-search/authority-classifier.ts already handles
 * separately and conservatively.
 */
export const STATE_TO_FEDERAL_CIRCUIT: Record<string, string> = {
  ME: "ca1",
  MA: "ca1",
  NH: "ca1",
  RI: "ca1",
  CT: "ca2",
  NY: "ca2",
  VT: "ca2",
  DE: "ca3",
  NJ: "ca3",
  PA: "ca3",
  MD: "ca4",
  NC: "ca4",
  SC: "ca4",
  VA: "ca4",
  WV: "ca4",
  LA: "ca5",
  MS: "ca5",
  TX: "ca5",
  KY: "ca6",
  MI: "ca6",
  OH: "ca6",
  TN: "ca6",
  IL: "ca7",
  IN: "ca7",
  WI: "ca7",
  AR: "ca8",
  IA: "ca8",
  MN: "ca8",
  MO: "ca8",
  NE: "ca8",
  ND: "ca8",
  SD: "ca8",
  AK: "ca9",
  AZ: "ca9",
  CA: "ca9",
  HI: "ca9",
  ID: "ca9",
  MT: "ca9",
  NV: "ca9",
  OR: "ca9",
  WA: "ca9",
  CO: "ca10",
  KS: "ca10",
  NM: "ca10",
  OK: "ca10",
  UT: "ca10",
  WY: "ca10",
  AL: "ca11",
  FL: "ca11",
  GA: "ca11",
  DC: "cadc",
};

/** Every federal appellate court id, for the "FEDERAL" and "all jurisdictions" jurisdiction options. */
export const ALL_FEDERAL_COURT_IDS = [
  "scotus",
  "ca1",
  "ca2",
  "ca3",
  "ca4",
  "ca5",
  "ca6",
  "ca7",
  "ca8",
  "ca9",
  "ca10",
  "ca11",
  "cadc",
  "cafc",
];

/** CourtListener's `court` param accepts space-separated ids as an OR filter — confirmed live. */
export function federalCourtIdsFor(stateCode: string): string[] {
  const circuit = STATE_TO_FEDERAL_CIRCUIT[stateCode.toUpperCase()];
  return circuit ? ["scotus", circuit] : ["scotus"];
}
