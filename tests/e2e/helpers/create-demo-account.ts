/**
 * Standalone helper (run via `npx tsx`, never imported directly into a
 * Playwright test process) that creates one real demo INDIVIDUAL account
 * and prints its credentials as JSON on stdout. Importing
 * `@clerk/nextjs/server` directly from within the Playwright test runner
 * process fails to resolve (a module-resolution mismatch between
 * Playwright's own loader and this package's ESM build) — running it as
 * a separate tsx-executed process, the same way scripts/demos/*.ts
 * already does successfully, sidesteps that entirely.
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

async function main() {
  const { clerkClient } = await import("@clerk/nextjs/server");
  const { prisma } = await import("../../../lib/db");
  const { generateTemporaryPassword, generateUsername } = await import("../../../lib/auth/generate-credentials");

  const username = `e2e-${generateUsername("intake")}`;
  const password = generateTemporaryPassword();
  const client = await clerkClient();
  const clerkUser = await client.users.createUser({ username, password, skipPasswordChecks: false });
  await prisma.user.create({
    data: { clerkUserId: clerkUser.id, role: "INDIVIDUAL", accountStatus: "ACTIVE", username, displayName: "E2E Intake Test User" },
  });

  process.stdout.write(JSON.stringify({ username, password }));
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
