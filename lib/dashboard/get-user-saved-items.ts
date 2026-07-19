import { prisma } from "@/lib/db";
import type { SavedResourceType } from "@/lib/generated/prisma/enums";

export interface UserSavedItem {
  id: string;
  resourceType: SavedResourceType;
  resourceKey: string;
  title: string;
  href: string | null;
  createdAt: Date;
}

/** Scoped to `userId` directly, optionally narrowed to one resourceType. */
export async function getUserSavedItems(userId: string, resourceType?: SavedResourceType): Promise<UserSavedItem[]> {
  const rows = await prisma.savedResource.findMany({
    where: { userId, ...(resourceType ? { resourceType } : {}) },
    orderBy: { createdAt: "desc" },
  });

  return rows.map((row) => ({
    id: row.id,
    resourceType: row.resourceType,
    resourceKey: row.resourceKey,
    title: row.title,
    href: row.href,
    createdAt: row.createdAt,
  }));
}
