/**
 * Records the 90-second pitch-video storyboard (see
 * ~/Desktop/casecompass-pitch-storyboard.md) as a silent screen capture
 * of a real browser navigating the real running dev server. Not a test —
 * a one-off recording script, run manually via:
 *   npx tsx scripts/record-pitch.ts
 * Requires `npm run dev` already running on http://localhost:3000 and
 * scripts/.artifacts/storageState.json (produced by
 * scripts/prep-demo-account.ts) for the authenticated dashboard section.
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
const VIDEO_DIR = path.join(ARTIFACTS_DIR, "video");
const STORAGE_STATE_PATH = path.join(ARTIFACTS_DIR, "storageState.json");
// Playwright's own bundled ffmpeg is a stripped-down build (webm/VP8 only,
// no concat demuxer, no libx264, no mp4 muxer) — it exists only to support
// Playwright's internal frame-to-webm recording, not general transcoding.
// ffmpeg-static (a devDependency) provides a real, full-featured build.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const FFMPEG = require("ffmpeg-static") as string;
const DESKTOP_MP4 = String.raw`C:\Users\dhmil\Desktop\casecompass-pitch.mp4`;

const meta = JSON.parse(fs.readFileSync(path.join(ARTIFACTS_DIR, "demo-meta.json"), "utf-8")) as { roadmapId: string };

async function smoothScrollTo(page: Page, selector: string, holdMs: number) {
  await page
    .evaluate((sel) => {
      const el = document.querySelector(sel);
      if (el) {
        const top = el.getBoundingClientRect().top + window.scrollY - 40;
        window.scrollTo({ top, behavior: "smooth" });
      }
    }, selector)
    .catch(() => {});
  await page.waitForTimeout(600);
  await page.waitForTimeout(holdMs);
}

async function recordContextA() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: SIZE,
    recordVideo: { dir: path.join(VIDEO_DIR, "a"), size: SIZE },
  });
  const page = await context.newPage();

  // Beat 1 — Person: hero, hold.
  await page.goto(`${BASE_URL}/#top`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(3000);

  // Beat 2 — Problem: scroll through Choose Your Path + impact stats.
  await smoothScrollTo(page, "#choose-path", 1500);
  await page.evaluate(() => window.scrollBy({ top: 500, behavior: "smooth" }));
  await page.waitForTimeout(1500);

  // Beat 3 — Possibility: How It Works.
  await smoothScrollTo(page, "#how-it-works", 2500);

  // Beat 4 — Product: real Get Started wizard, first four steps.
  await page.getByRole("link", { name: /build my research roadmap/i }).click();
  await page.waitForURL(/\/get-started/);
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: /get started/i }).click();
  await page.waitForTimeout(500);

  await page.getByRole("button", { name: "Criminal Case" }).click();
  await page.waitForTimeout(350);
  await page.getByRole("button", { name: /continue/i }).click();
  await page.waitForTimeout(500);

  await page.getByLabel(/state or court system/i).selectOption("South Carolina");
  await page.waitForTimeout(350);
  await page.getByRole("button", { name: /continue/i }).click();
  await page.waitForTimeout(500);

  await page.getByRole("button", { name: "Post-Conviction" }).click();
  await page.waitForTimeout(350);
  await page.getByRole("button", { name: /continue/i }).click();
  await page.waitForTimeout(500);

  await page.getByRole("button", { name: /understand my case/i }).click();
  await page.waitForTimeout(350);
  await page.getByRole("button", { name: /continue/i }).click();
  await page.waitForTimeout(700);

  await context.close();
  await browser.close();
}

async function recordContextB() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: SIZE,
    recordVideo: { dir: path.join(VIDEO_DIR, "b"), size: SIZE },
    storageState: STORAGE_STATE_PATH,
  });
  const page = await context.newPage();

  // Beat 5 — Proof: the real, populated roadmap + Cases to Research.
  await page.goto(`${BASE_URL}/dashboard/roadmaps/${meta.roadmapId}`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(700);

  await smoothScrollTo(page, "text=Cases to Research", 1200);
  await page.evaluate(() => window.scrollBy({ top: 500, behavior: "smooth" }));
  await page.waitForTimeout(1500);

  await page.getByRole("link", { name: /^view case$/i }).first().click();
  await page.waitForURL(/\/dashboard\/cases\//);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(900);

  await page.evaluate(() => window.scrollBy({ top: 500, behavior: "smooth" }));
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.scrollBy({ top: 500, behavior: "smooth" }));
  await page.waitForTimeout(1000);

  await context.close();
  await browser.close();
}

async function recordContextC() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: SIZE,
    recordVideo: { dir: path.join(VIDEO_DIR, "c"), size: SIZE },
  });
  const page = await context.newPage();

  // Beat 6 — Proof (facilities).
  await page.goto(`${BASE_URL}/#facilities`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);
  await smoothScrollTo(page, "#facilities", 2000);

  // Beat 7 — Payoff: About / tagline, hold.
  await smoothScrollTo(page, "#about", 3000);

  await context.close();
  await browser.close();
}

function findWebm(dir: string): string {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".webm"));
  if (files.length === 0) throw new Error(`No .webm found in ${dir}`);
  return path.join(dir, files[0]);
}

async function main() {
  fs.rmSync(VIDEO_DIR, { recursive: true, force: true });
  fs.mkdirSync(VIDEO_DIR, { recursive: true });

  console.log("Recording section A (marketing + wizard)...");
  await recordContextA();
  console.log("Recording section B (dashboard + case reader)...");
  await recordContextB();
  console.log("Recording section C (facilities + payoff)...");
  await recordContextC();

  const clips = [findWebm(path.join(VIDEO_DIR, "a")), findWebm(path.join(VIDEO_DIR, "b")), findWebm(path.join(VIDEO_DIR, "c"))];

  const concatListPath = path.join(VIDEO_DIR, "concat_list.txt");
  fs.writeFileSync(concatListPath, clips.map((p) => `file '${p.replace(/\\/g, "/")}'`).join("\n"));

  const combinedWebmPath = path.join(VIDEO_DIR, "combined.webm");
  console.log("Concatenating clips...");
  await execFileAsync(FFMPEG, ["-y", "-f", "concat", "-safe", "0", "-i", concatListPath, "-c", "copy", combinedWebmPath]);

  console.log("Transcoding to mp4...");
  await execFileAsync(FFMPEG, [
    "-y",
    "-i",
    combinedWebmPath,
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    "-an",
    DESKTOP_MP4,
  ]);

  console.log(`Done: ${DESKTOP_MP4}`);
}

main().catch((error) => {
  console.error("record-pitch failed:", error);
  process.exit(1);
});
