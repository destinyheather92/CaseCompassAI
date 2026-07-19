import { prisma } from "@/lib/db";

export interface UserSavedCase {
  id: string;
  roadmapId: string | null;
  providerName: string;
  providerCaseId: string;
  caseName: string;
  citation: string | null;
  court: string;
  jurisdiction: string;
  decisionDate: Date | null;
  docketNumber: string | null;
  sourceUrl: string;
  sourceName: string;
  matchedTopic: string | null;
  note: string | null;
  createdAt: Date;
}

/** Scoped to `userId` directly, optionally narrowed to one roadmap. */
export async function getUserSavedCases(userId: string, roadmapId?: string): Promise<UserSavedCase[]> {
  const rows = await prisma.savedCase.findMany({
    where: { userId, ...(roadmapId ? { roadmapId } : {}) },
    orderBy: { createdAt: "desc" },
  });

  return rows.map((row) => ({
    id: row.id,
    roadmapId: row.roadmapId,
    providerName: row.providerName,
    providerCaseId: row.providerCaseId,
    caseName: row.caseName,
    citation: row.citation,
    court: row.court,
    jurisdiction: row.jurisdiction,
    decisionDate: row.decisionDate,
    docketNumber: row.docketNumber,
    sourceUrl: row.sourceUrl,
    sourceName: row.sourceName,
    matchedTopic: row.matchedTopic,
    note: row.note,
    createdAt: row.createdAt,
  }));
}
