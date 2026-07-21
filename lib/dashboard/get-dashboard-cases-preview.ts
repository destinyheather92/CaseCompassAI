import { prisma } from "@/lib/db";
import { buildRoadmapCaseRequest } from "@/lib/case-search/build-roadmap-case-request";
import { searchCasesForRoadmap } from "@/lib/case-search/case-search-service";
import type { VerifiedCaseResult } from "@/lib/case-search/types";
import type { ResearchRoadmapContent } from "@/types/roadmap";

const PREVIEW_LIMIT = 2;

/**
 * Small best-effort preview for the dashboard overview — never throws,
 * just returns an empty list if no provider is configured or the
 * search fails, since this is a secondary section, not a critical
 * path. `roadmapId` must already be ownership-checked by the caller
 * (see app/dashboard/page.tsx, which only ever passes its own
 * `overview.activeRoadmap`).
 */
export async function getDashboardCasesPreview(roadmapId: string): Promise<VerifiedCaseResult[]> {
  const roadmap = await prisma.researchRoadmap.findUnique({ where: { id: roadmapId } });
  if (!roadmap) return [];

  const content = roadmap.content as unknown as ResearchRoadmapContent;
  const request = buildRoadmapCaseRequest(content, { limit: PREVIEW_LIMIT });
  const result = await searchCasesForRoadmap(request, content.summary);
  if (result.status !== "ok") return [];

  return result.cases.slice(0, PREVIEW_LIMIT).map((ranked) => ranked.case);
}
