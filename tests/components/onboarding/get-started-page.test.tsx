// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useIntakeStore } from "@/stores/use-intake-store";

const pushMock = vi.fn();
let mockSearchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => mockSearchParams,
}));

vi.mock("@clerk/nextjs", () => ({
  useClerk: () => ({ signOut: vi.fn() }),
}));

vi.mock("@/lib/client/user-scoped-storage", () => ({
  clearAllLocalSessionData: vi.fn(),
}));

/**
 * app/get-started/page.tsx is now an async Server Component whose only
 * job is the authentication gate (see docs/behavior/matters.md) — the
 * actual interactive wizard, including everything these tests exercise,
 * lives in GetStartedWizard, which is what a real authenticated visit
 * renders. Testing the wizard directly is the equivalent (and only
 * practical) way to cover this behavior with RTL, since a Server
 * Component can't be rendered this way.
 */
const { GetStartedWizard } = await import("@/components/onboarding/get-started-wizard");

function jsonResponse(body: unknown) {
  return { ok: true, json: async () => body } as Response;
}

describe("GetStartedWizard", () => {
  beforeEach(() => {
    mockSearchParams = new URLSearchParams();
    pushMock.mockReset();
    useIntakeStore.getState().reset();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("walks through Layer 1 and starts the AI interview, sending the collected deterministic answers", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({
        status: "started",
        sessionId: "s1",
        matterId: "m1",
        intakeStatus: "interviewing",
        question: {
          id: "q1",
          text: "What court handled your case?",
          purpose: "x",
          answerType: "short-text",
          choices: null,
          required: true,
          sensitiveInformationWarning: null,
        },
        factualSummary: "",
        unresolvedInformation: [],
        topicsCovered: [],
      }),
    );

    const user = userEvent.setup();
    render(<GetStartedWizard matterId="m1" />);

    await user.click(screen.getByRole("button", { name: /get started/i }));
    await user.click(screen.getByRole("button", { name: "Criminal Case" }));
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await user.selectOptions(screen.getByLabelText(/state or court system/i), "South Carolina");
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await user.click(screen.getByRole("button", { name: "Post-Conviction" }));
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await user.click(screen.getByRole("button", { name: /understand my case/i }));
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await user.click(screen.getByRole("button", { name: "Court opinion" }));
    await user.click(screen.getByRole("button", { name: /continue/i }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "What court handled your case?" })).toBeInTheDocument();
    });

    expect(fetch).toHaveBeenCalledWith(
      "/api/intake/interview/start",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          caseType: "criminal",
          jurisdiction: "SC",
          proceduralStage: "post-conviction",
          researchGoals: ["understand-case"],
          documentTypes: ["court-opinion"],
          matterId: "m1",
        }),
      }),
    );
  });

  it("shows recovery UI on a failed start, preserving the collected Layer-1 answers for retry", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ status: "provider-unavailable", message: "CaseCompass could not start the interview right now." }),
    );

    const store = useIntakeStore.getState();
    store.setCaseType("criminal");
    store.setJurisdiction("SC");
    store.setProceduralStage("post-conviction");
    store.toggleResearchGoal("understand-case");
    store.toggleDocumentType("court-opinion");
    store.goToStep("document-types");

    const user = userEvent.setup();
    render(<GetStartedWizard />);

    await user.click(screen.getByRole("button", { name: /continue/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/could not start the interview/i);
    });

    // Answers must still be intact after the failure.
    expect(useIntakeStore.getState().caseType).toBe("criminal");
    expect(useIntakeStore.getState().documentTypes).toEqual(["court-opinion"]);
  });

  it("submits an interview answer and shows the review screen once the AI marks intake-complete", async () => {
    const store = useIntakeStore.getState();
    store.applyStartedSession({
      sessionId: "s1",
      intakeStatus: "interviewing",
      question: {
        id: "q1",
        text: "What court handled your case?",
        purpose: "x",
        answerType: "short-text",
        choices: null,
        required: true,
        sensitiveInformationWarning: null,
      },
      factualSummary: "",
      unresolvedInformation: [],
      topicsCovered: [],
    });
    store.goToStep("ai-interview");

    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({
        status: "answered",
        intakeStatus: "ready-for-review",
        question: null,
        factualSummary: "The user's case was handled by Richland County Circuit Court.",
        unresolvedInformation: [],
        topicsCovered: ["court"],
        questionCount: 1,
        limitReached: false,
      }),
    );

    const user = userEvent.setup();
    render(<GetStartedWizard />);

    await user.type(screen.getByRole("textbox"), "Richland County Circuit Court");
    await user.click(screen.getByRole("button", { name: /continue/i }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /review what casecompass understood/i })).toBeInTheDocument();
    });
    expect(fetch).toHaveBeenCalledWith(
      "/api/intake/interview/answer",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ sessionId: "s1", questionId: "q1", answerText: "Richland County Circuit Court" }),
      }),
    );
  });

  it("generates a roadmap and redirects there directly once the intake is confirmed — no dead-end screen (guests can no longer reach this wizard at all)", async () => {
    const store = useIntakeStore.getState();
    store.applyStartedSession({
      sessionId: "s1",
      intakeStatus: "ready-for-review",
      question: null,
      factualSummary: "summary",
      unresolvedInformation: [],
      topicsCovered: [],
    });
    store.setAcknowledged(true);
    store.goToStep("review");

    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ status: "completed", sessionId: "s1" }))
      .mockResolvedValueOnce(jsonResponse({ status: "created", roadmapId: "r1" }));

    const user = userEvent.setup();
    render(<GetStartedWizard />);

    await user.click(screen.getByRole("button", { name: /confirm/i }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/dashboard/roadmap/generate",
        expect.objectContaining({ method: "POST", body: JSON.stringify({ intakeId: "s1" }) }),
      );
      expect(pushMock).toHaveBeenCalledWith("/dashboard/roadmaps/r1");
    });

    expect(screen.queryByRole("heading", { name: /you're ready/i })).not.toBeInTheDocument();
  });

  it("preserves the confirmed intake and offers Try Again / Return to Dashboard when roadmap generation fails", async () => {
    const store = useIntakeStore.getState();
    store.applyStartedSession({
      sessionId: "s1",
      intakeStatus: "ready-for-review",
      question: null,
      factualSummary: "summary",
      unresolvedInformation: [],
      topicsCovered: [],
    });
    store.setAcknowledged(true);
    store.goToStep("review");

    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ status: "completed", sessionId: "s1" }))
      .mockResolvedValueOnce(jsonResponse({ status: "generation-failed", message: "Could not build a valid roadmap right now." }));

    const user = userEvent.setup();
    render(<GetStartedWizard />);

    await user.click(screen.getByRole("button", { name: /confirm/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/could not build a valid roadmap right now/i);
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
    const dashboardLinks = screen.getAllByRole("link", { name: /return to dashboard/i });
    expect(dashboardLinks.length).toBeGreaterThan(0);
    expect(dashboardLinks[0]).toHaveAttribute("href", "/dashboard");
    expect(pushMock).not.toHaveBeenCalledWith(expect.stringContaining("/dashboard/roadmaps/"));
    // The intake itself must not be reset/erased on a roadmap-generation failure.
    expect(useIntakeStore.getState().sessionId).toBe("s1");
  });

  it("resumes a saved session from ?sessionId=, restoring prior answers without repeating them", async () => {
    mockSearchParams = new URLSearchParams("sessionId=s1");

    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({
        status: "found",
        session: {
          id: "s1",
          status: "interviewing",
          caseType: "criminal",
          jurisdiction: "SC",
          proceduralStage: "post-conviction",
          researchGoals: ["understand-case"],
          documentTypes: ["court-opinion"],
          factualSummary: "Summary so far.",
          unresolvedInformation: [],
          topicsCovered: ["case-type"],
          currentQuestion: {
            id: "q2",
            text: "What was the outcome?",
            purpose: "x",
            answerType: "short-text",
            choices: null,
            required: true,
            sensitiveInformationWarning: null,
          },
          questionCount: 1,
          answers: [{ questionId: "q1", questionText: "What court?", answerText: "Richland County", answerType: "short-text", sequence: 1 }],
        },
      }),
    );

    render(<GetStartedWizard />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "What was the outcome?" })).toBeInTheDocument();
    });

    expect(fetch).toHaveBeenCalledWith("/api/intake/interview/s1");
    expect(useIntakeStore.getState().answeredTurns).toEqual([
      { questionId: "q1", questionText: "What court?", answerText: "Richland County" },
    ]);
  });

  it("shows Save and Exit, Return to Dashboard, and Log Out mid-intake", async () => {
    useIntakeStore.getState().goToStep("case-type");

    render(<GetStartedWizard />);

    expect(screen.getByRole("button", { name: /save and exit/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /return to dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^log out$/i })).toBeInTheDocument();
  });

  it("redirects to /first-login instead of showing a dead-end error when starting the interview requires a password change first", async () => {
    const store = useIntakeStore.getState();
    store.setCaseType("criminal");
    store.setJurisdiction("SC");
    store.setProceduralStage("post-conviction");
    store.toggleResearchGoal("understand-case");
    store.toggleDocumentType("court-opinion");
    store.goToStep("document-types");

    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ status: "must-change-password", message: "You must change your password before continuing." }),
    );

    const user = userEvent.setup();
    render(<GetStartedWizard />);

    await user.click(screen.getByRole("button", { name: /continue/i }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/first-login");
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("redirects to /first-login when resuming a session requires a password change first", async () => {
    mockSearchParams = new URLSearchParams("sessionId=s1");
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ status: "must-change-password", message: "You must change your password before continuing." }),
    );

    render(<GetStartedWizard />);

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/first-login");
    });
  });

  it("Save and Exit redirects to the dashboard without marking the intake complete", async () => {
    const store = useIntakeStore.getState();
    store.applyStartedSession({
      sessionId: "s1",
      intakeStatus: "interviewing",
      question: null,
      factualSummary: "x",
      unresolvedInformation: [],
      topicsCovered: [],
    });
    store.goToStep("ai-interview");

    const user = userEvent.setup();
    render(<GetStartedWizard />);

    await user.click(screen.getByRole("button", { name: /save and exit/i }));

    expect(pushMock).toHaveBeenCalledWith("/dashboard?saved=intake");
    expect(fetch).not.toHaveBeenCalled();
  });
});
