import { prisma } from "@/lib/db";
import { requireOwnedSavedItem } from "@/lib/auth/dashboard-authorization";
import type { AppUser } from "@/lib/auth/authorization";

export type RemoveSavedResourceResult = { status: "removed" } | { status: "not-found" };

export async function removeSavedResource(savedItemId: string, actorUser: AppUser): Promise<RemoveSavedResourceResult> {
  const owned = await requireOwnedSavedItem(savedItemId, actorUser);
  if (!owned.ok) {
    return { status: "not-found" };
  }

  await prisma.savedResource.delete({ where: { id: savedItemId } });
  return { status: "removed" };
}
