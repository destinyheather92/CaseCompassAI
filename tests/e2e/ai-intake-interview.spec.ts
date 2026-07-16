import { test, expect } from "@playwright/test";

/**
 * Drives the full guided intake flow against a real running dev server,
 * with the AI interview turns mocked at the network boundary
 * (page.route) rather than via any production-code test backdoor — no
 * real, paid OpenAI calls are made. See docs/behavior/ai-intake-interview.md.
 */
test("guided intake: Layer 1 -> AI interview -> edit -> review -> confirm, with no legal advice or roadmap generated", async ({
  page,
}) => {
  let startCallCount = 0;
  let answerCallCount = 0;

  await page.route("**/api/intake/interview/start", async (route) => {
    startCallCount += 1;
    if (startCallCount === 1) {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          status: "started",
          sessionId: "e2e-session-1",
          intakeStatus: "interviewing",
          question: {
            id: "q1",
            text: "What court handled your case?",
            purpose: "Establish jurisdiction.",
            answerType: "short-text",
            choices: null,
            required: true,
            sensitiveInformationWarning: null,
          },
          factualSummary: "",
          unresolvedInformation: [],
          topicsCovered: [],
          questionCount: 1,
        }),
      });
      return;
    }

    // Second /start call happens after the user goes back and edits
    // Layer 1 — simulate the edited answers already being enough.
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        status: "started",
        sessionId: "e2e-session-2",
        intakeStatus: "ready-for-review",
        question: null,
        factualSummary: "The user has a civil matter with a court opinion already in hand.",
        unresolvedInformation: [],
        topicsCovered: ["case-type", "documents"],
        questionCount: 0,
      }),
    });
  });

  await page.route("**/api/intake/interview/answer", async (route) => {
    answerCallCount += 1;
    if (answerCallCount === 1) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "answered",
          intakeStatus: "interviewing",
          question: {
            id: "q2",
            text: "Was there a jury trial?",
            purpose: "Establish trial type.",
            answerType: "yes-no",
            choices: null,
            required: true,
            sensitiveInformationWarning: null,
          },
          factualSummary: "The user's case was handled by Richland County Circuit Court.",
          unresolvedInformation: [],
          topicsCovered: ["court"],
          questionCount: 2,
          limitReached: false,
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "answered",
        intakeStatus: "ready-for-review",
        question: null,
        factualSummary: "The user's case was handled by Richland County Circuit Court and included a jury trial.",
        unresolvedInformation: [],
        topicsCovered: ["court", "trial-type"],
        questionCount: 2,
        limitReached: false,
      }),
    });
  });

  await page.route("**/api/intake/interview/*/complete", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "completed", sessionId: "e2e-session-2" }),
    });
  });

  // 1. Open Get Started
  await page.goto("/get-started");
  await expect(page.getByRole("heading", { name: /build your legal research roadmap/i })).toBeVisible();

  // 2. Answer the deterministic (Layer 1) questions.
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

  // 3. Reach the AI interview and receive the first mocked question.
  await expect(page.getByRole("heading", { name: "What court handled your case?" })).toBeVisible();

  // 4. Answer it.
  await page.getByRole("textbox").fill("Richland County Circuit Court");
  await page.getByRole("button", { name: /continue/i }).click();

  // 5. Receive another question.
  await expect(page.getByRole("heading", { name: "Was there a jury trial?" })).toBeVisible();
  await page.getByRole("button", { name: "Yes" }).click();
  await page.getByRole("button", { name: /continue/i }).click();

  // 6. Reach the review screen with the factual summary and the answered
  // Q&A history both visible.
  await expect(page.getByRole("heading", { name: /review what casecompass understood/i })).toBeVisible();
  await expect(page.getByText(/richland county circuit court and included a jury trial/i)).toBeVisible();
  await expect(page.getByText("Was there a jury trial?")).toBeVisible();

  // 7. Edit — goes back into Layer 1, change the case type, and continue
  // back through to review (re-triggering /start, mocked to return
  // immediate intake-complete this time).
  await page.getByRole("button", { name: /^edit$/i }).click();
  await page.getByRole("button", { name: "Civil Case" }).click();
  await page.getByRole("button", { name: /continue/i }).click();
  await page.getByRole("button", { name: /continue/i }).click(); // jurisdiction already filled
  await page.getByRole("button", { name: /continue/i }).click(); // procedural stage already filled
  await page.getByRole("button", { name: /continue/i }).click(); // research goals already filled
  await page.getByRole("button", { name: /continue/i }).click(); // document types already filled -> triggers /start again

  await expect(page.getByRole("heading", { name: /review what casecompass understood/i })).toBeVisible();
  await expect(page.getByText(/civil matter/i)).toBeVisible();

  // 8. Confirm the summary — Confirm is disabled until acknowledged.
  await expect(page.getByRole("button", { name: /confirm/i })).toBeDisabled();
  await page.getByRole("checkbox").click();
  await page.getByRole("button", { name: /confirm/i }).click();

  // 9. Reach the ready-for-roadmap state.
  await expect(page.getByRole("heading", { name: /you're ready/i })).toBeVisible();

  // 10. No legal advice, no roadmap UI — this phase stops at confirmation.
  const bodyText = await page.locator("body").innerText();
  expect(bodyText.toLowerCase()).not.toContain("you should file");
  expect(bodyText.toLowerCase()).not.toContain("your rights were violated");
  expect(bodyText.toLowerCase()).not.toContain("recommended roadmap steps");
});
