/**
 * Creates one fresh, clearly-labeled demo INDIVIDUAL account (no email
 * needed — same Clerk Backend API mechanism this codebase already uses
 * for institution accounts), then drives one REAL intake -> roadmap ->
 * case-detail visit off-camera. This produces "Matter 1": a fully
 * populated matter with a real generated roadmap, real verified cases,
 * and — critically — a warmed CaseExplanationRecord cache for its first
 * case, so the actual recording (individual-demo.ts) can show a
 * plain-language case breakdown that loads instantly instead of
 * triggering a fresh, slow OpenAI call live on camera.
 *
 * The account is left with ZERO additional matters, so the recording
 * itself can still show a real "New Matter" creation for a second,
 * on-camera matter. Not a test, not part of the app — run manually via:
 *   npx tsx scripts/demos/prep-individual-account.ts
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE_URL = "http://localhost:3000";
const ARTIFACTS_DIR = path.join(__dirname, ".artifacts");
const CREDENTIALS_PATH = path.join(ARTIFACTS_DIR, "individual-credentials.json");
const META_PATH = path.join(ARTIFACTS_DIR, "individual-demo-meta.json");

async function createAccount(): Promise<{ username: string; password: string }> {
  const { clerkClient } = await import("@clerk/nextjs/server");
  const { prisma } = await import("../../lib/db");
  const { generateTemporaryPassword, generateUsername } = await import("../../lib/auth/generate-credentials");

  const username = `demo-${generateUsername("individual")}`;
  const password = generateTemporaryPassword();

  const client = await clerkClient();
  const clerkUser = await client.users.createUser({ username, password, skipPasswordChecks: false });

  await prisma.user.create({
    data: { clerkUserId: clerkUser.id, role: "INDIVIDUAL", accountStatus: "ACTIVE", username, displayName: "Demo Individual User" },
  });

  return { username, password };
}

async function completeFirstMatter(username: string, password: string): Promise<{ matterId: string; roadmapId: string; caseId: string | null }> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  page.on("console", (msg) => console.log(`[browser:${msg.type()}] ${msg.text()}`));
  page.on("pageerror", (err) => console.log(`[pageerror] ${err.message}`));
  page.on("response", (response) => {
    if (response.url().includes("/api/intake/interview/")) {
      console.log(`[response] ${response.status()} ${response.url()}`);
    }
  });

  // Real login via the username/password form (works for any Clerk account regardless of app role).
  await page.goto(`${BASE_URL}/institution/login`);
  await page.getByLabel(/username/i).fill(username);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/get-started/, { timeout: 20000 });

  // Layer 1.
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

  // Real AI interview — one real answer, then "I don't know" until review.
  // Between each "Continue" click and the next question/review appearing,
  // the wizard shows a generic multi-stage loading interstitial
  // (components/onboarding/intake-loading.tsx) that can last several
  // seconds waiting on a real OpenAI round trip — a short, fixed
  // per-click timeout can't tell that apart from the interview actually
  // being done, so every wait below races the two real next-states
  // against each other with a generous shared timeout instead.
  const REAL_ANSWER =
    "My attorney did not explain that pleading guilty would affect my immigration status, and I believe this was ineffective assistance of counsel during my guilty plea.";

  async function waitForNextQuestionOrReview(): Promise<"question" | "review"> {
    const reviewHeading = page.getByRole("heading", { name: /review what casecompass understood/i });
    const dontKnowCheckbox = page.getByRole("checkbox", { name: /i don't know/i });
    await Promise.race([
      reviewHeading.waitFor({ state: "visible", timeout: 45000 }),
      dontKnowCheckbox.waitFor({ state: "visible", timeout: 45000 }),
    ]);
    return (await reviewHeading.isVisible().catch(() => false)) ? "review" : "question";
  }

  let answeredWithRealText = false;
  try {
    for (let i = 0; i < 15; i++) {
      console.log(`[interview loop] iteration ${i}`);
      const state = await waitForNextQuestionOrReview();
      if (state === "review") break;

      // The adaptive interview picks its own question type each turn
      // (short-text, yes/no, single/multiple-choice) — it is not always
      // a textbox, so only fill one in when it happens to appear, and
      // fall back to "I don't know" (always rendered, any answer type)
      // the rest of the time.
      const textbox = page.getByRole("textbox");
      if (!answeredWithRealText && (await textbox.isVisible().catch(() => false))) {
        await textbox.fill(REAL_ANSWER);
        answeredWithRealText = true;
      } else {
        await page.getByRole("checkbox", { name: /i don't know/i }).click();
      }
      await page.getByRole("button", { name: /continue|saving/i }).click();
    }
  } catch (error) {
    fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, "interview-loop-failure.png"), fullPage: true });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, "interview-loop-failure.html"), await page.content());
    console.log(`Diagnostic screenshot/html saved to ${ARTIFACTS_DIR}`);
    throw error;
  }

  await page.getByRole("heading", { name: /review what casecompass understood/i }).waitFor({ timeout: 15000 });
  await page.getByRole("checkbox").click();
  await page.getByRole("button", { name: /confirm/i }).click();

  await page.waitForURL(/\/dashboard\/roadmaps\//, { timeout: 60000 });
  await page.waitForLoadState("networkidle");
  const roadmapId = page.url().split("/dashboard/roadmaps/")[1]?.split(/[/?#]/)[0];
  if (!roadmapId) throw new Error(`Could not extract roadmapId from URL: ${page.url()}`);

  // Warm the first case's AI-explanation cache so the recording's visit
  // to it later is a fast DB read, not a fresh OpenAI call.
  let caseId: string | null = null;
  const viewCaseLink = page.getByRole("link", { name: /^view case$/i }).first();
  if (await viewCaseLink.isVisible().catch(() => false)) {
    const href = await viewCaseLink.getAttribute("href");
    caseId = href?.split("/dashboard/cases/")[1]?.split(/[/?#]/)[0] ?? null;
    await viewCaseLink.click();
    await page.waitForURL(/\/dashboard\/cases\//);
    await page.waitForLoadState("networkidle");
    // Give the AI explanation call time to complete and persist.
    await page.waitForTimeout(4000);
  }

  const { prisma } = await import("../../lib/db");
  const roadmap = await prisma.researchRoadmap.findUnique({ where: { id: roadmapId } });
  const matterId = roadmap?.matterId;
  if (!matterId) throw new Error("Roadmap has no matterId — prep flow did not attach a matter correctly");

  await browser.close();
  return { matterId, roadmapId, caseId };
}

async function main() {
  const { username, password } = await createAccount();
  console.log(`Created demo account: ${username}`);

  const { matterId, roadmapId, caseId } = await completeFirstMatter(username, password);
  console.log(`Matter 1 ready: matterId=${matterId} roadmapId=${roadmapId} caseId=${caseId ?? "(none found)"}`);

  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  fs.writeFileSync(CREDENTIALS_PATH, JSON.stringify({ username, password }, null, 2));
  fs.writeFileSync(META_PATH, JSON.stringify({ matterId, roadmapId, caseId }, null, 2));
  console.log(`Credentials saved to ${CREDENTIALS_PATH}`);
  console.log(`Metadata saved to ${META_PATH}`);
  process.exit(0);
}

main().catch((error) => {
  console.error("prep-individual-account failed:", error);
  process.exit(1);
});
