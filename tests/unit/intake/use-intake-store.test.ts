import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useIntakeStore } from "@/stores/use-intake-store";

function resetStore() {
  useIntakeStore.getState().reset();
}

describe("useIntakeStore", () => {
  beforeEach(() => {
    resetStore();
  });
  afterEach(() => {
    resetStore();
  });

  it("has sensible initial state", () => {
    const state = useIntakeStore.getState();
    expect(state.step).toBe("welcome");
    expect(state.caseType).toBeNull();
    expect(state.researchGoals).toEqual([]);
    expect(state.documentTypes).toEqual([]);
    expect(state.sessionId).toBeNull();
    expect(state.error).toBeNull();
  });

  it("updates a single field", () => {
    useIntakeStore.getState().setCaseType("criminal");
    expect(useIntakeStore.getState().caseType).toBe("criminal");
  });

  it("toggles a research goal on and off", () => {
    useIntakeStore.getState().toggleResearchGoal("understand-case");
    expect(useIntakeStore.getState().researchGoals).toEqual(["understand-case"]);
    useIntakeStore.getState().toggleResearchGoal("understand-case");
    expect(useIntakeStore.getState().researchGoals).toEqual([]);
  });

  it("allows multiple research goals", () => {
    useIntakeStore.getState().toggleResearchGoal("understand-case");
    useIntakeStore.getState().toggleResearchGoal("research-issues");
    expect(useIntakeStore.getState().researchGoals).toEqual(["understand-case", "research-issues"]);
  });

  it("treats 'none' as exclusive for document types — selecting it clears everything else", () => {
    useIntakeStore.getState().toggleDocumentType("court-opinion");
    useIntakeStore.getState().toggleDocumentType("transcript");
    useIntakeStore.getState().toggleDocumentType("none");
    expect(useIntakeStore.getState().documentTypes).toEqual(["none"]);
  });

  it("selecting another document type after 'none' removes 'none'", () => {
    useIntakeStore.getState().toggleDocumentType("none");
    useIntakeStore.getState().toggleDocumentType("court-opinion");
    expect(useIntakeStore.getState().documentTypes).toEqual(["court-opinion"]);
  });

  it("navigates forward and backward through steps", () => {
    useIntakeStore.getState().goToStep("case-type");
    expect(useIntakeStore.getState().step).toBe("case-type");
    useIntakeStore.getState().goToStep("jurisdiction");
    expect(useIntakeStore.getState().step).toBe("jurisdiction");
  });

  it("preserves field values when navigating backward (editing doesn't erase answers)", () => {
    useIntakeStore.getState().setCaseType("criminal");
    useIntakeStore.getState().goToStep("case-type");
    useIntakeStore.getState().goToStep("welcome");
    expect(useIntakeStore.getState().caseType).toBe("criminal");
  });

  it("records session state after starting an interview", () => {
    useIntakeStore.getState().applyStartedSession({
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
      factualSummary: "summary",
      unresolvedInformation: [],
      topicsCovered: [],
    });
    const state = useIntakeStore.getState();
    expect(state.sessionId).toBe("s1");
    expect(state.currentQuestion?.id).toBe("q1");
    expect(state.intakeStatus).toBe("interviewing");
  });

  it("appends an answered turn to history and preserves it on error", () => {
    useIntakeStore.getState().applyStartedSession({
      sessionId: "s1",
      intakeStatus: "interviewing",
      question: { id: "q1", text: "Q1", purpose: "x", answerType: "short-text", choices: null, required: true, sensitiveInformationWarning: null },
      factualSummary: "",
      unresolvedInformation: [],
      topicsCovered: [],
    });
    useIntakeStore.getState().recordAnsweredTurn("q1", "Q1", "my answer");
    expect(useIntakeStore.getState().answeredTurns).toHaveLength(1);

    useIntakeStore.getState().setError("Something went wrong. Try again.");
    // The error must not wipe out already-recorded answers.
    expect(useIntakeStore.getState().answeredTurns).toHaveLength(1);
    expect(useIntakeStore.getState().error).toBe("Something went wrong. Try again.");
  });

  it("reset() clears all fields back to initial state", () => {
    useIntakeStore.getState().setCaseType("criminal");
    useIntakeStore.getState().applyStartedSession({
      sessionId: "s1",
      intakeStatus: "interviewing",
      question: null,
      factualSummary: "x",
      unresolvedInformation: [],
      topicsCovered: [],
    });
    useIntakeStore.getState().reset();
    const state = useIntakeStore.getState();
    expect(state.caseType).toBeNull();
    expect(state.sessionId).toBeNull();
    expect(state.step).toBe("welcome");
  });

  it("clearSession() clears sensitive server-derived state but can be called safely at any time", () => {
    useIntakeStore.getState().applyStartedSession({
      sessionId: "s1",
      intakeStatus: "interviewing",
      question: null,
      factualSummary: "sensitive summary",
      unresolvedInformation: [],
      topicsCovered: [],
    });
    useIntakeStore.getState().clearSession();
    const state = useIntakeStore.getState();
    expect(state.sessionId).toBeNull();
    expect(state.factualSummary).toBe("");
    expect(state.currentQuestion).toBeNull();
  });
});
