/**
 * One-time developer bootstrap: creates a demo Institution + Facility and
 * its first institution-admin account. This is the ONLY place that
 * creates an INSTITUTION_ADMIN directly — the normal
 * lib/institution/create-user.ts path deliberately refuses to (invariant
 * #31: institution staff cannot create other admins). Run manually,
 * never as part of application startup or CI.
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

  const existingAdmin = await prisma.user.findFirst({
    where: { institutionId: institution.id, role: "INSTITUTION_ADMIN" },
  });

  if (existingAdmin) {
    console.log(`An institution-admin already exists for ${institution.name} (username: ${existingAdmin.username}).`);
    console.log("Delete that User row first if you want the seed script to create a fresh one.");
    await prisma.$disconnect();
    return;
  }

  const username = generateUsername(institution.code);
  const temporaryPassword = generateTemporaryPassword();

  const client = await clerkClient();
  const clerkUser = await client.users.createUser({
    username,
    password: temporaryPassword,
    skipPasswordChecks: false,
  });

  const admin = await prisma.user.create({
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

  console.log("");
  console.log("Demo institution-admin created.");
  console.log(`  Institution: ${institution.name} (${institution.code})`);
  console.log(`  Facility:    ${facility.name} (${facility.code})`);
  console.log(`  Username:    ${admin.username}`);
  console.log(`  Temporary password: ${temporaryPassword}`);
  console.log("");
  console.log("Sign in at /institution/login — you'll be forced to set a new password on first login.");
  console.log("This password is shown only once; it is not stored anywhere and cannot be retrieved again.");

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exitCode = 1;
});
