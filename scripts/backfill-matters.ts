/**
 * One-time data backfill for the Matter refactor (see prisma/migrations/
 * 20260722000000_add_matters and docs/behavior/matters.md). The schema
 * migration only adds nullable `matterId` columns — this script creates
 * one default Matter per existing user who has any pre-existing
 * intake/roadmap/saved data and attaches that data to it, so nothing is
 * silently orphaned or deleted. Guest rows (userId IS NULL) are left
 * untouched — they never had an owner and still don't.
 *
 * Idempotent: only touches rows where matterId IS NULL, so running it
 * twice is a no-op the second time. Run via:
 *   npx tsx scripts/backfill-matters.ts
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

async function main() {
  const { prisma } = await import("../lib/db");

  const userIdsNeedingBackfill = new Set<string>();
  const [intakeUsers, roadmapUsers, resourceUsers, caseUsers] = await Promise.all([
    prisma.intakeSession.findMany({ where: { userId: { not: null }, matterId: null }, select: { userId: true }, distinct: ["userId"] }),
    prisma.researchRoadmap.findMany({ where: { userId: { not: null }, matterId: null }, select: { userId: true }, distinct: ["userId"] }),
    prisma.savedResource.findMany({ where: { matterId: null }, select: { userId: true }, distinct: ["userId"] }),
    prisma.savedCase.findMany({ where: { matterId: null }, select: { userId: true }, distinct: ["userId"] }),
  ]);
  for (const row of [...intakeUsers, ...roadmapUsers, ...resourceUsers, ...caseUsers]) {
    if (row.userId) userIdsNeedingBackfill.add(row.userId);
  }

  console.log(`Users needing a default matter: ${userIdsNeedingBackfill.size}`);

  let created = 0;
  for (const userId of userIdsNeedingBackfill) {
    const matter = await prisma.matter.create({
      data: { userId, title: "My First Matter", status: "ACTIVE" },
    });
    created += 1;

    const [i, r, sr, sc] = await Promise.all([
      prisma.intakeSession.updateMany({ where: { userId, matterId: null }, data: { matterId: matter.id } }),
      prisma.researchRoadmap.updateMany({ where: { userId, matterId: null }, data: { matterId: matter.id } }),
      prisma.savedResource.updateMany({ where: { userId, matterId: null }, data: { matterId: matter.id } }),
      prisma.savedCase.updateMany({ where: { userId, matterId: null }, data: { matterId: matter.id } }),
    ]);
    console.log(
      `  user ${userId} -> matter ${matter.id}: intakes=${i.count} roadmaps=${r.count} savedResources=${sr.count} savedCases=${sc.count}`,
    );
  }

  console.log(`Done. Created ${created} default matter(s).`);
  process.exit(0);
}

main().catch((error) => {
  console.error("backfill-matters failed:", error);
  process.exit(1);
});
