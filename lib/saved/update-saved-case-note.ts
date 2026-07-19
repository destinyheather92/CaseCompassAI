import { prisma } from "@/lib/db";
import { requireOwnedSavedCase } from "@/lib/auth/dashboard-authorization";
import { updateSavedCaseNoteSchema } from "@/lib/saved/saved-case-schema";
import type { AppUser } from "@/lib/auth/authorization";

export type UpdateSavedCaseNoteResult =
  | { status: "updated" }
  | { status: "not-found" }
  | { status: "invalid-request"; message: string };

export async function updateSavedCaseNote(
  savedCaseId: string,
  rawInput: unknown,
  actorUser: AppUser,
): Promise<UpdateSavedCaseNoteResult> {
  const parsed = updateSavedCaseNoteSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { status: "invalid-request", message: parsed.error.issues[0]?.message ?? "Invalid request." };
  }

  const owned = await requireOwnedSavedCase(savedCaseId, actorUser);
  if (!owned.ok) {
    return { status: "not-found" };
  }

  await prisma.savedCase.update({ where: { id: savedCaseId }, data: { note: parsed.data.note } });
  return { status: "updated" };
}
