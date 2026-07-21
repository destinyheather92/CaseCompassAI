import { prisma } from "@/lib/db";

export interface InstitutionRoadmapSummary {
  id: string;
  title: string;
  ownerLabel: string;
  createdAt: Date;
}

const DEFAULT_LIMIT = 50;

/**
 * Aggregate-only, institution-scoped roadmap list for staff — titles and
 * ownership labels only, never step content or intake narrative (that
 * stays private to the owning user, per docs/behavior/shared-device-privacy.md).
 */
export async function listInstitutionRoadmaps(institutionId: string, limit = DEFAULT_LIMIT): Promise<InstitutionRoadmapSummary[]> {
  const roadmaps = await prisma.researchRoadmap.findMany({
    where: { institutionId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      title: true,
      createdAt: true,
      user: { select: { displayName: true, username: true } },
    },
  });

  return roadmaps.map((roadmap) => ({
    id: roadmap.id,
    title: roadmap.title,
    ownerLabel: roadmap.user?.displayName ?? roadmap.user?.username ?? "Unassigned",
    createdAt: roadmap.createdAt,
  }));
}
