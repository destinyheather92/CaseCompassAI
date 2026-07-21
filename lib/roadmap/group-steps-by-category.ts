import { ROADMAP_STEP_CATEGORIES, type RoadmapStepCategory } from "@/lib/roadmap/roadmap-step-templates";

export interface CategoryGroup<T> {
  category: RoadmapStepCategory;
  steps: T[];
}

/**
 * Groups steps by category in a fixed, sensible reading order
 * (getting-started first, case-documentation last) regardless of which
 * categories are actually present — never alphabetical or
 * insertion-order, which would be less useful for a research sequence.
 * Steps within a category keep their original relative order.
 */
export function groupStepsByCategory<T extends { category: RoadmapStepCategory }>(steps: T[]): CategoryGroup<T>[] {
  return ROADMAP_STEP_CATEGORIES.map((category) => ({
    category,
    steps: steps.filter((step) => step.category === category),
  })).filter((group) => group.steps.length > 0);
}
