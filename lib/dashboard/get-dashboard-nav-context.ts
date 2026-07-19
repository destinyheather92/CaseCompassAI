import { prisma } from "@/lib/db";
import type { DashboardNavContext } from "@/lib/dashboard/dashboard-nav-items";

/** Lightweight — id-only projection, scoped strictly to userId, meant to be cheap enough to call on every /dashboard/* navigation. */
export async function getDashboardNavContext(userId: string): Promise<DashboardNavContext> {
  const [intake, roadmap] = await Promise.all([
    prisma.intakeSession.findFirst({ where: { userId }, orderBy: { updatedAt: "desc" }, select: { id: true } }),
    prisma.researchRoadmap.findFirst({ where: { userId }, orderBy: { updatedAt: "desc" }, select: { id: true } }),
  ]);

  return {
    latestIntakeId: intake?.id ?? null,
    latestRoadmapId: roadmap?.id ?? null,
  };
}
