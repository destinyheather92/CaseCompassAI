import { prisma } from "@/lib/db";
import { saveCaseSchema } from "@/lib/saved/saved-case-schema";
import { requireOwnedRoadmap } from "@/lib/auth/dashboard-authorization";
import { recordUserActivity } from "@/lib/activity/record-user-activity";
import type { AppUser } from "@/lib/auth/authorization";

export type SaveCaseResult =
  | { status: "saved"; id: string }
  | { status: "already-saved"; id: string }
  | { status: "invalid-request"; message: string }
  | { status: "invalid-roadmap" };

/**
 * Only ever persists a case that already carries its underlying
 * verified source record (sourceUrl/sourceName/providerCaseId) — never
 * just an AI-generated summary. Duplicate saves are prevented by the
 * database's own unique constraint on (userId, providerName, providerCaseId).
 */
export async function saveCase(rawInput: unknown, actorUser: AppUser): Promise<SaveCaseResult> {
  const parsed = saveCaseSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { status: "invalid-request", message: parsed.error.issues[0]?.message ?? "Invalid request." };
  }

  if (parsed.data.roadmapId) {
    const owned = await requireOwnedRoadmap(parsed.data.roadmapId, actorUser);
    if (!owned.ok) {
      return { status: "invalid-roadmap" };
    }
  }

  const existing = await prisma.savedCase.findUnique({
    where: {
      userId_providerName_providerCaseId: {
        userId: actorUser.id,
        providerName: parsed.data.providerName,
        providerCaseId: parsed.data.providerCaseId,
      },
    },
  });
  if (existing) {
    return { status: "already-saved", id: existing.id };
  }

  const saved = await prisma.savedCase.create({
    data: {
      userId: actorUser.id,
      roadmapId: parsed.data.roadmapId,
      providerName: parsed.data.providerName,
      providerCaseId: parsed.data.providerCaseId,
      caseName: parsed.data.caseName,
      citation: parsed.data.citation,
      court: parsed.data.court,
      jurisdiction: parsed.data.jurisdiction,
      decisionDate: parsed.data.decisionDate ? new Date(parsed.data.decisionDate) : undefined,
      docketNumber: parsed.data.docketNumber,
      sourceUrl: parsed.data.sourceUrl,
      sourceName: parsed.data.sourceName,
      matchedTopic: parsed.data.matchedTopic,
      note: parsed.data.note,
    },
  });

  await recordUserActivity({
    userId: actorUser.id,
    type: "CASE_SAVED",
    title: `Saved: ${parsed.data.caseName}`,
    href: parsed.data.sourceUrl,
  });

  return { status: "saved", id: saved.id };
}
