/**
 * Records the individual-user demo. One real speed-up technique is used,
 * and it's called out here and in docs/demos/README.md — it never
 * touches the real application:
 *
 * PRE-WARMED SEEDED CONTENT: scripts/demos/prep-individual-account.ts
 * already completed one REAL intake -> REAL roadmap -> REAL case-detail
 * visit off-camera ("Matter 1"), so this recording can show a real,
 * populated dashboard immediately, and — critically — show a plain-
 * language case breakdown that's already cached (no live OpenAI wait)
 * instead of generating one fresh on camera.
 *
 * Everything else — login, matter creation, the second matter's own
 * intake interview (real questions, real answers, same
 * wait-for-next-question-or-review pattern prep-individual-account.ts
 * uses), roadmap generation, the CourtListener case search, the case
 * source-attribution panel — is real, unmocked application behavior,
 * just paced quickly. An earlier version of this script mocked the
 * interview's network calls to remove OpenAI latency, but a mocked
 * /start response has no matching row in the database, so the
 * following real "Confirm" step failed outright — network-mocking an
 * intermediate step of a flow that ends in a real, persisted write
 * doesn't work; this version accepts the interview's real latency
 * instead of faking a state the rest of the app can't act on.
 *
 * Requires `npm run dev` running and
 * scripts/demos/.artifacts/{individual-credentials,individual-demo-meta}.json
 * (see prep-individual-account.ts). Run via:
 *   npx tsx scripts/demos/individual-demo.ts
 */
import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { chromium, type Page } from "playwright";

const execFileAsync = promisify(execFile);
const BASE_URL = "http://localhost:3000";
const SIZE = { width: 1920, height: 1080 };
const ARTIFACTS_DIR = path.join(__dirname, ".artifacts");
const VIDEO_DIR = path.join(ARTIFACTS_DIR, "video-individual");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const FFMPEG = require("ffmpeg-static") as string;
const OUTPUT_MP4 = path.join(__dirname, "..", "..", "public", "demos", "individual-user-demo.mp4");

const credentials = JSON.parse(fs.readFileSync(path.join(ARTIFACTS_DIR, "individual-credentials.json"), "utf-8")) as {
  username: string;
  password: string;
};
const prepMeta = JSON.parse(fs.readFileSync(path.join(ARTIFACTS_DIR, "individual-demo-meta.json"), "utf-8")) as {
  matterId: string;
  roadmapId: string;
  caseId: string | null;
};

async function pause(page: Page, ms: number) {
  await page.waitForTimeout(ms);
}

const REAL_ANSWER =
  "I was sentenced in federal court and believe a sentence enhancement was applied to my case incorrectly.";

/**
 * Waits for the wizard's next real state after a "Continue" click —
 * either the next adaptive question (the "I don't know" checkbox is
 * always rendered, whatever the question's answer type) or the review
 * screen — racing both rather than guessing which one a fixed timeout
 * would catch first. Same technique proven in prep-individual-account.ts.
 */
