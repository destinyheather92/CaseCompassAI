import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { getDashboardCasesPreview } from "@/lib/dashboard/get-dashboard-cases-preview";

const createdRoadmapIds: string[] = [];
const originalProvider = process.env.CASE_SEARCH_PROVIDER;

describe("getDashboardCasesPreview", () => {
  beforeEach(() => {
    process.env.CASE_SEARCH_PROVIDER = "none";
  });

  afterEach(async () => {
    await prisma.researchRoadmap.deleteMany({ where: { id: { in: createdRoadmapIds } } });
    createdRoadmapIds.length = 0;
  });

  afterAll(async () => {
    if (originalProvider === undefined) delete process.env.CASE_SEARCH_PROVIDER;
    else process.env.CASE_SEARCH_PROVIDER = originalProvider;
    await prisma.$disconnect();
  });

  it("returns an empty array (never throws) when no case-search provider is configured", async () => {
    const roadmap = await prisma.researchRoadmap.create({
      data: {
        title: "x",
        summary: "x",
        sourceKind: "DETERMINISTIC_FALLBACK",
        content: {
          title: "x",
          summary: "x",
          jurisdiction: { label: "South Carolina", code: "SC", limitationNote: "n" },
          steps: [{ id: "step-1", order: 1, title: "Understand Habeas Corpus", description: "d", whyItMatters: "w", suggestedActions: [], relatedTerms: [] }],
          legalTerms: [],
          sourceSuggestions: [],
          safetyNotes: [],
          confidence: { level: "low", explanation: "e" },
          disclaimer: "d",
          generatedAt: new Date().toISOString(),
        },
      },
    });
    createdRoadmapIds.push(roadmap.id);

    const preview = await getDashboardCasesPreview(roadmap.id);
    expect(preview).toEqual([]);
  });

  it("returns an empty array for a nonexistent roadmap id", async () => {
    const preview = await getDashboardCasesPreview("nonexistent-id");
    expect(preview).toEqual([]);
  });
});
