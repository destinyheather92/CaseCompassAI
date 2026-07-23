/**
 * One-off, off-camera prep step for the pitch video: creates a single
 * clearly-labeled demo INDIVIDUAL account directly via Clerk's Backend
 * API (no email/OTP needed — same mechanism this codebase already uses
 * for institution accounts), then drives the real /get-started flow
 * with Playwright (headless, not recorded) through a real AI interview
 * and Confirm, producing one real, persisted roadmap with real
 * CourtListener case results. Saves the authenticated session
 * (storageState) and the resulting roadmapId for record-pitch.ts to
 * reuse. Not part of the app, not a test — run manually via:
 *   npx tsx scripts/prep-demo-account.ts
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE_URL = "http://localhost:3000";
const ARTIFACTS_DIR = path.join(__dirname, ".artifacts");
const STORAGE_STATE_PATH = path.join(ARTIFACTS_DIR, "storageState.json");
const META_PATH = path.join(ARTIFACTS_DIR, "demo-meta.json");

async function createDemoAccount(): Promise<{ username: string; password: string }> {
  const { clerkClient } = await import("@clerk/nextjs/server");
  const { prisma } = await import("../lib/db");
  const { generateUsername, generateTemporaryPassword } = await import("../lib/auth/generate-credentials");

  const username = generateUsername("pitchdemo");
  const password = generateTemporaryPassword();

  const client = await clerkClient();
  const clerkUser = await client.users.createUser({
    username,
    password,
    skipPasswordChecks: false,
  });

  await prisma.user.create({
    data: {
      clerkUserId: clerkUser.id,
      role: "INDIVIDUAL",
      accountStatus: "ACTIVE",
      username,
      displayName: "Pitch Video Demo",
    },
  });

  console.log(`Created demo account: username=${username}`);
  return { username, password };
}

async function runIntakeAndCaptureSession(username: string, password: string): Promise<{ roadmapId: string }> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  // Sign in via the username/password form (works for any Clerk account
  // regardless of Prisma role — Clerk itself doesn't gate on app role).
  await page.goto(`${BASE_URL}/institution/login`);
  await page.getByLabel(/username/i).fill(username);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/get-started/, { timeout: 20000 });

  // Layer 1 — same selectors as tests/e2e/ai-intake-interview.spec.ts.
  await page.getByRole("button", { name: /get started/i }).click();
  await page.getByRole("button", { name: "Criminal Case" }).click();
  await page.getByRole("button", { name: /continue/i }).click();
  await page.getByLabel(/state or court system/i).selectOption("South Carolina");
  await page.getByRole("button", { name: /continue/i }).click();
  await page.getByRole("button", { name: "Post-Conviction" }).click();
  await page.getByRole("button", { name: /continue/i }).click();
  await page.getByRole("button", { name: /understand my case/i }).click();
  await page.getByRole("button", { name: /continue/i }).click();
  await page.getByRole("button", { name: "Court opinion" }).click();
  await page.getByRole("button", { name: /continue/i }).click();

  // Layer 2 — real AI interview. First free-text-capable question gets a
  // real, on-topic answer (feeds the case-search pipeline's legal-issue
  // matching); every subsequent question is answered "I don't know" to
  // reach review quickly, regardless of its answer type.
  const REAL_ANSWER =
    "My attorney did not explain that pleading guilty would affect my immigration status, and I believe this was ineffective assistance of counsel during my guilty plea.";
  let answeredWithRealText = false;

  for (let i = 0; i < 15; i++) {
    const reviewHeading = page.getByRole("heading", { name: /review what casecompass understood/i });
    if (await reviewHeading.isVisible().catch(() => false)) break;

    const textbox = page.getByRole("textbox");
    if (!answeredWithRealText && (await textbox.isVisible().catch(() => false))) {
      await textbox.fill(REAL_ANSWER);
      answeredWithRealText = true;
    } else {
      const dontKnow = page.getByRole("checkbox", { name: /i don't know/i });
      await dontKnow.click();
    }

    await page.getByRole("button", { name: /continue|saving/i }).click();
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(500);
  }

  await page.getByRole("heading", { name: /review what casecompass understood/i }).waitFor({ timeout: 15000 });
  await page.getByRole("checkbox").click();
  await page.getByRole("button", { name: /confirm/i }).click();

  await page.waitForURL(/\/dashboard\/roadmaps\//, { timeout: 30000 });
  const roadmapId = page.url().split("/dashboard/roadmaps/")[1]?.split(/[/?#]/)[0];
  if (!roadmapId) throw new Error(`Could not extract roadmapId from URL: ${page.url()}`);

  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  await context.storageState({ path: STORAGE_STATE_PATH });
  await browser.close();

  return { roadmapId };
}

async function main() {
  const { username, password } = await createDemoAccount();
  const { roadmapId } = await runIntakeAndCaptureSession(username, password);

  fs.writeFileSync(META_PATH, JSON.stringify({ username, roadmapId }, null, 2));
  console.log(`Roadmap generated: ${roadmapId}`);
  console.log(`storageState saved to ${STORAGE_STATE_PATH}`);
  console.log(`metadata saved to ${META_PATH}`);
  process.exit(0);
}

main().catch((error) => {
  console.error("prep-demo-account failed:", error);
  process.exit(1);
});
