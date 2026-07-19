import { prisma } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import { saveResourceSchema } from "@/lib/saved/saved-resource-schema";
import { recordUserActivity } from "@/lib/activity/record-user-activity";
import { redact } from "@/lib/security/safe-logger";
import type { AppUser } from "@/lib/auth/authorization";

export type SaveResourceResult =
  | { status: "saved"; id: string }
  | { status: "already-saved"; id: string }
  | { status: "invalid-request"; message: string };

/** Duplicate saves are prevented by the DB's own unique constraint, not just this check — this lookup just lets us return a friendlier result than a raw constraint violation. */
export async function saveResource(rawInput: unknown, actorUser: AppUser): Promise<SaveResourceResult> {
  const parsed = saveResourceSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { status: "invalid-request", message: parsed.error.issues[0]?.message ?? "Invalid request." };
  }

  const existing = await prisma.savedResource.findUnique({
    where: {
      userId_resourceType_resourceKey: {
        userId: actorUser.id,
        resourceType: parsed.data.resourceType,
        resourceKey: parsed.data.resourceKey,
      },
    },
  });
  if (existing) {
    return { status: "already-saved", id: existing.id };
  }

  const saved = await prisma.savedResource.create({
    data: {
      userId: actorUser.id,
      resourceType: parsed.data.resourceType,
      resourceKey: parsed.data.resourceKey,
      title: parsed.data.title,
      href: parsed.data.href,
      metadata: parsed.data.metadata ? (redact(parsed.data.metadata) as Prisma.InputJsonValue) : undefined,
    },
  });

  await recordUserActivity({
    userId: actorUser.id,
    type: parsed.data.resourceType === "NOTE" ? "NOTE_SAVED" : "RESOURCE_SAVED",
    title: `Saved: ${parsed.data.title}`,
    href: parsed.data.href,
  });

  return { status: "saved", id: saved.id };
}
