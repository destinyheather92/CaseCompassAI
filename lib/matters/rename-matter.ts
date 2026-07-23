import { prisma } from "@/lib/db";
import { requireOwnedMatter } from "@/lib/auth/dashboard-authorization";
import { renameMatterSchema } from "@/lib/matters/matter-schema";
import type { AppUser } from "@/lib/auth/authorization";

export type RenameMatterResult =
  | { status: "renamed"; title: string }
  | { status: "invalid-request"; message: string }
  | { status: "not-found" };

/**
 * Renames a matter — title only. Never touches `id`, so nothing linked
 * to this matter (intake, roadmap, saved cases, saved resources) is ever
 * disconnected by a rename. Ownership is verified the same way as every
 * other matter-scoped write (`requireOwnedMatter`), so one user can never
 * rename another user's matter, including via a manipulated matterId in
 * the request.
 */
export async function renameMatter(matterId: string, rawInput: unknown, actorUser: AppUser): Promise<RenameMatterResult> {
  const parsed = renameMatterSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { status: "invalid-request", message: parsed.error.issues[0]?.message ?? "Invalid request." };
  }

  const owned = await requireOwnedMatter(matterId, actorUser);
  if (!owned.ok) {
    return { status: "not-found" };
  }

  const updated = await prisma.matter.update({
    where: { id: matterId },
    data: { title: parsed.data.title },
  });

  return { status: "renamed", title: updated.title };
}
