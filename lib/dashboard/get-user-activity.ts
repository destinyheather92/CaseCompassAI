import { prisma } from "@/lib/db";
import type { UserActivityType } from "@/lib/generated/prisma/enums";

export interface UserActivityItem {
  id: string;
  type: UserActivityType;
  title: string;
  description: string | null;
  href: string | null;
  createdAt: Date;
}

const DEFAULT_LIMIT = 20;

/** Scoped to `userId` directly; content is already sanitized at write time by lib/activity/record-user-activity.ts. */
export async function getUserActivity(userId: string, limit: number = DEFAULT_LIMIT): Promise<UserActivityItem[]> {
  const rows = await prisma.userActivity.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    description: row.description,
    href: row.href,
    createdAt: row.createdAt,
  }));
}
