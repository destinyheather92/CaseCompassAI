/**
 * One-time developer bootstrap: creates a demo Institution + Facility +
 * institution-admin, a demo institutional (incarcerated) user, and a demo
 * individual user with two separate matters (one completed, with a real
 * generated roadmap; one incomplete, mid-intake) — see docs/behavior/matters.md
 * and docs/behavior/institutional-accounts.md. Run manually, never as
 * part of application startup or CI.
 *
 *   npm run db:seed
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

// Dynamic imports so DATABASE_URL/CLERK_SECRET_KEY are loaded into
// process.env (above) before lib/db.ts reads them at module-init time —
// static imports would be hoisted ahead of the loadEnv() call.
async function main() {
  const { clerkClient } = await import("@clerk/nextjs/server");
  const { prisma } = await import("../lib/db");
  const { generateTemporaryPassword, generateUsername } = await import("../lib/auth/generate-credentials");
  const { generateDeterministicRoadmap } = await import("../lib/roadmap/generate-roadmap");

  const institution = await prisma.institution.upsert({
    where: { code: "demo-facility" },
    update: {},
    create: { name: "Demo Correctional Facility", code: "demo-facility" },
  });

  const facility = await prisma.facility.upsert({
    where: { institutionId_code: { institutionId: institution.id, code: "unit-a" } },
    update: {},
    create: { institutionId: institution.id, name: "Housing Unit A", code: "unit-a" },
  });

  const client = await clerkClient();

  // --- Facility administrator ---
  let admin = await prisma.user.findFirst({ where: { institutionId: institution.id, role: "INSTITUTION_ADMIN" } });
  let adminTemporaryPassword: string | null = null;
  if (!admin) {
    const username = generateUsername(institution.code);
    adminTemporaryPassword = generateTemporaryPassword();
    const clerkUser = await client.users.createUser({ username, password: adminTemporaryPassword, skipPasswordChecks: false });
    admin = await prisma.user.create({
      data: {
        clerkUserId: clerkUser.id,
        role: "INSTITUTION_ADMIN",
        accountStatus: "PENDING_FIRST_LOGIN",
        username,
        displayName: "Demo Institution Admin",
        institutionId: institution.id,
        facilityId: facility.id,
        mustChangePassword: true,
        temporaryPasswordExpiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
    });
  }

  // --- Institutional (incarcerated) user ---
  let inmate = await prisma.user.findFirst({ where: { institutionId: institution.id, role: "INCARCERATED_USER" } });
  let inmateTemporaryPassword: string | null = null;
  if (!inmate) {
    const username = generateUsername(facility.code);
    inmateTemporaryPassword = generateTemporaryPassword();
    const clerkUser = await client.users.createUser({ username, password: inmateTemporaryPassword, skipPasswordChecks: false });
    inmate = await prisma.user.create({
      data: {
        clerkUserId: clerkUser.id,
        role: "INCARCERATED_USER",
        accountStatus: "PENDING_FIRST_LOGIN",
        username,
        displayName: "Demo Institutional User",
        institutionId: institution.id,
        facilityId: facility.id,
        docNumber: "DEMO-0001",
        mustChangePassword: true,
        temporaryPasswordExpiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        createdById: admin.id,
      },
    });
  }

  // --- Individual user with two separate matters ---
  let individual = await prisma.user.findFirst({ where: { role: "INDIVIDUAL", username: { startsWith: "demo-individual" } } });
  let individualTemporaryPassword: string | null = null;
  if (!individual) {
    const username = `demo-individual-${generateUsername("").replace(/^-/, "")}`;
    individualTemporaryPassword = generateTemporaryPassword();
    const clerkUser = await client.users.createUser({ username, password: individualTemporaryPassword, skipPasswordChecks: false });
    individual = await prisma.user.create({
      data: {
        clerkUserId: clerkUser.id,
        role: "INDIVIDUAL",
        accountStatus: "ACTIVE",
        username,
        displayName: "Demo Individual User",
      },
    });
  }

  const existingMatters = await prisma.matter.count({ where: { userId: individual.id } });
  if (existingMatters === 0) {
    // Matter 1 — completed: a confirmed intake plus a real generated roadmap.
    const completedMatter = await prisma.matter.create({
      data: { userId: individual.id, title: "South Carolina Post-Conviction Matter", jurisdiction: "SC", matterType: "post-conviction", status: "COMPLETED" },
    });
    const completedIntake = await prisma.intakeSession.create({
      data: {
        userId: individual.id,
        matterId: completedMatter.id,
        status: "COMPLETED",
        caseType: "post-conviction",
        jurisdiction: "SC",
        proceduralStage: "post-conviction",
        researchGoals: ["understand-case", "research-issues"],
        documentTypes: ["court-opinion"],
        factualSummary: "Demo seed data: a post-conviction matter with a confirmed intake, for demo purposes only.",
        completedAt: new Date(),
      },
    });
    const roadmapContent = generateDeterministicRoadmap({
      caseType: "post-conviction",
      jurisdiction: "SC",
      proceduralStage: "post-conviction",
      researchGoals: ["understand-case", "research-issues"],
      documentTypes: ["court-opinion"],
    });
    await prisma.researchRoadmap.create({
      data: {
        userId: individual.id,
        matterId: completedMatter.id,
        intakeSessionId: completedIntake.id,
        title: roadmapContent.title,
        summary: roadmapContent.summary,
        sourceKind: "DETERMINISTIC_FALLBACK",
        content: roadmapContent as unknown as import("@/lib/generated/prisma/client").Prisma.InputJsonValue,
      },
    });

    // Matter 2 — incomplete: intake still in progress, no roadmap yet.
    const incompleteMatter = await prisma.matter.create({
      data: { userId: individual.id, title: "Matter 2", jurisdiction: "GA", matterType: "criminal", status: "ACTIVE" },
    });
    await prisma.intakeSession.create({
      data: {
        userId: individual.id,
        matterId: incompleteMatter.id,
        status: "INTERVIEWING",
        caseType: "criminal",
        jurisdiction: "GA",
        proceduralStage: "pretrial",
        researchGoals: ["find-starting-point"],
        documentTypes: ["none"],
        factualSummary: "Demo seed data: an in-progress intake, for demo purposes only.",
        questionCount: 1,
      },
    });
  }

  console.log("");
  console.log("Seed complete.");
  console.log(`  Institution: ${institution.name} (${institution.code})`);
  console.log(`  Facility:    ${facility.name} (${facility.code})`);
  if (adminTemporaryPassword) {
    console.log(`  Facility admin username: ${admin.username} / temporary password: ${adminTemporaryPassword}`);
  } else {
    console.log(`  Facility admin already existed (username: ${admin.username}) — not recreated.`);
  }
  if (inmateTemporaryPassword) {
    console.log(`  Institutional user username: ${inmate.username} / temporary password: ${inmateTemporaryPassword}`);
  } else {
    console.log(`  Institutional user already existed (username: ${inmate.username}) — not recreated.`);
  }
  if (individualTemporaryPassword) {
    console.log(`  Individual user username: ${individual.username} / temporary password: ${individualTemporaryPassword}`);
    console.log("    Sign in at /institution/login (username/password works for any account) then visit /dashboard.");
  } else {
    console.log(`  Individual user already existed (username: ${individual.username}) — matters not recreated.`);
  }
  console.log("");
  console.log("Temporary passwords are shown only once; they are not stored anywhere and cannot be retrieved again.");

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exitCode = 1;
});
