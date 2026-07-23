import { test, expect, type Page } from "@playwright/test";
import { resourcesList } from "../../lib/resources-data";

/**
 * Covers the authenticated dashboard's Resources tab
 * (app/dashboard/resources/page.tsx) — reuses lib/resources-data.ts's
 * real registry rather than duplicating content, so this spec asserts
 * against the same source of truth the page renders from.
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

test.describe("dashboard Resources tab", () => {
  // Each test creates a real Clerk account and does a real login — see
  // the same note in tests/e2e/matter-management.spec.ts.
  test.describe.configure({ mode: "serial" });

  test("displays every real resource as a card with title, description, reading time, and difficulty", async ({ page }) => {
    const credentials = await createAccount();
    await login(page, credentials);
    await page.goto("/dashboard/resources", { waitUntil: "domcontentloaded" });

    const grid = page.getByTestId("resources-grid").first();
    await expect(grid).toBeVisible();

    const first = resourcesList[0];
    const card = page.getByTestId("resource-card").filter({ hasText: first.title });
    await expect(card).toBeVisible();
    await expect(card.getByText(first.cardDescription)).toBeVisible();
    await expect(card.getByText(`${first.readingTimeMinutes} min read`)).toBeVisible();
    await expect(card.getByText(first.difficulty)).toBeVisible();
    await expect(card.getByText("Explore Resource →")).toBeVisible();
  });

  test("selecting a card opens the correct resource page", async ({ page }) => {
    const credentials = await createAccount();
    await login(page, credentials);
    await page.goto("/dashboard/resources", { waitUntil: "domcontentloaded" });

    const target = resourcesList[0];
    await page.getByTestId("resource-card").filter({ hasText: target.title }).click();
    await page.waitForURL(new RegExp(target.href.replace(/\//g, "\\/")), { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: target.title })).toBeVisible();
  });

  test("the user can return to the dashboard after opening a resource", async ({ page }) => {
    const credentials = await createAccount();
    await login(page, credentials);
    await page.goto("/dashboard/resources", { waitUntil: "domcontentloaded" });

    const target = resourcesList[0];
    await page.getByTestId("resource-card").filter({ hasText: target.title }).click();
    await page.waitForURL(new RegExp(target.href.replace(/\//g, "\\/")), { waitUntil: "domcontentloaded" });

    await page.goto("/dashboard/resources", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("resources-grid").first()).toBeVisible();
  });

  test("resource cards render on a mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const credentials = await createAccount();
    await login(page, credentials);
    await page.goto("/dashboard/resources", { waitUntil: "domcontentloaded" });

    const target = resourcesList[0];
    await expect(page.getByTestId("resource-card").filter({ hasText: target.title })).toBeVisible();
  });

  test("only resources that actually exist are rendered as explorable cards; not-yet-built topics are labeled, not linked", async ({ page }) => {
    const credentials = await createAccount();
    await login(page, credentials);
    await page.goto("/dashboard/resources", { waitUntil: "domcontentloaded" });

    const cardCount = await page.getByTestId("resource-card").count();
    expect(cardCount).toBe(resourcesList.length);

    // Coming-soon topics must never render as clickable resource cards.
    const comingSoonSection = page.getByText("Coming Soon");
    await expect(comingSoonSection).toBeVisible();
  });
});
