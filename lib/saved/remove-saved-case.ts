import { prisma } from "@/lib/db";
import { requireOwnedSavedCase } from "@/lib/auth/dashboard-authorization";
import type { AppUser } from "@/lib/auth/authorization";

export type RemoveSavedCaseResult = { status: "removed" } | { status: "not-found" };

export async function removeSavedCase(savedCaseId: string, actorUser: AppUser): Promise<RemoveSavedCaseResult> {
  const owned = await requireOwnedSavedCase(savedCaseId, actorUser);
  if (!owned.ok) {
    return { status: "not-found" };
  }

  await prisma.savedCase.delete({ where: { id: savedCaseId } });
  return { status: "removed" };
}
