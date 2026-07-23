import { test, expect } from "@playwright/test";

/**
 * Beginning intake/a matter now always requires a real, signed-in
 * account (see docs/behavior/matters.md) — these specs cover every
 * unauthenticated entry point, matching the app's own security-invariant
 * discipline: never rely only on hiding a button, always enforce on the
 * server. No real Clerk sign-in is exercised here (that's covered by
 * scripts/demos/individual-demo.ts against a real account) — these specs
 * only need to prove the *gate* itself is in place.
 */
test.describe("auth required before intake/matters", () => {
  test("an unauthenticated visit to /get-started shows the auth-required modal, not the wizard", async ({ page }) => {
    await page.goto("/get-started");
    await expect(page.getByTestId("auth-required-modal")).toBeVisible();
    // The wizard's own welcome screen (a distinct "Get Started" button, not
    // this modal's login/signup links) must never render for a guest.
    await expect(page.getByRole("button", { name: /^get started$/i })).not.toBeVisible();
  });

  test("the modal has an accessible title and description", async ({ page }) => {
    await page.goto("/get-started");
    const modal = page.getByTestId("auth-required-modal");
    await expect(modal.getByRole("heading", { name: /log in or create an account to/i })).toBeVisible();
    await expect(modal.getByText(/your legal research roadmap is personal to your account/i)).toBeVisible();
  });

  test("Log In carries redirect_url=/get-started so the visitor returns to intake after signing in", async ({ page }) => {
    await page.goto("/get-started");
    await expect(page.getByTestId("auth-required-login")).toHaveAttribute("href", "/sign-in?redirect_url=%2Fget-started");
  });

  test("Create Account carries the same redirect_url", async ({ page }) => {
    await page.goto("/get-started");
    await expect(page.getByTestId("auth-required-signup")).toHaveAttribute("href", "/sign-up?redirect_url=%2Fget-started");
  });

  test("the close button (upper-right) closes the modal and navigates home, without starting intake", async ({ page }) => {
    await page.goto("/get-started");
    await page.getByTestId("auth-required-modal").getByRole("button", { name: /close/i }).click();
    await page.waitForURL((url) => url.pathname === "/");
    await expect(page.getByTestId("auth-required-modal")).not.toBeVisible();
  });

  test("pressing Escape closes the modal and navigates home", async ({ page }) => {
    await page.goto("/get-started");
    await page.keyboard.press("Escape");
    await page.waitForURL((url) => url.pathname === "/");
  });

  test("clicking the backdrop closes the modal and navigates home", async ({ page }) => {
    await page.goto("/get-started");
    // Click the dialog's own backdrop element directly — a raw corner
    // coordinate can land on unrelated fixed-position chrome (e.g. the
    // Next.js dev tools button in local/dev builds) instead of the
    // backdrop, causing a false failure unrelated to dialog behavior.
    await page.locator('[data-slot="dialog-overlay"]').click({ position: { x: 5, y: 5 } });
    await page.waitForURL((url) => url.pathname === "/");
  });

  test("Back to Home navigates to the homepage", async ({ page }) => {
    await page.goto("/get-started");
    await page.getByTestId("auth-required-back-home").click();
    await page.waitForURL((url) => url.pathname === "/");
  });

  test("the close button is keyboard accessible (reachable via Tab, activatable via Enter)", async ({ page }) => {
    await page.goto("/get-started");
    await page.getByTestId("auth-required-modal").getByRole("button", { name: /close/i }).focus();
    await page.keyboard.press("Enter");
    await page.waitForURL((url) => url.pathname === "/");
  });

  test("a direct visit to /dashboard redirects an unauthenticated visitor to sign-in", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL(/\/sign-in/);
  });

  test("a direct visit to a matter-scoped roadmap URL redirects an unauthenticated visitor to sign-in, never leaking whether it exists", async ({ page }) => {
    await page.goto("/dashboard/roadmaps/some-roadmap-id");
    await page.waitForURL(/\/sign-in/);
  });

  test("calling the protected intake-start API without a session is rejected", async ({ request }) => {
    const response = await request.post("/api/intake/interview/start", {
      data: {
        caseType: "criminal",
        jurisdiction: "SC",
        proceduralStage: "post-conviction",
        researchGoals: ["understand-case"],
        documentTypes: ["court-opinion"],
      },
    });
    expect(response.status()).toBe(401);
  });

  test("calling the protected roadmap-generate API without a session is rejected", async ({ request }) => {
    const response = await request.post("/api/dashboard/roadmap/generate", { data: { intakeId: "does-not-matter" } });
    expect(response.status()).toBe(401);
  });

  test("calling the matters API without a session is rejected", async ({ request }) => {
    const getResponse = await request.get("/api/matters");
    expect(getResponse.status()).toBe(401);

    const postResponse = await request.post("/api/matters", { data: {} });
    expect(postResponse.status()).toBe(401);
  });
});
