import { describe, expect, it } from "vitest";
import { groupStepsByCategory } from "@/lib/roadmap/group-steps-by-category";

describe("groupStepsByCategory", () => {
  it("groups steps into a fixed category order regardless of input order", () => {
    const steps = [
      { id: "a", category: "case-documentation" as const },
      { id: "b", category: "getting-started" as const },
      { id: "c", category: "legal-concepts" as const },
    ];
    const groups = groupStepsByCategory(steps);
    expect(groups.map((g) => g.category)).toEqual(["getting-started", "legal-concepts", "case-documentation"]);
  });

  it("omits categories with no steps", () => {
    const steps = [{ id: "a", category: "getting-started" as const }];
    const groups = groupStepsByCategory(steps);
    expect(groups).toHaveLength(1);
  });

  it("preserves relative order of steps within a category", () => {
    const steps = [
      { id: "a", order: 1, category: "legal-concepts" as const },
      { id: "b", order: 2, category: "legal-concepts" as const },
    ];
    const groups = groupStepsByCategory(steps);
    expect(groups[0].steps.map((s) => s.id)).toEqual(["a", "b"]);
  });

  it("returns an empty array for no steps", () => {
    expect(groupStepsByCategory([])).toEqual([]);
  });
});
