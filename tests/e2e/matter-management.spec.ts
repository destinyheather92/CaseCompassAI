import { test, expect, type Page } from "@playwright/test";

/**
 * Drives real matter creation/renaming against a real running dev
 * server with a real signed-in account (see tests/e2e/auth-required.spec.ts
 * for why intake/matters always require real auth now). No network
 * mocking here — every request in this spec is a real round trip to the
 * app's own API and database, since the whole point is proving rename
 * persistence and cross-user/cross-matter isolation.
 */
async function createAccount(): Promise<{ username: string; password: string }> {
  const { execFileSync } = await import("node:child_process");
  const path = await import("node:path");
  const output = execFileSync("npx", ["tsx", path.join(__dirname, "helpers", "create-demo-account.ts")], {
    encoding: "utf-8",
    cwd: path.join(__dirname, "..", ".."),
    shell: true,
  });
  const lines = output.trim().split("\n");
  return JSON.parse(lines[lines.length - 1]);
}

async function login(page: Page, credentials: { username: string; password: string }) {
  await page.goto("/sign-in");
  await page.getByRole("textbox", { name: /email address or username/i }).fill(credentials.username);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("textbox", { name: "Password", exact: true }).fill(credentials.password);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.waitForURL(/^(?!.*\/sign-in).*$/, { timeout: 20000, waitUntil: "domcontentloaded" });
}

test.describe("matter creation and renaming", () => {
  // Each test creates a real Clerk account and does a real login; running
  // several concurrently against a single local dev server was observed
  // to cause intermittent frame-detached/navigation-abort failures
  // (concurrency overload, not a product bug — see docs/demos test-run
  // notes) — serial mode keeps the suite deterministic.
  test.describe.configure({ mode: "serial" });

  test("creating a matter with a custom name shows that name on the dashboard", async ({ page }) => {
    const credentials = await createAccount();
    await login(page, credentials);
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

    await page.getByTestId("new-matter-button").click();
    await page.getByTestId("new-matter-dialog").waitFor();
    await page.getByTestId("new-matter-title-input").fill("Lexington County DUI Appeal");
    await page.getByTestId("create-matter-submit").click();
    await page.waitForURL(/\/get-started\?matterId=/, { timeout: 10000, waitUntil: "domcontentloaded" });

    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("matters-list").getByText("Lexington County DUI Appeal")).toBeVisible();
  });

  test("an empty custom name falls back to a neutral default instead of an empty title", async ({ page }) => {
    const credentials = await createAccount();
    await login(page, credentials);
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

    await page.getByTestId("new-matter-button").click();
    await page.getByTestId("new-matter-dialog").waitFor();
    await page.getByTestId("create-matter-submit").click();
    await page.waitForURL(/\/get-started\?matterId=/, { timeout: 10000, waitUntil: "domcontentloaded" });

    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("matters-list").getByText(/^Matter \d+$/)).toBeVisible();
  });

  test("renaming an existing matter persists after a page refresh", async ({ page }) => {
    const credentials = await createAccount();
    await login(page, credentials);
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

    await page.getByTestId("new-matter-button").click();
    await page.getByTestId("new-matter-dialog").waitFor();
    await page.getByTestId("create-matter-submit").click();
    await page.waitForURL(/\/get-started\?matterId=/, { timeout: 10000, waitUntil: "domcontentloaded" });

    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await page.getByTestId("rename-matter-button").first().click();
    await page.getByTestId("matter-title-input").fill("Federal Sentencing Matter");
    await page.getByTestId("save-matter-name").click();
    await expect(page.getByTestId("matters-list").getByText("Federal Sentencing Matter")).toBeVisible();

    await page.reload();
    await expect(page.getByTestId("matters-list").getByText("Federal Sentencing Matter")).toBeVisible();
  });

  test("renaming one matter never renames another matter", async ({ page }) => {
    const credentials = await createAccount();
    await login(page, credentials);
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

    for (let i = 0; i < 2; i++) {
      await page.getByTestId("new-matter-button").click();
      await page.getByTestId("new-matter-dialog").waitFor();
      await page.getByTestId("create-matter-submit").click();
      await page.waitForURL(/\/get-started\?matterId=/, { timeout: 10000, waitUntil: "domcontentloaded" });
      await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    }

    const cards = page.getByTestId("matter-card");
    await expect(cards).toHaveCount(2);

    await cards.first().getByTestId("rename-matter-button").click();
    await cards.first().getByTestId("matter-title-input").fill("Only This One Renamed");
    await cards.first().getByTestId("save-matter-name").click();
    await expect(cards.first().getByText("Only This One Renamed")).toBeVisible();

    // The second card's title must be untouched by the first card's rename.
    await expect(cards.last().getByText("Only This One Renamed")).not.toBeVisible();
  });

  test("rejects an empty rename and leaves the original name in place", async ({ page }) => {
    const credentials = await createAccount();
    await login(page, credentials);
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

    await page.getByTestId("new-matter-button").click();
    await page.getByTestId("new-matter-dialog").waitFor();
    await page.getByTestId("create-matter-submit").click();
    await page.waitForURL(/\/get-started\?matterId=/, { timeout: 10000, waitUntil: "domcontentloaded" });
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

    const card = page.getByTestId("matter-card").first();
    const originalTitle = await card.locator("h3").textContent();

    await card.getByTestId("rename-matter-button").click();
    await card.getByTestId("matter-title-input").fill("   ");
    await card.getByTestId("save-matter-name").click();

    // Rejected client-side, before any request — the field deliberately
    // stays open (with the error shown) so the user can correct it,
    // rather than silently reverting to the read-only view.
    await expect(card.getByRole("alert")).toBeVisible();
    await expect(card.getByTestId("matter-title-input")).toBeVisible();

    await card.getByRole("button", { name: /cancel renaming/i }).click();
    await expect(card.locator("h3")).toHaveText(originalTitle ?? "");
  });

  test("one user cannot rename another user's matter via the API", async ({ page }) => {
    const ownerCredentials = await createAccount();
    const intruderCredentials = await createAccount();

    await login(page, ownerCredentials);
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await page.getByTestId("new-matter-button").click();
    await page.getByTestId("new-matter-dialog").waitFor();
    await page.getByTestId("create-matter-submit").click();
    await page.waitForURL(/\/get-started\?matterId=/, { timeout: 10000, waitUntil: "domcontentloaded" });
    const matterId = new URL(page.url()).searchParams.get("matterId");
    expect(matterId).toBeTruthy();

    const intruderContext = await page.context().browser()!.newContext();
    const intruderPage = await intruderContext.newPage();
    await login(intruderPage, intruderCredentials);
    const response = await intruderPage.request.patch(`/api/matters/${matterId}`, {
      data: { title: "Hijacked Title" },
    });
    expect(response.status()).toBe(404);
    await intruderContext.close();
  });
});
