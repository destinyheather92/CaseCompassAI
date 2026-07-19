import { prisma } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import { userPreferencesSchema, type UserPreferences } from "@/lib/dashboard/user-preferences-schema";

export type UpdateUserPreferencesResult =
  | { status: "updated"; preferences: UserPreferences }
  | { status: "invalid-request"; message: string };

/** Always operates on the caller's own row — there is no id parameter, since preferences are never settable for anyone but yourself. */
export async function updateUserPreferences(userId: string, rawInput: unknown): Promise<UpdateUserPreferencesResult> {
  const parsed = userPreferencesSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { status: "invalid-request", message: parsed.error.issues[0]?.message ?? "Invalid request." };
  }

  const existing = await prisma.user.findUnique({ where: { id: userId }, select: { preferences: true } });
  const merged = { ...(existing?.preferences as UserPreferences | null), ...parsed.data };

  await prisma.user.update({
    where: { id: userId },
    data: { preferences: merged as Prisma.InputJsonValue },
  });

  return { status: "updated", preferences: merged };
}
