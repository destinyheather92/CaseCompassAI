import { prisma } from "@/lib/db";
import { createMatterSchema } from "@/lib/matters/matter-schema";
import { generateDefaultMatterTitle } from "@/lib/matters/matter-title";
import type { AppUser } from "@/lib/auth/authorization";

export type CreateMatterResult =
  | { status: "created"; matterId: string; title: string }
  | { status: "invalid-request"; message: string };

/**
 * Creates a new, empty Matter for the caller — the entry point for both
 * the dashboard's explicit "New Matter" button and a fresh visit to
 * /get-started with no matterId yet. Never creates a matter for anyone
 * but the authenticated caller (userId always comes from actorUser, never
 * client input).
 */
export async function createMatter(rawInput: unknown, actorUser: AppUser): Promise<CreateMatterResult> {
  const parsed = createMatterSchema.safeParse(rawInput ?? {});
  if (!parsed.success) {
    return { status: "invalid-request", message: parsed.error.issues[0]?.message ?? "Invalid request." };
  }

  const title =
    parsed.data.title ??
    generateDefaultMatterTitle({ existingMatterCount: await prisma.matter.count({ where: { userId: actorUser.id } }) });

  const matter = await prisma.matter.create({
    data: { userId: actorUser.id, title, status: "ACTIVE" },
  });

  return { status: "created", matterId: matter.id, title: matter.title };
}
