/**
 * Records the facility/institutional demo: homepage -> facility
 * registration (sample facility info) -> issued admin credentials ->
 * first-login password change -> institution dashboard -> create an
 * institutional user -> issued user credentials -> institution nav
 * showing no personal-roadmap functionality for the admin. Entirely
 * self-contained — the registration form itself issues real credentials
 * on screen, so no separate account-prep script is needed. Requires
 * `npm run dev` running. Run via:
 *   npx tsx scripts/demos/facility-demo.ts
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
const VIDEO_DIR = path.join(ARTIFACTS_DIR, "video-facility");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const FFMPEG = require("ffmpeg-static") as string;
const OUTPUT_MP4 = path.join(__dirname, "..", "..", "public", "demos", "facility-demo.mp4");

async function pause(page: Page, ms: number) {
  await page.waitForTimeout(ms);
}

async function main() {
  fs.rmSync(VIDEO_DIR, { recursive: true, force: true });
  fs.mkdirSync(VIDEO_DIR, { recursive: true });
  fs.mkdirSync(path.dirname(OUTPUT_MP4), { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: SIZE, recordVideo: { dir: VIDEO_DIR, size: SIZE } });
  const page = await context.newPage();

  // 1. Homepage -> facility section.
  await page.goto(`${BASE_URL}/#facilities`);
  await page.waitForLoadState("networkidle");
  await pause(page, 2000);

  // 2. Register the facility, with sample (fictional) information.
  await page.goto(`${BASE_URL}/institution/register`);
  await page.waitForLoadState("networkidle");
  await pause(page, 1000);

  const suffix = Date.now().toString().slice(-6);
  await page.getByLabel("Facility Name").fill(`Riverside Correctional Facility ${suffix}`);
  await pause(page, 300);
  await page.locator("#institutionType").selectOption("STATE_PRISON");
  await pause(page, 300);
  await page.getByLabel("Organization / Agency Name (optional)").fill("Department of Corrections (Demo)");
  await pause(page, 300);
  await page.getByLabel("Contact Person").fill("Jordan Rivera");
  await pause(page, 300);
  await page.getByLabel("Job Title (optional)").fill("Reentry Program Coordinator");
  await pause(page, 300);
  await page.getByLabel("Work Email").fill(`demo-${suffix}@example-facility.test`);
  await pause(page, 500);
  await page.getByRole("button", { name: /create institution account/i }).click();

  // 3. Issued admin credentials, shown once.
  await page.waitForSelector("text=Your institution account has been created", { timeout: 15000 });
  await pause(page, 2500);
  const adminUsername = (await page.locator("span.font-mono.text-cc-purple").first().textContent())?.trim() ?? "";
  const adminTempPassword = (await page.locator("span.font-mono.text-cc-purple").nth(1).textContent())?.trim() ?? "";
  if (!adminUsername || !adminTempPassword) throw new Error("Could not read issued admin credentials from the page");

  await page.getByRole("link", { name: /continue to sign in/i }).click();
  await page.waitForURL(/\/institution\/login/);
  await pause(page, 1000);

  // 4. Facility administrator logs in with the temporary password.
  await page.getByLabel("Username").fill(adminUsername);
  await pause(page, 300);
  await page.getByLabel("Password").fill(adminTempPassword);
  await pause(page, 300);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/first-login/, { timeout: 15000 });
  await pause(page, 1200);

  // 5. Mandatory first-login password change.
  const newPassword = `Demo-${suffix}-Secure!`;
  await page.getByLabel("Temporary password").fill(adminTempPassword);
  await pause(page, 300);
  await page.getByLabel("New password", { exact: true }).fill(newPassword);
  await pause(page, 300);
  await page.getByLabel("Confirm new password").fill(newPassword);
  await pause(page, 500);
  await page.getByRole("button", { name: /change password/i }).click();

  // 6. Institution dashboard.
  await page.waitForURL(/\/institution\/dashboard/, { timeout: 20000 });
  await page.waitForLoadState("networkidle");
  await pause(page, 2500);

  // 7. Institution nav — proof the admin has no personal-roadmap
  // functionality: no "Get Started"/intake link anywhere in this nav.
  await pause(page, 1500);

  // 8. Manage Users -> create an institutional (incarcerated) user.
  await page.getByRole("link", { name: /manage users/i }).click();
  await page.waitForURL(/\/institution\/users/);
  await page.waitForLoadState("networkidle");
  await pause(page, 1200);

  await page.getByRole("button", { name: "Create User" }).click();
  await pause(page, 800);
  await page.locator("#create-role").selectOption("incarcerated-user");
  await pause(page, 300);
  await page.getByLabel("First name (optional)").fill("Alex");
  await pause(page, 200);
  await page.getByLabel("Last name (optional)").fill("Morgan");
  await pause(page, 200);
  await page.getByLabel("DOC Number / Inmate ID (optional)").fill(`DEMO-${suffix}`);
  await pause(page, 500);
  await page.getByRole("button", { name: "Create", exact: true }).click();

  // 9. Issued institutional-user credentials.
  await page.waitForSelector("text=Temporary password for", { timeout: 10000 });
  await pause(page, 2500);
  await page.getByRole("button", { name: "Done" }).click();
  await pause(page, 1500);

  // 10. Closing view: the users table showing the new institutional user, separate from the admin's own account.
  await page.evaluate(() => window.scrollBy({ top: 300, behavior: "smooth" }));
  await pause(page, 2000);

  await context.close();
  await browser.close();

  const files = fs.readdirSync(VIDEO_DIR).filter((f) => f.endsWith(".webm"));
  if (files.length === 0) throw new Error("No recording produced");
  const webmPath = path.join(VIDEO_DIR, files[0]);

  console.log("Transcoding to mp4...");
  await execFileAsync(FFMPEG, ["-y", "-i", webmPath, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", OUTPUT_MP4]);
  console.log(`Done: ${OUTPUT_MP4}`);
}

main().catch((error) => {
  console.error("facility-demo failed:", error);
  process.exit(1);
});
