import { describe, expect, it } from "vitest";
import { classifyAuthority } from "@/lib/case-search/authority-classifier";

describe("classifyAuthority", () => {
  it("classifies a case from the exact same jurisdiction as binding", () => {
    const result = classifyAuthority({ roadmapJurisdiction: "sc", caseJurisdiction: "sc", caseCourtId: "sc" });
    expect(result).toBe("binding");
  });

  it("classifies a case from the exact same courtId as binding even if jurisdiction differs in casing", () => {
    const result = classifyAuthority({ roadmapJurisdiction: "SC", caseJurisdiction: "South Carolina", caseCourtId: "sc" });
    expect(result).toBe("binding");
  });

  it("classifies a U.S. Supreme Court case as binding regardless of the roadmap's jurisdiction", () => {
    const result = classifyAuthority({ roadmapJurisdiction: "sc", caseJurisdiction: "scotus", caseCourtId: "scotus" });
    expect(result).toBe("binding");
  });

  it("classifies a case naming the Supreme Court of the United States as binding", () => {
    const result = classifyAuthority({
      roadmapJurisdiction: "ca9",
      caseJurisdiction: "Supreme Court of the United States",
      caseCourtId: null,
    });
    expect(result).toBe("binding");
  });

  it("classifies a case from a different jurisdiction as persuasive", () => {
    const result = classifyAuthority({ roadmapJurisdiction: "sc", caseJurisdiction: "ny", caseCourtId: "ny" });
    expect(result).toBe("persuasive");
  });

  it("returns null when the case has no jurisdiction metadata at all — never guesses", () => {
    const result = classifyAuthority({ roadmapJurisdiction: "sc", caseJurisdiction: null, caseCourtId: null });
    expect(result).toBeNull();
  });

  it("returns null when the roadmap itself has no jurisdiction", () => {
    const result = classifyAuthority({ roadmapJurisdiction: "", caseJurisdiction: "sc", caseCourtId: "sc" });
    expect(result).toBeNull();
  });

  it("never labels a case binding merely because it shares a topic — jurisdiction match is the only signal used", () => {
    const result = classifyAuthority({ roadmapJurisdiction: "sc", caseJurisdiction: "ga", caseCourtId: "ga" });
    expect(result).not.toBe("binding");
  });
});