async function waitForNextQuestionOrReview(page: Page): Promise<"question" | "review"> {
  const reviewHeading = page.getByRole("heading", { name: /review what casecompass understood/i });
  const dontKnowCheckbox = page.getByRole("checkbox", { name: /i don't know/i });
  await Promise.race([
    reviewHeading.waitFor({ state: "visible", timeout: 45000 }),
    dontKnowCheckbox.waitFor({ state: "visible", timeout: 45000 }),
  ]);
  return (await reviewHeading.isVisible().catch(() => false)) ? "review" : "question";
}

/** Real adaptive interview: one real answer, then "I don't know" until review — no network mocking. */
async function completeInterview(page: Page) {
  let answeredWithRealText = false;
  for (let i = 0; i < 15; i++) {
    const state = await waitForNextQuestionOrReview(page);
    if (state === "review") break;

    const textbox = page.getByRole("textbox");
    if (!answeredWithRealText && (await textbox.isVisible().catch(() => false))) {
      await textbox.fill(REAL_ANSWER);
      answeredWithRealText = true;
    } else {
      await page.getByRole("checkbox", { name: /i don't know/i }).click();
    }
    await page.getByRole("button", { name: /continue|saving/i }).click();
  }
}

async function main() {
  fs.rmSync(VIDEO_DIR, { recursive: true, force: true });
  fs.mkdirSync(VIDEO_DIR, { recursive: true });
  fs.mkdirSync(path.dirname(OUTPUT_MP4), { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: SIZE, recordVideo: { dir: VIDEO_DIR, size: SIZE } });
  const page = await context.newPage();

  try {
    await recordDemo(page);
  } catch (error) {
    fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, "demo-failure.png"), fullPage: true }).catch(() => {});
    console.log(`Diagnostic screenshot saved to ${ARTIFACTS_DIR}`);
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
    throw error;
  }

  await context.close();
  await browser.close();

  const files = fs.readdirSync(VIDEO_DIR).filter((f) => f.endsWith(".webm"));
  if (files.length === 0) throw new Error("No recording produced");
  const webmPath = path.join(VIDEO_DIR, files[0]);

  console.log("Transcoding to mp4...");
  await execFileAsync(FFMPEG, ["-y", "-i", webmPath, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", OUTPUT_MP4]);
  console.log(`Done: ${OUTPUT_MP4}`);
}

async function recordDemo(page: Page) {
  // Homepage.
  await page.goto(`${BASE_URL}/#top`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");
  await pause(page, 1800);

  // Get Started while logged out -> auth-required modal -> Log In.
  await page.getByRole("link", { name: /build my research roadmap/i }).click();
  await page.waitForURL(/\/get-started/);
  await page.getByTestId("auth-required-modal").waitFor();
  await pause(page, 1200);
  await page.getByTestId("auth-required-login").click();
  await page.waitForURL(/\/sign-in/, { timeout: 15000 });

  await page.getByRole("textbox", { name: /email address or username/i }).fill(credentials.username);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("textbox", { name: "Password", exact: true }).fill(credentials.password);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.waitForURL(/^(?!.*\/sign-in).*$/, { timeout: 20000 });

  // Authenticated dashboard (already showing the real, pre-populated Matter 1) -> New Matter.
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");
  await pause(page, 1500);

  await page.getByTestId("new-matter-button").click();
  await page.getByTestId("new-matter-dialog").waitFor();
  await page.getByTestId("new-matter-title-input").fill("Federal Sentencing Matter");
  await pause(page, 300);
  await page.getByTestId("create-matter-submit").click();
  await page.waitForURL(/\/get-started\?matterId=/, { timeout: 10000 });

  // Condensed Layer 1 intake with demo-specific data, minimal pacing,
  // then the second matter's own real adaptive interview (variable
  // length — see completeInterview's docstring).
  await page.getByRole("button", { name: /get started/i }).click();
  await page.getByRole("button", { name: "Criminal Case" }).click();
  await page.getByRole("button", { name: /continue/i }).click();
  await page.getByLabel(/state or court system/i).selectOption("South Carolina");
  await page.getByRole("button", { name: /continue/i }).click();
  await page.getByRole("button", { name: "Sentencing" }).click();
  await page.getByRole("button", { name: /continue/i }).click();
  await page.getByRole("button", { name: /understand my case/i }).click();
  await page.getByRole("button", { name: /continue/i }).click();
  await page.getByRole("button", { name: "Court opinion" }).click();
  await page.getByRole("button", { name: /continue/i }).click();

  await completeInterview(page);

  await page.getByRole("heading", { name: /review what casecompass understood/i }).waitFor();
  await pause(page, 500);
  await page.getByRole("checkbox").click();
  await page.getByRole("button", { name: /confirm/i }).click();

  // The real, freshly generated roadmap for this new matter.
  await page.waitForURL(/\/dashboard\/roadmaps\//, { timeout: 60000 });
  await page.waitForLoadState("networkidle");
  await pause(page, 1200);
  await page.evaluate(() => window.scrollBy({ top: 700, behavior: "smooth" }));
  await pause(page, 1500);

  // Suggested cases (Matter 1's real, already-searched roadmap) and a
  // plain-language case breakdown (Matter 1's pre-warmed case, so this
  // loads from cache instantly instead of triggering a live AI call).
  await page.goto(`${BASE_URL}/dashboard/roadmaps/${prepMeta.roadmapId}`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => window.scrollBy({ top: 900, behavior: "smooth" }));
  await pause(page, 1800);

  if (prepMeta.caseId) {
    await page.goto(`${BASE_URL}/dashboard/cases/${prepMeta.caseId}`, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");
    await pause(page, 1200);
    await page.evaluate(() => window.scrollBy({ top: 500, behavior: "smooth" }));
    await pause(page, 1500);
  }

  // Closing dashboard view — both matters now listed.
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");
  await pause(page, 2000);
}

main().catch((error) => {
  console.error("individual-demo failed:", error);
  process.exit(1);
});
